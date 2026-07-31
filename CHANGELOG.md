# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

The version number tracks the language pack itself, not the Kiro release it targets. The
verified Kiro versions are listed in `config.json` under `target.verifiedKiroVersions`.

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
