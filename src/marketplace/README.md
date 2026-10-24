# Kiro Language Pack — 简体中文 / 繁體中文

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)
[![Downloads](https://img.shields.io/open-vsx/dt/polang233/kiro-language-pack)](https://open-vsx.org/extension/polang233/kiro-language-pack)

![Kiro Language Pack](../../media/icon.png)

**Kiro 的多语言工具包（汉化 / 中文翻译）。** 目前支持简体中文和繁体中文。

安装本插件，可以把编辑器和 Kiro 自己的界面翻成中文：会话列表、设置、聚焦智能体、规格与指引。聊天面板、钩子和能力编辑器、账户与用量弹窗里还有一批写死的英文；要翻其中一部分，再用仓库里的补丁。

## 安装

1. 先卸载其他语言包。本扩展替代 VS Code 官方中文语言包，不要两个一起装。
2. 扩展里搜索 **Kiro Language Pack**、**汉化** 或 **中文语言包**，安装。
3. 命令面板 → **Language Pack: Select Display Language** → 选 **中文（简体）** 或 **中文（繁體）** → **完全退出 Kiro 再打开**。

换语言不用重装，改 `kiroLanguagePack.language`（`auto` / `zh-cn` / `zh-tw` / `en`）后同样要重启。选 `en` 回到英文。

当前翻译对应 Kiro **1.4.0**，并兼容 1.1.70、1.1.14、1.0.437、1.0.395、1.0.309、1.0.242、1.0.228。更新的版本里，新增界面会先显示英文。

界面语言和 AI 回复语言无关。想让模型说中文，用 `.kiro/steering/language.md` 这类指引文件。

## 安装目录补丁

写死在程序文件里的英文，扩展改不到。完全退出 Kiro，按 [README 的命令行安装说明](https://github.com/polang233/kiro-language-pack#readme) 操作，再重新打开。Kiro 更新后重跑安装命令。改过的安装 AWS 不支持。

## 其他语言 / Other languages

简体和繁体已经发布。日语、韩语、法语、德语、西班牙语等已在仓库里预留，**还没有译文**，需要对应语言的用户自己翻、提 PR。没翻的键显示英文。

Shipped: `zh-cn`, `zh-tw`. Other locales are declared in the repo and waiting for translations.

贡献: [polang233/kiro-language-pack](https://github.com/polang233/kiro-language-pack)

## 隐私 / Privacy

只在你确认后写 `argv.json` 的 `locale`。不联网，不采集。

## 许可 / License

MIT. 工作台译文来自 MIT 许可的 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)。

社区项目，与 AWS、Microsoft 无隶属关系。

文档: [简体中文](https://github.com/polang233/kiro-language-pack#readme) · [English](https://github.com/polang233/kiro-language-pack/blob/main/README.en.md)
