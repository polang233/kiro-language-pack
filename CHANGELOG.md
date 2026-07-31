# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

The version number tracks the language pack itself, not the Kiro release it targets. The
verified Kiro versions are listed in `config.json` under `target.verifiedKiroVersions`.

## [Unreleased]

### Kiro 1.0.242

Reconciled with Kiro **1.0.242** (Code OSS 1.108.2), which is now listed in
`target.verifiedKiroVersions` alongside 1.0.228. `engines.vscode` stays at `^1.107.0` so the pack
installs on both.

- **Recovered ~470 translations the upgrade had taken out of range.** 1.0.242 reorganised the chat
  contrib into `widget/`, `attachments/`, `tools/`, `accessibility/`, `widgetHosts/`, `model/` and
  `actions/` subfolders. Module paths are part of the translation key, so 65 modules stopped
  matching and the build dropped their strings - the chat UI had quietly reverted to English in
  large parts. Fixed by renaming the module ids; no string was retranslated, and all recovered
  strings still match their English source structurally.
- Translated the 75 strings that were genuinely new or newly uncovered, per locale: the Agent
  Settings pane and its config model (steering / MCP / hooks / skills / powers domains, connection
  states, source badges), the simple-browser element picker overlay, the model picker, Kiro CLI and
  cloud-session entries in the session list, worktree trust messages, and the new session view
  toggles. `kiro core` coverage is back to **979/979 (100%)** for both `zh-cn` and `zh-tw`.
- Translated the 7 new `kiro.kiroAgent` editor context menu commands (Ask Kiro, Fix Grammar /
  Spelling, Write Comments, Write a Docstring, Fix this Code, Optimize this Code, Ask Kiro to Fix).
  `kiro.kiroAgent` coverage is **79/79 (100%)**.
- Added the 6 matching `editorActions.prompts.*` setting descriptions to the optional patcher's
  data - Kiro ships those as inline literals, so no language pack can reach them.
- 39 keys belonging to session-list views 1.0.242 removed outright are left in place: the build
  filters them out, and they light up again if the views return.

### Added (tooling)

- `npm run patch -- --list`: every Kiro installation found, its version and patch state, plus
  the locales that have patch data.
- The patcher asks which installation and which language to use whenever there is more than one
  option, instead of requiring `--install-dir` / `--locale` to be remembered. A non-interactive
  shell still refuses to guess and prints the available choices.
- `--apply` now finishes the setup after the rewrite: it uninstalls language packs that conflict
  with this one (`--keep-official` to skip) and sets `locale` in `argv.json` to the language it
  patched (`--no-set-locale` to skip), so a patched install comes up in the chosen language
  without a second manual step. Conflict detection matches on the `vscode` translation id
  declaration rather than the publisher id, and asks before uninstalling.

### Fixed

- `--no-webview` was documented but had no effect: the flag was written as `no-webview` and read
  as `webview=false`. Both spellings now work, for every flag. The patch-data toggle that used
  to be spelled `--extension=false` is now `--no-extension-strings`, so it can no longer be
  confused with `--no-extension`, which skips installing the `.vsix`.
- The patcher no longer falls back to the first enabled locale when `--locale` is omitted, which
  could patch an install with a language nobody asked for.

### Changed

- Store page and search metadata rewritten to be multilingual: `src/marketplace/README.md` now
  carries English, Simplified and Traditional Chinese, plus short lines in the languages the pack
  does not cover yet so their speakers can find the repository. `pack.displayName`,
  `pack.description` and the manifest keywords include the terms Chinese users actually search
  for (中文, 汉化, 漢化, 语言包).
- `src/marketplace/README.zh-cn.md` removed. The published pack bundles every locale, so the
  build always shipped `README.md`; the per-locale file was a second copy of the same page that
  could only drift.
- READMEs, docs index and the patch guides restructured around the two delivery paths
  (extension, extension + patch) and the current multi-language status.

## [1.0.0]

First stable release. Verified against Kiro **1.0.228** (Code OSS 1.107.1). Later Kiro
builds are expected to work in most cases; re-run `npm run check-upgrade` after upgrading.

### Added

- Simplified Chinese (`zh-cn`) translations for **1404 Code OSS core strings the upstream
  baseline does not cover**: session and project list, Settings panel, Agent Focus
  (聚焦智能体), spec and steering toolbars, supervised diff review, welcome carousel,
  license editor, and chat surfaces Kiro rewrote. Those keys live under the `vscode`
  translation id because Kiro compiled its UI into the Code OSS core.
- Traditional Chinese (`zh-tw`) on the same surface, with vscode-loc zh-hant as the workbench
  baseline and Taiwan-oriented product terms (e.g. 聚焦智慧體).
- Chinese translations for all 72 externalized `kiro.kiroAgent` manifest strings.
- A single self-contained extension that declares every enabled locale; the host picks by
  display language and untranslated keys fall back to English.
- Build pipeline: `detect`, `extract`, `audit`, `gap`, `sync`, `build`, `validate`,
  `coverage`, `package`, `publish`.
- Marker repair for inherited vscode-loc strings whose placeholders or command links no
  longer match the installed Kiro English source.
- Language picker (`kiroLanguagePack.language` + **Language Pack: Select Display Language**)
  that writes only the `locale` field of `argv.json`, plus a conflicting-pack warning.
- Optional install-directory patcher (`npm run patch`) for strings no language pack can
  reach. Unsupported; reverted by Kiro updates; not part of the `.vsix`.
- Eleven more locales pre-declared in `config.json` for community contributions.
- Optional `companion` build mode (disabled by default): `kiro.kiroAgent` only, coexists
  with the official VS Code language pack but cannot reach core Kiro UI.

### Changed

- Product naming: Agent Focus is **聚焦智能体** / **聚焦智慧體** (not 「智能体聚焦模式」).
- Colloquial zh-cn terminology pass (自动模式, 确认模式, 修 Bug, 指引, 工作区管理, …).
- Published pack is self-contained and **replaces** the official VS Code language pack
  (required to own the `vscode` translation id).

### Fixed

- Settings panel and session list are core NLS modules, not unreachable webviews. The
  genuinely unreachable surfaces remain the chat panel, hook/powers editors, and
  account/usage popup.

[1.0.0]: https://github.com/polang233/kiro-language-pack/releases/tag/v1.0.0
