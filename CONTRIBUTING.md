# Contributing

Translation fixes, terminology proposals and new languages are all welcome.
Read [README.md](README.md) first for how the build works. 中文说明见
[README.zh-CN.md](README.zh-CN.md)。

## Getting set up

```bash
npm install
npm run detect     # confirm the tooling finds your Kiro install
npm run extract    # snapshot the localizable surface of that install
npm run sync       # download the workbench baseline
npm run build && npm run coverage
```

If `detect` cannot find Kiro, set `KIRO_INSTALL_DIR` to the directory containing
`resources/app/package.json`.

Node.js 18.17 or newer. No compilation step, no test framework - correctness is verified by
`build` (which fails on malformed input) and by `coverage`.

## What to edit

| Change | File |
| --- | --- |
| Fix or add a Kiro translation | `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json` |
| Fix a workbench translation | `src/i18n/<locale>/overrides/main.i18n.json` |
| Change agreed terminology | `src/i18n/<locale>/glossary.json` |
| Change the marketplace page | `src/marketplace/README.<locale>.md` |
| Add a locale or bump the version | `config.json` |

Do not edit anything under `dist/`, `metadata/`, `upstream/` or `reports/` - all four are
generated and gitignored.

## Translation rules

These are mechanical requirements. A pull request that breaks one of them will render
incorrectly at runtime.

- **Placeholders.** `{0}`, `{1}` and friends must survive unchanged, with the same count.
  Reordering them is fine when the target grammar needs it; dropping one is not.
- **Codicons.** `$(add)`, `$(trash)` and similar markers are icon references. Keep them
  verbatim, including position relative to the text.
- **Command links.** In `[Enable MCP](command:kiroAgent.mcp.enable)` translate the label,
  never the `command:` target.
- **Key glyphs.** Keyboard hints such as `⌘Enter` and `⇅` stay as they are.
- **Whitespace and newlines.** `\n` sequences and leading or trailing spaces are load
  bearing in tree view welcome text. Preserve them.
- **Terminology.** Follow `glossary.json`. If you disagree with an entry, change the
  glossary in the same pull request and explain why - do not translate a term two ways.
- **English source comments.** Translation files carry the English text in `//` comments.
  Keep them in sync when a string changes upstream; they are how reviewers check your work
  without opening a second file.

Comments are legal in these files: the build strips them before writing the shipped JSON.

## Before opening a pull request

```bash
npm run build
npm run coverage
```

Both must succeed. Include in the description:

- the Kiro version you tested against (`npm run detect`)
- the coverage figure for the locale you touched
- for a new locale, a screenshot of the translated UI

## Reviewing a translation

Reviewers should check the mechanical rules above first, since those cause visible
breakage, then the wording. For the wording, prefer the terminology already used by the
official VS Code language pack for that language whenever a concept exists in both
products - users switch between the two constantly and inconsistency is worse than a
slightly awkward term.

## Adding a language

1. Append an entry to `locales` in `config.json`. `upstreamPackDir` points at the matching
   directory in [vscode-loc](https://github.com/microsoft/vscode-loc/tree/main/i18n), or is
   `null` when upstream has no pack for that language (the full edition is then skipped).
2. Write `src/i18n/<locale>/glossary.json`. Settle the terminology before translating; it is
   much cheaper than renaming a concept across 72 strings later.
3. Copy `src/i18n/zh-cn/kiro/kiro.kiroAgent.i18n.json` and replace the values.
4. Add `src/marketplace/README.<locale>.md`.
5. `npm run build && npm run coverage`, then open the pull request.

## Keeping up with Kiro releases

When Kiro updates, its string set moves. The workflow is:

```bash
npm run extract     # re-snapshot the new build
npm run audit       # see whether the reachable surface changed
npm run coverage    # find keys that are now untranslated
```

`coverage` writes `reports/coverage-<pack>.json`, whose `untranslated` array lists each
missing key together with its English source. That array is the TODO list. Newly added
Kiro strings show up there; removed ones disappear from the denominator automatically.

Then add the new Kiro version to `target.verifiedKiroVersions` in `config.json` and bump
`version`.

## Reporting problems

Open an issue with:

- Kiro version and platform
- which pack and edition is installed
- the string as displayed, and what you expected

For strings that cannot be reached by a language pack - anything inside the chat, spec, hook
or powers panels - please do not open a translation issue here. Those need i18n support in
Kiro itself; `reports/manifest-audit-kiro.kiroAgent.json` documents the exact gap and is
intended as evidence for an upstream request.

## License of contributions

By contributing you agree that your work is released under the MIT License, the same terms
as the rest of this repository.
