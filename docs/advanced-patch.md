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
npm run patch                  # dry run, writes nothing
npm run patch -- --apply       # apply patch, then install dist/kiro-language-pack-<ver>.vsix
npm run patch -- --status      # is this install patched, and is the patch still intact
npm run patch -- --restore     # put the patched originals back (does not uninstall the extension)
```

Flags for `--apply`:

- `--no-extension` — only rewrite install files; do not install the `.vsix`
- `--vsix=<path>` — install a specific package instead of `dist/kiro-language-pack-<version>.vsix`

If the `.vsix` is missing, the file rewrite still succeeds; run `npm run package` first when
you want the one-shot “patch + extension” path.

Requires Node.js 18.17+, a clone of this repository, and a local Kiro install. Set
`KIRO_INSTALL_DIR` if `npm run detect` cannot find Kiro.

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

## Safety rules

Manifest fields are replaced structurally, only in fields the host renders (`title`,
`contents`, `description`, ...), so an English word in the translation map cannot leak into
a command id or a `when` clause. Bundle literals are replaced as text, which is why the map
only contains long, unambiguous sentences - see the note at the top of
`src/i18n/zh-cn/patch/kiro.kiroAgent.json` for one that had to be rejected.

Contributors: see [CONTRIBUTING.md](../CONTRIBUTING.md#contributing-to-the-patcher) for how
to add patch entries safely.
