#!/usr/bin/env node
/**
 * Audit the local Kiro's core and built-in extension sources against a snapshot.
 * Saves the previous extract before refreshing. --baseline always runs the diff,
 * even when installed/verified/extracted versions already match.
 *
 *   node scripts/check-upgrade.mjs
 *   node scripts/check-upgrade.mjs --force
 *   node scripts/check-upgrade.mjs --baseline=reports/kiro-before-3.27.12.json
 *   node scripts/check-upgrade.mjs --locale=zh-cn --skeleton=reports/upgrade-work.json
 *
 * Reads the app; writes only repository metadata, reports and the requested skeleton.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findKiroInstall, readKiroInfo } from './lib/kiro-paths.mjs';
import { p, readJson, writeJson, log, fail, parseArgs, loadConfig, listFiles } from './lib/util.mjs';
import { diffUpgrade, auditUpgrade, buildUpgradeSkeleton } from './lib/upgrade-diff.mjs';

const { flags } = parseArgs();
const config = loadConfig();
const force = Boolean(flags.force);
const limit = Number.isInteger(Number(flags.limit)) && Number(flags.limit) >= 0 ? Number(flags.limit) : 40;
const explicitBaseline = Object.hasOwn(flags, 'baseline');
if (explicitBaseline && (typeof flags.baseline !== 'string' || !flags.baseline.trim())) {
  fail('Use --baseline=<path> to specify a metadata snapshot.');
}
const metadataPath = p('metadata', 'kiro.json');
const baselinePath = explicitBaseline ? path.resolve(p('.'), flags.baseline) : metadataPath;
const previousMeta = fs.existsSync(metadataPath) ? readJson(metadataPath) : null;
let baseline;
try {
  baseline = explicitBaseline ? readJson(baselinePath) : previousMeta;
  if (baseline !== null && (!baseline || typeof baseline.core !== 'object' ||
      baseline.core === null || Array.isArray(baseline.core))) {
    throw new Error('Expected a metadata snapshot with a core module map.');
  }
  if (explicitBaseline && baseline === null) throw new Error('Expected a metadata snapshot, got null.');
} catch (err) {
  fail(`Cannot read comparison baseline ${baselinePath}: ${err.message}`);
}
const previousVersion = baseline?.kiroVersion ?? null;

const found = findKiroInstall();
if (!found) {
  fail('Kiro installation not found. Set KIRO_INSTALL_DIR to the install root\n' +
    '  (the directory that contains resources/app/package.json) and retry.');
}
const info = readKiroInfo(found.appRoot);
const installVersion = info.kiroVersion ?? '(unknown)';
const verified = config.target?.verifiedKiroVersions ?? [];
const locales = config.locales.filter((l) => l.enabled !== false)
  .filter((l) => flags.locale ? l.id === flags.locale : true);
if (!locales.length) fail(`No enabled locale matched${flags.locale ? ` --locale=${flags.locale}` : ''}.`);

log.step('Version check');
log.plain(`  installed Kiro          ${installVersion}  (Code OSS ${info.vscodeVersion ?? '?'})`);
log.plain(`  verified in config.json   ${verified.length ? verified.join(', ') : '(none)'}`);
log.plain(`  last metadata extract     ${previousMeta?.kiroVersion ?? '(none)'}`);
log.plain(`  comparison baseline       ${previousVersion ?? '(none)'}  ${path.relative(p('.'), baselinePath)}`);
const matchesVerified = verified.includes(installVersion);
const matchesMetadata = previousMeta?.kiroVersion === installVersion &&
  (!info.commit || previousMeta?.commit === info.commit);
if (matchesVerified && matchesMetadata && !force && !explicitBaseline) {
  log.ok('Install matches verified versions and the last extract. Nothing to do.');
  log.plain('  Re-run with --baseline=<path> to compare an older snapshot, or --force to refresh.');
  process.exit(0);
}
if (!matchesVerified) log.warn(`Install ${installVersion} is not in target.verifiedKiroVersions.`);
if (previousMeta && !matchesMetadata) log.warn('Install version/commit differs from the last extract.');
if (force) log.info('--force: refreshing metadata and re-diffing.');
if (explicitBaseline) log.info('--baseline: refreshing and comparing the requested snapshot.');

const safePart = (value) => String(value ?? 'unknown').replace(/[^\w.-]+/g, '_');
let preservedMetadataSnapshot = null;
if (previousMeta) {
  const file = p('reports', 'baselines', `kiro-${safePart(previousMeta.kiroVersion)}-${safePart(previousMeta.commit)}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let created = false;
  try {
    fs.writeFileSync(file, fs.readFileSync(metadataPath), { flag: 'wx' });
    created = true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  preservedMetadataSnapshot = { path: path.relative(p('.'), file), created };
  log.info(`${created ? 'Saved previous snapshot' : 'Kept existing snapshot'}: ${preservedMetadataSnapshot.path}`);
}

log.step('Refreshing metadata/kiro.json from the local install');
const extract = spawnSync(process.execPath, [p('scripts', 'extract.mjs')], { stdio: 'inherit', windowsHide: true });
if (extract.status !== 0) fail(`extract failed; cannot continue check-upgrade.${extract.error ? ` ${extract.error.message}` : ''}`);
const metadata = readJson(metadataPath);
if (metadata.kiroVersion !== info.kiroVersion || (info.commit && metadata.commit !== info.commit)) {
  fail('The installation changed during extraction; rerun check-upgrade.');
}

const drift = diffUpgrade(baseline, metadata);
const { addedKeys: added, removedKeys: removed, counts, extensionDrift } = drift;

log.step(`Core drift (${previousVersion ?? 'no baseline'} → ${metadata.kiroVersion})`);
log.plain(`  added ${counts.added}  removed ${counts.removed}  changed English ${counts.changed}  moved ${counts.moved}`);
log.plain('  added/removed are raw key identities; moved keys are a subset of both lists.');
if (added.length) {
  const byMod = new Map();
  for (const row of added) byMod.set(row.moduleId, (byMod.get(row.moduleId) ?? 0) + 1);
  const top = [...byMod].sort((a, b) => b[1] - a[1]).slice(0, limit);
  log.plain('  new keys by module:');
  for (const [mod, n] of top) log.plain(`    ${String(n).padStart(4)}  ${mod}`);
  if (byMod.size > top.length) log.plain(`    ... ${byMod.size - top.length} more module(s)`);
}
log.step('Built-in extension drift');
log.plain(`  extensions added ${extensionDrift.counts.addedExtensions}  removed ${extensionDrift.counts.removedExtensions}`);
for (const section of ['packageNls', 'l10nBundle']) {
  if (section === 'l10nBundle' && !extensionDrift.l10nBundle.comparedExtensions.length) {
    log.plain('  l10nBundle: not compared (no pair of recorded snapshots)');
    continue;
  }
  const n = extensionDrift[section].counts;
  log.plain(`  ${section}: added ${n.added}  removed ${n.removed}  changed ${n.changed}`);
}
const bundles = extensionDrift.l10nBundle;
log.plain(`  bundle comparisons: ${bundles.comparedExtensions.length} extension(s)`);
if (bundles.uncomparedExtensions.length) {
  log.warn(`${bundles.uncomparedExtensions.length} extension bundle(s) not compared: snapshot data was not recorded.`);
  log.plain('  Bundle counts cover comparable snapshots only; see l10nBundle.uncomparedExtensions in the report.');
}

function mergeCore(target, contents) {
  for (const [moduleId, keys] of Object.entries(contents)) {
    target[moduleId] = { ...(target[moduleId] ?? {}), ...keys };
  }
}

/** Same precedence as build: upstream, overrides, authored Kiro files. */
function loadTranslations(localeId) {
  const upstreamFile = p('upstream', localeId, 'main.i18n.json');
  const upstreamCore = fs.existsSync(upstreamFile) ? readJson(upstreamFile).contents ?? {} : {};
  if (!fs.existsSync(upstreamFile)) log.warn(`${localeId}: no upstream baseline (npm run sync).`);
  const ownCore = {}, authoredCore = {}, ownExtensions = {}, upstreamExtensions = {};
  const sources = { ownCore: [], upstreamCore: fs.existsSync(upstreamFile) ? path.relative(p('.'), upstreamFile) : null,
    ownExtensions: {}, upstreamExtensions: {} };
  for (const file of listFiles(p('upstream', localeId, 'extensions'), '.i18n.json')) {
    const id = path.basename(file, '.i18n.json');
    upstreamExtensions[id] = readJson(file).contents ?? {};
    sources.upstreamExtensions[id] = path.relative(p('.'), file);
  }
  for (const folder of ['overrides', 'kiro']) {
    for (const file of listFiles(p('src', 'i18n', localeId, folder), '.i18n.json')) {
      const name = path.basename(file), contents = readJson(file).contents ?? {};
      const isCore = folder === 'overrides' ? name === 'main.i18n.json'
        : /^core[.\-]/.test(name) || name === 'core.i18n.json';
      if (isCore) {
        mergeCore(ownCore, contents);
        if (folder === 'kiro') mergeCore(authoredCore, contents);
        sources.ownCore.push(path.relative(p('.'), file));
      } else {
        const id = path.basename(file, '.i18n.json');
        const merged = ownExtensions[id] ??= {};
        for (const [section, keys] of Object.entries(contents)) merged[section] = { ...(merged[section] ?? {}), ...keys };
        (sources.ownExtensions[id] ??= []).push(path.relative(p('.'), file));
      }
    }
  }
  return { ownCore, authoredCore, upstreamCore, ownExtensions, upstreamExtensions, sources };
}

const audits = [];
for (const locale of locales) {
  const translations = loadTranslations(locale.id);
  const audit = auditUpgrade(metadata, drift, translations);
  audits.push(audit);
  const { missingTranslations: missing, addedUntranslated, orphanedAuthored: orphans } = audit;
  const agentId = config.target?.kiroExtensionId;
  const agentMeta = metadata.extensions?.[agentId];
  const agentMissing = audit.extensionMissingTranslations
    .filter((row) => row.extensionId === agentId && row.section === 'packageNls')
    .map(({ key, english }) => ({ key, english }));
  const report = {
    generatedAt: new Date().toISOString(), locale: locale.id,
    install: { kiroVersion: metadata.kiroVersion, vscodeVersion: metadata.vscodeVersion, commit: metadata.commit },
    previousExtract: previousVersion,
    comparisonBaseline: { path: path.relative(p('.'), baselinePath), explicit: explicitBaseline,
      kiroVersion: previousVersion, commit: baseline?.commit ?? null, available: drift.baselineAvailable },
    preservedMetadataSnapshot,
    comparisonScope: {
      core: 'All non-test modules. addedKeys/removedKeys retain raw identities, including movedKeys.',
      extensions: 'All built-in extensions: packageNls and recorded l10nBundle sources.',
      translations: 'Missing retains nonempty-entry coverage. identicalToEnglish entries are informational; all changed sources require review.',
      l10nBundle: 'Shipped English bundle.l10n.json in the manifest l10n directory, default l10n directory or extension root. Missing historical data is not treated as empty; see extensionDrift.l10nBundle.uncomparedExtensions.'
    },
    verifiedKiroVersions: verified, alignedWithVerified: matchesVerified,
    core: {
      addedSincePreviousExtract: added.length, removedSincePreviousExtract: removed.length,
      changedSincePreviousExtract: counts.changed, movedSincePreviousExtract: counts.moved,
      stillMissingTranslations: missing.length, orphanedAuthoredKeys: orphans.length,
      addedAndStillUntranslated: addedUntranslated.length,
      identicalToEnglish: audit.identicalToEnglish.length,
      changedTranslationsRequiringReview: audit.changedKeys.length,
      newlyOrphanedAuthoredKeys: audit.newlyOrphanedAuthored.length,
      preExistingOrphanedAuthoredKeys: audit.preExistingOrphanedAuthored?.length ?? null
    },
    kiroAgent: {
      packageNlsTotal: Object.keys(agentMeta?.packageNls ?? {}).length, packageNlsMissing: agentMissing.length
    },
    addedKeys: added, removedKeys: removed, ...audit, agentMissing,
    translationSources: translations.sources,
    extensionTranslations: {
      packageNlsMissing: audit.extensionMissingTranslations.filter((row) => row.section === 'packageNls').length,
      l10nBundleMissing: audit.extensionMissingTranslations.filter((row) => row.section === 'l10nBundle').length,
      identicalToEnglish: audit.extensionIdenticalToEnglish.length,
      changedTranslationsRequiringReview: audit.extensionDrift.packageNls.counts.changed + audit.extensionDrift.l10nBundle.counts.changed
    }
  };
  const reportPath = p('reports', `upgrade-${safePart(metadata.kiroVersion)}-${locale.id}.json`);
  writeJson(reportPath, report);

  log.step(`${locale.id} translation review against install ${metadata.kiroVersion}`);
  log.plain(`  still missing (core)                 ${missing.length}`);
  log.plain(`  identical English (informational)    ${audit.identicalToEnglish.length}`);
  log.plain(`  new since baseline & untranslated    ${addedUntranslated.length}`);
  log.plain(`  changed English requiring review     ${audit.changedKeys.length}`);
  log.plain(`  orphaned authored keys (all history)  ${orphans.length}`);
  log.plain(`    newly absent since baseline        ${audit.newlyOrphanedAuthored.length}`);
  log.plain(`    already absent in baseline         ${audit.preExistingOrphanedAuthored?.length ?? '(no baseline)'}`);
  log.plain(`  report: ${path.relative(p('.'), reportPath)}`);
  const modules = Object.entries(audit.missingByModule), top = modules.slice(0, limit);
  for (const [mod, keys] of top) log.plain(`    ${String(keys.length).padStart(4)}  ${mod}`);
  if (modules.length > top.length) log.plain(`    ... ${modules.length - top.length} more module(s)`);
}

if (typeof flags.skeleton === 'string') {
  const target = path.resolve(p('.'), flags.skeleton);
  const skeleton = buildUpgradeSkeleton(audits);
  writeJson(target, skeleton);
  const n = Object.values(skeleton.contents).reduce((sum, keys) => sum + Object.keys(keys).length, 0);
  log.ok(`English skeleton: ${n} core key(s), ${Object.keys(skeleton.extensions).length} extension(s) -> ${path.relative(p('.'), target)}`);
  log.plain('  English values are a work list. $reviewRequired marks missing entries and changed sources, even when a candidate translation exists.');
}
log.step('Next steps');
log.plain('  Review changedKeys and extensionDrift.*.changedKeys against own/upstream candidates and translationSources.');
log.plain('  Reuse movedKeys translations after checking their new module context. Review missing entries and obsolete authored keys.');
log.plain('  Verify translations and build before adding this Kiro version to target.verifiedKiroVersions.');
