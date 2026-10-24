#!/usr/bin/env node
/** Run the real patch entry point against disposable installs and a Node-backed CLI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { patchStatePaths, sha256 } from './lib/patch-state.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const sources = [
  'scripts/patch-install.mjs', 'scripts/lib/patch-state.mjs', 'scripts/lib/util.mjs',
  'scripts/lib/kiro-paths.mjs', 'scripts/lib/argv.mjs', 'src/extension/main.cjs'
];
const version = '1.0.0';
const commit = 'fixture-build-one';
const dataFolderName = '.kiro-fixture';

function put(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function contents(root) {
  const result = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else result[path.relative(root, file)] = sha256(fs.readFileSync(file));
    }
  };
  walk(root);
  return result;
}

const fakeCli = String.raw`
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const installRoot = path.resolve(__dirname, '../../..');
const home = path.join(os.homedir(), '.kiro-fixture');
const extensions = path.join(home, 'extensions');
const args = process.argv.slice(2);
if (process.env.ELECTRON_RUN_AS_NODE !== '1') process.exit(90);
fs.mkdirSync(home, { recursive: true });
fs.appendFileSync(path.join(home, 'cli.jsonl'), JSON.stringify(args) + String.fromCharCode(10));
if (args[0] === '--install-extension') {
  if (fs.existsSync(path.join(installRoot, 'fail-install'))) process.exit(7);
  if (!fs.existsSync(args[1])) process.exit(8);
  const dir = path.join(extensions, 'polang233.kiro-language-pack-1.0.0');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ publisher: 'polang233', name: 'kiro-language-pack' }));
} else if (args[0] === '--uninstall-extension') {
  for (const name of fs.readdirSync(extensions)) {
    const dir = path.join(extensions, name);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (manifest.publisher + '.' + manifest.name === args[1]) fs.rmSync(dir, { recursive: true, force: true });
  }
} else process.exit(9);
`;

function makeFixture(root, runtime, name) {
  const base = path.join(root, name);
  const project = path.join(base, 'package');
  const home = path.join(base, 'user');
  const installRoot = path.join(base, 'Kiro IDE & fixture = one');
  const appRoot = path.join(installRoot, 'resources', 'app');
  const extRoot = path.join(appRoot, 'extensions', 'kiro.kiro-agent');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  for (const rel of sources) {
    const dest = path.join(project, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(repo, rel), dest);
  }
  put(path.join(project, 'package.json'), { type: 'module' });
  const configFile = path.join(project, 'config.json');
  put(configFile, {
    publisher: 'polang233', namePrefix: 'kiro-language-pack', version: '1.0.0-fixture',
    engines: {}, modes: {}, upstream: {}, build: {}, target: {},
    locales: [
      { id: 'zh-cn', languageName: 'Chinese Simplified', localizedLanguageName: '简体', enabled: true },
      { id: 'zh-tw', languageName: 'Chinese Traditional', localizedLanguageName: '繁體', enabled: true }
    ]
  });
  const dictionaries = {
    'zh-cn': { manifest: { 'New Session': '新会话' }, extension: { 'Launch workflow': '启动工作流' }, webview: { 'Welcome to Kiro': '欢迎使用 Kiro' } },
    'zh-tw': { manifest: { 'New Session': '新對話' }, extension: { 'Launch workflow': '啟動工作流程' }, webview: { 'Welcome to Kiro': '歡迎使用 Kiro' } }
  };
  const dictFile = (locale) => path.join(project, 'src', 'i18n', locale, 'patch', 'kiro.kiroAgent.json');
  for (const [locale, dict] of Object.entries(dictionaries)) put(dictFile(locale), dict);
  const vsix = path.join(project, 'assets', 'language pack & fixture = one.vsix');
  put(vsix, 'fixture VSIX consumed only by the fake CLI');
  const argvFile = path.join(home, dataFolderName, 'argv.json');
  put(argvFile, '{\n  // keep this comment\n  "fixture": true,\n  "locale": "en"\n}\n');
  const conflict = path.join(home, dataFolderName, 'extensions', 'other.language-pack-1.0.0');
  put(path.join(conflict, 'package.json'), {
    publisher: 'other', name: 'language-pack',
    contributes: { localizations: ['zh-cn', 'zh-tw'].map((languageId) => ({ languageId, translations: [{ id: 'vscode' }] })) }
  });
  const writeBuild = (buildVersion = version, buildCommit = commit, suffix = 'original') => {
    put(path.join(appRoot, 'package.json'), { name: 'kiro', version: '1.100.0' });
    put(path.join(appRoot, 'product.json'), { version: buildVersion, commit: buildCommit, dataFolderName });
    put(path.join(extRoot, 'package.json'), { name: 'kiro-agent', publisher: 'kiro', title: 'New Session', build: suffix });
    put(path.join(extRoot, 'dist', 'extension.js'), `const workflow = "Launch workflow"; // ${suffix}\n`);
    put(path.join(extRoot, 'packages', 'chat', 'dist', 'main.js'), `const welcome = "Welcome to Kiro"; // ${suffix}\n`);
  };
  writeBuild();
  put(path.join(appRoot, 'out', 'cli.js'), fakeCli);
  const executable = path.join(installRoot, process.platform === 'win32' ? 'Kiro.exe' : process.platform === 'darwin' ? 'MacOS/Kiro' : 'kiro');
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  try { fs.linkSync(runtime, executable); } catch { fs.copyFileSync(runtime, executable); }
  const env = {
    HOME: home, USERPROFILE: home,
    APPDATA: path.join(home, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    TMP: base, TEMP: base, NO_COLOR: '1',
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {})
  };
  const run = (args = [], { locale = 'zh-cn', preload, success = true, target = installRoot } = {}) => {
    const child = spawnSync(process.execPath, [
      ...(preload ? ['--require', preload] : []), path.join(project, 'scripts', 'patch-install.mjs'),
      `--install-dir=${target}`, `--locale=${locale}`, `--vsix=${vsix}`, '--yes', ...args
    ], { cwd: project, env, encoding: 'utf8', timeout: 30000 });
    assert.ifError(child.error);
    const output = `${child.stdout}\n${child.stderr}`;
    if (success) assert.equal(child.status, 0, output);
    else assert.notEqual(child.status, 0, output);
    return { ...child, output };
  };
  const paths = (buildVersion = version, buildCommit = commit) => patchStatePaths({ installRoot, dataFolderName, commit: buildCommit, version: buildVersion, home });
  const calls = () => {
    const file = path.join(home, dataFolderName, 'cli.jsonl');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
  };
  return { base, project, home, installRoot, appRoot, extRoot, configFile, dictFile, dictionaries, vsix, argvFile, conflict, writeBuild, run, paths, calls };
}

function record(fixture) { return json(fixture.paths().recordPath); }
function backupFiles(fixture) { return contents(fixture.paths().backupRoot); }
function originals(fixture) {
  return Object.fromEntries(['package.json', 'dist/extension.js', 'packages/chat/dist/main.js'].map((rel) => [rel, fs.readFileSync(path.join(fixture.extRoot, rel))]));
}
function assertOriginals(fixture, expected) {
  for (const [rel, data] of Object.entries(expected)) assert.deepEqual(fs.readFileSync(path.join(fixture.extRoot, rel)), data, rel);
}

function failRename(fixture, target, name = 'fail-write') {
  const preload = path.join(fixture.base, `${name}.cjs`);
  put(preload, `
const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = function(from, to) {
  if (to === ${JSON.stringify(target)}) {
    const record = JSON.parse(fs.readFileSync(${JSON.stringify(fixture.paths().recordPath)}, 'utf8'));
    fs.writeFileSync(${JSON.stringify(path.join(fixture.base, 'journal-observed.json'))}, JSON.stringify(record));
    const error = new Error('fixture interrupted atomic write'); error.code = 'EACCES'; throw error;
  }
  return original.apply(this, arguments);
};
`);
  return preload;
}

test('patch-install uses only isolated fixture installs and user directories', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-patch-fixtures-'));
  const runtime = path.join(root, process.platform === 'win32' ? 'node.exe' : 'node');
  // Never link a fixture directly to the real runtime: Unix chmod could affect it.
  fs.copyFileSync(process.execPath, runtime);
  if (process.platform !== 'win32') fs.chmodSync(runtime, 0o755);
  try {
    await t.test('preview, including --apply --preview, changes no installation or argv bytes', () => {
      const f = makeFixture(root, runtime, 'preview');
      const app = contents(f.appRoot);
      const argv = fs.readFileSync(f.argvFile);
      f.run();
      f.run(['--apply', '--preview'], { locale: 'zh-tw' });
      assert.deepEqual(contents(f.appRoot), app);
      assert.deepEqual(fs.readFileSync(f.argvFile), argv);
      assert.equal(fs.existsSync(f.paths().recordPath), false);
      assert.equal(fs.existsSync(path.join(f.paths().reportDir, 'patch-plan-zh-cn.json')), true);
      assert.equal(fs.existsSync(path.join(f.project, 'reports')), false);
      assert.deepEqual(f.calls(), []);
    });

    await t.test('install twice retries the VSIX and locale, preserving original backups and special-character paths', () => {
      const f = makeFixture(root, runtime, 'twice');
      const before = originals(f);
      f.run(['--apply']);
      const after = contents(f.extRoot);
      const backups = backupFiles(f);
      const first = record(f);
      assert.equal(json(path.join(f.extRoot, 'package.json')).title, '新会话');
      assert.equal(fs.existsSync(f.conflict), false);
      put(f.argvFile, '{\n  "locale": "en"\n}\n');
      f.run(['--apply'], { target: path.join(f.installRoot, '.') + path.sep });
      assert.deepEqual(contents(f.extRoot), after);
      assert.deepEqual(backupFiles(f), backups);
      assert.deepEqual(record(f).files, first.files);
      assert.match(fs.readFileSync(f.argvFile, 'utf8'), /"locale": "zh-cn"/);
      const installs = f.calls().filter((call) => call[0] === '--install-extension');
      assert.equal(installs.length, 2);
      assert.deepEqual(installs[0], ['--install-extension', f.vsix, '--force']);
      for (const [rel, data] of Object.entries(before)) {
        assert.deepEqual(fs.readFileSync(path.join(f.paths().buildDir, first.files[rel].backup)), data);
      }
      assert.equal(fs.existsSync(path.join(f.extRoot, '.kiro-language-pack-backup')), false);
    });

    await t.test('language changes and patch upgrades always rewrite originals, including removed mappings', () => {
      const f = makeFixture(root, runtime, 'language');
      const before = originals(f);
      f.run(['--apply']);
      const backups = backupFiles(f);
      f.run(['--apply'], { locale: 'zh-tw' });
      assert.equal(json(path.join(f.extRoot, 'package.json')).title, '新對話');
      assert.match(fs.readFileSync(path.join(f.extRoot, 'dist', 'extension.js'), 'utf8'), /啟動工作流程/);
      assert.match(fs.readFileSync(f.argvFile, 'utf8'), /zh-tw/);
      const config = json(f.configFile);
      put(f.configFile, { ...config, version: '2.0.0-fixture' });
      put(f.dictFile('zh-tw'), { ...f.dictionaries['zh-tw'], manifest: {}, extension: { 'Launch workflow': '執行新版工作流程' } });
      f.run(['--apply'], { locale: 'zh-tw' });
      assert.deepEqual(fs.readFileSync(path.join(f.extRoot, 'package.json')), before['package.json']);
      assert.match(fs.readFileSync(path.join(f.extRoot, 'dist', 'extension.js'), 'utf8'), /執行新版工作流程/);
      assert.equal(record(f).packVersion, '2.0.0-fixture');
      assert.deepEqual(backupFiles(f), backups);
      f.run(['--restore']);
      assertOriginals(f, before);
    });

    await t.test('restore is repeatable, works with no record, and status recognizes restored records', () => {
      const f = makeFixture(root, runtime, 'restore');
      f.run(['--restore']);
      const before = originals(f);
      f.run(['--apply']);
      const backups = backupFiles(f);
      f.run(['--restore']);
      assertOriginals(f, before);
      assert.equal(record(f).status, 'restored');
      assert.match(f.run(['--status']).output, /not patched/);
      assert.doesNotMatch(f.run(['--status']).output, /still carry the patch/);
      f.run(['--restore']);
      assertOriginals(f, before);
      assert.deepEqual(backupFiles(f), backups);
      f.run(['--apply']);
      assert.equal(json(path.join(f.extRoot, 'package.json')).title, '新会话');
    });

    await t.test('an application update uses new originals, never restores the previous build', () => {
      const f = makeFixture(root, runtime, 'update');
      f.run(['--apply']);
      const oldPaths = f.paths();
      const oldBackups = backupFiles(f);
      f.writeBuild('2.0.0', 'fixture-build-two', 'new application bytes');
      const updated = originals(f);
      f.run(['--restore']);
      assertOriginals(f, updated);
      f.run(['--apply']);
      const newPaths = f.paths('2.0.0', 'fixture-build-two');
      assert.notEqual(newPaths.recordPath, oldPaths.recordPath);
      assert.equal(fs.existsSync(newPaths.recordPath), true);
      assert.deepEqual(contents(oldPaths.backupRoot), oldBackups);
      f.run(['--restore']);
      assertOriginals(f, updated);
      assert.notEqual(f.paths('2.0.0', 'different-commit').buildDir, newPaths.buildDir);
      assert.notEqual(f.paths('different-version', 'fixture-build-two').buildDir, newPaths.buildDir);
    });

    await t.test('external changes block apply and restore without discarding any recovery data', () => {
      const f = makeFixture(root, runtime, 'external');
      f.run(['--apply']);
      const target = path.join(f.extRoot, 'dist', 'extension.js');
      const patched = fs.readFileSync(target);
      const backups = backupFiles(f);
      put(target, 'third party contents\n');
      f.run(['--apply'], { success: false, locale: 'zh-tw' });
      assert.equal(fs.readFileSync(target, 'utf8'), 'third party contents\n');
      f.run(['--restore'], { success: false });
      assert.equal(fs.readFileSync(target, 'utf8'), 'third party contents\n');
      assert.equal(record(f).status, 'restore-incomplete');
      assert.equal(Object.keys(record(f).files).length, 3);
      assert.deepEqual(backupFiles(f), backups);
      put(target, patched);
      f.run(['--restore']);
    });

    await t.test('an edit immediately after reading a source is rejected before any application write', () => {
      const f = makeFixture(root, runtime, 'source-race');
      const before = originals(f);
      const target = path.join(f.extRoot, 'dist', 'extension.js');
      const preload = path.join(f.base, 'external-edit.cjs');
      put(preload, `
const fs = require('node:fs');
const original = fs.readFileSync;
let changed = false;
fs.readFileSync = function(file) {
  const data = original.apply(this, arguments);
  if (!changed && file === ${JSON.stringify(target)}) {
    changed = true;
    fs.writeFileSync(file, 'external edit after source read');
  }
  return data;
};
`);
      f.run(['--apply'], { preload, success: false });
      assert.equal(fs.readFileSync(target, 'utf8'), 'external edit after source read');
      assert.deepEqual(fs.readFileSync(path.join(f.extRoot, 'package.json')), before['package.json']);
      assert.deepEqual(fs.readFileSync(path.join(f.extRoot, 'packages', 'chat', 'dist', 'main.js')), before['packages/chat/dist/main.js']);
      assert.deepEqual(f.calls(), []);
    });

    await t.test('atomic replacements preserve file permissions under a restrictive Unix umask', { skip: process.platform === 'win32' }, () => {
      const f = makeFixture(root, runtime, 'mode');
      const target = path.join(f.extRoot, 'dist', 'extension.js');
      fs.chmodSync(target, 0o664);
      const preload = path.join(f.base, 'umask.cjs');
      put(preload, 'process.umask(0o077);');
      f.run(['--apply'], { preload });
      assert.equal(fs.statSync(target).mode & 0o777, 0o664);
      f.run(['--restore'], { preload });
      assert.equal(fs.statSync(target).mode & 0o777, 0o664);
    });

    await t.test('missing or corrupt backups fail strictly and remain recoverable', () => {
      for (const damage of ['missing', 'corrupt']) {
        const f = makeFixture(root, runtime, `backup-${damage}`);
        f.run(['--apply']);
        const entry = record(f).files['dist/extension.js'];
        const backup = path.join(f.paths().buildDir, entry.backup);
        const original = fs.readFileSync(backup);
        if (damage === 'missing') fs.rmSync(backup);
        else put(backup, 'bad backup bytes');
        f.run(['--apply'], { success: false });
        f.run(['--restore'], { success: false });
        assert.equal(record(f).files['dist/extension.js'].original, entry.original);
        if (damage === 'corrupt') assert.equal(fs.readFileSync(backup, 'utf8'), 'bad backup bytes');
        put(backup, original);
        f.run(['--restore']);
      }
    });

    await t.test('VSIX failure preserves conflicting packs and a rerun completes installation', () => {
      const f = makeFixture(root, runtime, 'install-failure');
      put(path.join(f.installRoot, 'fail-install'), 'fail');
      f.run(['--apply'], { success: false });
      assert.equal(record(f).status, 'setup-incomplete');
      assert.equal(fs.existsSync(f.conflict), true);
      assert.equal(f.calls().some((call) => call[0] === '--uninstall-extension'), false);
      fs.rmSync(path.join(f.installRoot, 'fail-install'));
      f.run(['--apply']);
      assert.equal(fs.existsSync(f.conflict), false);
      assert.deepEqual(f.calls().map((call) => call[0]), ['--install-extension', '--install-extension', '--uninstall-extension']);
      assert.equal(record(f).setup.extension, 'complete');
    });

    await t.test('a missing VSIX and failed locale write both return failure and can be retried', () => {
      const f = makeFixture(root, runtime, 'setup-failure');
      fs.rmSync(f.vsix);
      f.run(['--apply'], { success: false });
      assert.equal(fs.existsSync(f.conflict), true);
      put(f.vsix, 'fixture');
      fs.rmSync(f.argvFile);
      fs.mkdirSync(f.argvFile);
      f.run(['--apply'], { success: false });
      assert.equal(record(f).setup.locale, 'failed');
      fs.rmdirSync(f.argvFile);
      f.run(['--apply']);
      assert.match(fs.readFileSync(f.argvFile, 'utf8'), /zh-cn/);
      assert.equal(record(f).setup.locale, 'complete');
    });

    await t.test('an interrupted apply journals every write first and resumes, even during a language switch', () => {
      const f = makeFixture(root, runtime, 'write-failure');
      const before = originals(f);
      const preload = failRename(f, path.join(f.extRoot, 'dist', 'extension.js'));
      f.run(['--apply'], { success: false, preload });
      const observed = json(path.join(f.base, 'journal-observed.json'));
      assert.equal(observed.status, 'applying');
      assert.equal(Object.keys(observed.files).length, 3);
      assert.ok(Object.values(observed.files).every((entry) => entry.pending));
      for (const entry of Object.values(observed.files)) assert.equal(fs.existsSync(path.join(f.paths().buildDir, entry.backup)), true);
      f.run(['--apply']);
      f.run(['--apply'], { success: false, preload, locale: 'zh-tw' });
      f.run(['--apply'], { locale: 'zh-tw' });
      assert.equal(json(path.join(f.extRoot, 'package.json')).title, '新對話');
      f.run(['--restore']);
      assertOriginals(f, before);
    });

    await t.test('an interrupted restore also retains the journal and resumes', () => {
      const f = makeFixture(root, runtime, 'restore-failure');
      const before = originals(f);
      f.run(['--apply']);
      const preload = failRename(f, path.join(f.extRoot, 'dist', 'extension.js'));
      f.run(['--restore'], { success: false, preload });
      assert.equal(record(f).status, 'restore-incomplete');
      assert.ok(record(f).files['dist/extension.js'].pending);
      f.run(['--restore']);
      assertOriginals(f, before);
    });

    await t.test('legacy install-directory backups are imported without changing originals or deleting legacy data', () => {
      const f = makeFixture(root, runtime, 'legacy');
      const before = originals(f);
      const files = {};
      const backupRoot = path.join(f.extRoot, '.kiro-language-pack-backup');
      for (const [rel, data] of Object.entries(before)) {
        const patched = Buffer.from(data.toString('utf8').replace('New Session', '新会话').replace('Launch workflow', '启动工作流').replace('Welcome to Kiro', '欢迎使用 Kiro'));
        put(path.join(backupRoot, rel), data);
        put(path.join(f.extRoot, rel), patched);
        files[rel] = { original: sha256(data), patched: sha256(patched) };
      }
      put(path.join(f.extRoot, '.kiro-language-pack-patch.json'), { kiroVersion: version, locale: 'zh-cn', patchedAt: 'fixture', files });
      f.run(['--apply'], { locale: 'zh-tw' });
      assert.equal(json(path.join(f.extRoot, 'package.json')).title, '新對話');
      assert.ok(record(f).legacy);
      f.run(['--restore']);
      assertOriginals(f, before);
      assert.equal(fs.existsSync(backupRoot), true);
      f.run(['--restore']);
    });

    await t.test('different installation paths have separate records even with identical builds', () => {
      const first = makeFixture(root, runtime, 'install-one');
      const second = makeFixture(root, runtime, 'install-two');
      const common = { dataFolderName, version, commit, home: first.home };
      assert.notEqual(
        patchStatePaths({ ...common, installRoot: first.installRoot }).recordPath,
        patchStatePaths({ ...common, installRoot: second.installRoot }).recordPath
      );
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
