import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function nodeScript(file, args = [], options = {}) {
  const result = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(file)} exited ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  return result;
}

export function npmCommand(args, options = {}) {
  const candidates = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')];
  const entry = candidates.find((file) => file && fs.existsSync(file));
  if (!entry) throw new Error('Cannot locate npm-cli.js. Run this check through npm run.');
  return nodeScript(entry, args, options);
}
