# Kiro Language Pack

Community language pack for [Kiro IDE](https://kiro.dev/) — it translates the editor
workbench **and** Kiro's own interface (session list, Settings, Agent Focus, spec and
steering toolbars).

**English** · [简体中文](README.zh-CN.md)

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack icon" />

The project is built to hold any number of languages. **Today it ships Simplified Chinese
and Traditional Chinese** — those are the two that have translators. Eleven more locales are
already declared in `config.json` and waiting for someone to fill them in; see
[Adding a language](#adding-a-language).

## Preview

| Before · English | After · 简体中文 |
| --- | --- |
| ![English](docs/images/before-en.png) | ![Simplified Chinese](docs/images/after-zh-cn.png) |

## Two ways to install it

The extension is the normal, supported route. The patch is an extra step for people who
want the last few strings translated too, and it is not free of consequences.

| | **Extension** | **Extension + install patch** |
| --- | --- | --- |
| How | Install one `.vsix` | Clone this repo, run `npm run patch -- --apply` |
| Translates | Workbench + everything Kiro exposes to a language pack | The above, plus ~89 strings hard-coded inside the Kiro install |
| Official VS Code language pack | You uninstall it yourself | The patcher offers to uninstall it |
| Display language | You pick it after install | The patcher sets it for you |
| Survives a Kiro update | Yes | No — re-run the patch after every update |
| Supported by AWS | Yes, it is a normal extension | No, the install is modified |
| Undo | Uninstall the extension | `npm run patch -- --restore`, then uninstall |

## Install the extension

1. **Uninstall any other language pack first.** This pack replaces the official VS Code one —
   [why](docs/architecture.md#one-self-contained-extension). Two packs installed together give
   you a UI that is translated differently after each restart.
2. Install the pack:
   - from a [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) `.vsix` —
     Command Palette → **Extensions: Install from VSIX…**
   - or from Open VSX once the listing is live:
     [polang233/kiro-language-pack](https://open-vsx.org/extension/polang233/kiro-language-pack)
3. Command Palette → **Language Pack: Select Display Language** → pick a language → restart.

On Windows, do not double-click the `.vsix`; Visual Studio may claim the file type. Install it
from the Command Palette instead.

### Switching language later

Any of these work, and none of them require reinstalling — every bundled language is already
on disk:

- Command Palette → **Language Pack: Select Display Language**
- Settings → `kiroLanguagePack.language` (`auto`, `zh-cn`, `zh-tw`, `en`)
- The built-in **Configure Display Language** command

Picking `en` returns the whole UI to English while the pack stays installed. All three write
the `locale` field in `argv.json` and nothing else. The display language is a launch argument,
so Kiro has to be restarted, not just reloaded.

## Optional: patching the install

Some Kiro strings are English literals compiled into the application — no language pack can
reach them. The patcher rewrites them in place, then finishes the setup:

```bash
git clone https://github.com/polang233/kiro-language-pack
cd kiro-language-pack
npm install
npm run package            # build the .vsix the patcher will install

npm run patch -- --list    # which Kiro installs were found, which languages are patchable
npm run patch              # dry run: prints every change, writes nothing
npm run patch -- --apply   # do it
```

`npm run patch` asks which install and which language when there is more than one option, so
the flags are optional in a terminal. Name them explicitly in a script:

```bash
npm run patch -- --locale=zh-tw --install-dir="C:\Users\me\AppData\Local\Programs\Kiro" --apply
```

`--apply` performs four steps, each one skippable:

| Step | Skip with |
| --- | --- |
| Rewrite the unreachable strings, after backing up every file it touches | — |
| Install the language pack `.vsix` into that same Kiro | `--no-extension`, or `--vsix=<path>` |
| Uninstall language packs that conflict with this one | `--keep-official` |
| Set `locale` in `argv.json` to the language you chose | `--no-set-locale` |

`npm run patch -- --status` reports whether an install is still patched — useful after a Kiro
update, which silently replaces the patched files. `npm run patch -- --restore` puts the
originals back.

Full detail, including the exact file list and the risks:
[docs/advanced-patch.md](docs/advanced-patch.md).

## Language support

| Locale | Status |
| --- | --- |
| `zh-cn` 简体中文 | Shipped — workbench baseline plus all 979 Kiro-specific strings (100%) |
| `zh-tw` 繁體中文 | Shipped — same surface at 100%, Taiwan-oriented terminology |
| `ja` `ko` `fr` `de` `es` `it` `ru` `pt-br` `tr` `pl` `cs` | Declared in `config.json`, `enabled: false`, no translations yet |

One extension declares every enabled locale; Kiro loads the one matching `locale` in
`argv.json`, and any key without a translation falls back to English. That means a language
can ship at 40% and improve from there.

### Adding a language

Contributions are the only way this list grows — open a pull request:

1. Set `enabled: true` for your locale in `config.json`. If
   [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) has no pack for it, set
   `upstreamPackDir: null`: the workbench stays English and only the Kiro strings get
   translated, which is still more than exists today.
2. Add `src/i18n/<locale>/` — glossary first, then the translation files.
3. `npm run build && npm run validate && npm run coverage`.

Step-by-step instructions, the translation rules that `validate` enforces, and how to find
untranslated keys: [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language).

## Known limits

Still English, because Kiro has not externalized these strings at all — a language pack cannot
reach them and the patcher only covers part:

- the chat panel
- the hook and powers editors
- the account and usage popup

`reports/manifest-audit-kiro.kiroAgent.json` documents the exact gap and is meant as evidence
for an upstream i18n request. Please do not file translation issues for those surfaces here.

The UI language does not change what language the AI answers in. For that, add a steering
file such as `.kiro/steering/language.md`.

Reconciled against Kiro **1.0.242** (Code OSS 1.108.2) and **1.0.228** — see
`target.verifiedKiroVersions` in `config.json`. Other builds generally work; strings Kiro adds
in between fall back to English until someone runs `npm run check-upgrade` and translates the
additions.

A Kiro update can also *move* strings rather than add them — 1.0.242 reorganised the chat
modules, which silently took ~470 already-translated strings out of range. `npm run check-upgrade`
reports those as orphaned keys; they are fixed by renaming the module path, not by retranslating.

## Development

Node.js 18.17 or newer. No compile step.

```bash
npm install
npm run detect          # find the local Kiro install
npm run extract         # snapshot its localizable strings
npm run sync            # download the vscode-loc workbench baseline
npm run verify          # build + validate + coverage
npm run package         # dist/kiro-language-pack-<version>.vsix
npm run check-upgrade   # after a Kiro update: what changed, what needs translating
```

Docs: [architecture](docs/architecture.md) · [contributing](CONTRIBUTING.md) ·
[publishing](docs/publishing.md) · [all documents](docs/README.md)

## License

MIT. Workbench strings are derived from the MIT-licensed
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc); see [NOTICE](NOTICE).

A community project. Not affiliated with, endorsed by, or supported by AWS or Microsoft.
