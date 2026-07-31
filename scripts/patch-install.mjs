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
 *   npm run patch                  pick the install and the language, then report what
 *                                  would change. Writes nothing.
 *   npm run patch -- --apply       the same, but write, after backing up every file
 *   npm run patch -- --list        detected installs and patchable languages
 *   npm run patch -- --status      is this install patched, and is the patch still intact
 *   npm run patch -- --restore     put the backed up originals back
 *
 * Choosing the target. Both are asked interactively when they are ambiguous, so a
 * terminal never needs the flags; a script always should:
 *   --locale=<id>                  the language to patch
 *   --install-dir=<path>           the directory that contains resources/app
 *                                  (KIRO_INSTALL_DIR does the same)
 *
 * What --apply does, in order, and how to skip each step:
 *   1. rewrite the unreachable strings in the install     always
 *   2. install dist/<pack>-<version>.vsix into that Kiro  --no-extension, --vsix=<path>
 *   3. uninstall language packs that conflict with it     --keep-official
 *   4. set `locale` in argv.json to the patched language   --no-set-locale
 *
 * Also: --no-webview skips the chat UI bundles, --no-extension-strings skips the ones in
 * dist/extension.js. --yes never asks: confirmations take their default, and an ambiguous
 * target becomes an error instead of a question. A shell without a TTY behaves the same.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { p, readJson, writeJson, log, fail, parseArgs, loadConfig } from './lib/util.mjs';
import { findKiroInstalls, readKiroInfo, extensionsDir, argvJsonPath } from './lib/kiro-paths.mjs';
import { argvLocale } from './lib/argv.mjs';

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

/** Prompting needs a terminal on both ends, and --yes opts out of it. */
const interactive = flags.yes !== true && Boolean(process.stdin.isTTY && process.stdout.isTTY);

const patchDataFile = (id) => p('src', 'i18n', id, 'patch', 'kiro.kiroAgent.json');

/** Locales that are enabled in config.json *and* have patch data checked in. */
const patchableLocales = config.locales
  .filter((l) => l.enabled !== false)
  .filter((l) => fs.existsSync(patchDataFile(l.id)));

const describeLocale = (l) => `${l.id.padEnd(6)} ${l.localizedLanguageName} (${l.languageName})`;

async function prompt(question, fallback) {
  if (!interactive) return fallback;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer === '' ? fallback : answer;
  } finally {
    rl.close();
  }
}

const confirm = async (question, fallback) =>
  /^y(es)?$/i.test(String(await prompt(`${question} [${fallback ? 'Y/n' : 'y/N'}]: `, fallback ? 'y' : 'n')));

/** A numbered menu. Returns the chosen item, or null when the answer is unusable. */
async function choose(items, render, { title, hint }) {
  log.step(title);
  items.forEach((item, i) => log.plain(`  ${String(i + 1).padStart(2)}. ${render(item)}`));
  if (hint) log.plain(`     ${hint}`);
  const answer = await prompt(`  Choose 1-${items.length} [1]: `, '1');
  const index = Number.parseInt(String(answer), 10);
  return Number.isInteger(index) && index >= 1 && index <= items.length ? items[index - 1] : null;
}

const asInstall = (root) => {
  const installRoot = path.resolve(String(root));
  return { installRoot, appRoot: path.join(installRoot, 'resources', 'app') };
};
const looksLikeKiro = (candidate) => fs.existsSync(path.join(candidate.appRoot, 'package.json'));

const detected = findKiroInstalls();

// --- --list -----------------------------------------------------------------

if (flags.list) {
  log.step('Kiro installations found');
  if (!detected.length) {
    log.plain('  none - pass --install-dir=<path> or set KIRO_INSTALL_DIR');
  }
  for (const candidate of detected) {
    const found = readKiroInfo(candidate.appRoot);
    const record = readJson(
      path.join(candidate.appRoot, 'extensions', 'kiro.kiro-agent', RECORD_FILE),
      null
    );
    log.plain(`  ${candidate.installRoot}`);
    log.plain(`    Kiro ${found.kiroVersion} (Code OSS ${found.vscodeVersion})`);
    log.plain(`    ${record ? `patched with ${record.locale} on ${record.patchedAt}` : 'not patched'}`);
  }

  log.step('Languages this patch can install');
  if (!patchableLocales.length) log.plain('  none');
  for (const locale of patchableLocales) log.plain(`  ${describeLocale(locale)}`);
  const waiting = config.locales.filter((l) => !patchableLocales.includes(l));
  if (waiting.length) {
    log.plain(`\n  Declared in config.json but not patchable yet: ${waiting.map((l) => l.id).join(', ')}`);
    log.plain('  A locale becomes patchable once src/i18n/<id>/patch/kiro.kiroAgent.json exists - see CONTRIBUTING.md.');
  }
  log.plain('\n  Then: npm run patch -- --install-dir=<path> --locale=<id> [--apply]');
  process.exit(0);
}

// --- which install ----------------------------------------------------------

const install = await (async () => {
  if (flags['install-dir']) {
    const chosen = asInstall(flags['install-dir']);
    if (!looksLikeKiro(chosen)) {
      fail(
        `--install-dir=${flags['install-dir']} does not look like a Kiro installation.\n` +
        `  Expected to find ${path.join(chosen.appRoot, 'package.json')}.\n` +
        '  On macOS the directory is Kiro.app/Contents. `npm run patch -- --list` shows what was detected.'
      );
    }
    return chosen;
  }
  if (detected.length === 1) return detected[0];
  if (!detected.length) {
    fail(
      'Could not find a Kiro installation.\n' +
      '  Pass --install-dir=<the directory containing resources/app> or set KIRO_INSTALL_DIR.\n' +
      '  On macOS that directory is Kiro.app/Contents.'
    );
  }
  if (!interactive) {
    log.err('More than one Kiro installation was found, so the target has to be named:');
    for (const candidate of detected) {
      log.plain(`    --install-dir=${candidate.installRoot}    (Kiro ${readKiroInfo(candidate.appRoot).kiroVersion})`);
    }
    process.exit(1);
  }
  const picked = await choose(
    detected,
    (candidate) => `${candidate.installRoot}  (Kiro ${readKiroInfo(candidate.appRoot).kiroVersion})`,
    {
      title: 'Which Kiro installation?',
      hint: 'Anything else cancels. --install-dir=<path> skips this question.'
    }
  );
  if (!picked) fail('Cancelled. Nothing was written.');
  return picked;
})();

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

// --- which language ---------------------------------------------------------

// Asked after --status and --restore, which do not need it: the record on disk already
// says which language was applied.
const locale = await (async () => {
  if (!patchableLocales.length) {
    fail(
      'No locale has patch data.\n' +
      '  Expected src/i18n/<id>/patch/kiro.kiroAgent.json for a locale enabled in config.json.'
    );
  }
  if (typeof flags.locale === 'string') {
    const named = patchableLocales.find((l) => l.id === flags.locale);
    if (named) return named;
    const declared = config.locales.find((l) => l.id === flags.locale);
    fail(
      declared
        ? `${flags.locale} has no patch data (${path.relative(p('.'), patchDataFile(flags.locale))} is missing).\n` +
          `  The language pack itself may still cover it. Patchable: ${patchableLocales.map((l) => l.id).join(', ')}.`
        : `Unknown locale "${flags.locale}". Patchable: ${patchableLocales.map((l) => l.id).join(', ')}.`
    );
  }
  if (patchableLocales.length === 1) return patchableLocales[0];
  if (!interactive) {
    log.err('More than one language can be patched, so it has to be named:');
    for (const l of patchableLocales) log.plain(`    --locale=${l.id}    ${l.localizedLanguageName}`);
    process.exit(1);
  }
  const picked = await choose(patchableLocales, describeLocale, {
    title: 'Which language should this install be patched to?',
    hint: 'Anything else cancels. --locale=<id> skips this question.'
  });
  if (!picked) fail('Cancelled. Nothing was written.');
  return picked;
})();

const localeId = locale.id;

// --- load the patch data ----------------------------------------------------

const patchFile = patchDataFile(localeId);
const patch = readJson(patchFile);

/**
 * `--no-x` and `--x=false` are the same request. parseArgs stores them under different
 * keys, so both are accepted - a documented flag that silently does nothing is worse
 * than a redundant check.
 */
const off = (name) => flags[`no-${name}`] === true || flags[name] === false;

const manifestMap = patch.manifest ?? {};
const extensionMap = off('extension-strings') ? {} : (patch.extension ?? {});
const webviewMap = off('webview') ? {} : (patch.webview ?? {});

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
log.plain(`  language: ${localeId}  ${locale.localizedLanguageName}`);
log.plain(`  mode:     ${apply ? 'APPLY - files will be rewritten' : 'dry run - nothing will be written'}`);
const afterSteps = [
  off('extension') ? null : 'install the language pack .vsix',
  flags['keep-official'] ? null : 'uninstall conflicting language packs',
  off('set-locale') ? null : `set argv.json locale to ${localeId}`
].filter(Boolean);
log.plain(`  ${apply ? 'then:      ' : 'would then: '}${afterSteps.join(', ') || 'nothing else'}`);

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
  log.plain(`    npm run patch -- --locale=${localeId} --install-dir="${install.installRoot}" --apply`);
  log.plain('  Which then also installs dist/*.vsix, uninstalls conflicting language packs');
  log.plain(`  and sets the display language to ${localeId}. Opt out per step with`);
  log.plain('  --no-extension, --keep-official, --no-set-locale.');
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

/**
 * The rewrite above only covers what a language pack cannot reach. Three steps finish
 * the job on this install, each skippable, all of them outside the patch record because
 * none of them touch the application directory:
 *   installLanguagePackExtension  installs the .vsix that covers everything else
 *   removeConflictingPacks        uninstalls packs that also claim the `vscode` id
 *   setDisplayLanguage            points argv.json at the language just patched
 */
function findKiroCli(installRoot) {
  const names = process.platform === 'win32'
    ? ['kiro.cmd', 'kiro.exe', 'Kiro.exe']
    : ['kiro', 'Kiro'];
  for (const name of names) {
    const candidate = path.join(installRoot, 'bin', name);
    if (fs.existsSync(candidate)) return candidate;
  }
  // macOS app bundle: Contents/Resources/app/bin/... or Contents/MacOS
  const mac = path.join(installRoot, 'MacOS', 'Kiro');
  if (fs.existsSync(mac)) return mac;
  return null;
}

/** Run the Kiro CLI. Never fatal: the install rewrite has already succeeded. */
function runCli(cli, args, label) {
  const result = spawnSync(cli, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32' && cli.endsWith('.cmd')
  });
  if (result.error) {
    log.warn(`${label} failed: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    log.warn(`${label} exited with code ${result.status}`);
    return false;
  }
  return true;
}

function installLanguagePackExtension() {
  if (off('extension')) {
    log.info('skipped the language-pack install (--no-extension)');
    return;
  }

  const defaultVsix = p('dist', `${config.namePrefix}-${config.version}.vsix`);
  const vsixPath = typeof flags.vsix === 'string'
    ? (path.isAbsolute(flags.vsix) ? flags.vsix : p(flags.vsix))
    : defaultVsix;

  if (!fs.existsSync(vsixPath)) {
    log.warn(
      `language pack .vsix not found at ${path.relative(p('.'), vsixPath)}.\n` +
      '  Patch is applied. Run `npm run package` then re-run with --vsix=... or install the .vsix manually.\n' +
      '  Or: npm run package && npm run patch -- --apply  (after restore if already patched)'
    );
    return;
  }

  const cli = findKiroCli(install.installRoot);
  if (!cli) {
    log.warn(
      `could not find kiro CLI under ${install.installRoot}/bin.\n` +
      `  Install manually: Command Palette → Extensions: Install from VSIX… → ${path.relative(p('.'), vsixPath)}`
    );
    return;
  }

  log.step(`Installing language pack: ${path.relative(p('.'), vsixPath)}`);
  if (runCli(cli, ['--install-extension', vsixPath, '--force'], 'install-extension')) {
    log.ok('language pack extension installed (or updated)');
  }
}

/**
 * Installed extensions that also provide the workbench translations for the language
 * being patched - in practice the official VS Code pack, ms-ceintl.vscode-language-pack-*.
 *
 * `languagepacks.json` maps one translation id to exactly one file, assigned by whichever
 * extension is scanned last, so two claimants produce a UI that is translated differently
 * after each restart. Detection matches on the declaration rather than on the publisher id
 * so a repackaged or renamed pack is caught too.
 */
function conflictingPacks() {
  const dir = extensionsDir(info.dataFolderName);
  if (!fs.existsSync(dir)) return [];

  const ours = `${config.publisher}.`.toLowerCase();
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = readJson(path.join(dir, entry.name, 'package.json'), null);
    const localizations = manifest?.contributes?.localizations;
    if (!Array.isArray(localizations)) continue;

    const id = `${manifest.publisher ?? ''}.${manifest.name ?? ''}`;
    if (id.toLowerCase().startsWith(ours)) continue;

    const claims = localizations.some((l) =>
      l.languageId === localeId && (l.translations ?? []).some((tr) => tr.id === 'vscode'));
    if (claims) found.push({ id, dir: path.join(dir, entry.name) });
  }
  return found;
}

async function removeConflictingPacks() {
  if (flags['keep-official']) {
    log.info('left other language packs alone (--keep-official)');
    return;
  }
  const conflicts = conflictingPacks();
  if (!conflicts.length) return;

  log.step('Conflicting language packs');
  for (const pack of conflicts) log.plain(`  ${pack.id}`);
  log.plain(`  These also provide the workbench translations for ${localeId}. Only one can win, and`);
  log.plain('  which one is not stable across restarts, so this pack needs them gone.');

  if (!(await confirm('  Uninstall them?', true))) {
    log.warn('  left in place - expect a partly translated UI until one of them is removed');
    return;
  }

  const cli = findKiroCli(install.installRoot);
  if (!cli) {
    log.warn(
      `  could not find the kiro CLI under ${install.installRoot}/bin.\n` +
      `  Uninstall manually: Extensions view -> search @installed ${conflicts[0].id} -> Uninstall.`
    );
    return;
  }
  for (const pack of conflicts) {
    if (runCli(cli, ['--uninstall-extension', pack.id], `uninstall-extension ${pack.id}`)) {
      log.ok(`uninstalled ${pack.id}`);
    }
  }
}

/**
 * The display language is a launch argument, kept in `locale` in argv.json. Without this
 * the patched strings are in place but Kiro still starts in English, which reads as a
 * patch that did nothing. Only that one field is touched, and the write itself is the
 * implementation that ships in the extension - see scripts/lib/argv.mjs.
 */
async function setDisplayLanguage() {
  if (off('set-locale')) {
    log.info('left the display language alone (--no-set-locale)');
    return;
  }
  const file = argvJsonPath(info.dataFolderName);
  const { readLocale, writeLocale } = argvLocale();
  const current = readLocale(file);
  if (current === localeId) {
    log.info(`display language is already ${localeId} in ${file}`);
    return;
  }

  log.step('Display language');
  log.plain(`  ${file}`);
  log.plain(`  locale: ${current ?? 'not set (English)'} -> ${localeId}`);
  if (!(await confirm(`  Set the display language to ${locale.localizedLanguageName}?`, true))) {
    log.warn(`  unchanged - run "Language Pack: Select Display Language" in Kiro, or set locale to "${localeId}" yourself`);
    return;
  }
  try {
    writeLocale(file, localeId);
    log.ok(`display language set to ${localeId}`);
  } catch (err) {
    log.warn(`could not write ${file}: ${err.message}`);
    log.plain('  Set it from Kiro instead: Command Palette -> Language Pack: Select Display Language.');
  }
}

installLanguagePackExtension();
await removeConflictingPacks();
await setDisplayLanguage();

log.step('Done');
log.plain('  Restart Kiro - the display language is a launch argument, so reloading the window is not enough.');
log.plain('  `npm run patch -- --restore` undoes the rewrite of the install (not the extension, not argv.json).');
