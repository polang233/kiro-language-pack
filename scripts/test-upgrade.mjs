import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { p } from './lib/util.mjs';
import { diffUpgrade, auditUpgrade, buildUpgradeSkeleton } from './lib/upgrade-diff.mjs';

const snapshot = (core = {}, extensions = {}, version = '1.0.0', commit = 'old-commit') => ({
  kiroVersion: version, commit, vscodeVersion: '1.128.0', core, extensions
});
const extension = (packageNls = {}, l10nBundle = {}) => ({ packageNls, l10nBundle });

test('core additions, removals and same-identity English rewrites are distinct; test modules are excluded', () => {
  const before = snapshot({
    'vs/main': { removed: 'Retired command', rewritten: 'Delete item', stable: 'Settings' },
    'vs/test/fixture': { old: 'Only a test' }, 'tests/unit': { old: 'Test only' }
  });
  const after = snapshot({
    'vs/main': { added: 'New command', rewritten: 'Delete {0} items', stable: 'Settings' },
    'vs/test/fixture': { next: 'Changed test' }, 'tests/unit': { next: 'Another test' }
  });
  const diff = diffUpgrade(before, after);
  assert.deepEqual(diff.counts, { added: 1, removed: 1, changed: 1, moved: 0 });
  assert.deepEqual(diff.addedKeys, [{ moduleId: 'vs/main', key: 'added', english: 'New command' }]);
  assert.deepEqual(diff.removedKeys, [{ moduleId: 'vs/main', key: 'removed', english: 'Retired command' }]);
  assert.deepEqual(diff.changedKeys, [{ moduleId: 'vs/main', key: 'rewritten', english: 'Delete {0} items', previousEnglish: 'Delete item' }]);
});

test('a unique same-key English source moving modules is also retained in the raw added/removed lists', () => {
  const diff = diffUpgrade(snapshot({ old: { action: 'A unique action' } }), snapshot({ next: { action: 'A unique action' } }));
  assert.deepEqual(diff.movedKeys, [{ fromModuleId: 'old', toModuleId: 'next', key: 'action', english: 'A unique action' }]);
  assert.deepEqual(diff.counts, { added: 1, removed: 1, changed: 0, moved: 1 });
  assert.equal(diff.addedKeys[0].moduleId, 'next');
  assert.equal(diff.removedKeys[0].moduleId, 'old');
});

for (const [name, before, after] of [
  ['many removed candidates', { a: { k: 'Open' }, b: { k: 'Open' } }, { c: { k: 'Open' } }],
  ['many added candidates', { a: { k: 'Open' } }, { b: { k: 'Open' }, c: { k: 'Open' } }],
  ['an unchanged duplicate elsewhere', { a: { k: 'Open' }, stable: { other: 'Open' } }, { b: { k: 'Open' }, stable: { other: 'Open' } }],
  ['a renamed key', { a: { old: 'Open' } }, { b: { next: 'Open' } }],
  ['changed English at the destination', { a: { k: 'Open' } }, { b: { k: 'Open file' } }],
  ['empty source strings', { a: { k: '' } }, { b: { k: '' } }]
]) {
  test(`does not infer a module move with ${name}`, () => {
    const diff = diffUpgrade(snapshot(before), snapshot(after));
    assert.equal(diff.movedKeys.length, 0);
    assert.ok(diff.addedKeys.length > 0);
    assert.ok(diff.removedKeys.length > 0);
  });
}

test('all extension IDs participate, including extension addition/removal and package/bundle rewrites', () => {
  const before = snapshot({}, {
    'ext.removed': extension({ gone: 'Removed package' }, { gone: 'Removed bundle' }),
    'ext.stays': extension({ remove: 'Retired package', edit: 'Old package', stable: { message: 'Stable', comment: ['Old note'] } },
      { remove: 'Retired bundle', edit: { message: 'Old bundle', comment: ['Context'] } })
  });
  const after = snapshot({}, {
    'ext.added': extension({ fresh: 'Fresh package' }, { fresh: 'Fresh bundle' }),
    'ext.stays': extension({ add: 'New package', edit: 'New package wording', stable: { message: 'Stable', comment: ['New note'] } },
      { add: 'New bundle', edit: 'New bundle wording' })
  });
  const drift = diffUpgrade(before, after).extensionDrift;
  assert.deepEqual(drift.addedExtensions, ['ext.added']);
  assert.deepEqual(drift.removedExtensions, ['ext.removed']);
  assert.deepEqual(drift.counts, { addedExtensions: 1, removedExtensions: 1 });
  for (const section of ['packageNls', 'l10nBundle']) {
    assert.deepEqual(drift[section].counts, { added: 2, removed: 2, changed: 1 });
    assert.equal(drift[section].changedKeys[0].extensionId, 'ext.stays');
    assert.equal(drift[section].changedKeys[0].key, 'edit');
    assert.ok(drift[section].changedKeys[0].previousEnglish.startsWith('Old'));
    assert.ok(!drift[section].changedKeys.some((row) => row.key === 'stable'));
  }
  assert.deepEqual(drift.l10nBundle.uncomparedExtensions, []);
  assert.equal(drift.l10nBundle.comparedExtensions.length, 3);
  assert.deepEqual(drift.l10nBundle.coverage, { comparedExtensions: 3, uncomparedExtensions: 0 });
});

test('missing historical/current bundle fields mean uncomparable, while an explicit empty bundle is comparable', () => {
  const before = snapshot({}, {
    legacy: { packageNls: { title: 'Old title' } },
    lost: extension({}, { k: 'Old runtime source' }),
    recordedEmpty: extension(), bothMissing: { packageNls: {} }
  });
  const after = snapshot({}, {
    legacy: extension({ title: 'New title' }, { k: 'Current runtime source' }),
    lost: { packageNls: {} }, recordedEmpty: extension({}, { k: 'Actually added' }), bothMissing: { packageNls: {} }
  });
  const drift = diffUpgrade(before, after).extensionDrift;
  assert.equal(drift.packageNls.counts.changed, 1);
  assert.deepEqual(drift.l10nBundle.counts, { added: 1, removed: 0, changed: 0 });
  assert.equal(drift.l10nBundle.addedKeys[0].extensionId, 'recordedEmpty');
  assert.deepEqual(drift.l10nBundle.uncomparedExtensions, [
    { extensionId: 'bothMissing', reason: 'baseline-and-current-not-recorded' },
    { extensionId: 'legacy', reason: 'baseline-not-recorded' },
    { extensionId: 'lost', reason: 'current-not-recorded' }
  ]);
});

test('comparison is deterministic and does not mutate either snapshot', () => {
  const freeze = (value) => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const before = freeze(snapshot({ z: { z: 'Last', a: 'Old' }, a: { z: 'Gone' } }, { z: extension({ x: 'Old' }) }));
  const after = freeze(snapshot({ z: { b: 'Added', a: 'New' }, b: { a: 'Also added' } }, { a: extension(), z: extension({ x: 'New' }) }));
  const expected = diffUpgrade(before, after);
  assert.deepEqual(expected, diffUpgrade(before, after));
  const reordered = snapshot({ b: after.core.b, z: { a: 'New', b: 'Added' } }, { z: after.extensions.z, a: after.extensions.a });
  assert.deepEqual(expected, diffUpgrade(before, reordered));
  assert.equal(before.core.z.a, 'Old');
  const audit = auditUpgrade(after, freeze(expected), freeze({ ownCore: { z: { a: '候選譯文' } } }));
  assert.equal(buildUpgradeSkeleton([freeze(audit)]).contents.z.a, 'New');
});

test('changed English always requires review and identifies own/upstream/both/missing candidates', () => {
  const before = snapshot({ mod: { own: 'Old own', upstream: 'Old upstream', both: 'Old both', missing: 'Old missing' } });
  const after = snapshot({ mod: { own: 'New own', upstream: 'New upstream', both: 'New both', missing: 'New missing' } });
  const audit = auditUpgrade(after, diffUpgrade(before, after), {
    ownCore: { mod: { own: '本地翻譯', both: '本地優先' } },
    upstreamCore: { mod: { upstream: '上游翻譯', both: '上游候選' } }
  });
  const changes = Object.fromEntries(audit.changedKeys.map((row) => [row.key, row.translationReview]));
  assert.deepEqual(changes.own.sourcesToReview, ['own']);
  assert.deepEqual(changes.upstream.sourcesToReview, ['upstream']);
  assert.deepEqual(changes.both.sourcesToReview, ['own', 'upstream']);
  assert.equal(changes.both.effectiveSource, 'own');
  assert.equal(changes.both.own, '本地優先');
  assert.equal(changes.both.upstream, '上游候選');
  assert.deepEqual(changes.missing.sourcesToReview, []);
  assert.ok(Object.values(changes).every((state) => state.required));
  assert.equal(audit.missingTranslations.length, 1);
  assert.equal(audit.changedKeys.length, 4);
});

test('nonempty coverage preserves intentional English terms and lists identical English as information', () => {
  const after = snapshot({ mod: { own: 'Kiro', upstream: 'MCP', grep: 'Instant Grep', ctrl: 'Ctrl',
    shift: 'Shift', os: 'OS', variable: 'variableName', missing: 'Translate this', empty: '', translated: 'Translate me' } });
  const audit = auditUpgrade(after, diffUpgrade(snapshot(), after), {
    ownCore: { mod: { own: 'Kiro', grep: 'Instant Grep', translated: '真正譯文', missing: '' } },
    upstreamCore: { mod: { own: '被覆寫的上游翻譯', upstream: 'MCP', ctrl: 'Ctrl', shift: 'Shift', os: 'OS', variable: 'variableName' } }
  });
  assert.deepEqual(audit.missingTranslations.map((row) => row.key), ['missing']);
  assert.deepEqual(audit.addedUntranslated, audit.missingTranslations);
  assert.deepEqual(audit.identicalToEnglish.map((row) => row.key), ['ctrl', 'grep', 'os', 'own', 'shift', 'upstream', 'variable']);
  assert.equal(audit.identicalToEnglish.find((row) => row.key === 'own').translationSource, 'own');
  assert.deepEqual(buildUpgradeSkeleton([audit]).contents, { mod: { missing: 'Translate this' } });
});

test('113 historical authored orphans are separate from this upgrade deletion; overrides do not inflate authored counts', () => {
  const historical = Object.fromEntries(Array.from({ length: 113 }, (_, i) => [`stale${i}`, '歷史譯文']));
  const before = snapshot({ mod: { removed: 'Removed this time', stable: 'Still here' } });
  const after = snapshot({ mod: { stable: 'Still here' } });
  const authoredCore = { mod: { removed: '本次刪除譯文', stable: '仍存在' }, historical };
  const audit = auditUpgrade(after, diffUpgrade(before, after), {
    authoredCore, ownCore: { ...authoredCore, overrides: { retired: '已過期的修正' } }
  });
  assert.equal(audit.orphanedAuthored.length, 114);
  assert.deepEqual(audit.newlyOrphanedAuthored, [{ moduleId: 'mod', key: 'removed' }]);
  assert.equal(audit.preExistingOrphanedAuthored.length, 113);
  const unchanged = auditUpgrade(before, diffUpgrade(before, before), { ownCore: authoredCore });
  assert.equal(unchanged.orphanedAuthored.length, 113);
  assert.equal(unchanged.newlyOrphanedAuthored.length, 0);
});

test('moved keys expose the old candidate for reuse without marking the new module translated', () => {
  const before = snapshot({ old: { k: 'A uniquely moved source' } });
  const after = snapshot({ next: { k: 'A uniquely moved source' } });
  const audit = auditUpgrade(after, diffUpgrade(before, after), { ownCore: { old: { k: '可重用譯文' } } });
  assert.equal(audit.movedKeys[0].previousTranslations.own, '可重用譯文');
  assert.equal(audit.movedKeys[0].translationReview.hasCandidateTranslation, false);
  assert.equal(audit.addedUntranslated.length, 1);
});

test('extension package and runtime English rewrites associate candidate translations and stay in the skeleton', () => {
  const before = snapshot({}, { ext: extension({ k: 'Old package' }, { k: 'Old bundle' }) });
  const after = snapshot({}, { ext: extension({ k: 'New package' }, { k: 'New bundle' }) });
  const audit = auditUpgrade(after, diffUpgrade(before, after), {
    ownExtensions: { ext: { package: { k: '套件譯文' }, bundle: { k: '執行期譯文' } } },
    upstreamExtensions: { ext: { package: { k: '上游套件' }, bundle: { k: '上游執行期' } } }
  });
  assert.deepEqual(audit.extensionMissingTranslations, []);
  for (const section of ['packageNls', 'l10nBundle']) {
    assert.deepEqual(audit.extensionDrift[section].changedKeys[0].translationReview.sourcesToReview, ['own', 'upstream']);
  }
  const skeleton = buildUpgradeSkeleton([audit]);
  assert.deepEqual(skeleton.extensions.ext.contents, { package: { k: 'New package' }, bundle: { k: 'New bundle' } });
  assert.equal(skeleton.$reviewRequired.extensions.length, 2);
  const copied = auditUpgrade(after, diffUpgrade(before, after), { ownExtensions: { ext: skeleton.extensions.ext.contents } });
  assert.equal(copied.extensionMissingTranslations.length, 0);
  assert.equal(copied.extensionIdenticalToEnglish.length, 2);
  for (const section of ['packageNls', 'l10nBundle']) {
    const review = copied.extensionDrift[section].changedKeys[0].translationReview;
    assert.equal(review.required, true);
    assert.equal(review.identicalToEnglish, true);
  }
});

test('core skeleton retains changed source with candidates, deduplicates locales and explicitly requires review if copied', () => {
  const before = snapshot({ mod: { k: 'Old source' } }), after = snapshot({ mod: { k: 'New source' } });
  const drift = diffUpgrade(before, after);
  const a = auditUpgrade(after, drift, { ownCore: { mod: { k: '本地翻譯' } } });
  const b = auditUpgrade(after, drift, { upstreamCore: { mod: { k: '上游翻譯' } } });
  assert.equal(a.missingTranslations.length + b.missingTranslations.length, 0);
  const skeleton = buildUpgradeSkeleton([a, b]);
  assert.deepEqual(skeleton.contents, { mod: { k: 'New source' } });
  assert.deepEqual(skeleton.$reviewRequired.core, [{ moduleId: 'mod', key: 'k', reason: 'source-changed' }]);
  const copied = auditUpgrade(after, drift, { ownCore: skeleton.contents });
  assert.equal(copied.missingTranslations.length, 0);
  assert.equal(copied.identicalToEnglish.length, 1);
  assert.equal(copied.changedKeys[0].translationReview.identicalToEnglish, true);
  assert.equal(copied.changedKeys[0].translationReview.required, true);
});

test('no previous snapshot is explicit and does not claim historical orphan knowledge', () => {
  const after = snapshot({ mod: { k: 'Initial source' } });
  const drift = diffUpgrade(null, after);
  assert.equal(drift.baselineAvailable, false);
  assert.equal(drift.counts.added, 1);
  const audit = auditUpgrade(after, drift, { ownCore: { historical: { k: '歷史翻譯' } } });
  assert.equal(audit.preExistingOrphanedAuthored, null);
});

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function fixture(t, { aligned = false, legacyBundles = false, withBundle = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro upgrade audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['scripts/check-upgrade.mjs', 'scripts/extract.mjs',
    'scripts/lib/upgrade-diff.mjs', 'scripts/lib/util.mjs', 'scripts/lib/kiro-paths.mjs']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(p(file), path.join(root, file));
  }
  const install = path.join(root, 'App with spaces'), app = path.join(install, 'resources', 'app');
  const before = snapshot({
    'vs/main': { rewritten: 'Delete item', obsolete: 'Retired item' }, old: { move: 'Unique moving command' }
  }, { 'fixture.tool': extension({ title: 'Old title' }, { prompt: 'Old prompt' }) });
  const after = snapshot({
    'vs/main': { rewritten: 'Delete {0} items', added: 'A new command' }, next: { move: 'Unique moving command' }
  }, { 'fixture.tool': extension({ title: 'New title', added: 'Added package' },
    { prompt: { message: 'New prompt', comment: ['Runtime context'] }, added: 'Added runtime' }) }, '1.2.0', 'new-commit');
  if (legacyBundles) delete before.extensions['fixture.tool'].l10nBundle;
  const oldFile = path.join(root, 'reports', 'old baseline=original.json');
  writeJson(oldFile, before);
  writeJson(path.join(root, 'metadata', 'kiro.json'), aligned ? after : before);
  const originalMetadata = fs.readFileSync(path.join(root, 'metadata', 'kiro.json'), 'utf8');
  writeJson(path.join(root, 'config.json'), {
    publisher: 'fixture', namePrefix: 'fixture', version: '1.0.0', engines: {}, modes: {}, upstream: {}, build: {},
    target: { verifiedKiroVersions: ['1.2.0'], kiroExtensionId: 'fixture.tool' },
    locales: [{ id: 'zh-cn', languageName: 'Chinese', localizedLanguageName: '中文', enabled: true }]
  });
  writeJson(path.join(app, 'package.json'), { name: 'fixture-kiro', version: '1.2.0' });
  writeJson(path.join(app, 'product.json'), { version: '1.2.0', vsCodeVersion: '1.128.0', commit: 'new-commit' });
  writeJson(path.join(app, 'out', 'nls.keys.json'), Object.entries(after.core).map(([id, keys]) => [id, Object.keys(keys)]));
  writeJson(path.join(app, 'out', 'nls.messages.json'), Object.values(after.core).flatMap(Object.values));
  const extDir = path.join(app, 'extensions', 'tool');
  writeJson(path.join(extDir, 'package.json'), { publisher: 'fixture', name: 'tool', version: '1.0.0', l10n: './runtime strings' });
  writeJson(path.join(extDir, 'package.nls.json'), after.extensions['fixture.tool'].packageNls);
  if (withBundle) writeJson(path.join(extDir, 'runtime strings', 'bundle.l10n.json'), after.extensions['fixture.tool'].l10nBundle);
  const historical = Object.fromEntries(Array.from({ length: 113 }, (_, i) => [`stale${i}`, '歷史譯文']));
  writeJson(path.join(root, 'src/i18n/zh-cn/kiro/core.i18n.json'), { version: '1.0.0', contents: {
    'vs/main': { rewritten: '本地刪除譯文', added: '新增命令' }, old: { move: '移動命令' }, historical
  } });
  writeJson(path.join(root, 'src/i18n/zh-cn/overrides/main.i18n.json'), { contents: { 'vs/main': { rewritten: '本地修正' } } });
  writeJson(path.join(root, 'upstream/zh-cn/main.i18n.json'), { contents: { 'vs/main': { rewritten: '上游刪除譯文' } } });
  writeJson(path.join(root, 'src/i18n/zh-cn/kiro/fixture.tool.i18n.json'), { contents: {
    package: { title: '本地套件標題' }, bundle: { prompt: '本地提示' }
  } });
  writeJson(path.join(root, 'upstream/zh-cn/extensions/fixture.tool.i18n.json'), { contents: {
    package: { title: '上游套件標題' }, bundle: { prompt: '上游提示' }
  } });
  const appFiles = (dir = app) => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => entry.isDirectory() ? appFiles(path.join(dir, entry.name))
      : [[path.relative(app, path.join(dir, entry.name)), fs.readFileSync(path.join(dir, entry.name), 'utf8')]]);
  const originalApp = appFiles();
  const runScript = (script, args) => {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
      cwd: root, env: { ...process.env, KIRO_INSTALL_DIR: install }, encoding: 'utf8', windowsHide: true
    });
    assert.ifError(result.error);
    assert.deepEqual(appFiles(), originalApp, 'extraction/audit must only read the application');
    return result;
  };
  return { root, before, after, oldFile, originalMetadata,
    run: (...args) => runScript('check-upgrade.mjs', ['--limit=0', ...args]),
    extract: () => runScript('extract.mjs', []),
    metadataFile: path.join(root, 'metadata', 'kiro.json'),
    reportFile: path.join(root, 'reports', 'upgrade-1.2.0-zh-cn.json'),
    read: (file) => JSON.parse(fs.readFileSync(file, 'utf8')) };
}

test('CLI default archives the exact pre-refresh metadata and reports core, extension and translation review end to end', (t) => {
  const f = fixture(t);
  const run = f.run('--skeleton=reports/work.json');
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const report = f.read(f.reportFile), saved = path.join(f.root, 'reports/baselines/kiro-1.0.0-old-commit.json');
  assert.equal(fs.readFileSync(saved, 'utf8'), f.originalMetadata);
  assert.equal(report.previousExtract, '1.0.0');
  assert.equal(report.comparisonBaseline.explicit, false);
  assert.equal(report.preservedMetadataSnapshot.created, true);
  assert.equal(report.core.addedSincePreviousExtract, 2);
  assert.equal(report.core.removedSincePreviousExtract, 2);
  assert.equal(report.core.changedSincePreviousExtract, 1);
  assert.equal(report.core.movedSincePreviousExtract, 1);
  assert.equal(report.core.preExistingOrphanedAuthoredKeys, 113);
  assert.equal(report.core.newlyOrphanedAuthoredKeys, 1);
  assert.equal(report.changedKeys[0].translationReview.own, '本地刪除譯文');
  assert.equal(report.changedKeys[0].translationReview.upstream, '上游刪除譯文');
  assert.equal(report.kiroAgent.packageNlsTotal, 2);
  assert.equal(report.kiroAgent.packageNlsMissing, 1);
  assert.equal(report.agentMissing[0].key, 'added');
  assert.equal(report.extensionDrift.packageNls.counts.changed, 1);
  assert.equal(report.extensionDrift.l10nBundle.counts.changed, 1);
  assert.equal(f.read(f.metadataFile).extensions['fixture.tool'].l10nBundle.prompt.message, 'New prompt');
  const skeleton = f.read(path.join(f.root, 'reports/work.json'));
  assert.equal(skeleton.contents['vs/main'].rewritten, 'Delete {0} items');
  assert.equal(skeleton.extensions['fixture.tool'].contents.bundle.prompt, 'New prompt');
  assert.equal(report.translationSources.ownCore.length, 2);
});

test('CLI explicit baseline forces a real comparison even when already aligned, and preserves the chosen baseline', (t) => {
  const f = fixture(t, { aligned: true });
  const baselineBytes = fs.readFileSync(f.oldFile, 'utf8');
  const run = f.run(`--baseline=${path.relative(f.root, f.oldFile)}`);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const report = f.read(f.reportFile);
  assert.equal(report.alignedWithVerified, true);
  assert.equal(report.previousExtract, '1.0.0');
  assert.equal(report.comparisonBaseline.commit, 'old-commit');
  assert.equal(report.comparisonBaseline.explicit, true);
  assert.equal(report.core.changedSincePreviousExtract, 1);
  assert.equal(report.core.addedSincePreviousExtract, 2);
  assert.equal(fs.readFileSync(f.oldFile, 'utf8'), baselineBytes);
  assert.equal(fs.readFileSync(path.join(f.root, 'reports/baselines/kiro-1.2.0-new-commit.json'), 'utf8'), f.originalMetadata);
});

test('CLI never overwrites an existing version/commit archive', (t) => {
  const f = fixture(t);
  const saved = path.join(f.root, 'reports/baselines/kiro-1.0.0-old-commit.json');
  const original = JSON.stringify({ ...f.before, savedEarlier: true });
  fs.mkdirSync(path.dirname(saved), { recursive: true });
  fs.writeFileSync(saved, original);
  const run = f.run();
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(fs.readFileSync(saved, 'utf8'), original);
  assert.equal(f.read(f.reportFile).preservedMetadataSnapshot.created, false);
});

test('CLI reports absent historical bundles as uncomparable and captures current bundles for the next audit', (t) => {
  const f = fixture(t, { aligned: true, legacyBundles: true });
  let run = f.run(`--baseline=${f.oldFile}`);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const drift = f.read(f.reportFile).extensionDrift;
  assert.deepEqual(drift.l10nBundle.uncomparedExtensions, [{ extensionId: 'fixture.tool', reason: 'baseline-not-recorded' }]);
  assert.deepEqual(drift.l10nBundle.counts, { added: 0, removed: 0, changed: 0 });
  assert.deepEqual(drift.l10nBundle.coverage, { comparedExtensions: 0, uncomparedExtensions: 1 });
  assert.equal(drift.packageNls.counts.changed, 1);
  run = f.extract();
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const extracted = f.read(f.metadataFile).extensions['fixture.tool'];
  assert.equal(extracted.l10nBundle.prompt.message, 'New prompt');
  assert.equal(extracted.l10nBundleKeyCount, 2);
  assert.equal(extracted.l10nBundleFile, path.join('runtime strings', 'bundle.l10n.json'));
  run = f.run('--force');
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.deepEqual(f.read(f.reportFile).extensionDrift.l10nBundle.uncomparedExtensions, []);
  assert.deepEqual(f.read(f.reportFile).extensionDrift.l10nBundle.comparedExtensions, ['fixture.tool']);
});

test('standalone real extractor records a known empty bundle when the extension ships no English bundle file', (t) => {
  const f = fixture(t, { withBundle: false });
  const result = f.extract();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const ext = f.read(f.metadataFile).extensions['fixture.tool'];
  assert.deepEqual(ext.l10nBundle, {});
  assert.equal(ext.l10nBundleKeyCount, 0);
  assert.equal(ext.l10nBundleFile, null);
  assert.equal(fs.existsSync(path.join(f.root, 'App with spaces/resources/app/extensions/tool/runtime strings/bundle.l10n.json')), false);
});

test('CLI aligned default skips refresh; a changed commit at the same version triggers an audit', (t) => {
  const f = fixture(t, { aligned: true });
  let run = f.run();
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(fs.existsSync(f.reportFile), false);
  assert.equal(fs.readFileSync(f.metadataFile, 'utf8'), f.originalMetadata);
  writeJson(f.metadataFile, { ...f.after, commit: 'another-commit' });
  run = f.run();
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(f.read(f.reportFile).comparisonBaseline.commit, 'another-commit');
});

test('CLI rejects missing/invalid explicit baselines before refreshing or creating archives', (t) => {
  const f = fixture(t, { aligned: true });
  writeJson(path.join(f.root, 'invalid.json'), { addedKeys: [] });
  writeJson(path.join(f.root, 'null.json'), null);
  for (const arg of ['--baseline', '--baseline=', '--baseline=absent.json', '--baseline=invalid.json', '--baseline=null.json']) {
    const run = f.run(arg);
    assert.notEqual(run.status, 0, arg);
    assert.equal(fs.readFileSync(f.metadataFile, 'utf8'), f.originalMetadata);
    assert.equal(fs.existsSync(path.join(f.root, 'reports/baselines')), false);
    assert.equal(fs.existsSync(f.reportFile), false);
  }
});
