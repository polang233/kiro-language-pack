# Kiro Language Pack

[Kiro IDE](https://kiro.dev/) 社区语言包：既翻译编辑器主体，**也**翻译 Kiro 自己的界面（会话列表、
Settings、聚焦智能体、规格与指引工具栏）。

[English](README.md) · **简体中文**

[![Open VSX](https://img.shields.io/open-vsx/v/polang233/kiro-language-pack?label=Open%20VSX)](https://open-vsx.org/extension/polang233/kiro-language-pack)
[![下载量](https://img.shields.io/open-vsx/dt/polang233/kiro-language-pack)](https://open-vsx.org/extension/polang233/kiro-language-pack)

<img src="media/icon.png" width="96" height="96" alt="Kiro Language Pack 图标" />

项目本身是按多语言设计的，**当前发布的只有简体中文和繁体中文**——因为只有这两种语言有人翻译。
`config.json` 里另外预置了 11 种 locale，等人来填，见[新增语言](#新增语言)。

## 效果

| 安装前 · English | 安装后 · 简体中文 |
| --- | --- |
| ![英文](docs/images/before-en.png) | ![简体中文](docs/images/after-zh-cn.png) |

## 两种安装方式

装扩展是正常路径，受支持。打补丁是给"想把最后那几十条也翻过来"的人准备的额外步骤，代价也写在下面。

| | **装扩展** | **扩展 + 安装目录补丁** |
| --- | --- | --- |
| 怎么做 | 装一个 `.vsix` | 克隆本仓库，跑 `npm run patch -- --apply` |
| 翻译范围 | 编辑器主体 + Kiro 暴露给语言包的全部界面 | 以上全部，再加约 89 条写死在 Kiro 安装目录里的文案 |
| VS Code 官方语言包 | 需要你自己先卸载 | 补丁会询问后帮你卸载 |
| 显示语言 | 装完自己选 | 补丁直接帮你写好 |
| Kiro 升级后还在吗 | 在 | 不在——每次升级后要重新打 |
| AWS 是否支持 | 支持，它就是个普通扩展 | 不支持，安装目录被改过 |
| 怎么撤销 | 卸载扩展 | `npm run patch -- --restore`，再卸载扩展 |

## 安装扩展

1. **先卸载其他语言包。** 本包替代 VS Code 官方语言包（[原因](docs/architecture.zh-CN.md#单个自包含扩展)）。
   两个包同时装着，界面会变成每次重启翻译得都不一样。
2. 安装：
   - **在 Kiro 里（推荐）：** 扩展视图 → 搜索 **Kiro Language Pack**（或 中文语言包）→ 安装。
     商店页：[Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack)
   - 或从 [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) 下 `.vsix`，
     命令面板 → **Extensions: Install from VSIX…**
3. 命令面板 → **Language Pack: Select Display Language** → 选语言 → 重启。

Windows 上别双击 `.vsix`，那个后缀可能被 Visual Studio 占用，请从命令面板安装。

### 之后怎么换语言

下面三种都行，都不用重装扩展——包里带的语言早就在磁盘上了：

- 命令面板 → **Language Pack: Select Display Language**
- 设置项 `kiroLanguagePack.language`（`auto`、`zh-cn`、`zh-tw`、`en`）
- Kiro 自带的 **Configure Display Language**

选 `en` 就是整个界面回到英文，扩展留着不动。三种方式都只改 `argv.json` 里的 `locale` 字段，别的不碰。
显示语言是启动参数，所以必须重启 Kiro，重载窗口不算。

## 可选：给安装目录打补丁

Kiro 有一部分文案是直接写死在程序里的英文字面量，任何语言包都碰不到。补丁就是就地改掉它们，然后把
剩下的配置一并做完：

```bash
git clone https://github.com/polang233/kiro-language-pack
cd kiro-language-pack
npm install
npm run package            # 先打出补丁要安装的 .vsix

npm run patch -- --list    # 找到了哪些 Kiro 安装、哪些语言能打补丁
npm run patch              # 干跑：把每一处改动打印出来，什么都不写
npm run patch -- --apply   # 真的执行
```

安装目录或语言不止一个时，`npm run patch` 会问你选哪个，所以在终端里不需要记参数。写进脚本时再显式指定：

```bash
npm run patch -- --locale=zh-tw --install-dir="C:\Users\me\AppData\Local\Programs\Kiro" --apply
```

`--apply` 会依次做四件事，每件都能跳过：

| 步骤 | 跳过参数 |
| --- | --- |
| 改写够不到的文案，动之前先备份每个文件 | — |
| 把语言包 `.vsix` 装进同一个 Kiro | `--no-extension`，或 `--vsix=<路径>` |
| 卸载与本包冲突的语言包 | `--keep-official` |
| 把 `argv.json` 的 `locale` 设成你选的语言 | `--no-set-locale` |

`npm run patch -- --status` 看某个安装的补丁还在不在——Kiro 升级会不声不响地把补丁过的文件换回去。
`npm run patch -- --restore` 还原。

完整说明（改了哪些文件、有什么风险）：[docs/advanced-patch.zh-CN.md](docs/advanced-patch.zh-CN.md)。

## 语言支持情况

| Locale | 状态 |
| --- | --- |
| `zh-cn` 简体中文 | 已发布——编辑器主体译文 + Kiro 专有文案 1335 条全覆盖（100%） |
| `zh-tw` 繁體中文 | 已发布——同样范围、同样 100%，用台湾习惯用词 |
| `ja` `ko` `fr` `de` `es` `it` `ru` `pt-br` `tr` `pl` `cs` | `config.json` 里已预置，`enabled: false`，还没有译文 |

一个扩展声明所有已启用的 locale，Kiro 按 `argv.json` 里的 `locale` 加载对应译文；没翻译的键静默回落英文。
也就是说一种语言翻到 40% 就可以先发出来，之后慢慢补。

### 新增语言

这份列表只能靠贡献变长，欢迎提 Pull Request：

1. 在 `config.json` 里把你的 locale 改成 `enabled: true`。如果
   [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) 没有这门语言，就设
   `upstreamPackDir: null`：编辑器主体保持英文，只翻 Kiro 部分——那也比现在什么都没有强。
2. 建 `src/i18n/<locale>/`，先定术语表再翻译。
3. `npm run build && npm run validate && npm run coverage`。

详细步骤、`validate` 会强制检查的译文规则、以及怎么找出还没翻的键：
[CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language)。

## 已知局限

以下位置仍是英文，因为 Kiro 根本没把这些文案外置——语言包碰不到，补丁也只能覆盖一部分：

- 聊天面板
- 钩子（hook）和能力（powers）编辑器
- 账户与用量弹窗

`reports/manifest-audit-kiro.kiroAgent.json` 把缺口逐条记了下来，用途是向上游提 i18n 需求。
这几处请不要在本仓库提翻译 issue。

界面语言和 AI 用什么语言回复是两件事。想让模型说中文，加一个 steering 文件，例如
`.kiro/steering/language.md`。

已对齐 Kiro **1.0.395**、**1.0.309**（Code OSS 1.109.5）、**1.0.242**（Code OSS 1.108.2）与 **1.0.228**，见
`config.json` 的 `target.verifiedKiroVersions`。其他版本基本能用；这之间 Kiro 新增的字符串会先回落英文，
直到有人跑 `npm run check-upgrade` 把新增部分翻出来。

要注意升级不只会*新增*字符串，还会*搬走*字符串——1.0.242 重构了聊天模块的路径，导致约 470 条已翻译的
文案悄悄失效。`npm run check-upgrade` 会把它们报成 orphaned key，修法是改模块路径，而不是重新翻译。

## 开发

Node.js 18.17 以上，无需编译。

```bash
npm install
npm run detect          # 找到本机的 Kiro 安装
npm run extract         # 抓取它的可本地化字符串快照
npm run sync            # 下载 vscode-loc 的编辑器主体译文底座
npm run verify          # build + validate + coverage
npm run package         # 产出 dist/kiro-language-pack-<version>.vsix
npm run check-upgrade   # Kiro 升级后：变了什么、还有什么要翻
```

文档：[架构](docs/architecture.zh-CN.md) · [贡献指南](CONTRIBUTING.md) ·
[上架流程](docs/publishing.zh-CN.md) · [文档索引](docs/README.zh-CN.md)

## 许可

MIT。编辑器主体译文来自同为 MIT 许可的
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，详见 [NOTICE](NOTICE)。

社区项目，与 AWS、Microsoft 无隶属关系，也未获得其背书或支持。
