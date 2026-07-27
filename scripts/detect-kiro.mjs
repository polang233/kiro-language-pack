#!/usr/bin/env node
/**
 * Reports everything the build needs to know about the locally installed Kiro:
 *   - Kiro release and the underlying Code OSS version (drives engines.vscode)
 *   - NLS metadata layout (decides whether core UI can be localized at all)
 *   - built-in extension ids (the values used in contributes.localizations)
 *   - argv.json location (where the display language is stored)
 *
 * Usage: npm run detect [-- --json]
 *        KIRO_INSTALL_DIR=<path> npm run detect
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  findKiroInstall, readKiroInfo, findCoreNlsMetadata,
  listBuiltinExtensions, argvJsonPath, extensionsDir
} from './lib/kiro-paths.mjs';
import { log, fail, parseArgs, readJson } from './lib/util.mjs';

const { flags } = parseArgs();

const found = findKiroInstall();
if (!found) {
  fail(
    'Kiro installation not found.\n' +
    '  Set KIRO_INSTALL_DIR to the install root and retry, for example:\n' +
    '    Windows  $env:KIRO_INSTALL_DIR = "C:\\Users\\<you>\\AppData\\Local\\Programs\\Kiro"\n' +
    '    macOS    export KIRO_INSTALL_DIR="/Applications/Kiro.app/Contents"\n' +
    '    Linux    export KIRO_INSTALL_DIR="/usr/share/kiro"\n' +
    '  The directory must contain resources/app/package.json.'
  );
}

const info = readKiroInfo(found.appRoot);
const nls = findCoreNlsMetadata(found.appRoot);
const builtins = listBuiltinExtensions(found.appRoot);
const argv = argvJsonPath(info.dataFolderName);
const extDir = extensionsDir(info.dataFolderName);

const argvContents = fs.existsSync(argv) ? readJson(argv, {}) : null;

const installedPacks = fs.existsSync(extDir)
  ? fs.readdirSync(extDir).filter((n) => /language-pack/i.test(n))
  : [];

const report = {
  installRoot: found.installRoot,
  appRoot: found.appRoot,
  productName: info.productName,
  kiroVersion: info.kiroVersion,
  vscodeVersion: info.vscodeVersion,
  commit: info.commit,
  quality: info.quality,
  galleryUrl: info.galleryUrl,
  nlsLayout: nls.layout,
  argvJson: argv,
  argvLocale: argvContents?.locale ?? null,
  extensionsDir: extDir,
  installedLanguagePacks: installedPacks,
  builtinExtensionCount: builtins.length,
  builtinExtensionsWithNls: builtins.filter((e) => e.hasNls).map((e) => e.id)
};

if (flags.json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

log.step('Kiro installation');
log.plain(`  install root       ${report.installRoot}`);
log.plain(`  app root           ${report.appRoot}`);
log.plain(`  product            ${report.productName ?? '(unknown)'}`);
log.plain(`  Kiro version       ${report.kiroVersion ?? '(unknown)'}`);
log.plain(`  Code OSS version   ${report.vscodeVersion ?? '(unknown)'}`);
log.plain(`  commit             ${report.commit ?? '(unknown)'}`);
log.plain(`  quality            ${report.quality ?? '(unknown)'}`);
log.plain(`  extension registry ${report.galleryUrl ?? '(not configured)'}`);

log.step('Localization support');
if (nls.layout === 'keys') {
  log.ok('out/nls.keys.json found (current layout) - language packs are supported.');
} else if (nls.layout === 'metadata') {
  log.ok('out/nls.metadata.json found (legacy layout) - language packs are supported.');
} else {
  log.warn(
    'No NLS metadata found under out/. This build may have stripped it, in which\n' +
    '  case the core workbench cannot be localized. Built-in extension strings\n' +
    '  coming from package.nls.json usually still work.'
  );
}
log.plain(`  argv.json          ${report.argvJson}${fs.existsSync(argv) ? '' : '  (created on first language switch)'}`);
log.plain(`  argv.json locale   ${report.argvLocale ?? '(not set - defaults to en)'}`);
log.plain(`  extensions dir     ${report.extensionsDir}`);
log.plain(`  language packs     ${installedPacks.length ? installedPacks.join(', ') : '(none installed)'}`);

log.step(`Built-in extensions (${builtins.length} total, ${report.builtinExtensionsWithNls.length} with package.nls.json)`);
for (const e of builtins) {
  log.plain(`  ${e.hasNls ? '[nls]' : '     '} ${e.id.padEnd(44)} ${e.folder}`);
}

log.step('Next steps');
log.plain(`  1. Set engines.vscode in config.json to a bound not above ${report.vscodeVersion ?? 'x.y.z'}`);
log.plain('  2. npm run extract   # snapshot the localizable surface of this build');
log.plain('  3. npm run audit     # see how much of the Kiro UI a language pack can reach');
log.plain('  4. npm run sync && npm run build && npm run package');
log.plain(`\n  out directory: ${path.join(found.appRoot, 'out')}`);
