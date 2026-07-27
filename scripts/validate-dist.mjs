#!/usr/bin/env node
/**
 * Validates the packs in `dist/` before they are published.
 *
 * Structural checks always run. When `metadata/kiro.json` is present the English
 * source is compared against every translated string, so placeholders, icon
 * references and command links cannot silently drift - those are the mistakes that
 * break the UI at runtime rather than merely reading badly.
 *
 * Usage: node scripts/validate-dist.mjs [--strict]
 * Exit code 1 on any error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { p, readJson, log, parseArgs, loadConfig } from './lib/util.mjs';
import { markerMismatches } from './lib/markers.mjs';

const UNRESOLVED_TOKEN = /\$\{[A-Z_]+\}/;

const { flags } = parseArgs();
const config = loadConfig();

const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const summaryFile = p('dist', 'build-summary.json');
if (!fs.existsSync(summaryFile)) {
  log.err('dist/build-summary.json not found. Run `npm run build` first.');
  process.exit(1);
}
const summary = readJson(summaryFile);
const repairWasEnabled = summary.repairEnabled === true;

const metadataFile = p('metadata', 'kiro.json');
const metadata = fs.existsSync(metadataFile) ? readJson(metadataFile) : null;
if (!metadata) {
  log.warn('metadata/kiro.json absent - source comparison checks are skipped (structural checks still run).');
}

if (String(config.publisher).startsWith('CHANGE-ME')) {
  (flags.strict ? error : warn)('config.json publisher is still a placeholder.');
}
for (const [key, value] of Object.entries({ repository: config.repository, homepage: config.homepage, bugs: config.bugs })) {
  if (typeof value === 'string' && value.includes('CHANGE-ME')) {
    (flags.strict ? error : warn)(`config.json ${key} still contains a CHANGE-ME placeholder.`);
  }
}

for (const build of summary.builds) {
  const outDir = p('dist', build.name);
  const scope = build.name;

  const manifestFile = path.join(outDir, 'package.json');
  if (!fs.existsSync(manifestFile)) {
    error(`${scope}: package.json missing`);
    continue;
  }
  const manifest = readJson(manifestFile);

  // --- manifest shape --------------------------------------------------
  for (const field of ['name', 'displayName', 'description', 'version', 'publisher', 'engines']) {
    if (!manifest[field]) error(`${scope}: manifest is missing "${field}"`);
  }
  if (UNRESOLVED_TOKEN.test(JSON.stringify(manifest))) {
    error(`${scope}: manifest still contains an unresolved \${TOKEN} from the template`);
  }
  if (!manifest.categories?.includes('Language Packs')) {
    error(`${scope}: categories must include "Language Packs" or the host will not treat it as a language pack`);
  }

  const localizations = manifest.contributes?.localizations;
  if (!Array.isArray(localizations) || localizations.length !== 1) {
    error(`${scope}: expected exactly one contributes.localizations entry`);
    continue;
  }
  const localization = localizations[0];
  for (const field of ['languageId', 'languageName', 'localizedLanguageName']) {
    if (!localization[field]) error(`${scope}: localization is missing "${field}"`);
  }
  if (localization.languageId !== build.locale) {
    error(`${scope}: languageId "${localization.languageId}" does not match the built locale "${build.locale}"`);
  }
  if (!Array.isArray(localization.translations) || localization.translations.length === 0) {
    error(`${scope}: localization declares no translations`);
    continue;
  }

  // --- files it points at ----------------------------------------------
  const referenced = new Set();
  let stringCount = 0;

  for (const entry of localization.translations) {
    if (!entry.id || !entry.path) {
      error(`${scope}: malformed translations entry ${JSON.stringify(entry)}`);
      continue;
    }
    const relative = entry.path.replace(/^\.\//, '');
    if (!entry.path.startsWith('./')) {
      error(`${scope}: translation path "${entry.path}" should be relative and start with ./`);
    }
    const file = path.join(outDir, relative);
    if (!fs.existsSync(file)) {
      error(`${scope}: ${entry.id} -> ${entry.path} does not exist`);
      continue;
    }
    referenced.add(path.resolve(file));

    let data;
    try {
      data = readJson(file);
    } catch (err) {
      error(`${scope}: ${entry.path} is not valid JSON - ${err.message}`);
      continue;
    }
    if (!data.contents || typeof data.contents !== 'object') {
      error(`${scope}: ${entry.path} has no "contents" object`);
      continue;
    }

    // Every value must be a non-empty string; nested one level (module -> key).
    for (const [section, bucket] of Object.entries(data.contents)) {
      if (bucket === null || typeof bucket !== 'object') {
        error(`${scope}: ${entry.path} section "${section}" is not an object`);
        continue;
      }
      for (const [key, value] of Object.entries(bucket)) {
        stringCount++;
        if (typeof value !== 'string') {
          error(`${scope}: ${entry.id} ${section}.${key} is ${typeof value}, expected string`);
        } else if (value.trim() === '') {
          error(`${scope}: ${entry.id} ${section}.${key} is empty`);
        }
      }
    }

    // --- compare against the English source ----------------------------
    if (!metadata) continue;

    if (entry.id === 'vscode') {
      for (const [moduleId, bucket] of Object.entries(data.contents)) {
        const source = metadata.core[moduleId];
        if (!source) continue;
        for (const [key, value] of Object.entries(bucket)) {
          compare(scope, `${moduleId}/${key}`, source[key], value);
        }
      }
    } else {
      const source = metadata.extensions[entry.id]?.packageNls;
      if (!source) continue;
      for (const [key, value] of Object.entries(data.contents.package ?? {})) {
        compare(scope, `${entry.id}/${key}`, source[key], value);
      }
    }
  }

  // --- stray files ------------------------------------------------------
  const translationsDir = path.join(outDir, 'translations');
  if (fs.existsSync(translationsDir)) {
    for (const file of walk(translationsDir)) {
      if (!referenced.has(path.resolve(file))) {
        warn(`${scope}: ${path.relative(outDir, file)} is shipped but not referenced by the manifest`);
      }
    }
  }

  for (const required of ['README.md', 'LICENSE', 'NOTICE']) {
    if (!fs.existsSync(path.join(outDir, required))) {
      (required === 'README.md' ? warn : error)(`${scope}: ${required} is missing from the package`);
    }
  }

  log.ok(`${scope}: ${localization.translations.length} bundle(s), ${stringCount} string(s)`);
}

/**
 * Compare structural markers between the English source and a translation.
 *
 * When the build ran with marker repair enabled, anything still mismatched here got
 * past the repair pass on purpose - it belongs to a file this repository maintains -
 * so it is an error. Without repair (`--no-filter`, or a CI build with no metadata)
 * inherited drift is expected and only warned about.
 */
function compare(scope, label, source, translated) {
  if (typeof source !== 'string') return;

  const mismatches = markerMismatches(source, translated);
  if (mismatches.length) {
    const detail = `${scope}: ${label} ${mismatches.join(' + ')} mismatch\n    en: ${source}\n    tr: ${translated}`;
    (repairWasEnabled ? error : warn)(detail);
  }

  const sourceNewlines = (source.match(/\n/g) ?? []).length;
  const translatedNewlines = (translated.match(/\n/g) ?? []).length;
  if (sourceNewlines !== translatedNewlines) {
    warn(`${scope}: ${label} newline count differs (${sourceNewlines} vs ${translatedNewlines})`);
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (warnings.length) {
  log.step(`Warnings (${warnings.length})`);
  for (const message of warnings) log.warn(`  ${message}`);
}

if (errors.length) {
  log.step(`Errors (${errors.length})`);
  for (const message of errors) log.err(`  ${message}`);
  process.exit(1);
}

log.step('Validation passed');
log.plain(`  ${summary.builds.length} pack(s) checked${metadata ? ' against the installed Kiro build' : ' (structural only)'}`);
