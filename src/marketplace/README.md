# Kiro Language Pack — 简体中文 / 繁體中文

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)
[![Downloads](https://img.shields.io/open-vsx/dt/polang233/kiro-language-pack)](https://open-vsx.org/extension/polang233/kiro-language-pack)

![Kiro Language Pack](../../media/icon.png)

Community language pack for [Kiro IDE](https://kiro.dev/). One extension, two languages:
**Simplified Chinese (简体中文)** and **Traditional Chinese (繁體中文)**. It translates the
editor workbench *and* Kiro's own interface — session list, Settings, Agent Focus, spec and
steering toolbars.

**简体中文** — Kiro IDE 中文语言包（汉化）。一个扩展内含简体与繁体中文，覆盖编辑器主体和 Kiro 自有界面
（会话列表、Settings、聚焦智能体、规格与指引工具栏）。安装后在命令面板选择显示语言即可。

**繁體中文** — Kiro IDE 中文語言包（漢化）。一個擴充內含簡體與繁體中文，涵蓋編輯器主體與 Kiro 自有介面
（工作階段清單、Settings、聚焦智慧體、規格與指引工具列）。安裝後在命令選擇區選擇顯示語言即可。

> **Read this first / 请先看这条:** this pack **replaces** the official VS Code language pack.
> Uninstall `Chinese (Simplified) Language Pack for Visual Studio Code` (or any other language
> pack) before installing it — two packs installed together produce a UI that is translated
> differently after each restart.
>
> 本扩展**替代** VS Code 官方中文语言包。安装前请先卸载官方语言包或其他语言包，不要并存，否则界面每次
> 重启的翻译结果都不一样。

## Install / 安装

1. Uninstall any other language pack. 先卸载其他语言包。
2. In Kiro, open the Extensions view and search **Kiro Language Pack** (or 中文语言包) → Install.
   在 Kiro 扩展视图搜索 **Kiro Language Pack**（或 中文语言包）→ 安装。
   Listing / 商店页: [open-vsx.org/extension/polang233/kiro-language-pack](https://open-vsx.org/extension/polang233/kiro-language-pack)
3. Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Language Pack: Select Display
   Language** → pick **中文（简体）** or **中文（繁體）** → restart Kiro.
   命令面板 → **Language Pack: Select Display Language** → 选择语言 → 重启 Kiro。

The display language is a launch argument, so Kiro must be restarted — reloading the window is
not enough. 显示语言是启动参数，必须重启 Kiro，重载窗口无效。

## Switching language / 切换语言

Three equivalent ways, none of which need a reinstall — both languages are already on disk:
三种方式等价，都不用重装扩展，两种语言都已经在本地：

- **Language Pack: Select Display Language** in the Command Palette / 命令面板里的这条命令
- the `kiroLanguagePack.language` setting — `auto`, `zh-cn`, `zh-tw`, `en` / 设置项
- Kiro's built-in **Configure Display Language** / Kiro 自带的命令

Choosing `en` returns the whole UI to English with the pack still installed, so you can switch
back at any time. 选 `en` 就是整个界面回到英文，扩展留着，随时可以再切回来。

## What is translated / 翻译范围

Included / 已包含:

- The editor workbench — baseline from [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)
  / 编辑器主体，底座取自 vscode-loc
- Kiro's own UI, which Kiro compiled into the editor core: session and project list, Settings
  panel, Agent Focus (聚焦智能体 / 聚焦智慧體), spec and steering toolbars, supervised diff
  review / Kiro 自有界面，这部分被编进了编辑器内核
- The `kiro.kiroAgent` command titles, view names and setting descriptions / 内置扩展的清单文案

Still English / 仍是英文: the chat panel, the hook and powers editors, and the account/usage
popup. Kiro does not externalize those strings, so no language pack can reach them.
这几处 Kiro 没有把文案外置，任何语言包都碰不到。

An optional patch in the repository can translate about 89 further strings by rewriting files
inside the Kiro installation. It is not part of this extension, a Kiro update reverts it, and a
modified install is not supported by AWS — see the repository if you want it.
仓库里另有一个可选补丁，通过改写 Kiro 安装目录再多翻约 89 条文案。它不属于本扩展，Kiro 升级即失效，
且改过的安装 AWS 不予支持，需要的话请看仓库说明。

Reconciled against Kiro **1.1.14**, **1.0.437**, **1.0.395**, **1.0.309**, **1.0.242** and **1.0.228**. Other builds work; strings Kiro adds later
fall back to English until the pack catches up.
已对齐 Kiro 1.1.14、1.0.437、1.0.395、1.0.309、1.0.242 与 1.0.228；其他版本可用，之后新增的字符串会先回落英文。

The UI language is independent of the language the AI replies in — for that, use a steering
file such as `.kiro/steering/language.md`. 界面语言与 AI 回复语言无关，后者用 steering 文件控制。

## Want your language? / 想要其他语言？

This project is built for any number of languages; Chinese is simply where the translators are.
Eleven more locales are already declared and waiting for translations — Japanese, Korean,
French, German, Spanish, Italian, Russian, Portuguese (Brazil), Turkish, Polish and Czech.
Untranslated keys fall back to English, so a language can ship half-finished and improve from
there.

Contribute on GitHub: **[polang233/kiro-language-pack](https://github.com/polang233/kiro-language-pack)**
([contributor guide](https://github.com/polang233/kiro-language-pack/blob/main/CONTRIBUTING.md))

- 简体中文 — 欢迎提交译文修正，或贡献一门新语言。
- 繁體中文 — 歡迎提交譯文修正，或貢獻一門新語言。
- 日本語 — 日本語はまだありません。GitHub で翻訳を歓迎します。
- 한국어 — 한국어는 아직 없습니다. GitHub에서 번역 기여를 환영합니다.
- Français — pas encore de version française, contributions bienvenues sur GitHub.
- Deutsch — noch keine deutsche Übersetzung, Beiträge auf GitHub willkommen.
- Español — aún no hay traducción al español, se agradecen contribuciones en GitHub.
- Русский — русского перевода пока нет, вклад на GitHub приветствуется.

## Privacy / 隐私

The extension writes exactly one thing, and only after you confirm it: the `locale` field in
`argv.json`. No network requests, no telemetry, no other files.
本扩展只在你确认后写入 `argv.json` 的 `locale` 字段，不联网、不采集遥测、不动其他文件。

## License / 许可

MIT. Workbench strings are derived from the MIT-licensed
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc).

A community project. Not affiliated with, endorsed by, or supported by AWS or Microsoft.
社区项目，与 AWS、Microsoft 无隶属关系。

Documentation / 完整文档:
[English](https://github.com/polang233/kiro-language-pack#readme) ·
[简体中文](https://github.com/polang233/kiro-language-pack/blob/main/README.zh-CN.md)
