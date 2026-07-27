# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

The version number tracks the language pack itself, not the Kiro release it targets. The
verified Kiro versions are listed in `config.json` under `target.verifiedKiroVersions`.

## [Unreleased]

Verified against Kiro 1.0.228 (Code OSS 1.107.1).

### Added

- Simplified Chinese (`zh-cn`) translations for **1404 Code OSS core strings the upstream
  baseline does not cover**. This is the part of Kiro that no existing language pack reaches:
  the session and project list, the Settings panel, Agent Focus, the spec and steering
  toolbars, supervised diff review, the welcome carousel, the license editor, and the chat
  surfaces Kiro rewrote. Kiro is a fork that compiled its own UI into
  `resources/app/out/nls.messages.json`, so these keys live under the `vscode` translation
  id rather than in a separate extension id.
- Simplified Chinese translations for all 72 externalized strings of the `kiro.kiroAgent`
  built-in extension: command titles, view names, spec editor toolbar, editor titles and
  tree view welcome text.
- A single self-contained extension that declares every enabled locale, so the host selects
  by display language and untranslated keys fall back to English. One artifact, ~460 KB.
- `npm run gap`: diffs the installed key set against the upstream baseline and reports what
  this project has to translate itself, with the English source for every key.
  `--skeleton=<file>` writes a ready-to-translate stub.
- Twelve more locales pre-declared in `config.json`, matching every language
  `microsoft/vscode-loc` ships. Contributing one is a config flag plus translation files.
- An optional `companion` edition: one extension per locale claiming only `kiro.kiroAgent`,
  which coexists with the official VS Code language pack. Disabled by default because it
  cannot reach anything Kiro compiled into the core.
- Build pipeline: `detect`, `extract`, `audit`, `gap`, `sync`, `build`, `validate`,
  `coverage`, `package`, `publish`.
- Marker repair. Translations inherited from the upstream baseline whose `{0}` placeholders,
  `$(icon)` references or `(command:...)` links no longer match the English source in the
  target build are dropped rather than shipped, so the string falls back to English instead
  of rendering literal placeholder text or a dead link. 19 such strings were removed from the
  Chinese baseline.
- Manifest audit that measures how much of the Kiro UI is reachable by a language pack:
  107 of 183 localizable manifest strings are externalized, 76 are inline English literals,
  and the webview bundles carry no i18n layer at all.
- Terminology glossary so Kiro concepts (Spec, Steering, Hook, Power, Checkpoint,
  Autopilot) stay consistent as more languages are added.
- A `contents.bundle` section is emitted for `kiro.kiroAgent`. Kiro declares `"l10n"` in its
  manifest but does not call `vscode.l10n.t()` yet; the section starts taking effect
  automatically once it does.

- A language picker inside the pack: the `kiroLanguagePack.language` setting and the
  **Language Pack: Select Display Language** command. Both write the `locale` field of
  `argv.json` and offer to restart. The host only volunteers to switch when the pack matches
  the OS locale, so on an English system a plain language pack looks like it did nothing;
  this closes that gap. `auto` leaves the editor alone and prompts once.
- A startup check for another extension claiming the same `vscode` translation id, naming the
  extension to uninstall. Without it the symptom is a UI whose translation coverage changes
  between restarts, which is very hard to diagnose.
- Those two features are why the pack now ships ~250 lines of code. It reads `product.json`
  and `argv.json`, writes only the `locale` field of `argv.json` after confirmation, reads
  installed extension manifests, and keeps two dismissal flags in its own global state. No
  network access, no telemetry, no other files. `runtime: false` on a build mode produces a
  code-free pack.
- `npm test`: covers the argv.json edit, the one destructive operation in the pack -
  comment preservation, comma correctness, missing field, empty object, absent file.
- `npm run patch`: an optional, unsupported patcher for the strings no language pack can
  reach. It rewrites files inside the installed Kiro - 72 hardcoded manifest fields, the
  4 workflow descriptions in `dist/extension.js`, and 13 literals in the React chat UI, 89
  strings in total for Chinese. Manifest fields are replaced structurally so an English word
  cannot leak into an id; bundle literals are text replacement, which is why the map only
  holds long unambiguous sentences. Dry run by default, with backups, `--status` and
  `--restore`. A Kiro update overwrites it; nothing here ships in the `.vsix`. The dry run
  names every file it would touch and writes `reports/patch-plan-<locale>.json` with each
  before/after pair, so the change can be reviewed in full first.

### Changed

- The published pack is now **self-contained and replaces** the official VS Code language
  pack, instead of complementing it. `languagepacks.json` maps each translation id to
  exactly one file - assigned by plain overwrite as extensions are scanned - so there is no
  per-key merge. Translating Kiro's own UI requires owning the `vscode` id, and shipping the
  `vscode-loc` workbench baseline alongside is what keeps that safe. Do not install both.
- One extension for all languages rather than one extension per language. `translations/` is
  now laid out per locale when more than one is built.

### Fixed

- Corrected an earlier scope claim. The Settings panel and session shell were documented as
  unreachable webview content; they are core NLS modules
  (`vs/workbench/contrib/kiroStandalone/*`) and are fully translatable. The genuinely
  unreachable surfaces are the chat panel, hook and powers editors, and the account/usage
  popup.

[Unreleased]: https://github.com/polang233/kiro-language-pack/commits/main
