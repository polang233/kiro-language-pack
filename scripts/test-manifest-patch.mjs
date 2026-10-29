import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { p } from './lib/util.mjs';

test('autonomy tooltips keep the HTML structure and attributes in both locales', () => {
  for (const locale of ['zh-cn', 'zh-tw']) {
    const dictionary = JSON.parse(fs.readFileSync(p('src', 'i18n', locale, 'patch', 'kiro.kiroAgent.json'), 'utf8'));
    const html = Object.entries(dictionary.webview).filter(([key]) => key.startsWith('<'));
    assert.equal(html.length, 3);
    for (const [english, translated] of html) {
      assert.notEqual(translated, english);
      assert.deepEqual(translated.match(/<[^>]+>/g), english.match(/<[^>]+>/g));
    }
  }
});

test('inline manifest coverage detects new English even without package.nls changes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-manifest-audit-'));
  const app = path.join(temp, 'resources', 'app');
  const extension = path.join(app, 'extensions', 'kiro.kiro-agent');
  try {
    fs.mkdirSync(extension, { recursive: true });
    fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'kiro', version: '1.131.0' }));
    const manifest = title => ({ publisher: 'kiro', name: 'kiroAgent', contributes: { commands: [{ command: 'kiro.test', title }] } });
    const run = () => spawnSync(process.execPath, [p('scripts', 'audit-manifest.mjs'), '--check-patch', '--report=' + path.join(temp, 'audit.json')], {
      env: { ...process.env, KIRO_INSTALL_DIR: temp }, encoding: 'utf8', windowsHide: true
    });
    fs.writeFileSync(path.join(extension, 'package.json'), JSON.stringify(manifest('New Recipe')));
    const covered = run();
    assert.equal(covered.error, undefined);
    assert.equal(covered.status, 0, covered.stdout + covered.stderr);
    assert.match(covered.stdout, /zh-tw: inline manifest 1\/1 covered/);
    fs.writeFileSync(path.join(extension, 'package.json'), JSON.stringify(manifest('New untranslated client command')));
    const missing = run();
    assert.equal(missing.error, undefined);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stdout + missing.stderr, /New untranslated client command/);
    assert.match(missing.stdout + missing.stderr, /Inline manifest translations are missing/);
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
