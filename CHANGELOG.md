# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

The version number tracks the language pack itself, not the Kiro release it targets. The
verified Kiro versions are listed in `config.json` under `target.verifiedKiroVersions`.
Aligning with a new Kiro IDE build is a patch bump.

## [Unreleased]

## [1.1.1]

Verified against Kiro **1.0.395** (Code OSS 1.109.5), in addition to **1.0.309**, **1.0.242** and **1.0.228**.
`engines.vscode` stays `^1.107.0` so the pack still installs on the older builds.

### Kiro 1.0.395

- Translated the 177 Kiro-authored core strings added between 1.0.309 and 1.0.395: My Tasks, Task Trackers, session search, rail section reorder, experiments, workflows, cloud-config notices, artifacts, and Open VSX publisher-identity warnings. `kiro core` coverage is **1335/1335 (100%)** for both `zh-cn` and `zh-tw`; `kiro.kiroAgent` is **80/80 (100%)**.
- 1 authored key 1.0.395 removed (`kiro.agentConfig.cloudReadOnly`) is left in place: the build filters it out.

## [1.1.0]

Verified against Kiro **1.0.309** (Code OSS 1.109.5), in addition to **1.0.228** and **1.0.242**.
`engines.vscode` stays `^1.107.0` so the pack still installs on the older builds.

### Kiro 1.0.309

- Translated the 315 Kiro-authored core strings (and 1 `kiro.kiroAgent` command) added between 1.0.242 and 1.0.309: session pinning, collapsible sessions rail, attention cards, in-app updates, Cloud Sessions in Agent Focus, the integrated browser, and chat hooks / skills settings. `kiro core` coverage is **1159/1159 (100%)** for both `zh-cn` and `zh-tw`; `kiro.kiroAgent` is **80/80 (100%)**.
- Recovered 29 translations whose module path moved (prompt-header hover → validator, Copilot plan names, Open with Kiro CLI, and a handful of chat chrome strings).
- 183 authored keys 1.0.309 removed outright are left in place: the build filters them out, and they light up again if those views return.

### Changed

- Open VSX listing is live at [polang233/kiro-language-pack](https://open-vsx.org/extension/polang233/kiro-language-pack). README install instructions now send people to search inside Kiro first; GitHub Releases remain a `.vsix` fallback. Version and download badges added.

## [1.0.0]

First public release. Verified against Kiro **1.0.228** (Code OSS 1.107.1) and
**1.0.242** (Code OSS 1.108.2). `engines.vscode` is `^1.107.0` so the pack installs on both.
Later Kiro builds are expected to work in most cases; re-run `npm run check-upgrade` after
upgrading.

### Kiro 1.0.242

- **Recovered ~470 translations the upgrade had taken out of range.** 1.0.242 reorganised the chat
  contrib into `widget/`, `attachments/`, `tools/`, `accessibility/`, `widgetHosts/`, `model/` and
  `actions/` subfolders. Module paths are part of the translation key, so 65 modules stopped
  matching and the build dropped their strings - the chat UI had quietly reverted to English in
  large parts. Fixed by renaming the module ids; no string was retranslated, and all recovered
  strings still match their English source structurally.
- Translated the 75 strings that were genuinely new or newly uncovered, per locale: the Agent
  Settings pane and its config model (steering / MCP / hooks / skills / powers domains, connection
  states, icon badges), the simple-browser element picker overlay, the model picker, Kiro CLI and
  cloud-session entries in the session list, worktree trust messages, and the new session view
  toggles. `kiro core` coverage is back to **979/979 (100%)** for both `zh-cn` and `zh-tw`.
- Translated the 7 new `kiro.kiroAgent` editor context menu commands (Ask Kiro, Fix Grammar /
  Spelling, Write Comments, Write a Docstring, Fix this Code, Optimize this Code, Ask Kiro to Fix).
  `kiro.kiroAgent` coverage is **79/79 (100%)**.
- Added the 6 matching `editorActions.prompts.*` setting descriptions to the optional patcher's
  data - Kiro ships those as inline literals, so no language pack can reach them.
- 39 keys belonging to session-list views 1.0.242 removed outright are left in place: the build
  filters them out, and they light up again if the views return.

### Added

- Simplified Chinese (`zh-cn`) translations for **1404 Code OSS core strings the upstream
  baseline does not cover**: session and project list, Settings panel, Agent Focus
  (聚焦智能体), spec and steering toolbars, supervised diff review, welcome carousel,
  license editor, and chat surfaces Kiro rewrote. Those keys live under the `vscode`
  translation id because Kiro compiled its UI into the Code OSS core.
- Traditional Chinese (`zh-tw`) on the same surface, with vscode-loc zh-hant as the workbench
  baseline and Taiwan-oriented product terms (e.g. 聚焦智慧體).
- Chinese translations for all externalized `kiro.kiroAgent` manifest strings (**79/79**).
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
- `npm run patch -- --list`: every Kiro installation found, its version and patch state, plus
  the locales that have patch data.
- The patcher asks which installation and which language to use whenever there is more than one
  option. `--apply` finishes setup after the rewrite: uninstalls conflicting language packs
  (`--keep-official` to skip) and sets `locale` in `argv.json` (`--no-set-locale` to skip).
- Eleven more locales pre-declared in `config.json` for community contributions.
- Optional `companion` build mode (disabled by default): `kiro.kiroAgent` only, coexists
  with the official VS Code language pack but cannot reach core Kiro UI.

### Changed

- Product naming: Agent Focus is **聚焦智能体** / **聚焦智慧體** (not 「智能体聚焦模式」).
- Colloquial zh-cn terminology pass (自动模式, 确认模式, 修 Bug, 指引, 工作区管理, …).
- Published pack is self-contained and **replaces** the official VS Code language pack
  (required to own the `vscode` translation id).
- Store page and search metadata rewritten to be multilingual: `src/marketplace/README.md`
  carries English, Simplified and Traditional Chinese, plus short lines in languages not yet
  covered. `pack.displayName`, `pack.description` and keywords include 中文 / 汉化 / 漢化 / 语言包.
- READMEs, docs index and the patch guides restructured around the two delivery paths
  (extension, extension + patch).

### Fixed

- Settings panel and session list are core NLS modules, not unreachable webviews. The
  genuinely unreachable surfaces remain the chat panel, hook/powers editors, and
  account/usage popup.
- `--no-webview` was documented but had no effect: both `no-webview` and `webview=false`
  spellings now work for every flag. The patch-data toggle is `--no-extension-strings`
  (no longer `--extension=false`), so it is not confused with `--no-extension`.
- The patcher no longer falls back to the first enabled locale when `--locale` is omitted.

[1.1.1]: https://github.com/polang233/kiro-language-pack/releases/tag/v1.1.1
[1.1.0]: https://github.com/polang233/kiro-language-pack/releases/tag/v1.1.0
[1.0.0]: https://github.com/polang233/kiro-language-pack/releases/tag/v1.0.0
