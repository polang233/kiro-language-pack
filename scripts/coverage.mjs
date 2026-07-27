#!/usr/bin/env node
/**
 * Measures translation coverage of the built packs against the installed Kiro
 * build, and writes the list of untranslated keys so contributors have a
 * concrete TODO list.
 *
 * Requires `metadata/kiro.json` (npm run extract) and `dist/` (npm run build).
 *
 * Usage: npm run coverage [-- --locale=zh-cn] [--mode=full] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { p, readJson, writeJson, log, fail, parseArgs, loadConfig } from './lib/util.mjs';

const { flags } = parseArgs();
const config = loadConfig();

const metadataFile = p('metadata', 'kiro.json');
if (!fs.existsSync(metadataFile)) {
  fail('metadata/kiro.json not found. Run `npm run extract` on a machine with Kiro installed.');
}
const metadata = readJson(metadataFile);

const summaryFile = p('dist', 'build-summary.json');
if (!fs.existsSync(summaryFile)) fail('dist/build-summary.json not found. Run `npm run build` first.');
const summary = readJson(summaryFile);

const builds = summary.builds
  .filter((b) => (flags.locale ? b.locale === flags.locale : true))
  .filter((b) => (flags.mode ? b.mode === flags.mode : true));
if (!builds.length) fail('No build matched the given filters.');

const pct = (done, total) => (total === 0 ? 100 : Math.round((done / total) * 1000) / 10);

const reports = [];

for (const build of builds) {
  const outDir = p('dist', build.name);
  const manifest = readJson(path.join(outDir, 'package.json'));
  const translations = manifest.contributes.localizations[0].translations;

  const loaded = new Map();
  for (const entry of translations) {
    const file = path.join(outDir, entry.path.replace(/^\.\//, ''));
    loaded.set(entry.id, readJson(file).contents ?? {});
  }

  // --- Core workbench ---------------------------------------------------
  const coreContents = loaded.get('vscode') ?? {};
  let coreTotal = 0;
  let coreDone = 0;
  const coreMissingModules = [];
  for (const [moduleId, keys] of Object.entries(metadata.core)) {
    const translated = coreContents[moduleId] ?? {};
    const total = Object.keys(keys).length;
    const done = Object.keys(keys).filter((k) => typeof translated[k] === 'string' && translated[k] !== '').length;
    coreTotal += total;
    coreDone += done;
    if (done < total) coreMissingModules.push({ moduleId, missing: total - done, total });
  }

  // --- Built-in extensions ---------------------------------------------
  const extensionRows = [];
  const untranslated = [];
  for (const [id, info] of Object.entries(metadata.extensions)) {
    const total = info.packageNlsKeyCount;
    if (total === 0) continue;
    const translated = loaded.get(id)?.package ?? {};
    const missingKeys = Object.keys(info.packageNls)
      .filter((k) => typeof translated[k] !== 'string' || translated[k] === '');
    const done = total - missingKeys.length;
    extensionRows.push({ id, total, done, percent: pct(done, total) });
    if (missingKeys.length) {
      untranslated.push({
        extensionId: id,
        missing: missingKeys.map((k) => ({ key: k, english: info.packageNls[k] }))
      });
    }
  }
  extensionRows.sort((a, b) => b.total - a.total);

  const target = extensionRows.find((r) => r.id === config.target.kiroExtensionId) ?? null;

  const report = {
    generatedAt: new Date().toISOString(),
    build: build.name,
    locale: build.locale,
    mode: build.mode,
    against: {
      kiroVersion: metadata.kiroVersion,
      vscodeVersion: metadata.vscodeVersion,
      commit: metadata.commit
    },
    core: { total: coreTotal, translated: coreDone, percent: pct(coreDone, coreTotal) },
    target,
    extensions: extensionRows,
    untranslated
  };
  reports.push(report);

  writeJson(p('reports', `coverage-${build.name}.json`), report);
}

if (flags.json) {
  console.log(JSON.stringify(reports, null, 2));
  process.exit(0);
}

for (const r of reports) {
  // An add-on pack deliberately ships no workbench baseline, so reporting 0%
  // for the core and for every other built-in extension would be noise.
  const kiroOnly = r.mode === 'addon';

  log.step(`${r.build}   (Kiro ${r.against.kiroVersion} / Code OSS ${r.against.vscodeVersion})`);
  if (kiroOnly) {
    log.plain('  add-on build: workbench strings come from a separate language pack');
  } else {
    log.plain(`  core workbench            ${String(r.core.translated).padStart(6)} / ${String(r.core.total).padEnd(6)} ${r.core.percent}%`);
  }
  if (r.target) {
    const fn = r.target.percent === 100 ? log.ok : log.warn;
    fn(`  ${r.target.id.padEnd(24)} ${String(r.target.done).padStart(6)} / ${String(r.target.total).padEnd(6)} ${r.target.percent}%   <- primary target`);
  } else {
    log.warn(`  ${config.target.kiroExtensionId} not present in this build`);
  }

  const others = kiroOnly
    ? []
    : r.extensions.filter((e) => e.id !== config.target.kiroExtensionId && e.percent < 100);
  if (others.length) {
    log.plain(`  built-in extensions below 100% (${others.length}):`);
    for (const e of others.slice(0, 15)) {
      log.plain(`    ${e.id.padEnd(40)} ${String(e.done).padStart(5)} / ${String(e.total).padEnd(5)} ${e.percent}%`);
    }
    if (others.length > 15) log.plain(`    ... ${others.length - 15} more, see reports/coverage-${r.build}.json`);
  }
  log.plain(`  report: reports/coverage-${r.build}.json`);
}
