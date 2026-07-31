/**
 * Access to the display-language field of argv.json from build-time scripts.
 *
 * The implementation deliberately lives in `src/extension/main.cjs`: that is the copy
 * that ships inside the .vsix and the copy `npm test` exercises. argv.json is JSON with
 * comments, is shared with the editor, and a botched write can keep Kiro from starting,
 * so there must be exactly one implementation of that edit. This module loads it with
 * `vscode` stubbed - the same trick scripts/test-extension.mjs uses - rather than
 * duplicating the logic here.
 */
import Module from 'node:module';
import { createRequire } from 'node:module';
import { p } from './util.mjs';

/** Enough of the `vscode` API surface for the module to load; none of it is called. */
const VSCODE_STUB = {
  l10n: { t: (message) => message },
  env: { appRoot: '', language: 'en' },
  window: {},
  commands: {},
  workspace: {},
  extensions: { all: [] }
};

let cached = null;

/**
 * @returns {{ readLocale: (file: string) => string | null,
 *             writeLocale: (file: string, locale: string) => void }}
 */
export function argvLocale() {
  if (cached) return cached;

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'vscode') return VSCODE_STUB;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const require = createRequire(import.meta.url);
    const api = require(p('src', 'extension', 'main.cjs')).__test;
    if (!api?.readLocale || !api?.writeLocale) {
      throw new Error('src/extension/main.cjs no longer exports __test.{readLocale,writeLocale}');
    }
    cached = api;
  } finally {
    Module._load = originalLoad;
  }
  return cached;
}
