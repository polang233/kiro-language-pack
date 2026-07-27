# Kiro 简体中文语言包

汉化 [Kiro IDE](https://kiro.dev/) 的专有界面 —— 命令、视图标题、规格编辑器工具栏。
社区维护，非官方项目。

**与 VS Code 官方中文语言包并存互补，不会顶掉它。**

[English](#english) · [安装](#安装) · [切换语言](#切换语言) · [覆盖范围](#覆盖范围)

---

## 安装

需要两个扩展配合，各管一块：

| 扩展 | 负责 |
| --- | --- |
| **本扩展** | Kiro 自有界面：命令、视图标题、规格工具栏 |
| Chinese (Simplified) Language Pack for Visual Studio Code | 编辑器主体：菜单、命令面板、设置、源代码管理、终端 |

在扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`）里把两个都装上即可。如果你已经在用官方中文包，
那就只装本扩展，原有的一切保持不变。

这不是权宜之计：编辑器宿主会把所有声明同一语言的语言包的译文表**合并**起来，本扩展只声明
`kiro.kiroAgent` 这一项，官方包不提供它，两者不冲突。

也可以从 [GitHub Releases](https://github.com/CHANGE-ME-owner/kiro-language-pack/releases)
下载 `.vsix`，然后在命令面板执行 `Extensions: Install from VSIX...`。

> 别双击 `.vsix` 文件。装了 Visual Studio 的机器上，这个后缀会被它的安装器接管并报错。

如果你更想只装一个扩展搞定全部，仓库里还提供一个自包含的 **Standalone** 版本，它内置了编辑器
主体译文、用来替代官方包。默认不发布，需要自行构建。

## 切换语言

语言包不提供设置项 —— 显示语言由编辑器统一管理，方式和 VS Code 完全一致：

1. 打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. 执行 **Configure Display Language**（配置显示语言）
3. 选择 **中文（简体）**，然后重启 Kiro

找不到该命令的话，直接改配置文件。在 `argv.json` 里写：

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

本扩展覆盖 Kiro 专有界面中**所有可被语言包触及的字符串**，共 72 条：

- 命令：新建会话、创建检查点、打开 Kiro 钩子界面、配置能力包、将终端内容发送到聊天……
- 视图标题：智能体钩子、智能体引导与技能、MCP 服务器、聊天上下文
- 规格编辑器：需求、设计、任务列表、缺陷修复、同步文件、全部运行
- 编辑器标题：规格富文本编辑器、钩子富文本编辑器、规格视图
- 树视图引导文案与输入框提示

### 以下部分无法汉化

| 界面 | 原因 |
| --- | --- |
| 聊天面板、Spec 面板、钩子编辑器、能力包面板、Settings 面板的内部文案 | 这些是打包后的 webview，文案硬编码在产物里，没有做国际化抽取。语言包机制触及不到。 |
| Kiro 的设置项描述、少量命令标题与视图名 | Kiro 清单里有 76 条字符串是直接写死的英文字面量，没有走 `%key%` 间接层。 |

这两条是 Kiro 自身的限制，不是本包偷懒。仓库里有一份逐条列出这些字符串的审计报告，用来向上游
提交国际化支持请求。进展见仓库 issue。

想让 AI 用中文回复，那和界面无关，加个引导文档就行，例如 `.kiro/steering/language.md`：

```markdown
始终使用简体中文回复。
```

## 报告问题与参与翻译

- 提交 issue：<https://github.com/CHANGE-ME-owner/kiro-language-pack/issues>
- 术语约定见仓库 `src/i18n/zh-cn/glossary.json`
- 欢迎新增其他语言，加一个配置条目和一个目录即可，不需要改代码

## 许可与声明

MIT 许可。Standalone 版本中编辑器主体的译文基线来自 MIT 许可的
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，详见随包的 `NOTICE`。

本项目为独立社区项目，与 Amazon Web Services, Inc. 及 Microsoft Corporation 无隶属关系，
也未获其背书。产品名称仅用于说明兼容性。

---

<a id="english"></a>

## English

Simplified Chinese for the [Kiro IDE](https://kiro.dev/) specific user interface: commands,
view titles and the spec editor toolbar. Community maintained, unofficial.

**It complements the official VS Code language pack instead of replacing it.** Install both:
this extension covers Kiro's own UI, the official pack covers the editor workbench. The host
merges the translation maps of every extension contributing the same language, and this pack
only claims the `kiro.kiroAgent` id, which the official pack does not provide.

**Switch the language** with the **Configure Display Language** command, or set
`"locale": "zh-cn"` in `~/.kiro/argv.json` and restart Kiro. A language pack contributes no
settings of its own; the display language belongs to the editor.

**Scope.** All 72 strings that Kiro externalizes are translated: command titles, view names,
spec editor toolbar, editor titles and tree view welcome text. Text rendered inside Kiro's
webview panels (chat, spec, hook editor, powers, settings) is compiled into the bundles with
no i18n layer, and 76 further manifest strings are inline English literals - neither can be
reached by any language pack. The repository ships an audit report listing every one of them,
intended as evidence for an upstream request.

A self-contained **Standalone** edition that also bundles the workbench baseline is available
to build from source, for people who prefer a single extension.

MIT licensed. The Standalone workbench baseline derives from the MIT licensed
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc); see the bundled `NOTICE`.
Not affiliated with or endorsed by Amazon Web Services, Inc. or Microsoft Corporation.
