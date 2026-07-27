#!/usr/bin/env node
/**
 * Optional, unsupported: translates the strings a language pack cannot reach by
 * rewriting files inside the installed Kiro.
 *
 * Three sources of unreachable text, all confirmed by `npm run audit`:
 *   1. 76 of 183 localizable manifest strings in extensions/kiro.kiro-agent/package.json
 *      are inline English literals with no `%key%` indirection - the SPECS view title,
 *      the tree view welcome text and its buttons, most MCP commands.
 *   2. Workflow names and descriptions in dist/extension.js. Kiro declares `"l10n"` but
 *      never calls `vscode.l10n.t()`, so nothing localizes them.
 *   3. The React chat UI under packages, in each package's dist directory - "Let's build",
 *      the Autopilot tooltip, the changed-files bar.
 *
 * This edits the application directory. Consequences, in order of how likely they are to
 * bite: a Kiro update replaces the files and the translations are gone; a failed patch can
 * leave the editor in a broken state; AWS does not support a modified install. Originals
 * are backed up and `--restore` puts them back.
 *
 * Nothing here affects the .vsix. The language pack remains the supported path.
 *
 * Usage:
 *   npm run patch                  dry run - report what would change, write nothing
 *   npm run patch -- --apply       apply, after backing up every file it touches
 *   npm run patch -- --restore     put the backed up originals back
 *   npm run patch -- --status      show whether the install is currently patched
 *
 * Flags: --locale=zh-cn  --install-dir=<path>  --no-webview  --no-extension
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { p, readJson, writeJson, log, fail, parseArgs, loadConfig } from './lib/util.mjs';
import { findKiroInstall, readKiroInfo } from './lib/kiro-paths.mjs';

const BACKUP_DIR = '.kiro-language-pack-backup';
const RECORD_FILE = '.kiro-language-pack-patch.json';

/**
 * Manifest fields the host renders. Restricting the walk to these means an English
 * word in the translation map can never be substituted into an id, a `when` clause
 * or a command name.
 */
const LOCALIZABLE_FIELDS = new Set([
  'title', 'shortTitle', 'category', 'label', 'name', 'displayName', 'description',
  'markdownDescription', 'deprecationMessage', 'markdownDeprecationMessage', 'contents',
  'enumDescriptions', 'enumItemLabels', 'markdownEnumDescriptions'
]);

/** A literal short enough to be an identifier is not safe to replace inside bundles. */
const MIN_LITERAL_LENGTH = 6;

const { flags } = parseArgs();
const config = loadConfig();
const localeId = typeof flags.locale === 'string' ? flags.locale : config.locales.find((l) => l.enabled !== false)?.id;
if (!localeId) fail('No locale to patch. Pass --locale=<id>.');

const install = flags['install-dir']
  ? { installRoot: String(flags['install-dir']), appRoot: path.join(String(flags['install-dir']), 'resources', 'app') }
  : findKiroInstall();
if (!install || !fs.existsSync(path.join(install.appRoot, 'package.json'))) {
  fail(
    'Could not find a Kiro installation.\n' +
    '  Set KIRO_INSTALL_DIR or pass --install-dir=<the directory containing resources/app>.'
  );
}
const info = readKiroInfo(install.appRoot);
const extDir = path.join(install.appRoot, 'extensions', 'kiro.kiro-agent');
if (!fs.existsSync(extDir)) fail(`kiro.kiro-agent not found under ${install.appRoot}/extensions.`);

const backupRoot = path.join(extDir, BACKUP_DIR);
const recordPath = path.join(extDir, RECORD_FILE);

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const relative = (file) => path.relative(extDir, file).split(path.sep).join('/');

function readRecord() {
  return fs.existsSync(recordPath) ? readJson(recordPath, null) : null;
}

// --- status -----------------------------------------------------------------

if (flags.status) {
  const record = readRecord();
  log.step(`Kiro ${info.kiroVersion} at ${install.installRoot}`);
  if (!record) {
    log.plain('  not patched');
    process.exit(0);
  }
  log.plain(`  patched with ${record.locale} on ${record.patchedAt}`);
  log.plain(`  against Kiro ${record.kiroVersion}${record.kiroVersion === info.kiroVersion ? '' : `  <- install is now ${info.kiroVersion}, the patch was probably overwritten`}`);
  let intact = 0;
  let changed = 0;
  for (const [rel, entry] of Object.entries(record.files)) {
    const file = path.join(extDir, rel);
    if (!fs.existsSync(file)) { changed++; continue; }
    sha256(fs.readFileSync(file)) === entry.patched ? intact++ : changed++;
  }
  log.plain(`  ${intact} file(s) still carry the patch, ${changed} no longer do`);
  process.exit(0);
}

// --- restore ----------------------------------------------------------------

if (flags.restore) {
  const record = readRecord();
  if (!record) fail(`Nothing to restore: ${relative(recordPath)} not found.`);

  log.step(`Restoring ${Object.keys(record.files).length} file(s) in ${install.installRoot}`);
  let restored = 0;
  let skipped = 0;
  for (const [rel, entry] of Object.entries(record.files)) {
    const backup = path.join(backupRoot, rel);
    const target = path.join(extDir, rel);
    if (!fs.existsSync(backup)) {
      log.warn(`  ${rel}: backup missing, leaving as is`);
      skipped++;
      continue;
    }
    const current = fs.existsSync(target) ? sha256(fs.readFileSync(target)) : null;
    if (current && current !== entry.patched && current !== entry.original) {
      log.warn(`  ${rel}: changed since the patch (a Kiro update?), leaving as is`);
      skipped++;
      continue;
    }
    fs.copyFileSync(backup, target);
    restored++;
    log.info(`  restored ${rel}`);
  }
  fs.rmSync(recordPath, { force: true });
  fs.rmSync(backupRoot, { recursive: true, force: true });
  log.ok(`${restored} restored, ${skipped} skipped. Restart Kiro.`);
  process.exit(0);
}

// --- load the patch data ----------------------------------------------------

const patchFile = p('src', 'i18n', localeId, 'patch', 'kiro.kiroAgent.json');
if (!fs.existsSync(patchFile)) {
  fail(
    `No patch data for ${localeId} (${path.relative(p('.'), patchFile)}).\n` +
    '  Only the language pack itself covers this locale; there is nothing to patch.'
  );
}
const patch = readJson(patchFile);
const manifestMap = patch.manifest ?? {};
const extensionMap = flags.extension === false ? {} : (patch.extension ?? {});
const webviewMap = flags.webview === false ? {} : (patch.webview ?? {});

for (const [group, map] of [['extension', extensionMap], ['webview', webviewMap]]) {
  for (const english of Object.keys(map)) {
    if (english.length < MIN_LITERAL_LENGTH) {
      fail(`${group}."${english}" is only ${english.length} characters. Literal replacement in a bundle needs at least ${MIN_LITERAL_LENGTH} to be safe.`);
    }
  }
}

const apply = flags.apply === true;
/** @type {Record<string, {original: string, patched: string}>} */
const record = {};
/**
 * Every change, in full. Written to reports/ on a dry run and into the record on apply,
 * so "what did this actually do to my install" has a file-level answer rather than a
 * summary line.
 * @type {{file: string, kind: string, replacements: {english: string, translated: string, count: number}[]}[]}
 */
const plan = [];
let totalReplacements = 0;

function backup(file) {
  const dest = path.join(backupRoot, relative(file));
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

function commit(file, before, after, replacements) {
  totalReplacements += replacements;
  if (!apply) return;
  backup(file);
  fs.writeFileSync(file, after, 'utf8');
  record[relative(file)] = { original: sha256(Buffer.from(before, 'utf8')), patched: sha256(Buffer.from(after, 'utf8')) };
}

// --- 1. the extension manifest ----------------------------------------------

function patchManifest() {
  const file = path.join(extDir, 'package.json');
  const before = fs.readFileSync(file, 'utf8');
  const manifest = JSON.parse(before);
  let replaced = 0;
  const untouched = new Set(Object.keys(manifestMap));

  const visit = (node, fieldName) => {
    if (Array.isArray(node)) {
      if (LOCALIZABLE_FIELDS.has(fieldName)) {
        for (let i = 0; i < node.length; i++) {
          if (typeof node[i] === 'string') {
            const hit = translate(node[i]);
            if (hit !== null) { node[i] = hit; replaced++; }
          } else visit(node[i], fieldName);
        }
      } else {
        for (const child of node) visit(child, fieldName);
      }
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        if (!LOCALIZABLE_FIELDS.has(key)) continue;
        const hit = translate(value);
        if (hit !== null) { node[key] = hit; replaced++; }
      } else {
        visit(value, key);
      }
    }
  };

  /** @type {Map<string, {english: string, translated: string, count: number}>} */
  const applied = new Map();

  const translate = (value) => {
    // `%key%` values are resolved from package.nls.json, which the language pack
    // already overrides. Touching them here would fight the supported path.
    if (/^%.+%$/.test(value)) return null;
    if (!(value in manifestMap)) return null;
    untouched.delete(value);
    const translated = manifestMap[value];
    if (translated === value) return null;
    const seen = applied.get(value);
    if (seen) seen.count++;
    else applied.set(value, { english: value, translated, count: 1 });
    return translated;
  };

  visit(manifest, '');

  log.step(`extensions/kiro.kiro-agent/package.json`);
  log.plain(`  ${replaced} field(s) translated out of ${Object.keys(manifestMap).length} mapped string(s)`);
  if (untouched.size) {
    log.warn(`  ${untouched.size} mapped string(s) not found in this build - Kiro may have changed them:`);
    for (const s of [...untouched].slice(0, 8)) log.plain(`    ${JSON.stringify(s.slice(0, 70))}`);
  }
  if (!replaced) return;

  plan.push({ file: relative(file), kind: 'manifest', replacements: [...applied.values()] });
  const after = JSON.stringify(manifest, null, 2) + '\n';
  commit(file, before, after, replaced);
}

// --- 2 and 3. literals inside bundles ---------------------------------------

function patchBundle(file, map, label) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let replaced = 0;
  const perString = [];
  const replacements = [];

  // Longest first: "files changed" must be consumed before "file changed", or the
  // shorter entry would match inside the longer one.
  for (const english of Object.keys(map).sort((a, b) => b.length - a.length)) {
    const translated = map[english];
    if (translated === english) continue;
    const parts = after.split(english);
    const n = parts.length - 1;
    if (n === 0) continue;
    after = parts.join(translated);
    replaced += n;
    perString.push(`${n}x ${JSON.stringify(english.slice(0, 60))}`);
    replacements.push({ english, translated, count: n });
  }

  if (!replaced) return { replaced: 0, perString };
  plan.push({ file: relative(file), kind: label, replacements });
  commit(file, before, after, replaced);
  return { replaced, perString, label };
}

function* bundleFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === BACKUP_DIR) continue;
      yield* bundleFiles(full);
    } else if (entry.name.endsWith('.js')) {
      yield full;
    }
  }
}

function patchExtensionJs() {
  if (!Object.keys(extensionMap).length) return;
  const file = path.join(extDir, 'dist', 'extension.js');
  if (!fs.existsSync(file)) {
    log.warn('dist/extension.js not found, skipping runtime strings.');
    return;
  }
  log.step('dist/extension.js');
  const result = patchBundle(file, extensionMap, 'extension');
  log.plain(`  ${result.replaced} literal(s) replaced`);
  for (const line of result.perString) log.plain(`    ${line}`);
  const missing = Object.keys(extensionMap).length - result.perString.length;
  if (missing > 0) log.warn(`  ${missing} mapped literal(s) not present - Kiro may have reworded them`);
}

function patchWebviews() {
  if (!Object.keys(webviewMap).length) return;
  log.step('packages/*/dist - React chat UI');
  let files = 0;
  let replaced = 0;
  const seen = new Set();
  for (const file of bundleFiles(path.join(extDir, 'packages'))) {
    if (!file.includes(`${path.sep}dist${path.sep}`)) continue;
    const result = patchBundle(file, webviewMap, 'webview');
    if (!result.replaced) continue;
    files++;
    replaced += result.replaced;
    log.info(`  ${relative(file)}`);
    for (const line of result.perString) { log.plain(`      ${line}`); seen.add(line.slice(line.indexOf(' ') + 1)); }
  }
  log.plain(`  ${replaced} literal(s) across ${files} file(s)`);
  const missing = Object.keys(webviewMap).length - seen.size;
  if (missing > 0) log.warn(`  ${missing} mapped literal(s) not found in any bundle - Kiro may have reworded them`);
}

// --- run --------------------------------------------------------------------

log.step(`Patching Kiro ${info.kiroVersion} (Code OSS ${info.vscodeVersion}) at ${install.installRoot}`);
log.plain(`  locale: ${localeId}`);
log.plain(`  mode:   ${apply ? 'APPLY - files will be rewritten' : 'dry run - nothing will be written'}`);

const existing = readRecord();
if (existing && apply) {
  fail(
    `Already patched with ${existing.locale} on ${existing.patchedAt}.\n` +
    '  Run `npm run patch -- --restore` first, then patch again.'
  );
}

patchManifest();
patchExtensionJs();
patchWebviews();

log.step('Summary');
log.plain(`  ${totalReplacements} replacement(s) in ${plan.length} file(s). Every file it would touch:`);
for (const entry of plan) {
  log.plain(`    ${entry.file}  (${entry.kind}, ${entry.replacements.reduce((n, r) => n + r.count, 0)} replacement(s))`);
}
log.plain('  Nothing outside this list is read, written, moved or deleted.');

if (!apply) {
  const report = p('reports', `patch-plan-${localeId}.json`);
  writeJson(report, {
    generatedAt: new Date().toISOString(),
    locale: localeId,
    installRoot: install.installRoot,
    kiroVersion: info.kiroVersion,
    extensionDir: path.relative(install.installRoot, extDir),
    totalReplacements,
    files: plan
  });
  log.plain(`\n  Full before/after list: ${path.relative(p('.'), report)}`);
  log.plain('  Nothing was written to the install. To apply:');
  log.plain('    npm run patch -- --apply');
  log.plain('  Read the header of scripts/patch-install.mjs first - this modifies the application directory.');
  process.exit(0);
}

writeJson(recordPath, {
  locale: localeId,
  packVersion: config.version,
  kiroVersion: info.kiroVersion,
  vscodeVersion: info.vscodeVersion,
  patchedAt: new Date().toISOString(),
  backupDir: BACKUP_DIR,
  totalReplacements,
  files: record,
  changes: plan
});

// The host caches the scan of built-in extensions; editing package.json changes its
// mtime, which normally invalidates that, but dropping the cache is cheap insurance.
const cacheDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'Kiro', 'CachedExtensions')
  : null;
if (cacheDir && fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  log.info('cleared the built-in extension scan cache');
}

log.ok(`Patched. Originals are in ${relative(backupRoot)}/, the record in ${relative(recordPath)}.`);
log.plain('  Restart Kiro to see the change. `npm run patch -- --restore` undoes it.');
