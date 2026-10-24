import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chineseLocale, systemLocale } from './lib/system-locale.mjs';
import { parseCli } from './lib/cli.mjs';
import { nodeScript } from './lib/npm-tooling.mjs';
import { p, readJson, parseArgs } from './lib/util.mjs';

test('Traditional Chinese regions and script, with explicit script taking precedence', () => {
  for (const tag of ['zh-TW', 'zh_HK.UTF-8', 'zh-MO', 'zh-Hant', 'zh-Hant-HK', 'zh-CHT', 'TW', 'HK', 'MO']) {
    assert.equal(chineseLocale(tag), 'zh-tw', tag);
  }
  for (const tag of ['zh-CN', 'zh_SG.UTF-8', 'zh-Hans-HK', 'en-US', 'C.UTF-8', '', undefined]) {
    assert.equal(chineseLocale(tag), 'zh-cn', tag);
  }
});

test('Windows reads UI culture even when a terminal LANG is English', () => {
  let invocation;
  const language = systemLocale({ platform: 'win32', env: { LANG: 'en_US' },
    run: (...args) => { invocation = args; return { status: 0, stdout: 'zh-HK\r\n' }; } });
  assert.equal(language, 'zh-HK');
  assert.ok(invocation[1].includes('(Get-UICulture).Name'));
  assert.equal(invocation[2].windowsHide, true);
});

test('macOS reads the first preferred language; Linux respects locale precedence', () => {
  assert.equal(systemLocale({ platform: 'darwin', env: {}, run: () => ({ status: 0, stdout: '(\n "zh-Hant-TW",\n "en-US"\n)' }) }), 'zh-Hant-TW');
  assert.equal(systemLocale({ platform: 'linux', env: { LC_ALL: 'zh_HK.UTF-8', LANG: 'en_US' } }), 'zh_HK.UTF-8');
  assert.equal(systemLocale({ platform: 'linux', env: { LC_ALL: 'C', LANG: 'zh_TW' } }), 'C');
  assert.equal(systemLocale({ platform: 'linux', env: { LANGUAGE: 'zh_TW:en', LANG: 'en_US' } }), 'zh_TW');
  assert.equal(systemLocale({ platform: 'win32', env: {}, run: () => { throw new Error('not available'); }, fallback: () => 'zh-TW' }), 'zh-TW');
});

test('CLI accepts overrides and paths with spaces, equals signs and shell characters', () => {
  assert.deepEqual(parseCli([]), { command: 'install', options: {} });
  assert.deepEqual(parseCli(['--locale', 'zh-tw', 'preview', '--dir=D:/Apps & Tools/IDE=a']), {
    command: 'preview', options: { locale: 'zh-tw', dir: 'D:/Apps & Tools/IDE=a' }
  });
  assert.equal(parseArgs(['--dir=D:/IDE=a']).flags.dir, 'D:/IDE=a');
  for (const args of [['--locale=xx'], ['--locale'], ['--dir'], ['--what'], ['remove'], ['install', 'restore'], ['--dir=a', '--install-dir=b']]) {
    assert.throws(() => parseCli(args), args.join(' '));
  }
});

test('help/version run without any editor installation', () => {
  const pkg = readJson(p('package.json'));
  assert.match(nodeScript(p('bin', 'cli.mjs'), ['--help']).stdout, /--locale=zh-cn\|zh-tw/);
  assert.equal(nodeScript(p('bin', 'cli.mjs'), ['--version']).stdout.trim(), pkg.version);
});
