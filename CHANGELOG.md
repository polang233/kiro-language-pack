# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

The version number tracks the language pack itself, not the Kiro release it targets. The
verified Kiro versions are listed in `config.json` under `target.verifiedKiroVersions`.

## [Unreleased]

Verified against Kiro 1.0.228 (Code OSS 1.107.1).

### Added

- Simplified Chinese (`zh-cn`) translations for all 72 externalized strings of the
  `kiro.kiroAgent` built-in extension: command titles, view names, spec editor toolbar,
  editor titles and tree view welcome text.
- Two editions per locale. The full edition bundles a workbench baseline derived from
  `microsoft/vscode-loc`; the add-on edition ships Kiro strings only, for users who keep
  their existing VS Code language pack.
- Build pipeline: `detect`, `extract`, `audit`, `sync`, `build`, `validate`, `coverage`,
  `package`, `publish`.
- Marker repair. Translations inherited from the upstream baseline whose `{0}` placeholders,
  `$(icon)` references or `(command:...)` links no longer match the English source in the
  target build are dropped rather than shipped, so the string falls back to English instead
  of rendering literal placeholder text or a dead link. 21 such strings were removed from
  the Chinese pack.
- Manifest audit that measures how much of the Kiro UI is reachable by a language pack:
  107 of 183 localizable manifest strings are externalized, 76 are inline English literals,
  and 346 webview bundles (~12.9 MiB) carry no i18n layer at all.
- Terminology glossary so Kiro concepts (Spec, Steering, Hook, Power, Checkpoint,
  Autopilot) stay consistent as more languages are added.
- A `contents.bundle` section is emitted for `kiro.kiroAgent`. Kiro declares `"l10n"` in its
  manifest but does not call `vscode.l10n.t()` yet; the section starts taking effect
  automatically once it does.

[Unreleased]: https://github.com/OWNER/kiro-language-pack/commits/main
