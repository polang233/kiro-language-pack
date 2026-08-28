# Architecture

Technical design notes for the Kiro Language Pack. For installation and everyday use, see
[README.md](../README.md).

## One self-contained extension

The pack carries the workbench baseline from
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) *and* the Kiro translations
this project authors. It therefore owns the `vscode` translation id and **replaces** the
official VS Code language pack. Do not install both.

That is not a preference, it follows from how Kiro is built. Kiro is a fork that compiled
its own UI into the Code OSS core:

```
resources/app/out/nls.messages.json
  vs/workbench/contrib/kiroStandalone/…       session list, Settings panel, Agent Focus (聚焦智能体)
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
inherited strings whose placeholders no longer match the source (see [Marker repair](#marker-repair)).

| Edition | Extension name | Contents | Default |
| --- | --- | --- | --- |
| **Full** | `kiro-language-pack` | Workbench baseline + Kiro strings, every enabled locale | published |
| **Companion** | `kiro-language-pack-<locale>-companion` | `kiro.kiroAgent` manifest strings only | build only |

Sizes differ by three orders of magnitude: the full pack is about 1.5 MB of minified
translation JSON per locale, the companion one is a single small bundle. `npm run build` prints
the exact figures for the current locale set, and the `.vsix` compresses them substantially.

Companion coexists with the official pack because it never claims `vscode`. The trade-off is
scope: it reaches the 72 manifest strings (command titles, view names, spec toolbar) and
nothing Kiro compiled into the core - the Settings panel stays English. It is disabled in
`config.json`; enable it only if giving up the official pack is not an option.

## How localization works

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

## Build pipeline

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

- **Filtering.** Keys that do not exist in Kiro are dropped - around 8000 per locale, roughly a
  third of the upstream baseline. That is what keeps the pack from carrying translations for a
  VS Code this fork does not contain.
- **Repair.** Because `vscode-loc` tracks the current VS Code release while Kiro lags
  behind, some inherited translations no longer match their source: a stale `{2}` renders as
  the literal text `{2}`, and a translated `command:` target turns a link into dead text.
  The build drops those - a couple of dozen per locale - so the string falls back to English
  instead of rendering wrong. Mismatches in files this repository maintains are reported
  instead, since those are our bugs.
- **Gap analysis.** `npm run gap` diffs the installed key set against the upstream baseline.
  The difference — 1335 keys on Kiro 1.0.395, 1159 on 1.0.309, 979 on 1.0.242 — is exactly what this project has to translate
  itself, and the report lists every one of them with its English source.
- **Coverage.** It gives `coverage` a real denominator instead of a guess.

The snapshot is optional, so CI can build without Kiro installed - filtering, repair and gap
analysis are skipped in that case.

## Runtime

A language pack does not need code, and the translations work without it. The pack ships a
single small file anyway, for the two things the host leaves undone: the language picker
(**Language Pack: Select Display Language**), and a warning when another extension also
claims the workbench translations, which otherwise shows up as a UI that is translated
differently after each restart.

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
    kiro/core.workbench.i18n.json remaining core keys upstream misses
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

## Research notes

Historical investigation and decision records live in [history.md](history.md). When the two
disagree, this document and [README.md](../README.md) are authoritative.
