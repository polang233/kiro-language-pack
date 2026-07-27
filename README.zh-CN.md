# Kiro Language Pack

[Kiro IDE](https://kiro.dev/) 界面语言包，社区维护。

[English](README.md) · **简体中文**

Kiro 目前只有英文界面，并且没有提供切换自有面板语言的入口。本仓库构建可直接安装的语言包，
汉化 Kiro 界面；如果选择完整版，还会一并汉化整个编辑器主体，一个扩展搞定全部。

所有产物都由构建流水线生成。贡献者只维护译文文件和术语表，清单生成、key 过滤、覆盖率统计、
打包都由脚本完成。

---

## 支持的语言

| Locale | 语言 | Kiro 界面 | 编辑器主体 | 状态 |
| --- | --- | --- | --- | --- |
| `zh-cn` | 中文（简体） | 72 / 72（100%） | 由配套语言包提供 | 可用 |

数据基于 Kiro 1.0.228（Code OSS 1.107.1）实测。欢迎新增语言，且**不需要改任何代码**，
见[新增语言](#新增语言)。

## 设计取向：互补，而不是替代

发布的语言包只汉化 **Kiro 自有界面**，与 VS Code 官方中文语言包并存，编辑器主体仍由官方包
负责。原因很实际：大多数人已经在用官方包，不愿意为了汉化 Kiro 面板把它换掉。

这不是权宜之计。宿主会把所有声明同一 `languageId` 的扩展的译文表**合并**成
`languagepacks.json` 里一张扁平的 `id -> 路径` 表。本包只声明 `kiro.kiroAgent` 这一个 id，
官方包不提供它，因此没有可争的东西。已在 Kiro 1.0.228 上双装实测：每个 id 都解析到预期的扩展。

| 版本 | 扩展名 | 内容 | 体积 | 默认 |
| --- | --- | --- | --- | --- |
| **Kiro 版** | `kiro-language-pack-<locale>` | 只含 Kiro 译文，与官方语言包配套 | 约 11 KB | 发布 |
| **Standalone 版** | `kiro-language-pack-<locale>-standalone` | 编辑器主体译文 + Kiro 译文，自包含，替代官方包 | 约 430 KB | 仅本地构建 |

Standalone 在 `config.json` 里默认关闭。想只装一个扩展搞定全部就打开它，但那种情况下不要再留
着官方包 —— 两者都会声明 `vscode` 这个 id。

## 安装

两个扩展各管一半界面：

| 扩展 | 负责 |
| --- | --- |
| 本语言包 | Kiro 自有界面：命令、视图标题、规格编辑器工具栏 |
| Chinese (Simplified) Language Pack for Visual Studio Code | 编辑器主体：菜单、命令面板、设置、源代码管理、终端 |

在 Kiro 的扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`）里把两个都装上。Kiro 默认使用
[Open VSX](https://open-vsx.org/) 市场。如果你已经在用官方语言包，那只有本包是新增的，
原有设置一切不变。

也可以从 [Releases](../../releases) 下载 `.vsix`：

```
命令面板 -> Extensions: Install from VSIX...
```

## 切换显示语言

语言包本身不提供设置项 —— 显示语言由编辑器统一管理，Kiro 沿用了 Code OSS 的机制：

1. 打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. 执行 **Configure Display Language**
3. 选择语言，然后重启 Kiro

如果找不到该命令，直接改 `argv.json`：

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

## 哪些能汉化，哪些不能

下面是实测结论，不是估计。在自己的安装上跑 `npm run audit` 可以复现这些数字。

| 界面 | 可达 | 说明 |
| --- | --- | --- |
| 编辑器主体：菜单、命令面板、设置、源代码管理、终端、通知 | 可以 | 由配套的官方语言包负责，或用 Standalone 版 |
| 内置扩展：Git、Markdown、npm、各语言支持、主题 | 可以 | 同上，Standalone 版内含 92 个译文包 |
| Kiro 命令标题、视图名、规格编辑器工具栏、树视图引导文案 | 可以 | 183 条可本地化清单字符串中有 107 条走了 `%key%`，背后是 `package.nls.json` 的 72 条 key。 |
| Kiro 设置项描述、部分命令标题、部分视图名 | **不能** | 有 76 条清单字符串是直接写死的英文字面量，没有 `%key%` 间接层，语言包无能为力。 |
| Kiro 聊天面板、Spec 面板、钩子编辑器、能力包面板、Settings 面板 | **不能** | 346 个 webview bundle，约 12.9 MiB，打包时没有做国际化抽取。 |
| Kiro 运行时消息（`vscode.l10n.t()`） | 已就绪 | Kiro 清单里声明了 `"l10n"` 但还没调用该 API。构建已经预留 `contents.bundle` 段，Kiro 一旦开始用就能立刻翻译。 |

最后两行是上游的限制，不是这里偷懒。`npm run audit` 生成的报告会列出每一条无法触及的字符串，
就是准备用来附在给上游的 i18n 需求里的。

想让 AI 用中文回复，那和界面无关，加个引导文档就行，例如 `.kiro/steering/language.md`。

## 实现方式

VS Code（因此也包括 Kiro）通过语言包贡献点解析界面字符串。语言包是一个不含代码的扩展，
声明如下：

```json
{
  "contributes": {
    "localizations": [{
      "languageId": "zh-cn",
      "languageName": "Chinese Simplified",
      "localizedLanguageName": "中文（简体）",
      "translations": [
        { "id": "vscode", "path": "./translations/main.i18n.json" },
        { "id": "kiro.kiroAgent", "path": "./translations/extensions/kiro.kiroAgent.i18n.json" }
      ]
    }]
  }
}
```

每个译文文件把模块路径和 key 映射到译文。缺失的 key 会静默回退英文，所以不完整的翻译只会
显示英文，不会让界面出错。对内置扩展来说，宿主会从语言包同时读取清单字符串
（`contents.package`）和运行时译文包（`contents.bundle`），这正是 `kiro.kiroAgent`
能被翻译的原因。

流水线：

```
Kiro 安装目录 ──(extract)──> metadata/kiro.json ────────┐
                                                        │
microsoft/vscode-loc ──(sync)──> upstream/<locale>/ ─────┼──(build)──> dist/<pack>/ ──(package)──> .vsix
                                                        │
src/i18n/<locale>/{overrides,kiro} ─────────────────────┘
                                                        └──(coverage)──> reports/
```

`metadata/kiro.json` 是当前安装里所有可本地化 key 的快照，连英文原文一起存。它有三个用途：

- **过滤**：丢掉 Kiro 里不存在的 key —— 中文 Standalone 版丢了 8108 条，这就是产物能保持小
  体积的原因。
- **修复**：`vscode-loc` 跟的是最新版 VS Code，而 Kiro 的内核偏旧，于是有些继承来的译文
  已经和原文对不上了 —— 多出来的 `{2}` 会原样显示成字面量 `{2}`，被翻译过的 `command:`
  目标会让链接变成死文本。构建会把这些丢掉（中文 21 条），让它回退成英文，而不是显示错的
  内容。属于本仓库维护的文件里出现同类问题则会报警而不是静默丢弃，因为那是我们自己的 bug。
  这一项只对携带基线的 Standalone 版有意义。
- **覆盖率**：给 `coverage` 一个真实的分母，而不是估算。

这份快照是可选的，所以 CI 在没装 Kiro 的情况下也能构建，只是过滤和修复会跳过。

## 从源码构建

需要 Node.js 18.17 及以上。

```bash
npm install

npm run detect     # 探测本机 Kiro：版本、NLS 布局、扩展 id
npm run extract    # 把可本地化范围快照到 metadata/kiro.json
npm run audit      # 量化语言包到底能覆盖多少 Kiro 界面
npm run sync       # 从 microsoft/vscode-loc 下载编辑器主体译文基线
npm run build      # 为每个 locale 和版本组装 dist/<pack>/
npm run validate   # 结构校验 + 占位符/图标/命令链接完整性检查
npm run coverage   # 覆盖率统计与未翻译 key 清单
npm run package    # 产出 .vsix
```

常用参数写在 `--` 之后：

```bash
npm run build -- --locale=zh-cn --mode=kiro
npm run build -- --mode=standalone    # 需先在 config.json 里启用
npm run build -- --no-filter          # 保留本机 Kiro 里不存在的 key
npm run build -- --no-repair          # 保留标记已漂移的上游译文
npm run sync -- --force               # 忽略缓存重新下载
npm run sync -- --strategy=api        # 用 GitHub API 列文件（需要 GITHUB_TOKEN）
npm run package -- --skip-build
```

`npm run detect` 不一定能猜到 Kiro 装在哪。指向安装根目录即可，也就是包含
`resources/app/package.json` 的那一层：

```powershell
$env:KIRO_INSTALL_DIR = "C:\Users\<你>\AppData\Local\Programs\Kiro"
```

### 安装自己构建的包

产物在 `dist/` 下：

```
dist/kiro-language-pack-zh-cn-0.1.0.vsix                 Kiro 版（默认构建）
dist/kiro-language-pack-zh-cn-standalone-0.1.0.vsix      Standalone 版（需在 config.json 里启用）
```

**不要双击 `.vsix` 文件。** 如果机器上装了 Visual Studio，这个后缀会被它的 VSIX Installer
接管，然后报 `NoApplicableSKUsException`。那是文件关联的问题，不是包的问题。

命令行安装最稳妥。`kiro` 不在 PATH 里时用安装目录下的 `bin\kiro.cmd`：

```powershell
$kiro = 'F:\AI\Kiro\bin\kiro.cmd'          # 换成你的安装路径
& $kiro --install-extension dist\kiro-language-pack-zh-cn-0.1.0.vsix
& $kiro --list-extensions | Select-String language-pack
```

装 Kiro 版**不需要**卸载官方语言包，两者是配套关系。装完重启 Kiro。

验证是否生效：看侧边栏 Kiro 视图的标题是否变成「智能体钩子」「智能体引导与技能」
「MCP 服务器」，以及打开 `.kiro/specs/*/requirements.md` 时工具栏是否显示
「需求 / 设计 / 任务列表 / 同步文件 / 全部运行」。

还可以直接查宿主合并后的结果，确认每个 id 解析到了哪个扩展：

```powershell
node -e "const j=require(process.env.APPDATA+'/Kiro/languagepacks.json');console.log(j['zh-cn'].translations['kiro.kiroAgent'])"
```

该文件在 Kiro 启动时重建，所以 CLI 装完要重启一次才会更新。

想还原：卸载该扩展即可，官方包和 `argv.json` 都不用动。

## 仓库结构

```
config.json                       唯一配置入口：publisher、版本、locale 列表、构建模式
src/
  manifest.template.json          扩展清单骨架
  marketplace/README.<locale>.md  扩展市场页面展示的内容
  i18n/<locale>/
    glossary.json                 该语言的术语约定
    kiro/<extId>.i18n.json        Kiro 译文，本项目的核心资产
    overrides/main.i18n.json      对上游编辑器主体基线的人工修正
scripts/                          构建流水线
metadata/                         生成物，已 gitignore
upstream/                         译文缓存，已 gitignore
dist/                             构建产物，已 gitignore
reports/                          覆盖率与审计报告，已 gitignore
```

## 新增语言

不需要改代码。

1. 在 `config.json` 的 `locales` 里追加一项。`upstreamPackDir` 填
   [vscode-loc](https://github.com/microsoft/vscode-loc/tree/main/i18n) 里对应的目录；
   如果上游没有该语言就填 `null`，该 locale 的完整版会自动跳过。
2. 建 `src/i18n/<locale>/glossary.json`，**先把术语定下来**。
3. 建 `src/i18n/<locale>/kiro/kiro.kiroAgent.i18n.json`。直接复制中文那份改值即可，
   文件里的行内注释保留了英文原文。
4. 建 `src/marketplace/README.<locale>.md`。
5. 跑 `npm run build && npm run coverage`。

评审要求与翻译规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与署名

MIT，见 [LICENSE](LICENSE)。

完整版中编辑器主体的译文来自
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，其源码与译文均为 MIT
许可。每次构建所用的上游 commit 会记录在生成的清单里。完整署名见 [NOTICE](NOTICE)，
该文件随每个 `.vsix` 一起分发。

本项目为独立社区项目，与 Amazon Web Services, Inc. 及 Microsoft Corporation 无隶属关系，
也未获其背书。产品名称仅用于说明兼容性。
