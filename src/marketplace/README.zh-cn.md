# Kiro 简体中文语言包

汉化 [Kiro IDE](https://kiro.dev/) 的整个界面 —— 包括编辑器主体，以及**其他语言包碰不到的
Kiro 自有界面**：会话列表、Settings 面板、智能体聚焦模式、规格与引导工具栏。社区维护，非官方项目。

[English](#english) · [安装](#安装) · [切换语言](#切换语言) · [覆盖范围](#覆盖范围)

---

## 安装

一个扩展搞定全部。装完之后选语言：

- 命令面板执行 **Language Pack: Select Display Language**（选择显示语言），或者
- 改设置项 `kiroLanguagePack.language`

两者都会替你写好显示语言并询问是否重启。如果系统语言本来就是中文，Kiro 也会自己弹出切换提示。

> **请先卸载其他中文语言包。** 本扩展是自包含的：它同时提供编辑器主体和 Kiro 自有界面的译文，
> 因此是**替代** VS Code 官方中文语言包，而不是与它并存。两个包争同一种语言时，结果取决于扩展
> 扫描顺序，症状是界面一半中文一半英文。本扩展会在启动时检测到这种情况，并直接告诉你该卸载哪个。

也可以从 [GitHub Releases](https://github.com/polang233/kiro-language-pack/releases)
下载 `.vsix`，然后在命令面板执行 `Extensions: Install from VSIX...`。

> 别双击 `.vsix` 文件。装了 Visual Studio 的机器上，这个后缀会被它的安装器接管并报错。

### 为什么必须替代而不能并存

Kiro 是一个 fork，把自己的界面直接编译进了 Code OSS 内核（`vs/workbench/contrib/kiroStandalone/*`
等模块）。这些字符串属于 `vscode` 这个翻译 id，而宿主对每个 id 只认一个文件、按扫描顺序覆盖赋值，
没有按 key 合并的机制。想汉化 Kiro 的 Settings 面板，就必须提供 `vscode` 这个文件，于是只能连
编辑器主体的译文一起打包。主体译文取自官方包同源的
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，所以换过来不会有损失。

仓库里另有一个只声明 `kiro.kiroAgent`、可与官方包并存的**互补版**，但它只能覆盖 72 条命令与视图
名，Settings 面板仍是英文。默认不发布，需要自行构建。

## 切换语言

语言包不提供设置项 —— 显示语言由编辑器统一管理，方式和 VS Code 完全一致。

如果系统语言就是中文，装完 Kiro 会主动询问并重启，直接同意即可。否则：

1. 打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. 执行 **Configure Display Language**（配置显示语言）
3. 选择 **中文（简体）**，然后重启 Kiro

找不到该命令的话，直接在 `argv.json` 里写：

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

改完重启 Kiro 生效。想切回英文，把值改成 `"en"` 或删掉该字段。

## 覆盖范围

基于 Kiro 1.0.228（Code OSS 1.107.1）实测：

| 界面 | 覆盖 |
| --- | --- |
| 编辑器主体：菜单、命令面板、设置、源代码管理、终端、通知 | 15588 / 15607（99.9%） |
| 内置扩展：Git、Markdown、npm、各语言支持、主题 | 92 个译文包 |
| Kiro 自有界面（上游没有任何译文的部分） | 1404 / 1404（100%） |
| Kiro 命令标题、视图名、树视图引导文案 | 72 / 72（100%） |

Kiro 自有界面具体包括：

- 会话与项目列表、更多操作菜单、工作树选择器
- **Settings 面板**：外观、启动模式、更新、智能体自主级别、模型、用量摘要、Tab 自动补全、
  终端命令超时、通知、MCP、隐私与数据
- 智能体聚焦模式、工作区管理器、欢迎轮播
- 规格工具栏：需求、设计、任务列表、缺陷修复、同步文件、全部运行、审阅设计
- 引导工具栏、监督差异审阅（接受/拒绝差异块）、许可证编辑器
- 聊天与智能体会话界面中被 Kiro 重写的部分

### 以下部分无法汉化

| 界面 | 原因 |
| --- | --- |
| 聊天面板本体、钩子编辑器、能力包面板、账户与用量弹窗 | 这些是打包后的 webview，文案硬编码在产物里，没有做国际化抽取。语言包机制触及不到。 |
| Kiro 的部分设置项描述、少量命令标题与视图名 | Kiro 清单里有 76 条字符串是直接写死的英文字面量，没有走 `%key%` 间接层。 |

这两条是 Kiro 自身的限制，任何扩展都碰不到。仓库里有一份逐条列出这些字符串的审计报告，用来向
上游提交国际化支持请求。

仓库另外提供一个**可选脚本**，通过改写已安装的 Kiro 来翻译这剩下的部分。它是有意为之的最后手段
—— Kiro 升级会覆盖回去，而且改过的安装不受官方支持 —— 所以不包含在本扩展里。需要的话看仓库
README。

## 除了翻译，本扩展还做了什么

没有多余动作。它读 `product.json` 定位用户数据目录，读取、并且**只在你确认后**写入 `argv.json`
的 `locale` 这一个字段，另外读已安装扩展的清单以警告语言包冲突。不联网，不上报。

想让 AI 用中文回复，那和界面无关，加个引导文档就行，例如 `.kiro/steering/language.md`：

```markdown
始终使用简体中文回复。
```

## 报告问题与参与翻译

- 提交 issue：<https://github.com/polang233/kiro-language-pack/issues>
- 术语约定见仓库 `src/i18n/zh-cn/glossary.json`
- 欢迎新增其他语言：`config.json` 里已预置 13 种语言，打开开关再补译文即可，不需要改代码

## 许可与声明

MIT 许可。编辑器主体的译文基线来自 MIT 许可的
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，详见随包的 `NOTICE`。

本项目为独立社区项目，与 Amazon Web Services, Inc. 及 Microsoft Corporation 无隶属关系，
也未获其背书。产品名称仅用于说明兼容性。

---

<a id="english"></a>

## English

Simplified Chinese for the whole [Kiro IDE](https://kiro.dev/) interface: the editor
workbench, the built-in extensions, and the parts no other language pack reaches - the
session list, the Settings panel, Agent Focus, the spec and steering toolbars, supervised
diff review. Community maintained, unofficial.

**Uninstall any other Chinese language pack first.** This pack is self-contained and
**replaces** the official VS Code language pack rather than sitting beside it. Kiro is a fork
that compiled its own UI into the Code OSS core, so those strings belong to the `vscode`
translation id, and the host resolves each id to exactly one file - there is no per-key
merge. Providing Kiro's translations therefore means providing the workbench baseline too.
That baseline comes from the same MIT-licensed
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) the official pack is built
from, so nothing is lost.

**Switch the language** by accepting the prompt Kiro shows after install, or run **Configure
Display Language** from the Command Palette, or set `"locale": "zh-cn"` in
`~/.kiro/argv.json` and restart. A language pack contributes no settings of its own.

**Coverage** against Kiro 1.0.228: 15588 / 15607 core workbench strings, all 1404 core
strings upstream does not cover, all 72 externalized `kiro.kiroAgent` manifest strings.

**Out of reach.** Kiro's chat panel, hook editor, powers panel and account/usage popup are
compiled webviews with no i18n layer, and 76 further manifest strings are inline English
literals. The repository ships an audit report listing every one of them, intended as
evidence for an upstream request.

MIT licensed. Not affiliated with or endorsed by Amazon Web Services, Inc. or Microsoft
Corporation.
