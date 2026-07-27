# Kiro Language Pack

Community language pack for the [Kiro IDE](https://kiro.dev/).

**English** · [简体中文](README.zh-CN.md)

Kiro ships English only. This repository builds one installable extension that translates
the whole editor: the Code OSS workbench, the built-in extensions, and the parts Kiro added
itself - the session shell, the Settings panel, the spec and steering toolbars, supervised
diff review, the rewritten chat surfaces.

The extension declares every enabled language, so the host picks by display language and
anything untranslated falls back to English. Nothing is configured inside the pack.

Everything is generated from a build pipeline. Contributors maintain translation files and a
terminology glossary; the pipeline handles manifest generation, key filtering, coverage
measurement and packaging.

---

## Supported languages

| Locale | Language | Workbench | Kiro's own strings | Status |
| --- | --- | --- | --- | --- |
| `zh-cn` | 中文（简体）Simplified Chinese | 15588 / 15607 (99.9%) | 1404 / 1404 (100%) + 72 / 72 manifest keys | Ready |

Measured against Kiro 1.0.228 (Code OSS 1.107.1). Twelve more languages are pre-declared in
`config.json` and only need translation files, see [Adding a language](#adding-a-language).

## Design: one self-contained extension

The pack carries the workbench baseline from
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) *and* the Kiro translations
this project authors. It therefore owns the `vscode` translation id and **replaces** the
official VS Code language pack. Do not install both.

That is not a preference, it follows from how Kiro is built. Kiro is a fork that compiled
its own UI into the Code OSS core:

```
resources/app/out/nls.messages.json
  vs/workbench/contrib/kiroStandalone/…       session list, Settings panel, Agent Focus
  vs/workbench/contrib/spec/…                 spec toolbar
  vs/workbench/contrib/steering/…             steering toolbar
  vs/workbench/contrib/supervisedDiff/…       hunk-by-hunk review
  vs/workbench/contrib/chat/…                 largely rewritten
```

Those strings belong to the `vscode` translation id, not to a separate extension id. And the
host resolves ids one file at a time - `%APPDATA%\Kiro\languagepacks.json` maps each
translation id to exactly one path, assigned by a plain overwrite as extensions are scanned:

```js
for (const c of localization.translations)
  entry.translations[c.id] = join(extension.location.fsPath, c.path);
```

There is no per-key merge. Translating Kiro's Settings panel means providing the `vscode`
file, and two extensions cannot both provide it. Shipping the baseline alongside is what
makes owning that id safe.

Nothing is lost by the swap: the workbench strings come from the same MIT-licensed
`vscode-loc` snapshot the official pack is built from, and this build additionally drops
inherited strings whose placeholders no longer match the source (see [Marker
repair](#how-it-works)).

| Edition | Extension name | Contents | Size | Default |
| --- | --- | --- | --- | --- |
| **Full** | `kiro-language-pack` | Workbench baseline + Kiro strings, every enabled locale | ~460 KB | published |
| **Companion** | `kiro-language-pack-<locale>-companion` | `kiro.kiroAgent` manifest strings only | ~11 KB | build only |

Companion coexists with the official pack because it never claims `vscode`. The trade-off is
scope: it reaches the 72 manifest strings (command titles, view names, spec toolbar) and
nothing Kiro compiled into the core - the Settings panel stays English. It is disabled in
`config.json`; enable it only if giving up the official pack is not an option.

## Install

Install from the extension view in Kiro (`Ctrl+Shift+X` / `Cmd+Shift+X`). Kiro uses the
[Open VSX](https://open-vsx.org/) registry by default.

If you already run an official VS Code language pack in Kiro, uninstall it first. Two
extensions claiming the same `vscode` id resolve by extension scan order, which is not
stable - the symptom is a UI that is sometimes translated and sometimes mostly English. The
pack notices this on startup and tells you which extension to remove, so you do not have to
work it out from the symptom.

Or install a `.vsix` from [Releases](../../releases):

```
Command Palette -> Extensions: Install from VSIX...
```

## Switching the display language

Pick one from the pack itself:

- **Language Pack: Select Display Language** in the Command Palette, or
- the `kiroLanguagePack.language` setting - `auto`, one of the bundled languages, or `en`

Either writes the `locale` field of `argv.json` and offers to restart. `auto` means "leave
the editor alone"; the pack then asks once, and never again if you dismiss it.

This exists because the host only volunteers to switch when the pack matches your OS
locale:

> Would you like to change Kiro's display language to 中文（简体） and restart?

If your OS is in English, that prompt never appears and a plain language pack looks broken.
The built-in route still works if you prefer it - **Configure Display Language** in the
Command Palette - and so does editing `argv.json` by hand:

```json
{
  "locale": "zh-cn"
}
```

| Platform | Path |
| --- | --- |
| Windows | `%USERPROFILE%\.kiro\argv.json` |
| macOS | `~/.kiro/argv.json` |
| Linux | `~/.kiro/argv.json` |

Restart Kiro afterwards. Set the value to `"en"` or delete the field to go back to English.

### What the runtime does

A language pack does not need code, and the translations work without it. The pack ships a
single small file anyway, for the two things the host leaves undone: the language picker
above, and a warning when another extension also claims the workbench translations, which
otherwise shows up as a UI that is translated differently after each restart.

The complete list of what it touches:

| Access | Path | When |
| --- | --- | --- |
| read | `<appRoot>/product.json` | to learn the user data folder name |
| read | `~/<dataFolder>/argv.json` | to know the current display language |
| write | `~/<dataFolder>/argv.json` | only the `locale` field, only after you confirm |
| read | manifests of installed extensions | to spot a conflicting language pack |
| write | this extension's own global state | two "do not ask again" flags |

No network access, no telemetry, no other files, and your `settings.json` is only touched
if you change the setting yourself. `argv.json` is edited in place with a targeted
replacement so comments and formatting survive - that is the one destructive operation in
the pack, so it is also the one thing with tests (`npm test`).

Set `runtime: false` on a build mode in `config.json` for a strictly code-free pack.

## What can and cannot be translated

This is the honest scope, measured rather than assumed. Run `npm run audit` and
`npm run gap` to reproduce the numbers on your own install.

| Surface | Reachable | Notes |
| --- | --- | --- |
| Editor workbench: menus, Command Palette, settings, SCM, terminal, notifications | Yes | vscode-loc baseline, 15607 keys. |
| Built-in extensions: Git, Markdown, npm, language support, themes | Yes | 92 bundles from the same baseline. |
| Kiro session list, project list, Settings panel, Agent Focus | Yes | `vs/workbench/contrib/kiroStandalone/*`. Authored here - upstream has no translation for any of it. |
| Kiro spec toolbar, steering toolbar, supervised diff review, welcome carousel, license editor | Yes | Also core modules Kiro added. |
| Kiro command titles, view names, tree view welcome text | Yes | 107 of 183 localizable manifest strings are externalized as `%key%`, backed by 72 keys in `package.nls.json`. |
| The SPECS view title, tree view welcome text and its buttons, most MCP commands, Kiro's settings descriptions | **No** | 76 manifest strings are inline English literals with no `%key%` indirection. Not reachable by any language pack - see [Patching the install](#patching-the-install). |
| Kiro chat panel, hook editor, powers panel, account and usage popup | **No** | Webview bundles compiled without an i18n layer. `Estimated Usage`, `Credits` and `Manage Plan` appear in neither the core NLS table nor the extension's JavaScript. |
| Kiro runtime messages via `vscode.l10n.t()` | **No** | Kiro declares `"l10n"` in its manifest but does not call the API, and the workflow names and descriptions in the welcome view are plain literals in `dist/extension.js`. The build already emits a `contents.bundle` section, so these become translatable the day Kiro adopts the API. |

The last three rows are upstream limitations, not missing work here. Reports generated by
`npm run audit` list every unreachable string and are meant to be attached to upstream
requests for wider i18n coverage.

### Patching the install

Everything the extension can do, it does. This is the remainder - the strings no extension
of any kind can reach, because the host never looks up a translation for them. The escape
hatch is to rewrite them inside the installed Kiro, which is a different kind of thing and
strictly opt-in.

```bash
npm run patch                  # dry run, writes nothing
npm run patch -- --apply       # apply, backing up every file first
npm run patch -- --status      # is this install patched, and is the patch still intact
npm run patch -- --restore     # put the originals back
```

For Chinese this covers 89 further strings in exactly three files:

| File | Strings | What |
| --- | --- | --- |
| `extensions/kiro.kiro-agent/package.json` | 72 | the `SPECS` title, the three tree view welcome blocks and their buttons, the MCP commands, the trust and tool-card settings |
| `extensions/kiro.kiro-agent/dist/extension.js` | 4 | the workflow descriptions in the welcome view |
| `extensions/kiro.kiro-agent/packages/kiro-ui-agent-chat/dist/assets/*.js` | 13 | `Let's build`, the Autopilot tooltip, the changed-files bar |

Nothing outside that list is read, written, moved or deleted. The dry run prints the file
list and writes `reports/patch-plan-<locale>.json` with every before/after pair, so the
change is reviewable in full before you apply it. After applying, the same list is stored in
`extensions/kiro.kiro-agent/.kiro-language-pack-patch.json` next to the hashes.

This is opt-in and unsupported, in that order of importance:

- **A Kiro update overwrites the patched files.** Re-run after every upgrade; `--status`
  tells you when that happened.
- It edits the application directory. Originals are copied to
  `extensions/kiro.kiro-agent/.kiro-language-pack-backup/` and recorded with their hashes.
- AWS does not support a modified install. Restore before filing a bug against Kiro.
- Nothing here goes into the `.vsix`. The language pack remains the supported path, and the
  patch is additive on top of it.

Manifest fields are replaced structurally, only in fields the host renders (`title`,
`contents`, `description`, ...), so an English word in the translation map cannot leak into
a command id or a `when` clause. Bundle literals are replaced as text, which is why the map
only contains long, unambiguous sentences - see the note at the top of
`src/i18n/zh-cn/patch/kiro.kiroAgent.json` for one that had to be rejected.

To make the AI answer in your language, that is unrelated to the UI - add a steering
document, e.g. `.kiro/steering/language.md`.

## How it works

VS Code, and therefore Kiro, resolves UI strings through the language pack contribution
point. A pack is a code-free extension that declares one entry per language:

```json
{
  "contributes": {
    "localizations": [
      {
        "languageId": "zh-cn",
        "languageName": "Chinese Simplified",
        "localizedLanguageName": "中文（简体）",
        "translations": [
          { "id": "vscode", "path": "./translations/main.i18n.json" },
          { "id": "vscode.git", "path": "./translations/extensions/vscode.git.i18n.json" },
          { "id": "kiro.kiroAgent", "path": "./translations/extensions/kiro.kiroAgent.i18n.json" }
        ]
      }
    ]
  }
}
```

Each translation file maps module paths and keys to translated text. Keys that are absent
fall back to English silently, so a partial translation degrades gracefully instead of
breaking the UI. The host reads `contributes.localizations` from every installed extension,
so a single extension can serve any number of languages.

The pipeline:

```
Kiro installation ──(extract)──> metadata/kiro.json ─────┐
                                                         │
microsoft/vscode-loc ──(sync)──> upstream/<locale>/ ──────┼──(build)──> dist/<pack>/ ──(package)──> .vsix
                                                         │
src/i18n/<locale>/{overrides,kiro} ──────────────────────┘
                                                         ├──(gap)──────> reports/kiro-core-gap-<locale>.json
                                                         └──(coverage)─> reports/
```

`metadata/kiro.json` is a snapshot of every localizable key in the installed build,
including the English source text. It serves four purposes:

- **Filtering.** Keys that do not exist in Kiro are dropped - 8108 of them for Chinese,
  which is what keeps the artifact at 460 KB instead of 1.4 MB.
- **Repair.** Because `vscode-loc` tracks the current VS Code release while Kiro lags
  behind, some inherited translations no longer match their source: a stale `{2}` renders as
  the literal text `{2}`, and a translated `command:` target turns a link into dead text.
  The build drops those, 19 of them for Chinese, so the string falls back to English instead
  of rendering wrong. Mismatches in files this repository maintains are reported instead,
  since those are our bugs.
- **Gap analysis.** `npm run gap` diffs the installed key set against the upstream baseline.
  The difference - 1404 keys for Chinese - is exactly what this project has to translate
  itself, and the report lists every one of them with its English source.
- **Coverage.** It gives `coverage` a real denominator instead of a guess.

The snapshot is optional, so CI can build without Kiro installed - filtering, repair and gap
analysis are skipped in that case.

## Build from source

Requires Node.js 18.17 or newer.

```bash
npm install

npm run detect     # inspect the local Kiro install: version, NLS layout, extension ids
npm run extract    # snapshot the localizable surface into metadata/kiro.json
npm run audit      # measure how much of the Kiro UI a language pack can reach
npm run gap        # list core strings the upstream baseline does not cover
npm run sync       # download the workbench baseline from microsoft/vscode-loc
npm run build      # assemble dist/<pack>/
npm run validate   # structural checks plus placeholder/icon/command-link integrity
npm run coverage   # translation coverage plus a list of untranslated keys
npm run test       # exercise the runtime's argv.json editing
npm run package    # produce the .vsix
npm run patch      # optional: translate what no extension can reach, in place
```

Useful flags, passed after `--`:

```bash
npm run build -- --locale=zh-cn
npm run build -- --mode=companion   # only after enabling it in config.json
npm run build -- --no-filter        # keep keys absent from the local Kiro build
npm run build -- --no-repair        # keep upstream strings whose markers drifted
npm run gap -- --module=kiroStandalone
npm run gap -- --skeleton=.tmp-todo.json    # untranslated keys, ready to translate
npm run sync -- --force             # re-download instead of using the cache
npm run sync -- --strategy=api      # list files via the GitHub API (needs GITHUB_TOKEN)
npm run package -- --skip-build
```

`npm run detect` cannot always guess where Kiro lives. Point it at the install root, the
directory containing `resources/app/package.json`:

```powershell
$env:KIRO_INSTALL_DIR = "C:\Users\<you>\AppData\Local\Programs\Kiro"
```

### Installing what you just built

**Do not double-click the `.vsix`.** On a machine with Visual Studio installed, that file
extension is handled by the Visual Studio VSIX Installer, which fails with
`NoApplicableSKUsException`. That is a file association problem, not a problem with the
package.

Installing from a shell is more reliable. When `kiro` is not on PATH, use `bin/kiro` from
the install directory:

```powershell
$kiro = 'F:\AI\Kiro\bin\kiro.cmd'          # adjust to your install path
& $kiro --install-extension dist\kiro-language-pack-0.1.0.vsix
& $kiro --list-extensions | Select-String language-pack
```

Restart Kiro afterwards. `languagepacks.json` is rebuilt at startup, so a CLI install needs
one restart before it takes effect. To verify which extension owns each id:

```powershell
node -e "const j=require(process.env.APPDATA+'/Kiro/languagepacks.json');console.log(j['zh-cn'].translations['vscode'])"
```

Then check the surfaces that only this pack can reach: the session list and **Settings**
panel in Agent Focus, and the spec toolbar with a file under `.kiro/specs/` open.

To revert, uninstall the extension and reinstall the official pack if you want one.
`argv.json` is untouched either way.

## Repository layout

```
config.json                       single source of truth: publisher, version, locales, modes
src/
  manifest.template.json          extension manifest skeleton
  extension/main.cjs              the runtime: language picker, conflict warning
  marketplace/README.md           the page shown on the extension marketplace
  i18n/<locale>/
    glossary.json                 terminology contract for the locale
    extension.l10n.json           the runtime's own messages
    kiro/core.kiro.i18n.json      Kiro's own UI, compiled into the Code OSS core
    kiro/core.chat.i18n.json      chat and agent session strings upstream does not cover
    kiro/core.workbench.i18n.json remaining core keys upstream does not cover
    kiro/<extId>.i18n.json        built-in extension manifest strings (kiro.kiroAgent)
    overrides/main.i18n.json      corrections to the upstream workbench baseline
    patch/kiro.kiroAgent.json     strings only the optional installation patcher can reach
scripts/                          the build pipeline
metadata/                         generated, gitignored
upstream/                         translation cache, gitignored
dist/                             build output, gitignored
reports/                          coverage, gap and audit reports, gitignored
```

Any file named `core*.i18n.json` under `kiro/` is merged into the `vscode` translation id.
Splitting by area is a convenience - one file with 1400 keys is not reviewable.

## Adding a language

No code changes required. All thirteen languages `vscode-loc` ships are already listed in
`config.json` with `enabled: false`.

1. Flip `enabled` to `true` for your locale in `config.json`. For a language `vscode-loc`
   does not cover, add an entry with `upstreamPackDir: null`: the workbench then stays
   English and only the Kiro strings are translated, which is still a net gain since no
   official pack exists for it either.
2. Create `src/i18n/<locale>/glossary.json` and agree on the terminology first.
3. Run `npm run sync -- --locale=<locale>` to fetch the baseline, then
   `npm run gap -- --locale=<locale> --skeleton=.tmp-todo.json` for the work list.
4. Write `src/i18n/<locale>/kiro/core*.i18n.json` and
   `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json`. The Chinese files carry the English
   source in `//` comments, so they double as a reference.
5. Run `npm run build && npm run validate && npm run coverage`.

Partial work is useful: untranslated keys fall back to English, they do not break anything.

See [CONTRIBUTING.md](CONTRIBUTING.md) for review expectations and translation rules.

## License and attribution

MIT. See [LICENSE](LICENSE).

Workbench translations are derived from
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc), whose source and strings
are MIT licensed. The upstream commit used for a build is recorded in the generated
manifest. Full attribution is in [NOTICE](NOTICE), which ships inside every `.vsix`.

This is an independent community project. It is not affiliated with, endorsed by, or
sponsored by Amazon Web Services, Inc. or Microsoft Corporation. Product names are used
only to describe compatibility.
