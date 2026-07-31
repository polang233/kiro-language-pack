# Contributing

Translation fixes, terminology proposals and new languages are all welcome.

**Users:** install and usage live in [README.md](README.md) /
[README.zh-CN.md](README.zh-CN.md) — this file is the contributor entry point (build,
translation rules, new locales, Kiro upgrades).

Docs index: [docs/README.md](docs/README.md). Historical research notes (not product docs):
[docs/history.md](docs/history.md).

## Repository layout

| Path | Role |
| --- | --- |
| `README.md` / `README.zh-CN.md` | User-facing install and limits |
| `config.json` | Single source of truth for build / locales / marketplace copy |
| `src/i18n/` | Translations (edit here) |
| `src/extension/` | Language-pack runtime (argv.json locale switcher) |
| `src/marketplace/` | The store page copied into the `.vsix` — one multilingual file |
| `scripts/` | Build, sync, package, patch, upgrade-check |
| `media/` | Extension icon |
| `docs/` | Architecture, publishing, optional patch, history |
| `dist/` | Build output (gitignored) |

## Getting set up

```bash
npm install
npm run detect     # confirm the tooling finds your Kiro install
npm run extract    # snapshot the localizable surface of that install
npm run sync       # download the workbench baseline
npm run build && npm run validate && npm run coverage
```

If `detect` cannot find Kiro, set `KIRO_INSTALL_DIR` to the directory containing
`resources/app/package.json`.

Node.js 18.17 or newer. No compilation step, no test framework - correctness is verified by
`build` (which fails on malformed input), `validate` (which checks every shipped string
against its English source) and `coverage`.

## What to edit

| Change | File |
| --- | --- |
| Fix or add a translation for Kiro's own UI in the core | `src/i18n/<locale>/kiro/core.kiro.i18n.json` |
| Same, for chat and agent session strings | `src/i18n/<locale>/kiro/core.chat.i18n.json` |
| Same, for the remaining core keys upstream misses | `src/i18n/<locale>/kiro/core.workbench.i18n.json` |
| Fix or add a `kiro.kiroAgent` manifest string | `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json` |
| Fix an inherited workbench translation | `src/i18n/<locale>/overrides/main.i18n.json` |
| Change agreed terminology | `src/i18n/<locale>/glossary.json` |
| Change the store page | `src/marketplace/README.md` — see the note below |
| Translate the runtime's own notifications | `src/i18n/<locale>/extension.l10n.json` |
| Change the runtime itself | `src/extension/main.cjs` |
| Add a string only the optional patcher can reach | `src/i18n/<locale>/patch/kiro.kiroAgent.json` |
| Enable a locale or bump the version | `config.json` |

Any file named `core*.i18n.json` under `kiro/` is merged into the `vscode` translation id.
The split is by area only - add a new one if a group grows unwieldy.

Do not edit anything under `dist/`, `metadata/`, `upstream/` or `reports/` - all four are
generated and gitignored.

**The store page is one file for every language.** Open VSX and the Marketplace render a single
page per extension, and the published pack bundles every enabled locale, so
`src/marketplace/README.md` has to serve all of them at once - and its text is what store search
indexes. Keep it multilingual: English for reach, then the languages the pack actually ships,
then the short "your language is missing" lines that let speakers of an unsupported language
find the repository. `build.mjs` will use `src/marketplace/README.<locale>.md` instead when a
build contains exactly one locale; no such file exists today, and adding one means maintaining a
second copy of the same information.

The short description and the search keywords are separate from that page: they live in
`config.json` (`pack.displayName`, `pack.description`) and `src/manifest.template.json`
(`keywords`).

## Finding what needs translating

```bash
npm run gap                                  # summary plus the largest gaps by module
npm run gap -- --module=kiroStandalone       # narrow to one area
npm run gap -- --skeleton=.tmp-todo.json     # a core.i18n.json shaped stub to fill in
```

`reports/kiro-core-gap-<locale>.json` lists every uncovered key with its English source.
Never write the skeleton straight into `src/` - the values are still English, and shipping
those would look like a finished translation.

`npm run coverage` reports three separate numbers, because they mean different things:

- **core workbench** - everything in the installed build, mostly inherited from vscode-loc
- **kiro core** - the subset upstream does not cover, i.e. what this project authors
- **kiro.kiroAgent** - the built-in extension's manifest strings

Only the last two are ours to fix.

## Translation rules

These are mechanical requirements. A pull request that breaks one of them will render
incorrectly at runtime, and `validate` will fail.

- **Placeholders.** `{0}`, `{1}` and friends must survive unchanged, with the same count.
  Reordering them is fine when the target grammar needs it; dropping one is not.
- **Codicons.** `$(add)`, `$(folder-opened)`, `$(loading~spin)` and similar markers are icon
  references. Keep them verbatim, including position relative to the text.
- **Command links.** In `[Enable MCP](command:kiroAgent.mcp.enable)` translate the label,
  never the `command:` target.
- **Menu mnemonics.** `&&` marks the access key in menu labels, as in `&&File`. Move it to a
  sensible position for the target language, do not delete it. The Chinese convention is
  `文件(&&F)`.
- **Key glyphs.** Keyboard hints such as `⌘Enter` and `⇅` stay as they are.
- **Whitespace and newlines.** `\n` sequences and leading or trailing spaces are load
  bearing - in tree view welcome text, and in strings that get concatenated at runtime.
  Preserve them; `validate` warns when the newline count changes.
- **Empty values are invalid.** The host rejects them. A handful of core keys have an empty
  English source (some color registrations); leave those out entirely rather than inventing
  text. `gap` excludes them from the denominator.
- **Terminology.** Follow `glossary.json`. If you disagree with an entry, change the
  glossary in the same pull request and explain why - do not translate a term two ways.
- **Match the official pack where a concept exists in both products.** Users switch between
  VS Code and Kiro constantly; inconsistency is worse than a slightly awkward term.

Comments are legal in these files: the build strips them before writing the shipped JSON.
The header comment in each `core*.i18n.json` explains what belongs there.

## Before opening a pull request

```bash
npm run build
npm run validate
npm run coverage
npm test           # only needed when you touch src/extension/
```

All must succeed. `validate` reporting a `marker mismatch` in a file this repository
maintains is an error, not a warning - fix the string.

Include in the description:

- the Kiro version you tested against (`npm run detect`)
- the coverage figures for the locale you touched
- for a new locale, a screenshot of the translated UI

## Adding a language

Every language `microsoft/vscode-loc` ships is already listed in `config.json` with
`enabled: false`.

1. Flip `enabled` to `true`. For a language upstream does not cover, add an entry with
   `upstreamPackDir: null` - the workbench stays English and only the Kiro strings are
   translated, which is still a net gain since no official pack exists for it either.
2. Write `src/i18n/<locale>/glossary.json`. Settle the terminology before translating; it is
   much cheaper than renaming a concept across 1400 strings later.
3. `npm run sync -- --locale=<locale>`, then
   `npm run gap -- --locale=<locale> --skeleton=.tmp-todo.json`.
4. Write `src/i18n/<locale>/kiro/core*.i18n.json` and
   `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json`. The Chinese files carry the English
   source in `//` comments and double as a reference.
5. `npm run build && npm run validate && npm run coverage`, then open the pull request.
6. Touch the two places that advertise the pack, since the store shows one page for every
   bundled locale: add your language to `src/marketplace/README.md` (moving it out of the
   "want your language?" list), and to `pack.displayName` / `pack.description` in `config.json`
   if it deserves to be searchable there.

Partial work is welcome. Untranslated keys fall back to English silently, so a language can
land at 40% and improve from there. Patch data (`src/i18n/<locale>/patch/`) is optional and can
come later - see below.

## Keeping up with Kiro releases

When Kiro updates, start with:

```bash
npm run check-upgrade
# or, always refresh and re-diff:
npm run check-upgrade -- --force
npm run check-upgrade -- --skeleton=.tmp-upgrade.json
```

That compares the installed Kiro version to `config.target.verifiedKiroVersions` and the last
`metadata/kiro.json` extract. On a mismatch (or with `--force`) it re-runs `extract`, lists
**added / removed** core keys, and which of them still lack a translation under
`src/i18n/<locale>/kiro/`. Reports land in `reports/upgrade-<kiroVersion>-<locale>.json`.

**Check `orphanedAuthored` before translating anything.** Those are keys this repository has a
translation for that the new build no longer contains, and the usual cause is not a deleted
string but a *moved* one: Kiro 1.0.242 reorganised the chat contrib into `widget/`, `attachments/`,
`tools/`, `accessibility/` and `widgetHosts/` subfolders, which put ~470 finished translations out
of range at once. The build silently drops them, so the symptom is a chunk of UI reverting to
English.

The fix is a module rename, not a retranslation. For each orphaned module, look for a module in
`metadata/kiro.json` with the same basename and overlapping key names, then rename the key in
`src/i18n/<locale>/kiro/core*.i18n.json`. Two things make this safe to verify: the key names have
to match, and `npm run validate` compares every string against the English source, so a rename
onto the wrong module shows up as marker mismatches. Note that a build can register the same file
under both its old and its new path - `simpleBrowserEditorOverlay` and `modelPickerActionItem` do
in 1.0.242 - in which case both entries are needed.

Manual follow-up (same as before):

```bash
npm run sync        # refresh vscode-loc baseline if needed
npm run gap         # uncovered-by-upstream work list
npm run audit       # manifest / webview reachability
npm run coverage    # untranslated keys in the built pack
```

Then add the new Kiro version to `target.verifiedKiroVersions` in `config.json` and bump
`version`. If you use the optional install patch, an upgrade has silently reverted it:
`npm run patch -- --status` confirms that, then `npm run patch -- --restore` (to drop the stale
record and backups) and `npm run patch -- --apply` puts it back.

Publishing: see [docs/publishing.md](docs/publishing.md).

## Reporting problems

Open an issue with:

- Kiro version and platform
- which pack and edition is installed
- the string as displayed, and what you expected

Two things to check first:

- **A mostly English UI after installing.** Make sure no other language pack is installed.
  Two extensions claiming the `vscode` id resolve by scan order, which is not stable.
- **Nothing changed at all.** `languagepacks.json` is rebuilt when Kiro starts, so a CLI
  install needs one restart.

For strings that cannot be reached by a language pack - anything inside the chat panel, the
hook or powers editors, or the account and usage popup - please do not open a translation
issue here. Those need i18n support in Kiro itself;
`reports/manifest-audit-kiro.kiroAgent.json` documents the exact gap and is intended as
evidence for an upstream request. Some of them can be translated with `npm run patch`, at
the cost of editing the install; see the README.

### Contributing to the runtime

`src/extension/main.cjs` is deliberately small and has one rule: **it may only do things a
language pack cannot do by declaration.** A language pack works with no code at all, so
every line here has to earn its place. Today that is two features - the language picker and
the conflicting-pack warning.

Anything that reads or writes outside `argv.json` needs a strong argument, and the file
header lists every path the runtime touches; keep that list accurate, the README quotes it.
`npm test` covers the argv.json edit. It is `.cjs` in the repo because the repository is an
ESM package; the build copies it to `extension.js` inside the `.vsix`, where the manifest has
no `type` field and it is CommonJS again.

### Contributing to the patcher

A locale becomes patchable by adding `src/i18n/<locale>/patch/kiro.kiroAgent.json`; the patcher
lists the ones that have it under `npm run patch -- --list`, and refuses a `--locale` without it.
This is optional work - the language pack is the supported path, and a locale is perfectly
useful without patch data.

The file has three sections and two very different risk profiles.

- `manifest` is safe. Values are replaced structurally in
  `extensions/kiro.kiro-agent/package.json`, only in fields the host renders, so a short
  English word like `Enable` cannot end up in a command id.
- `extension` and `webview` are plain text replacement inside JavaScript bundles. Only add
  literals that are long, unambiguous, and clearly display text. `(optional)` was tried and
  rejected because it also occurs inside the bundled TextMate grammars for Clarity and
  Fortran. The script refuses anything shorter than six characters, but that is a floor, not
  a guarantee - check the occurrence counts in the dry run.

Entries are applied longest first, so `files changed` is consumed before `file changed`.
Always verify with `npm run patch` (dry run) before `--apply`, and confirm the counts are
what you expect: an unexpected extra hit means the literal is not unique.

`--apply` does three things after the rewrite - installs the `.vsix`, uninstalls conflicting
language packs, sets `locale` in `argv.json` - so that a patched install actually comes up in the
chosen language. They are outside the patch record because none of them touch the application
directory, and each has an opt-out (`--no-extension`, `--keep-official`, `--no-set-locale`). The
`argv.json` write is not reimplemented there: `scripts/lib/argv.mjs` loads the shipped
implementation out of `src/extension/main.cjs`, so `npm test` covers both callers. Keep it that
way.

## License of contributions

By contributing you agree that your work is released under the MIT License, the same terms
as the rest of this repository.
