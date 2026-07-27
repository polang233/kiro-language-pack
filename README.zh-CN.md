# Kiro Language Pack

[Kiro IDE](https://kiro.dev/) 语言包，社区维护。

[English](README.md) · **简体中文**

Kiro 目前只有英文界面。本仓库构建**一个**可直接安装的扩展，汉化整个编辑器：Code OSS 主体、
内置扩展，以及 Kiro 自己加的那些界面 —— 会话列表、Settings 面板、规格与引导工具栏、监督差异
审阅、被重写过的聊天界面。

扩展会声明所有已启用的语言，由宿主按显示语言自动选择，没翻到的条目回退英文。语言包本身不提供
任何设置项。

所有产物都由构建流水线生成。贡献者只维护译文文件和术语表，清单生成、key 过滤、覆盖率统计、
打包都由脚本完成。

---

## 支持的语言

| Locale | 语言 | 编辑器主体 | Kiro 自有字符串 | 状态 |
| --- | --- | --- | --- | --- |
| `zh-cn` | 中文（简体） | 15588 / 15607（99.9%） | 1404 / 1404（100%）+ 清单 72 / 72 | 可用 |

数据基于 Kiro 1.0.228（Code OSS 1.107.1）实测。`config.json` 里已经预置了另外 12 种语言，
只差译文文件，见[新增语言](#新增语言)。

## 设计：单个自包含扩展

语言包同时携带来自
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) 的编辑器主体基线**和**本项目
自己写的 Kiro 译文。因此它占用 `vscode` 这个翻译 id，会**替代** VS Code 官方语言包。两者不要
同时安装。

这不是偏好，而是 Kiro 的实现决定的。Kiro 是一个 fork，把自己的界面直接编译进了 Code OSS
内核：

```
resources/app/out/nls.messages.json
  vs/workbench/contrib/kiroStandalone/…       会话列表、Settings 面板、智能体聚焦模式
  vs/workbench/contrib/spec/…                 规格工具栏
  vs/workbench/contrib/steering/…             引导工具栏
  vs/workbench/contrib/supervisedDiff/…       逐块审阅
  vs/workbench/contrib/chat/…                 大幅重写
```

这些字符串属于 `vscode` 这个翻译 id，而不是某个独立扩展 id。而宿主对每个 id 只认一个文件 ——
`%APPDATA%\Kiro\languagepacks.json` 把每个翻译 id 映射到唯一路径，扫描扩展时直接覆盖赋值：

```js
for (const c of localization.translations)
  entry.translations[c.id] = join(extension.location.fsPath, c.path);
```

**没有按 key 合并的机制。** 想汉化 Kiro 的 Settings 面板，就必须提供 `vscode` 这个文件，而两个
扩展不可能同时提供它。把主体基线一起打包进来，正是为了让占用这个 id 不至于让工作台退化。

这样换掉官方包不会有损失：主体译文来自官方包同源的那份 MIT 许可 `vscode-loc` 快照，而且本构建
还会额外丢掉占位符已经和原文对不上的继承译文（见[实现方式](#实现方式)里的「修复」）。

| 版本 | 扩展名 | 内容 | 体积 | 默认 |
| --- | --- | --- | --- | --- |
| **完整版** | `kiro-language-pack` | 主体基线 + Kiro 译文，含所有已启用语言 | 约 460 KB | 发布 |
| **互补版** | `kiro-language-pack-<locale>-companion` | 仅 `kiro.kiroAgent` 清单字符串 | 约 11 KB | 仅本地构建 |

互补版能与官方包并存，因为它从不声明 `vscode`。代价是范围：它只能覆盖那 72 条清单字符串
（命令标题、视图名、规格工具栏），碰不到 Kiro 编译进内核的任何东西 —— Settings 面板仍是英文。
它在 `config.json` 里默认关闭，只有在实在不能放弃官方包时才启用。

## 安装

在 Kiro 的扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`）里安装。Kiro 默认使用
[Open VSX](https://open-vsx.org/) 市场。

如果 Kiro 里已经装了 VS Code 官方语言包，请先卸载。两个扩展争同一个 `vscode` id 时，结果取决
于扩展扫描顺序，而这个顺序并不稳定 —— 症状是界面有时是中文、有时大面积回退英文。语言包在启动时
会检测到这种情况并直接告诉你该卸载哪个扩展，不用你从症状去猜。

也可以从 [Releases](../../releases) 下载 `.vsix`：

```
命令面板 -> Extensions: Install from VSIX...
```

## 切换显示语言

直接在语言包里选：

- 命令面板执行 **Language Pack: Select Display Language**（选择显示语言），或者
- 改设置项 `kiroLanguagePack.language` —— `auto`、包内任一语言，或 `en`

两者都会写 `argv.json` 的 `locale` 字段并询问是否重启。`auto` 表示不干预编辑器，语言包只会问你
一次，点「不再提示」后就再也不问。

之所以要做这个：宿主只在语言包与系统区域一致时才主动提示切换：

> Would you like to change Kiro's display language to 中文（简体） and restart?

系统是英文的话这条提示永远不会出现，纯语言包就显得像没生效。你也可以继续走内置路径 —— 命令面板
里的 **Configure Display Language**，或者直接手改 `argv.json`：

```json
{
  "locale": "zh-cn"
}
```

| 平台 | 路径 |
| --- | --- |
| Windows | `%USERPROFILE%\.kiro\argv.json` |
| macOS | `~/.kiro/argv.json` |
| Linux | `~/.kiro/argv.json` |

改完重启 Kiro。想回到英文，把值改成 `"en"` 或删掉该字段。

### 运行时到底做了什么

语言包本来不需要代码，译文没有它也生效。这里仍然带了一个很小的文件，只做宿主没做的两件事：
上面那个语言选择器，以及当另一个扩展也声明了编辑器主体译文时给出警告 —— 否则症状是每次重启后
界面汉化程度都不一样。

它接触的东西，全部在这里：

| 操作 | 路径 | 时机 |
| --- | --- | --- |
| 读 | `<appRoot>/product.json` | 取用户数据目录名 |
| 读 | `~/<数据目录>/argv.json` | 读当前显示语言 |
| 写 | `~/<数据目录>/argv.json` | 只写 `locale` 一个字段，且必须你确认 |
| 读 | 已安装扩展的清单 | 检测冲突的语言包 |
| 写 | 本扩展自己的 globalState | 两个「不再提示」标记 |

不联网、不上报、不碰其他文件；`settings.json` 只在你自己改设置时才变动。`argv.json` 是**定点
替换**，注释和格式原样保留 —— 这是整个语言包里唯一有破坏性的操作，所以也是唯一带测试的部分
（`npm test`）。

想要一个完全不含代码的语言包，在 `config.json` 的构建模式上设 `runtime: false`。

## 哪些能汉化，哪些不能

下面是实测结论，不是估计。在自己的安装上跑 `npm run audit` 和 `npm run gap` 可以复现这些数字。

| 界面 | 可达 | 说明 |
| --- | --- | --- |
| 编辑器主体：菜单、命令面板、设置、源代码管理、终端、通知 | 可以 | vscode-loc 基线，15607 条 key。 |
| 内置扩展：Git、Markdown、npm、各语言支持、主题 | 可以 | 同一份基线里的 92 个译文包。 |
| Kiro 会话列表、项目列表、Settings 面板、智能体聚焦模式 | 可以 | `vs/workbench/contrib/kiroStandalone/*`。本项目自己翻译 —— 上游一条译文都没有。 |
| Kiro 规格工具栏、引导工具栏、监督差异审阅、欢迎轮播、许可证编辑器 | 可以 | 同样是 Kiro 加进内核的模块。 |
| Kiro 命令标题、视图名、树视图引导文案 | 可以 | 183 条可本地化清单字符串中有 107 条走了 `%key%`，背后是 `package.nls.json` 的 72 条 key。 |
| SPECS 视图标题、树视图引导文案及其按钮、多数 MCP 命令、Kiro 的设置项描述 | **不能** | 有 76 条清单字符串是直接写死的英文字面量，没有 `%key%` 间接层，任何语言包都碰不到 —— 见[打补丁到安装目录](#打补丁到安装目录)。 |
| Kiro 聊天面板、钩子编辑器、能力包面板、账户与用量弹窗 | **不能** | 都是打包时没做国际化抽取的 webview。`Estimated Usage`、`Credits`、`Manage Plan` 在内核 NLS 表和扩展的 JS 里都搜不到。 |
| Kiro 运行时消息（`vscode.l10n.t()`） | **不能** | Kiro 清单里声明了 `"l10n"` 但从未调用该 API；欢迎页里的工作流名称与描述也只是 `dist/extension.js` 里的普通字面量。构建已经预留 `contents.bundle` 段，Kiro 一旦开始用就能立刻翻译。 |

最后三行是上游的限制，不是这里偷懒。`npm run audit` 生成的报告会列出每一条无法触及的字符串，
就是准备用来附在给上游的 i18n 需求里的。

### 打补丁到安装目录

**扩展能做的都已经在扩展里做了。** 剩下的是任何扩展都碰不到的部分 —— 宿主根本不会为这些字符串
去查译文。后路是直接改写已安装的 Kiro，这是另一种性质的操作，严格可选。

```bash
npm run patch                  # 试运行，什么都不写
npm run patch -- --apply       # 应用，动手前先备份每个文件
npm run patch -- --status      # 当前安装打过补丁没有，补丁还在不在
npm run patch -- --restore     # 还原原始文件
```

中文这边可以多覆盖 89 条，只涉及三个文件：

| 文件 | 条数 | 内容 |
| --- | --- | --- |
| `extensions/kiro.kiro-agent/package.json` | 72 | `SPECS` 标题、三块树视图引导文案及其按钮、MCP 命令、信任与工具卡片设置项 |
| `extensions/kiro.kiro-agent/dist/extension.js` | 4 | 欢迎页里的工作流描述 |
| `extensions/kiro.kiro-agent/packages/kiro-ui-agent-chat/dist/assets/*.js` | 13 | `Let's build`、自动驾驶模式提示、已更改文件条 |

**这个清单之外的任何文件都不会被读取、写入、移动或删除。** 试运行会打印文件清单，并把每一条
改动前后的完整对照写进 `reports/patch-plan-<locale>.json`，你可以在应用前逐条审阅。应用之后同一份
清单会连哈希一起存到 `extensions/kiro.kiro-agent/.kiro-language-pack-patch.json`。

这是可选功能，且不受支持。按重要性排序：

- **Kiro 升级会把改过的文件覆盖回去。** 每次升级后重跑；`--status` 会告诉你是否已被覆盖。
- 它会修改应用程序目录。原始文件会复制到
  `extensions/kiro.kiro-agent/.kiro-language-pack-backup/`，并连哈希一起记录。
- AWS 不会为被改动过的安装提供支持。给 Kiro 提 bug 之前请先 `--restore`。
- 这些内容不会进 `.vsix`。语言包仍是受支持的路径，补丁只是叠加在它之上。

清单字段是**按结构**替换的，只处理宿主真正会渲染的字段（`title`、`contents`、`description`…），
所以译文表里的英文词不可能被塞进命令 id 或 `when` 子句。bundle 里的字面量是文本替换，因此表里
只放长且唯一的整句 —— `src/i18n/zh-cn/patch/kiro.kiroAgent.json` 开头记了一条被否掉的反例。

想让 AI 用中文回复，那和界面无关，加个引导文档就行，例如 `.kiro/steering/language.md`。

## 实现方式

VS Code（因此也包括 Kiro）通过语言包贡献点解析界面字符串。语言包是一个不含代码的扩展，
每种语言声明一个条目：

```json
{
  "contributes": {
    "localizations": [
      {
        "languageId": "zh-cn",
        "languageName": "Chinese Simplified",
        "localizedLanguageName": "中文（简体）",
        "translations": [
          { "id": "vscode", "path": "./translations/main.i18n.json" },
          { "id": "vscode.git", "path": "./translations/extensions/vscode.git.i18n.json" },
          { "id": "kiro.kiroAgent", "path": "./translations/extensions/kiro.kiroAgent.i18n.json" }
        ]
      }
    ]
  }
}
```

每个译文文件把模块路径和 key 映射到译文。缺失的 key 会静默回退英文，所以不完整的翻译只会
显示英文，不会让界面出错。宿主会读取每个已安装扩展的 `contributes.localizations`，因此一个
扩展可以服务任意多种语言。

流水线：

```
Kiro 安装目录 ──(extract)──> metadata/kiro.json ────────┐
                                                        │
microsoft/vscode-loc ──(sync)──> upstream/<locale>/ ─────┼──(build)──> dist/<pack>/ ──(package)──> .vsix
                                                        │
src/i18n/<locale>/{overrides,kiro} ─────────────────────┘
                                                        ├──(gap)──────> reports/kiro-core-gap-<locale>.json
                                                        └──(coverage)─> reports/
```

`metadata/kiro.json` 是当前安装里所有可本地化 key 的快照，连英文原文一起存。它有四个用途：

- **过滤**：丢掉 Kiro 里不存在的 key —— 中文丢了 8108 条，这就是产物从 1.4 MB 压到 460 KB 的
  原因。
- **修复**：`vscode-loc` 跟的是最新版 VS Code，而 Kiro 的内核偏旧，于是有些继承来的译文
  已经和原文对不上了 —— 多出来的 `{2}` 会原样显示成字面量 `{2}`，被翻译过的 `command:`
  目标会让链接变成死文本。构建会把这些丢掉（中文 19 条），让它回退成英文，而不是显示错的
  内容。属于本仓库维护的文件里出现同类问题则会报警而不是静默丢弃，因为那是我们自己的 bug。
- **差异分析**：`npm run gap` 把本机 key 集合与上游基线做差。差出来的部分（中文 1404 条）正是
  本项目必须自己翻译的范围，报告会连英文原文一起列出每一条。
- **覆盖率**：给 `coverage` 一个真实的分母，而不是估算。

这份快照是可选的，所以 CI 在没装 Kiro 的情况下也能构建，只是过滤、修复和差异分析会跳过。

## 从源码构建

需要 Node.js 18.17 及以上。

```bash
npm install

npm run detect     # 探测本机 Kiro：版本、NLS 布局、扩展 id
npm run extract    # 把可本地化范围快照到 metadata/kiro.json
npm run audit      # 量化语言包到底能覆盖多少 Kiro 界面
npm run gap        # 列出上游基线覆盖不到的内核字符串
npm run sync       # 从 microsoft/vscode-loc 下载编辑器主体译文基线
npm run build      # 组装 dist/<pack>/
npm run validate   # 结构校验 + 占位符/图标/命令链接完整性检查
npm run coverage   # 覆盖率统计与未翻译 key 清单
npm run test       # 测试运行时对 argv.json 的编辑
npm run package    # 产出 .vsix
npm run patch      # 可选：就地翻译任何扩展都碰不到的部分
```

常用参数写在 `--` 之后：

```bash
npm run build -- --locale=zh-cn
npm run build -- --mode=companion   # 需先在 config.json 里启用
npm run build -- --no-filter        # 保留本机 Kiro 里不存在的 key
npm run build -- --no-repair        # 保留标记已漂移的上游译文
npm run gap -- --module=kiroStandalone
npm run gap -- --skeleton=.tmp-todo.json    # 导出未翻译 key，可直接开始翻
npm run sync -- --force             # 忽略缓存重新下载
npm run sync -- --strategy=api      # 用 GitHub API 列文件（需要 GITHUB_TOKEN）
npm run package -- --skip-build
```

`npm run detect` 不一定能猜到 Kiro 装在哪。指向安装根目录即可，也就是包含
`resources/app/package.json` 的那一层：

```powershell
$env:KIRO_INSTALL_DIR = "C:\Users\<你>\AppData\Local\Programs\Kiro"
```

### 安装自己构建的包

**不要双击 `.vsix` 文件。** 如果机器上装了 Visual Studio，这个后缀会被它的 VSIX Installer
接管，然后报 `NoApplicableSKUsException`。那是文件关联的问题，不是包的问题。

命令行安装最稳妥。`kiro` 不在 PATH 里时用安装目录下的 `bin\kiro.cmd`：

```powershell
$kiro = 'F:\AI\Kiro\bin\kiro.cmd'          # 换成你的安装路径
& $kiro --install-extension dist\kiro-language-pack-0.1.0.vsix
& $kiro --list-extensions | Select-String language-pack
```

装完重启 Kiro。`languagepacks.json` 在启动时重建，所以 CLI 装完必须重启一次才会生效。确认每个
id 归属于哪个扩展：

```powershell
node -e "const j=require(process.env.APPDATA+'/Kiro/languagepacks.json');console.log(j['zh-cn'].translations['vscode'])"
```

然后重点看只有本包能覆盖的地方：智能体聚焦模式里的会话列表和 **Settings** 面板，以及打开
`.kiro/specs/` 下文件时的规格工具栏。

想还原：卸载该扩展，需要的话重新装回官方包。两种情况下 `argv.json` 都不用动。

## 仓库结构

```
config.json                       唯一配置入口：publisher、版本、locale 列表、构建模式
src/
  manifest.template.json          扩展清单骨架
  extension/main.cjs              运行时：语言选择器、冲突警告
  marketplace/README.md           扩展市场页面展示的内容
  i18n/<locale>/
    glossary.json                 该语言的术语约定
    extension.l10n.json           运行时自身的消息
    kiro/core.kiro.i18n.json      Kiro 自有界面，编译进 Code OSS 内核的那部分
    kiro/core.chat.i18n.json      上游未覆盖的聊天与智能体会话字符串
    kiro/core.workbench.i18n.json 上游未覆盖的其余内核 key
    kiro/<extId>.i18n.json        内置扩展清单字符串（kiro.kiroAgent）
    overrides/main.i18n.json      对上游编辑器主体基线的人工修正
    patch/kiro.kiroAgent.json     只有可选的安装目录补丁才能覆盖的字符串
scripts/                          构建流水线
metadata/                         生成物，已 gitignore
upstream/                         译文缓存，已 gitignore
dist/                             构建产物，已 gitignore
reports/                          覆盖率、差异与审计报告，已 gitignore
```

`kiro/` 下任何名为 `core*.i18n.json` 的文件都会合并进 `vscode` 这个翻译 id。按领域拆分只是
为了可读 —— 1400 条 key 挤在一个文件里没法评审。

## 新增语言

不需要改代码。`vscode-loc` 提供的全部 13 种语言都已列在 `config.json` 里，`enabled: false`。

1. 在 `config.json` 里把对应 locale 的 `enabled` 改成 `true`。如果是 `vscode-loc` 没有的语言，
   新增一项并把 `upstreamPackDir` 设为 `null`：编辑器主体保持英文，只翻 Kiro 部分。反正该语言
   本来也没有官方包，这仍然是净收益。
2. 建 `src/i18n/<locale>/glossary.json`，**先把术语定下来**。
3. 跑 `npm run sync -- --locale=<locale>` 拉基线，再跑
   `npm run gap -- --locale=<locale> --skeleton=.tmp-todo.json` 拿到待译清单。
4. 写 `src/i18n/<locale>/kiro/core*.i18n.json` 和
   `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json`。中文那几份在 `//` 注释里保留了英文原文，
   可以直接当参考。
5. 跑 `npm run build && npm run validate && npm run coverage`。

翻一部分也有价值：没翻到的 key 会回退英文，不会造成任何损坏。

评审要求与翻译规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与署名

MIT，见 [LICENSE](LICENSE)。

编辑器主体的译文来自
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，其源码与译文均为 MIT
许可。每次构建所用的上游 commit 会记录在生成的清单里。完整署名见 [NOTICE](NOTICE)，
该文件随每个 `.vsix` 一起分发。

本项目为独立社区项目，与 Amazon Web Services, Inc. 及 Microsoft Corporation 无隶属关系，
也未获其背书。产品名称仅用于说明兼容性。
