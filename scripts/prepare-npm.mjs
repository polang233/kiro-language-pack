#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { p, readJson } from './lib/util.mjs';
import { nodeScript } from './lib/npm-tooling.mjs';

const config = readJson(p('config.json'));
const pkg = readJson(p('package.json'));
const lock = readJson(p('package-lock.json'));
if ([pkg.version, lock.version, lock.packages[''].version].some((version) => version !== config.version)
    || pkg.name !== lock.name || pkg.name !== lock.packages[''].name) {
  throw new Error('config.json, package.json and package-lock.json versions/names must agree before packaging.');
}
// Build on the maintainer's machine/CI. End users receive the finished VSIX.
nodeScript(p('scripts', 'package.mjs'), [], { cwd: p('.'), stdio: 'inherit' });
nodeScript(p('scripts', 'validate-dist.mjs'), [], { cwd: p('.'), stdio: 'inherit' });
const vsix = p('dist', `${config.namePrefix}-${config.version}.vsix`);
const manifest = readJson(p('dist', config.namePrefix, 'package.json'));
if (manifest.version !== pkg.version || manifest.name !== config.namePrefix || manifest.publisher !== config.publisher) {
  throw new Error('The bundled extension does not match the npm package.');
}
if (!fs.existsSync(vsix) || fs.statSync(vsix).size < 100) throw new Error('The current VSIX is missing or empty.');
const asset = p('assets', 'language-pack.vsix');
fs.mkdirSync(path.dirname(asset), { recursive: true });
fs.copyFileSync(vsix, asset);
console.log(`npm runtime prepared: ${pkg.name}@${pkg.version}`);
