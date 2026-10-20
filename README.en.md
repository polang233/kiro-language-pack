# Kiro Language Pack

A multilingual language pack for Kiro. Simplified Chinese and Traditional Chinese are supported. It translates the editor and Kiro's own interface: the session list, Settings, Agent Focus, and the spec and steering toolbars.

[中文文档在此打开](README.md)

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack icon" />

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)
[![Downloads](https://img.shields.io/open-vsx/dt/polang233/kiro-language-pack)](https://open-vsx.org/extension/polang233/kiro-language-pack)

| Before · English | After · 简体中文 |
| --- | --- |
| ![English](docs/images/before-en.png) | ![Simplified Chinese](docs/images/after-zh-cn.png) |

Installing the extension is enough. Clone the repo and run the patch to translate some English that is compiled into the app.

## Install the extension

1. Uninstall any other language pack. This one replaces the official VS Code pack. Two packs together make the UI flip translations on every restart. [Why](docs/architecture.md#one-self-contained-extension).
2. Extensions → search **Kiro Language Pack**, **汉化**, or **中文语言包** → Install. Listing: [Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack). Or download a [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) `.vsix` and run **Extensions: Install from VSIX…**. Do not double-click the file on Windows.
3. Command Palette → **Language Pack: Select Display Language** → pick **中文（简体）** or **中文（繁體）** → **quit Kiro and open it again**. Reload is not enough.

To switch later, restart after any of these:

- Command Palette → **Language Pack: Select Display Language**
- Setting `kiroLanguagePack.language`: `auto`, `zh-cn`, `zh-tw`, `en`
- Kiro's **Configure Display Language**

`en` returns the UI to English. The extension stays installed.

## Install patch

The chat panel, the hook and powers editors, and the account and usage popup keep some English in the app files. The extension cannot change those. The patch translates about 89 more strings, installs this pack, and sets the display language. A Kiro update wipes the rewrite. Run it again. A modified install is not supported by AWS.

```bash
git clone https://github.com/polang233/kiro-language-pack
cd kiro-language-pack
npm install
npm run package
npm run patch -- --apply
```

Preview with `npm run patch`. Restore the app files with `npm run patch -- --restore`. Details: [docs/advanced-patch.md](docs/advanced-patch.md).

## Languages

| Locale | Status |
| --- | --- |
| `zh-cn` 简体中文 | Shipped. 1449 Kiro-authored strings (100%) |
| `zh-tw` 繁體中文 | Shipped. Same numbers, Taiwan terminology |
| `ja` `ko` `fr` `de` `es` `it` `ru` `pt-br` `tr` `pl` `cs` | Reserved, no translations yet |

One extension holds every enabled locale. Anything not translated stays English.

The current translation matches Kiro **1.4.0** (Code OSS 1.131.0), and also **1.1.70**, **1.1.14**, **1.0.437**, **1.0.395**, **1.0.309**, **1.0.242**, and **1.0.228**. Older versions generally work. On newer versions, newly added text stays English until we translate it.

The patch covers only part of the compiled English above. The UI language does not change the language the AI replies in. For that, add a steering file such as `.kiro/steering/language.md`.

### Adding a language

1. Set `enabled: true` for that locale in `config.json`. If [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) has no pack for it, set `upstreamPackDir` to `null`: the workbench stays English and only the Kiro strings are translated.
2. Add `src/i18n/<locale>/`: glossary first, then the translations.
3. `npm run build && npm run validate && npm run coverage`.

Details: [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language).

## Development

Node.js 18.17+.

```bash
npm install
npm run detect
npm run extract
npm run sync
npm run verify
npm run package
npm run check-upgrade
```

Docs: [architecture](docs/architecture.md) · [contributing](CONTRIBUTING.md) · [publishing](docs/publishing.md)

## License

MIT. Workbench strings come from [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc); see [NOTICE](NOTICE).

Not affiliated with AWS or Microsoft.
