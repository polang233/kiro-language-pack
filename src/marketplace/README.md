# Kiro Language Pack

![Kiro Language Pack icon](../../media/icon.png)

Community language pack for [Kiro IDE](https://kiro.dev/).

This extension ships **Simplified Chinese (简体中文)** and **Traditional Chinese (繁體中文)** in a single package. It localizes both the editor workbench and Kiro-specific UI. After installation, choose the display language in the Command Palette.

本扩展在**同一扩展包**中提供简体中文与繁体中文，覆盖编辑器主体与 Kiro 自有界面。安装后请在命令面板中选择显示语言。

**Important:** This pack replaces the official VS Code language pack. Uninstall any other language pack before installing this one. Do not run them side by side.

**重要：** 本扩展替代 VS Code 官方语言包。安装前请先卸载其他语言包，请勿并存。

## Languages

| Locale | Language |
| --- | --- |
| `zh-cn` | Chinese (Simplified) · 简体中文 |
| `zh-tw` | Chinese (Traditional) · 繁體中文 |

Additional languages can be contributed through GitHub. Enabled locales are selected by the host according to the display language setting.

## Install

1. Uninstall any other language pack.
2. Install from the Extensions view, [Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack), or a [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) `.vsix`.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Language Pack: Select Display Language** → choose **中文（简体）** or **中文（繁體）** → restart.

You can switch between included languages without reinstalling the extension.

## Coverage

Included:

- Editor workbench (baseline from [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc))
- Kiro UI: session and project list, Settings, Agent Focus (聚焦智能体 / 聚焦智慧體), spec and steering toolbars, and `kiro.kiroAgent` manifest strings

Still in English (not externalized upstream): chat panel, hook editor, powers panel, and account / usage popup.

Verified on Kiro **1.0.228**. Other builds are expected to work in most cases; after a Kiro upgrade, see the repository upgrade notes.

AI reply language is separate from the UI language. Use project steering (for example `.kiro/steering/language.md`) if you need Chinese model responses.

## Contributing

Translations, terminology fixes, and **new languages** are welcome.

- Open an issue or pull request on [GitHub](https://github.com/polang233/kiro-language-pack)
- Contributor guide: [CONTRIBUTING.md](https://github.com/polang233/kiro-language-pack/blob/main/CONTRIBUTING.md)

To add a language: contribute files under `src/i18n/<locale>/`, then enable that locale in `config.json`. Several locales are already prepared and waiting for translations.

欢迎在 GitHub 提交译文改进，或贡献日语、韩语等其他语言。

## Privacy

When you confirm a language change, this extension writes only the `locale` field in `argv.json`. It does not send network requests or collect telemetry.

## License

MIT. Workbench strings include material from [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc). Not affiliated with AWS or Microsoft.

Full documentation: [README (English)](https://github.com/polang233/kiro-language-pack#readme) · [README（简体中文）](https://github.com/polang233/kiro-language-pack/blob/main/README.zh-CN.md)
