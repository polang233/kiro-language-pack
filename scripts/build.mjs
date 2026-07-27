#!/usr/bin/env node
/**
 * Assembles one installable language pack per (locale x mode) into
 * `dist/<name>/`, ready for `npm run package`.
 *
 * Inputs, in increasing precedence:
 *   1. upstream/<locale>/                     Code OSS baseline (full mode only)
 *   2. src/i18n/<locale>/overrides/*.i18n.json  hand fixes to the baseline
 *   3. src/i18n/<locale>/kiro/*.i18n.json       Kiro specific translations
 *
 * `metadata/kiro.json` (from `npm run extract`) is optional. When present, keys
 * that do not exist in the local Kiro build are dropped. When absent - as in CI -
 * filtering is skipped so the build still succeeds.
 *
 * Usage: npm run build [-- --locale=zh-cn] [--mode=full] [--no-filter]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  p, readJson, writeJson, deepMerge, listFiles, rmrf, log, fail, parseArgs, loadConfig
} from './lib/util.mjs';
import { markerMismatches } from './lib/markers.mjs';

const I18N_VERSION = '1.0.0';
const CORE_TRANSLATION_ID = 'vscode';

const { flags } = parseArgs();
const config = loadConfig();

const metadataFile = p('metadata', 'kiro.json');
const metadata = fs.existsSync(metadataFile) ? readJson(metadataFile) : null;

const filterEnabled = (() => {
  if (flags.filter === false || flags['no-filter']) return false;
  if (!config.build.filterByKiroMetadata) return false;
  if (!metadata) {
    log.warn('metadata/kiro.json not found - key filtering disabled. Run `npm run extract` on a machine with Kiro installed for a leaner pack.');
    return false;
  }
  return true;
})();

/**
 * Marker repair needs the English source, which only metadata provides. It removes
 * inherited translations that would render broken placeholders or dead command
 * links - a real defect in the upstream baseline caused by version skew.
 */
const repairEnabled = (() => {
  if (flags.repair === false || flags['no-repair']) return false;
  if (config.build.repairMismatchedMarkers === false) return false;
  return Boolean(metadata);
})();

const locales = config.locales
  .filter((l) => l.enabled !== false)
  .filter((l) => (flags.locale ? l.id === flags.locale : true));
if (!locales.length) fail(`No enabled locale matched${flags.locale ? ` --locale=${flags.locale}` : ''}.`);

const modes = Object.entries(config.modes)
  .filter(([, m]) => m.enabled !== false)
  .filter(([id]) => (flags.mode ? id === flags.mode : true));
if (!modes.length) fail(`No enabled mode matched${flags.mode ? ` --mode=${flags.mode}` : ''}.`);

const template = fs.readFileSync(p('src', 'manifest.template.json'), 'utf8');

const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;

/** Strip a `.i18n.json` filename down to its translation id. */
const translationIdFromFile = (file) => path.basename(file).replace(/\.i18n\.json$/, '');

function readContents(file) {
  const data = readJson(file);
  if (!data || typeof data !== 'object') fail(`Malformed translation file: ${file}`);
  const contents = data.contents ?? data;
  if (typeof contents !== 'object') fail(`Missing "contents" object in ${file}`);
  return contents;
}

/**
 * Keep only modules/keys that exist in the installed Kiro build, and - unless
 * disabled - drop translations whose structural markers no longer match the English
 * source. The latter is version skew between microsoft/vscode-loc and Kiro's older
 * Code OSS base: shipping those strings would render literal `{2}` placeholders or
 * dead command links. Dropping them falls back to English, which is correct.
 */
function filterCore(contents, ownedKeys) {
  const kept = {};
  const stats = { modulesDropped: 0, keysDropped: 0, keysKept: 0, mismatched: 0, mismatchedOwned: 0 };

  for (const [moduleId, entries] of Object.entries(contents)) {
    const known = metadata.core[moduleId];
    if (!known) {
      stats.modulesDropped++;
      stats.keysDropped += Object.keys(entries ?? {}).length;
      continue;
    }
    const bucket = {};
    for (const [key, value] of Object.entries(entries ?? {})) {
      if (!(key in known)) {
        stats.keysDropped++;
        continue;
      }
      if (repairEnabled && markerMismatches(known[key], value).length) {
        // Strings this repository maintains are a bug on our side; report them
        // loudly instead of silently discarding the contributor's work.
        if (ownedKeys.has(`${moduleId}\u0000${key}`)) {
          stats.mismatchedOwned++;
          log.warn(`marker mismatch in overrides: ${moduleId}/${key}`);
        } else {
          stats.mismatched++;
          continue;
        }
      }
      bucket[key] = value;
      stats.keysKept++;
    }
    if (!isEmpty(bucket)) kept[moduleId] = bucket;
  }
  return { contents: kept, stats };
}

/**
 * Filter an extension bundle. `contents.package` maps to package.nls.json keys
 * and can be validated. `contents.bundle` holds runtime vscode.l10n strings,
 * whose keys are the English source strings; those are passed through untouched.
 */
function filterExtension(id, contents, ownedKeys) {
  const known = metadata.extensions[id];
  if (!known) return { contents: null, stats: { keysKept: 0, keysDropped: 0, mismatched: 0, mismatchedOwned: 0 } };

  const out = {};
  const stats = { keysKept: 0, keysDropped: 0, mismatched: 0, mismatchedOwned: 0 };

  for (const [section, entries] of Object.entries(contents)) {
    if (section !== 'package') {
      // `bundle` holds runtime vscode.l10n strings keyed by their English source;
      // there is no separate source list to validate them against.
      out[section] = entries;
      continue;
    }
    const bucket = {};
    for (const [key, value] of Object.entries(entries ?? {})) {
      if (!(key in known.packageNls)) {
        stats.keysDropped++;
        continue;
      }
      if (repairEnabled && markerMismatches(known.packageNls[key], value).length) {
        if (ownedKeys.has(`${id}\u0000${key}`)) {
          stats.mismatchedOwned++;
          log.warn(`marker mismatch in ${id}: ${key}`);
        } else {
          stats.mismatched++;
          continue;
        }
      }
      bucket[key] = value;
      stats.keysKept++;
    }
    if (!isEmpty(bucket)) out.package = bucket;
  }
  return { contents: isEmpty(out) ? null : out, stats };
}

function renderManifest(vars, translations) {
  const rendered = template.replace(/\$\{([A-Z_]+)\}/g, (match, key) => {
    if (!(key in vars)) fail(`Manifest template references unknown token \${${key}}`);
    // JSON.stringify then trim the quotes so quotes/backslashes stay escaped
    return JSON.stringify(String(vars[key])).slice(1, -1);
  });
  const manifest = JSON.parse(rendered);
  manifest.contributes.localizations[0].translations = translations;
  if (!vars.ICON) delete manifest.icon;
  return manifest;
}

const upstreamInfoCache = new Map();
function upstreamInfo(localeId) {
  if (!upstreamInfoCache.has(localeId)) {
    upstreamInfoCache.set(localeId, readJson(p('upstream', localeId, '.sync-info.json'), null));
  }
  return upstreamInfoCache.get(localeId);
}

const summaries = [];

for (const locale of locales) {
  for (const [modeId, mode] of modes) {
    if (mode.includeUpstream && !locale.upstreamPackDir) {
      log.warn(`${locale.id}/${modeId}: locale has no upstreamPackDir, skipping.`);
      continue;
    }

    const name = `${config.namePrefix}-${locale.id}${mode.nameSuffix ?? ''}`;
    const outDir = p('dist', name);
    log.step(`Building ${name}  (locale=${locale.id}, mode=${modeId})`);

    /** @type {Record<string, object>} translation id -> contents */
    const bundles = {};
    let core = {};

    // Keys this repository maintains, as `<scope>\0<key>`. Marker problems in these
    // are our bugs and must be reported rather than silently dropped.
    const ownedCoreKeys = new Set();
    const ownedExtKeys = new Set();
    const recordOwnedCore = (contents) => {
      for (const [moduleId, entries] of Object.entries(contents)) {
        for (const key of Object.keys(entries ?? {})) ownedCoreKeys.add(`${moduleId}\u0000${key}`);
      }
    };
    const recordOwnedExt = (id, contents) => {
      for (const key of Object.keys(contents.package ?? {})) ownedExtKeys.add(`${id}\u0000${key}`);
    };

    if (mode.includeUpstream) {
      const upstreamDir = p('upstream', locale.id);
      const mainFile = path.join(upstreamDir, 'main.i18n.json');
      if (!fs.existsSync(mainFile)) {
        fail(
          `${locale.id}: upstream baseline missing (${path.relative(p('.'), mainFile)}).\n` +
          `  Run: npm run sync -- --locale=${locale.id}`
        );
      }
      core = readContents(mainFile);
      const extFiles = listFiles(path.join(upstreamDir, 'extensions'), '.i18n.json');
      for (const file of extFiles) {
        bundles[translationIdFromFile(file)] = readContents(file);
      }
      log.info(`upstream baseline: core + ${extFiles.length} extension bundle(s)`);
    }

    // Hand-written corrections to the upstream core baseline.
    const overrideMain = p('src', 'i18n', locale.id, 'overrides', 'main.i18n.json');
    if (fs.existsSync(overrideMain)) {
      const contents = readContents(overrideMain);
      core = deepMerge(core, contents);
      recordOwnedCore(contents);
      log.info('applied overrides/main.i18n.json');
    }
    for (const file of listFiles(p('src', 'i18n', locale.id, 'overrides'), '.i18n.json')) {
      const id = translationIdFromFile(file);
      if (id === 'main') continue;
      const contents = readContents(file);
      bundles[id] = deepMerge(bundles[id] ?? {}, contents);
      recordOwnedExt(id, contents);
    }

    // Kiro specific translations - the reason this project exists.
    const kiroFiles = listFiles(p('src', 'i18n', locale.id, 'kiro'), '.i18n.json');
    if (!kiroFiles.length) {
      log.warn(`${locale.id}: no files in src/i18n/${locale.id}/kiro/ - the pack will not translate any Kiro string.`);
    }
    for (const file of kiroFiles) {
      const id = translationIdFromFile(file);
      const contents = readContents(file);
      bundles[id] = deepMerge(bundles[id] ?? {}, contents);
      recordOwnedExt(id, contents);
      log.info(`kiro translations: ${id}`);
    }

    // Filtering against the installed build.
    let coreStats = null;
    let repaired = 0;
    if (filterEnabled && !isEmpty(core)) {
      const result = filterCore(core, ownedCoreKeys);
      core = result.contents;
      coreStats = result.stats;
      repaired += coreStats.mismatched;
      log.info(`core filter: kept ${coreStats.keysKept}, dropped ${coreStats.keysDropped} unknown key(s), ${coreStats.modulesDropped} unknown module(s)`);
      if (coreStats.mismatched) {
        log.info(`core repair: dropped ${coreStats.mismatched} upstream string(s) whose placeholders/links no longer match the source`);
      }
    }

    const translations = [];
    rmrf(outDir);

    if (!isEmpty(core)) {
      const rel = 'translations/main.i18n.json';
      writeJson(path.join(outDir, rel), { version: I18N_VERSION, contents: core }, { pretty: config.build.prettyJson });
      translations.push({ id: CORE_TRANSLATION_ID, path: `./${rel}` });
    }

    let extKeptCount = 0;
    let extDroppedCount = 0;
    for (const id of Object.keys(bundles).sort()) {
      let contents = bundles[id];
      if (filterEnabled) {
        const result = filterExtension(id, contents, ownedExtKeys);
        repaired += result.stats.mismatched;
        if (!result.contents) {
          extDroppedCount++;
          continue;
        }
        contents = result.contents;
      }
      if (config.build.dropEmptyBundles && isEmpty(contents)) {
        extDroppedCount++;
        continue;
      }
      const rel = `translations/extensions/${id}.i18n.json`;
      writeJson(path.join(outDir, rel), { version: I18N_VERSION, contents }, { pretty: config.build.prettyJson });
      translations.push({ id, path: `./${rel}` });
      extKeptCount++;
    }

    if (!translations.length) {
      fail(`${name}: nothing to ship. Check src/i18n/${locale.id}/ and, for full mode, run npm run sync.`);
    }

    const displayName = locale.displayName
      ? (modeId === 'addon' ? `${locale.displayName} (Add-on)` : locale.displayName)
      : `${locale.languageName} (${locale.localizedLanguageName}) Language Pack for Kiro${modeId === 'addon' ? ' (Add-on)' : ''}`;

    const description = modeId === 'addon'
      ? (locale.descriptionAddon ?? `${locale.localizedLanguageName} translations for the Kiro specific user interface. Install alongside an existing VS Code language pack.`)
      : (locale.description ?? `${locale.localizedLanguageName} language pack for the Kiro IDE, covering both the editor workbench and the Kiro specific user interface.`);

    const manifest = renderManifest({
      NAME: name,
      DISPLAY_NAME: displayName,
      DESCRIPTION: description,
      VERSION: config.version,
      PUBLISHER: config.publisher,
      LICENSE: config.license,
      ICON: config.icon ?? '',
      ENGINE_VSCODE: config.engines.vscode,
      LANGUAGE_ID: locale.id,
      LANGUAGE_NAME: locale.languageName,
      LOCALIZED_LANGUAGE_NAME: locale.localizedLanguageName,
      REPOSITORY: config.repository,
      HOMEPAGE: config.homepage,
      BUGS_URL: config.bugs
    }, translations);

    manifest.kiroLanguagePack = {
      mode: modeId,
      locale: locale.id,
      targetExtension: config.target.kiroExtensionId,
      verifiedKiroVersions: config.target.verifiedKiroVersions,
      builtAgainst: metadata
        ? { kiroVersion: metadata.kiroVersion, vscodeVersion: metadata.vscodeVersion, commit: metadata.commit }
        : null,
      upstream: mode.includeUpstream ? (upstreamInfo(locale.id) ?? { repo: config.upstream.repo, ref: config.upstream.ref }) : null
    };

    writeJson(path.join(outDir, 'package.json'), manifest);

    // Files the marketplace and the license require inside the .vsix.
    const readmeSource = [
      p('src', 'marketplace', `README.${locale.id}.${modeId}.md`),
      p('src', 'marketplace', `README.${locale.id}.md`),
      p('src', 'marketplace', 'README.md')
    ].find((f) => fs.existsSync(f));
    if (readmeSource) {
      fs.copyFileSync(readmeSource, path.join(outDir, 'README.md'));
    } else {
      log.warn('no marketplace README found under src/marketplace/ - the extension page will be empty.');
    }
    for (const file of ['LICENSE', 'NOTICE', 'CHANGELOG.md']) {
      if (fs.existsSync(p(file))) fs.copyFileSync(p(file), path.join(outDir, file));
    }

    // Everything in this directory is generated and meant to ship; the file only
    // exists so vsce does not warn about a missing ignore list.
    fs.writeFileSync(
      path.join(outDir, '.vscodeignore'),
      '# Generated by scripts/build.mjs - every remaining file belongs in the package.\n' +
      '.vscodeignore\n**/.DS_Store\n**/Thumbs.db\n',
      'utf8'
    );

    const bytes = translations.reduce(
      (n, t) => n + fs.statSync(path.join(outDir, t.path.replace(/^\.\//, ''))).size,
      0
    );

    log.ok(`${name}: ${translations.length} translation file(s), ${(bytes / 1024).toFixed(0)} KiB -> dist/${name}/`);
    summaries.push({
      name, locale: locale.id, mode: modeId, translationFiles: translations.length,
      extensionBundlesKept: extKeptCount, extensionBundlesDropped: extDroppedCount,
      coreIncluded: !isEmpty(core), repairedStrings: repaired, bytes
    });
  }
}

writeJson(p('dist', 'build-summary.json'), {
  generatedAt: new Date().toISOString(),
  version: config.version,
  publisher: config.publisher,
  filterEnabled,
  repairEnabled,
  builds: summaries
});

log.step('Summary');
for (const s of summaries) {
  log.plain(
    `  ${s.name.padEnd(34)} ${String(s.translationFiles).padStart(4)} files  ` +
    `${(s.bytes / 1024).toFixed(0).padStart(6)} KiB  core=${s.coreIncluded ? 'yes' : 'no'}  ` +
    `repaired=${s.repairedStrings}`
  );
}
log.plain('\nNext: npm run coverage   then   npm run package');
