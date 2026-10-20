# Kiro Language Pack

Kiro 的多语言工具包，目前支持简体中文和繁体中文。翻译编辑器，以及 Kiro 自己的界面：会话列表、设置、聚焦智能体、规格与指引。

[英文文档在此打开](README.en.md)

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack 图标" />

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)
[![下载量](https://img.shields.io/open-vsx/dt/polang233/kiro-language-pack)](https://open-vsx.org/extension/polang233/kiro-language-pack)

| 安装前 · English | 安装后 · 简体中文 |
| --- | --- |
| ![英文](docs/images/before-en.png) | ![简体中文](docs/images/after-zh-cn.png) |

装扩展就能用。下载项目后打补丁，可以再翻掉一部分写死在程序里的英文。

## 安装扩展

1. 先卸载其他语言包。本扩展替代 VS Code 官方中文语言包，两个同时装，重启后翻译会乱。[原因](docs/architecture.zh-CN.md#单个自包含扩展)。
2. 扩展里搜索 **Kiro Language Pack**、**汉化** 或 **中文语言包**，安装。商店页：[Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack)。也可以从 [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) 下 `.vsix`，命令面板执行 **Extensions: Install from VSIX…**。Windows 不要双击 `.vsix`。
3. 命令面板 → **Language Pack: Select Display Language** → 选 **中文（简体）** 或 **中文（繁體）** → **完全退出 Kiro 再打开**。重载窗口无效。

之后换语言不用重装，仍然要重启：

- 命令面板 → **Language Pack: Select Display Language**
- 设置 `kiroLanguagePack.language`：`auto`、`zh-cn`、`zh-tw`、`en`
- Kiro 自带的 **Configure Display Language**

选 `en` 回到英文，扩展还在。

## 安装目录补丁

聊天面板、钩子和能力编辑器、账户与用量弹窗里，有一批英文写在程序文件里，扩展改不到。补丁大约再翻 89 条，并会装上语言包、设好显示语言。Kiro 更新后这些改动会消失，要再执行一次。改过的安装 AWS 不支持。

```bash
git clone https://github.com/polang233/kiro-language-pack
cd kiro-language-pack
npm install
npm run package
npm run patch -- --apply
```

先看会改什么：`npm run patch`。还原程序文件：`npm run patch -- --restore`。细节：[docs/advanced-patch.zh-CN.md](docs/advanced-patch.zh-CN.md)。

## 语言

| 语言 | 状态 |
| --- | --- |
| `zh-cn` 简体中文 | 已发布。Kiro 自有界面 1449 键（100%） |
| `zh-tw` 繁體中文 | 已发布。数字与简体相同，用台湾用词 |
| `ja` `ko` `fr` `de` `es` `it` `ru` `pt-br` `tr` `pl` `cs` | 已预留，尚无译文 |

一个扩展包含已启用的语言。没翻的句子显示英文。

当前翻译对应 Kiro **1.4.0**（Code OSS 1.131.0），并兼容 **1.1.70**、**1.1.14**、**1.0.437**、**1.0.395**、**1.0.309**、**1.0.242**、**1.0.228**。更老的版本一般能用。更新的版本里，新增界面会先显示英文。

上面那几处写死的英文，补丁也只覆盖其中一部分。界面语言和 AI 回复语言无关；想让模型说中文，用 `.kiro/steering/language.md` 这类指引文件。

### 添加语言

1. 在 `config.json` 把该语言的 `enabled` 设为 `true`。[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) 没有这门语言时，把 `upstreamPackDir` 设为 `null`：编辑器保持英文，只翻 Kiro 的字符串。
2. 添加 `src/i18n/<locale>/`，先写术语表，再写译文。
3. `npm run build && npm run validate && npm run coverage`。

细节：[CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language)。

## 开发

Node.js 18.17+。

```bash
npm install
npm run detect
npm run extract
npm run sync
npm run verify
npm run package
npm run check-upgrade
```

文档：[架构](docs/architecture.zh-CN.md) · [贡献](CONTRIBUTING.md) · [发布](docs/publishing.zh-CN.md)

## 许可

MIT。工作台译文来自 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)；见 [NOTICE](NOTICE)。

社区项目，与 AWS、Microsoft 无隶属关系。
