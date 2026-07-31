# Kiro Language Pack

[Kiro IDE](https://kiro.dev/) 社区语言包：既翻译编辑器主体，**也**翻译 Kiro 自己的界面（会话列表、Settings、聚焦智能体、规格与指引工具栏）。

Community language pack for [Kiro IDE](https://kiro.dev/) — translates the editor workbench **and** Kiro's own interface (session list, Settings, Agent Focus, spec and steering toolbars).

**简体中文** · [完整中文说明](README.zh-CN.md) · English below

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack icon" />

当前已发布 **简体中文** 与 **繁体中文**（有人翻译的才发）。`config.json` 里另预置了 11 种语言，欢迎贡献，见[新增语言](#adding-a-language--新增语言)。

Ships **Simplified** and **Traditional Chinese** today. Eleven more locales are declared in `config.json` and waiting for translators — see [Adding a language](#adding-a-language--新增语言).

## Preview / 效果

| Before · English | After · 简体中文 |
| --- | --- |
| ![English](docs/images/before-en.png) | ![Simplified Chinese](docs/images/after-zh-cn.png) |

## Two ways to install / 两种安装方式

装扩展是正常、受支持的路径。打补丁是给「想把最后那几十条也翻过来」的人准备的，有代价。

The extension is the normal, supported route. The patch is optional and not free of consequences.

| | **扩展 Extension** | **扩展 + 安装目录补丁 Patch** |
| --- | --- | --- |
| 怎么做 How | 装一个 `.vsix` | 克隆仓库，跑 `npm run patch -- --apply` |
| 翻译范围 Translates | 编辑器主体 + Kiro 暴露给语言包的全部界面 | 以上全部，再加约 89 条写死在安装目录里的文案 |
| 官方语言包 Official pack | 需要你自己先卸载 | 补丁会询问后帮你卸载 |
| 显示语言 Display language | 装完自己选 | 补丁直接帮你写好 |
| Kiro 升级后 Survives update | 在 Yes | 不在 — 每次升级后要重新打 |
| AWS 是否支持 Supported | 支持（普通扩展） | 不支持（改过安装目录） |
| 怎么撤销 Undo | 卸载扩展 | `npm run patch -- --restore`，再卸载扩展 |

## Install the extension / 安装扩展

> **请先看这条 / Read this first:** 本包**替代** VS Code 官方语言包。安装前请先卸载官方中文包或其他语言包，不要并存，否则界面每次重启翻译都不一样。
> This pack **replaces** the official VS Code language pack — [why](docs/architecture.md#one-self-contained-extension). Two packs together produce a UI that is translated differently after each restart.

1. **先卸载其他语言包。** Uninstall any other language pack first.
2. **安装本包：**
   - 从 [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) 下载 `.vsix` → 命令面板 → **Extensions: Install from VSIX…**
   - 或等 Open VSX 上架后搜索：[polang233/kiro-language-pack](https://open-vsx.org/extension/polang233/kiro-language-pack)
3. 命令面板 → **Language Pack: Select Display Language** → 选 **中文（简体）** 或 **中文（繁體）** → **重启 Kiro**（重载窗口不够）。

Windows 上**不要双击** `.vsix`（可能被 Visual Studio 抢走关联），请从命令面板安装。

### Switching language later / 之后怎么换语言

三种方式都行，都不用重装——包里带的语言已经在磁盘上：

- 命令面板 → **Language Pack: Select Display Language**
- 设置项 `kiroLanguagePack.language`（`auto` / `zh-cn` / `zh-tw` / `en`）
- Kiro 自带的 **Configure Display Language**

选 `en` 就是整个界面回到英文，扩展留着不动。显示语言是启动参数，必须**重启** Kiro。

## Optional: patching the install / 可选：安装目录补丁

有一部分文案是写死在程序里的英文字面量，语言包碰不到。补丁就地改掉它们，并把配置一并做完：

```bash
git clone https://github.com/polang233/kiro-language-pack
cd kiro-language-pack
npm install
npm run package            # 先打出补丁要安装的 .vsix

npm run patch -- --list    # 找到了哪些 Kiro 安装、哪些语言能打补丁
npm run patch              # 干跑：打印改动，什么都不写
npm run patch -- --apply   # 真的执行
```

安装目录或语言不止一个时，终端里会问你选哪个。写进脚本时再显式指定：

```bash
npm run patch -- --locale=zh-tw --install-dir="C:\Users\me\AppData\Local\Programs\Kiro" --apply
```

`--apply` 依次做四件事，每件都能跳过：

| 步骤 Step | 跳过 Skip with |
| --- | --- |
| 改写够不到的文案（先备份） | — |
| 把语言包 `.vsix` 装进同一个 Kiro | `--no-extension`，或 `--vsix=<路径>` |
| 卸载与本包冲突的语言包 | `--keep-official` |
| 把 `argv.json` 的 `locale` 设成所选语言 | `--no-set-locale` |

`npm run patch -- --status` 看补丁还在不在（Kiro 升级会悄悄换回原文件）。  
`npm run patch -- --restore` 还原。

完整说明与风险：[docs/advanced-patch.md](docs/advanced-patch.md) · [中文](docs/advanced-patch.zh-CN.md)

## Language support / 语言支持

| Locale | Status / 状态 |
| --- | --- |
| `zh-cn` 简体中文 | 已发布 — 编辑器主体 + Kiro 专有文案 979 条全覆盖（100%） |
| `zh-tw` 繁體中文 | 已发布 — 同样范围 100%，台湾习惯用词 |
| `ja` `ko` `fr` `de` `es` `it` `ru` `pt-br` `tr` `pl` `cs` | `config.json` 已预置，`enabled: false`，尚无译文 |

一个扩展声明所有已启用 locale；没翻译的键回落英文。翻到 40% 也可以先发，之后慢慢补。

### Adding a language / 新增语言

欢迎提 Pull Request：

1. 在 `config.json` 把该 locale 设为 `enabled: true`。若 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) 没有这门语言，设 `upstreamPackDir: null`：编辑器主体保持英文，只翻 Kiro 部分。
2. 建 `src/i18n/<locale>/`，先定术语表再翻译。
3. `npm run build && npm run validate && npm run coverage`。

详细步骤与校验规则：[CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language)

## Known limits / 已知局限

以下仍是英文——Kiro 没把文案外置，语言包碰不到，补丁也只能覆盖一部分：

- 聊天面板 / the chat panel
- 钩子（hook）和能力（powers）编辑器
- 账户与用量弹窗 / account and usage popup

这几处请不要在本仓库提翻译 issue。`reports/manifest-audit-kiro.kiroAgent.json` 记录了缺口，用于向上游提 i18n 需求。

界面语言 **≠** AI 回复语言。想让模型说中文，加 steering 文件，例如 `.kiro/steering/language.md`。

已对齐 Kiro **1.0.242**（Code OSS 1.108.2）与 **1.0.228**。其他版本一般能用；新增字符串会先回落英文，直到有人跑 `npm run check-upgrade` 补译。升级也可能*搬走*字符串（1.0.242 重构聊天模块路径，约 470 条已译文曾失效）——修法是改模块路径，不是重翻。

## Development / 开发

Node.js 18.17+，无需编译。

```bash
npm install
npm run detect          # 找到本机 Kiro / find local install
npm run extract         # 抓取可本地化字符串 / snapshot strings
npm run sync            # 下载 vscode-loc 底座 / workbench baseline
npm run verify          # build + validate + coverage
npm run package         # 产出 .vsix
npm run check-upgrade   # Kiro 升级后：变了什么、还要翻什么
```

文档 Docs：[架构 architecture](docs/architecture.md) · [中文](docs/architecture.zh-CN.md) · [贡献 CONTRIBUTING](CONTRIBUTING.md) · [上架 publishing](docs/publishing.md) · [中文](docs/publishing.zh-CN.md) · [索引](docs/README.md)

## License / 许可

MIT。编辑器主体译文来自 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)；见 [NOTICE](NOTICE)。

社区项目，与 AWS、Microsoft 无隶属关系，也未获其背书或支持。  
A community project. Not affiliated with, endorsed by, or supported by AWS or Microsoft.
