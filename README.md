# Kiro Language Pack

Community language pack for [Kiro IDE](https://kiro.dev/) — workbench + Kiro UI in **Simplified** and **Traditional Chinese**.

**English** · [简体中文](README.zh-CN.md)

<img src="media/icon.png" width="128" height="128" alt="Kiro Language Pack icon" />

One extension, English marketplace title (**Kiro Language Pack**). After install, pick the display language in the Command Palette.

## Preview

**Before · English**

![English](docs/images/before-en.png)

**After · Simplified Chinese**

![Simplified Chinese](docs/images/after-zh-cn.png)

## Install

1. Uninstall any other language pack in Kiro (this pack **replaces** the official VS Code one).
2. Install from [Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack) or a [Release](https://github.com/polang233/kiro-language-pack/releases) `.vsix`.
3. Command Palette → **Language Pack: Select Display Language** → choose language → restart.

Windows: do not double-click the `.vsix` (Visual Studio may hijack it). Use **Extensions: Install from VSIX...**.

## Extension vs optional patch

| | Extension (recommended) | Optional install patch |
| --- | --- | --- |
| What | Normal language pack `.vsix` | `npm run patch -- --apply` rewrites 3 files inside the Kiro install |
| Covers | Workbench + Kiro UI (session list, Settings, Agent Focus, toolbars, …) | ~89 extra hard-coded strings the pack cannot reach |
| Safe / supported | Yes | No — wiped by Kiro updates; restore with `--restore` |
| Notes | Switch language anytime without reinstalling | `--apply` also installs `dist/*.vsix` if present (`--no-extension` to skip) |

Details: [docs/advanced-patch.md](docs/advanced-patch.md).

## Limits

Still English (Kiro upstream): chat webview, hook editor, powers panel, account/usage popup, and some inline manifest strings.

AI reply language is separate — add e.g. `.kiro/steering/language.md`.

Verified on Kiro **1.0.228**; other builds mostly work.

## Languages

| Locale | In this release |
| --- | --- |
| `zh-cn` / `zh-tw` | Yes |
| Others | Prepared in `config.json`; need translation files + `enabled: true` |

One pack lists every enabled locale; the host loads the one matching `locale` in `argv.json`.

## Docs & contribute

[docs/](docs/README.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [Publishing](docs/publishing.md)

```bash
npm install && npm run package
npm run check-upgrade   # after a Kiro upgrade
```

## License

MIT. Workbench strings from [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc). Not affiliated with AWS or Microsoft.
