# Advanced: patching the Kiro install

**This is optional.** Installing the language pack extension is the supported path. The
patch rewrites files inside your Kiro installation to translate strings that no extension
can reach. Read [README.en.md](../README.en.md) for the normal install flow first.

## When you might need this

The extension covers almost everything a language pack can reach. These surfaces stay English
unless you patch:

| Surface | Why the extension cannot reach it |
| --- | --- |
| SPECS view title, tree view welcome text and buttons, most MCP commands, Kiro settings descriptions | Some manifest strings are inline English literals with no `%key%` indirection |
| Workflow descriptions in the welcome view | Plain literals in `dist/extension.js`, not routed through `vscode.l10n.t()` |
| Chat UI phrases like `Let's build`, the Autopilot tooltip, the changed-files bar | Webview bundles compiled without an i18n layer |

The number of matching strings and bundles depends on the Kiro version. Use the preview output for the current install. Reports from `npm run audit` list unreachable strings.

## Commands

```bash
npm run patch -- --list        # Kiro installs found, and which languages are patchable
npm run patch                  # preview, writes a report in the user profile
npm run patch -- --apply       # do it
npm run patch -- --status      # is this install patched, and is the patch still intact
npm run patch -- --restore     # put the originals back (does not uninstall the extension)
```

These are source-checkout commands. For the npm CLI with automatic language detection, use the README. Source use requires Node.js 18.17+, this repository and an installed Kiro.

## Choosing the install and the language

Both are asked interactively whenever there is more than one option, so nothing has to be
memorised at a terminal:

```
Which Kiro installation?
   1. C:\Users\me\AppData\Local\Programs\Kiro  (Kiro 1.0.228)
   2. D:\Kiro                                  (Kiro 1.0.242)
  Choose 1-2 [1]:

Which language should this install be patched to?
   1. zh-cn  中文（简体） (Chinese Simplified)
   2. zh-tw  中文（繁體） (Chinese Traditional)
  Choose 1-2 [1]:
```

Name them explicitly to skip the questions — required in a script, since a non-interactive
shell refuses to guess:

```bash
npm run patch -- --install-dir="D:\Kiro" --locale=zh-tw --apply
```

- `--install-dir=<path>` is the directory that contains `resources/app`. On macOS that is
  `Kiro.app/Contents`. `KIRO_INSTALL_DIR` does the same thing.
- `--locale=<id>` must be a locale that is enabled in `config.json` **and** has
  `src/i18n/<id>/patch/kiro.kiroAgent.json`. `--list` prints both sets; the language pack
  covers more locales than the patcher does.
- `--yes` takes the default for every confirmation and never prompts.

## What `--apply` does

Four steps, in order. The first one is the patch; the other three exist so a fresh install
ends up in a working state instead of "patched but still displaying English".

| Step | Skip with |
| --- | --- |
| Rewrite the unreachable strings, backing up every file first | — |
| Install the language pack `.vsix` into that same Kiro | `--no-extension`, or `--vsix=<path>` |
| Uninstall language packs that conflict with this one | `--keep-official` |
| Set `locale` in `argv.json` to the chosen language | `--no-set-locale` |

The conflict step looks for installed extensions that declare the `vscode` translation id for
the language being patched — in practice `ms-ceintl.vscode-language-pack-*`. It matches on the
declaration rather than the publisher, so a repackaged pack is caught too, and it asks before
uninstalling anything.

The last step writes the same single field the extension's language picker writes, using the
same code (`scripts/lib/argv.mjs` loads it from `src/extension/main.cjs`). Restart Kiro
afterwards: the display language is a launch argument, so reloading the window is not enough.

If the current VSIX is missing or installation fails, the command returns a failure while retaining the patch and recovery data. Build it with `npm run package`, then rerun the same apply command. Repeated installation, language changes and patch updates recalculate from the verified originals; no prior restore is required.

Two more flags reduce the scope of the rewrite itself, mostly for debugging:
`--no-webview` leaves the chat UI bundles alone, `--no-extension-strings` leaves
`dist/extension.js` alone.

## What gets changed (Chinese)

| File | Contents |
| --- | --- |
| `extensions/kiro.kiro-agent/package.json` | View titles, welcome text, commands and setting descriptions |
| `extensions/kiro.kiro-agent/dist/extension.js` | Workflow descriptions |
| `extensions/kiro.kiro-agent/packages/*/dist/**/*.js` | Chat and session UI text |

The preview lists application files and every before/after pair. Reports live under `~/.kiro/kiro-language-pack/installs/<install>/builds/<build>/reports/`; `patch.json` and `backup/` in the same build directory retain the hashes and originals. The CLI also installs the extension, resolves conflicting packs and changes the display-language field in `argv.json`.

## Risks and limitations

- **A Kiro update overwrites the patched files.** Re-run after every upgrade; `--status`
  tells you when that happened.
- It edits the application directory. Originals stay in the user profile, separated by installation and application build. Existing install-directory backups are imported when needed. A failed restore preserves unresolved recovery data.
- AWS does not support a modified install. Restore before filing a bug against Kiro.
- Nothing here goes into the `.vsix`. The language pack remains the supported path, and the
  patch is additive on top of it. `--apply` installs that pack when `dist/*.vsix` is present.
- `--restore` undoes the rewrite of the install, and only that. The extension stays installed
  and `argv.json` keeps the display language — both are reversible from inside Kiro.

## Safety rules

Manifest fields are replaced structurally, only in fields the host renders (`title`,
`contents`, `description`, ...), so an English word in the translation map cannot leak into
a command id or a `when` clause. Bundle literals are replaced as text, which is why the map
only contains long, unambiguous sentences - see the note at the top of
`src/i18n/zh-cn/patch/kiro.kiroAgent.json` for one that had to be rejected.

Contributors: see [CONTRIBUTING.md](../CONTRIBUTING.md#contributing-to-the-patcher) for how
to add patch entries safely.
