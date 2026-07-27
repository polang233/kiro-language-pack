import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson } from './util.mjs';

/**
 * Kiro is a Code OSS fork, so the desktop layout matches VS Code:
 *   <install>/resources/app/package.json
 *   <install>/resources/app/product.json
 *   <install>/resources/app/out/            core NLS metadata
 *   <install>/resources/app/extensions/     built-in extensions
 * On macOS <install> is Kiro.app/Contents.
 */
function candidateRoots() {
  const home = os.homedir();
  const env = process.env;
  const roots = [];

  if (env.KIRO_INSTALL_DIR) roots.push(env.KIRO_INSTALL_DIR);

  if (process.platform === 'win32') {
    const bases = [
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'),
      env.ProgramFiles,
      env['ProgramFiles(x86)'],
      path.join(home, 'AppData', 'Local', 'Programs')
    ].filter(Boolean);
    for (const base of bases) {
      roots.push(path.join(base, 'Kiro'), path.join(base, 'kiro'), path.join(base, 'Kiro IDE'));
    }
    // Portable or custom installs are common on Windows; probe fixed drives.
    for (const drive of ['C', 'D', 'E', 'F', 'G']) {
      roots.push(`${drive}:\\Kiro`, `${drive}:\\Program Files\\Kiro`, `${drive}:\\AI\\Kiro`);
    }
  } else if (process.platform === 'darwin') {
    roots.push(
      '/Applications/Kiro.app/Contents',
      path.join(home, 'Applications', 'Kiro.app', 'Contents')
    );
  } else {
    roots.push(
      '/usr/share/kiro',
      '/opt/Kiro',
      '/opt/kiro',
      '/usr/lib/kiro',
      path.join(home, '.local', 'share', 'kiro')
    );
  }
  return roots;
}

export function findKiroInstall() {
  for (const root of candidateRoots()) {
    const appRoot = path.join(root, 'resources', 'app');
    if (fs.existsSync(path.join(appRoot, 'package.json'))) {
      return { installRoot: root, appRoot };
    }
  }
  return null;
}

export function readKiroInfo(appRoot) {
  const pkg = readJson(path.join(appRoot, 'package.json'), {});
  const product = readJson(path.join(appRoot, 'product.json'), {});
  return {
    appRoot,
    // Kiro's own release number, e.g. 1.0.228
    kiroVersion: product.version ?? pkg.version ?? null,
    // Underlying Code OSS version - this is what engines.vscode must satisfy
    vscodeVersion: product.vsCodeVersion ?? pkg.version ?? null,
    commit: product.commit ?? null,
    quality: product.quality ?? null,
    productName: product.nameLong ?? product.nameShort ?? pkg.name ?? null,
    // Kiro defaults to the Open VSX registry
    galleryUrl: product.extensionsGallery?.serviceUrl ?? null,
    dataFolderName: product.dataFolderName ?? null
  };
}

/** Where installed extensions live, the counterpart of ~/.vscode/extensions. */
export function extensionsDir(dataFolderName) {
  return path.join(os.homedir(), dataFolderName || '.kiro', 'extensions');
}

/** argv.json lives at ~/<dataFolderName>/argv.json and holds the display language. */
export function argvJsonPath(dataFolderName) {
  return path.join(os.homedir(), dataFolderName || '.kiro', 'argv.json');
}

/**
 * Locate the core NLS metadata. Two layouts exist across Code OSS versions:
 *   - current: out/nls.keys.json  [[moduleId, [key, ...]], ...]
 *              out/nls.messages.json  [englishMessage, ...] in the same order
 *   - legacy:  out/nls.metadata.json  { keys: {...}, messages: {...} }
 */
export function findCoreNlsMetadata(appRoot) {
  const out = path.join(appRoot, 'out');
  const metadata = path.join(out, 'nls.metadata.json');
  const keys = path.join(out, 'nls.keys.json');
  const messages = path.join(out, 'nls.messages.json');

  if (fs.existsSync(metadata)) return { layout: 'metadata', metadata };
  if (fs.existsSync(keys)) {
    return { layout: 'keys', keys, messages: fs.existsSync(messages) ? messages : null };
  }
  return { layout: 'none' };
}

/**
 * Enumerate built-in extensions. The returned `id` is `publisher.name` from the
 * manifest, which is what contributes.localizations expects - note that it can
 * differ from the folder name (kiro.kiro-agent on disk, kiro.kiroAgent as id).
 */
export function listBuiltinExtensions(appRoot) {
  const dir = path.join(appRoot, 'extensions');
  if (!fs.existsSync(dir)) return [];

  const result = [];
  for (const name of fs.readdirSync(dir)) {
    const extDir = path.join(dir, name);
    const manifest = path.join(extDir, 'package.json');
    if (!fs.statSync(extDir).isDirectory() || !fs.existsSync(manifest)) continue;

    const pkg = readJson(manifest, null);
    if (!pkg?.name) continue;

    result.push({
      id: `${pkg.publisher || 'vscode'}.${pkg.name}`,
      folder: name,
      dir: extDir,
      manifest,
      version: pkg.version ?? null,
      displayName: pkg.displayName ?? pkg.name,
      hasNls: fs.existsSync(path.join(extDir, 'package.nls.json'))
    });
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}
