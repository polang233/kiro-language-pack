# Advanced: patching the Kiro install

**This is optional.** Installing the language pack extension is the supported path. The
patch rewrites files inside your Kiro installation to translate strings that no extension
can reach. Read [README.md](../README.md) for the normal install flow first.

## When you might need this

The extension covers almost everything a language pack can reach. These surfaces stay English
unless you patch:

| Surface | Why the extension cannot reach it |
| --- | --- |
| SPECS view title, tree view welcome text and buttons, most MCP commands, Kiro settings descriptions | 76 manifest strings are inline English literals with no `%key%` indirection |
| Workflow descriptions in the welcome view | Plain literals in `dist/extension.js`, not routed through `vscode.l10n.t()` |
| Chat UI phrases like `Let's build`, the Autopilot tooltip, the changed-files bar | Webview bundles compiled without an i18n layer |

For Chinese this adds **89 strings** across exactly three files. Reports from
`npm run audit` list every unreachable string and are meant for upstream i18n requests.

## Commands

```bash
npm run patch -- --list        # Kiro installs found, and which languages are patchable
npm run patch                  # dry run, writes nothing
npm run patch -- --apply       # do it
npm run patch -- --status      # is this install patched, and is the patch still intact
npm run patch -- --restore     # put the originals back (does not uninstall the extension)
```

Requires Node.js 18.17+, a clone of this repository, and a local Kiro install.

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

If `dist/*.vsix` is missing, the rewrite still succeeds and the step is skipped with a warning.
Run `npm run package` first for the one-shot path.

Two more flags reduce the scope of the rewrite itself, mostly for debugging:
`--no-webview` leaves the chat UI bundles alone, `--no-extension-strings` leaves
`dist/extension.js` alone.

## What gets changed (Chinese)

| File | Strings | What |
| --- | --- | --- |
| `extensions/kiro.kiro-agent/package.json` | 72 | the `SPECS` title, the three tree view welcome blocks and their buttons, the MCP commands, the trust and tool-card settings |
| `extensions/kiro.kiro-agent/dist/extension.js` | 4 | the workflow descriptions in the welcome view |
| `extensions/kiro.kiro-agent/packages/kiro-ui-agent-chat/dist/assets/*.js` | 13 | `Let's build`, the Autopilot tooltip, the changed-files bar |

Nothing outside that list is read, written, moved or deleted. The dry run prints the file
list and writes `reports/patch-plan-<locale>.json` with every before/after pair, so the
change is reviewable in full before you apply it. After applying, the same list is stored in
`extensions/kiro.kiro-agent/.kiro-language-pack-patch.json` next to the hashes.

## Risks and limitations

- **A Kiro update overwrites the patched files.** Re-run after every upgrade; `--status`
  tells you when that happened.
- It edits the application directory. Originals are copied to
  `extensions/kiro.kiro-agent/.kiro-language-pack-backup/` and recorded with their hashes.
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
