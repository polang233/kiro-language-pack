# Kiro Language Pack

Kiro 中文语言包，支持简体中文和使用台湾用词的繁体中文，覆盖编辑器、会话、设置、规格与指引界面。

[English](README.en.md)

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack 图标" />

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)

| 安装前 · English | 安装后 · 简体中文 |
| --- | --- |
| ![英文](docs/images/before-en.png) | ![简体中文](docs/images/after-zh-cn.png) |

## 命令行安装

推荐 Node.js 22+，最低 18.17。先完全退出 Kiro。

npm 包尚未首次发布，以下 npx 入口在首发后可用。

```bash
npx @polang233/kiro-language-pack@latest
```

默认执行 `install`，安装语言包并翻译程序内的文案。包内自带本版本 VSIX，无需下载源码或构建。指定语言和安装目录：

```bash
npx @polang233/kiro-language-pack@latest --locale=zh-tw --dir="安装目录"
```

| 子命令 | 用途 |
| --- | --- |
| `preview` | 预览改动 |
| `status` | 查看状态 |
| `restore` | 只恢复程序文件 |

系统语言为 TW/HK/MO 或 zh-Hant 时自动选 `zh-tw`，沿用台湾用词；其他选 `zh-cn`。可用 `--locale` 指定。`--dir` 指向含 `resources/app` 的安装目录，macOS 为 `Kiro.app/Contents`。

安装后重新打开 Kiro；应用更新后重跑安装命令。扩展和显示语言可在应用内切换，`restore` 不会卸载扩展或重置显示语言。

可在仓库内联调源码入口，准备步骤见 [npm 维护说明](docs/npm.md)：

```bash
node bin/cli.mjs preview --locale=zh-tw
```

## 扩展安装

1. 卸载其他语言包，避免与官方 VS Code 中文包冲突。
2. 在扩展中搜索 **Kiro Language Pack** 或 **汉化**，也可从 [GitHub Releases](https://github.com/polang233/kiro-language-pack/releases) 下载 VSIX，通过 **Extensions: Install from VSIX…** 安装。
3. 命令面板运行 **Language Pack: Select Display Language**，选简体或繁体，完全退出 Kiro 后重新打开。

扩展 id 保持 `polang233.kiro-language-pack`。也可用设置 `kiroLanguagePack.language` 选择 `auto`、`zh-cn`、`zh-tw` 或 `en`，切换后重启。仅安装扩展时，部分写死在程序里的英文需要命令行安装才能翻译。

当前译文对应 Kiro **1.4.26**（Code OSS 1.131.0）。新增或未覆盖的文案会显示英文。界面语言不影响 AI 回复语言，可通过 `.kiro/steering/language.md` 指定回复语言。

## 开发与许可

[维护与源码测试](docs/npm.md) · [发布](docs/publishing.zh-CN.md) · [架构](docs/architecture.zh-CN.md) · [贡献](CONTRIBUTING.md)

MIT。工作台译文来自 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，见 [NOTICE](NOTICE)。社区项目，与 AWS、Microsoft 无隶属关系。
