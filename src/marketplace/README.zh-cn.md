# Kiro 简体中文语言包

为 [Kiro IDE](https://kiro.dev/) 提供简体中文界面。社区维护，非官方项目。

[English](#english) · [安装](#安装) · [切换语言](#切换语言) · [覆盖范围](#覆盖范围)

---

## 安装

在 Kiro 中打开扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`），搜索 **Chinese (Simplified) Language Pack for Kiro** 并安装。

也可以从 [GitHub Releases](https://github.com/CHANGE-ME-owner/kiro-language-pack/releases) 下载 `.vsix`，然后在命令面板执行 `Extensions: Install from VSIX...`。

本语言包有两个版本：

| 版本 | 适用场景 |
| --- | --- |
| **完整版**（本页） | 独立使用，同时汉化编辑器界面与 Kiro 专有界面。**推荐** |
| **补充版**（`-addon` 后缀） | 已经装了 VS Code 官方中文语言包，只想补上 Kiro 专有界面 |

两个版本都声明 `zh-cn`，**请勿同时安装**，也不要和 VS Code 官方中文包一起装完整版。

## 切换语言

语言包本身不提供设置项 —— 显示语言由编辑器统一管理，切换方式和 VS Code 完全一致：

1. 打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. 执行 **Configure Display Language**（配置显示语言）
3. 选择 **中文（简体）**，然后重启 Kiro

如果找不到该命令，可以直接编辑配置文件。在用户目录下的 `.kiro/argv.json` 中加入：

```json
{
  "locale": "zh-cn"
}
```

各平台路径：

| 平台 | 路径 |
| --- | --- |
| Windows | `%USERPROFILE%\.kiro\argv.json` |
| macOS | `~/.kiro/argv.json` |
| Linux | `~/.kiro/argv.json` |

改完重启 Kiro 生效。想切回英文，把值改成 `"en"` 或删掉该字段。

## 覆盖范围

| 界面 | 状态 |
| --- | --- |
| 编辑器主体：菜单、命令面板、设置、源代码管理、终端、通知 | 已汉化（仅完整版） |
| 内置扩展：Git、Markdown、npm、各语言支持等 | 已汉化（仅完整版） |
| Kiro 命令、视图标题、规格编辑器工具栏、树视图引导文案 | 已汉化 |
| Kiro 聊天面板、Spec 面板、钩子编辑器、能力包面板的内部文案 | **暂无法汉化** |
| AI 回复所用语言 | 不适用，由引导文档控制 |

最后一行的限制是技术性的，不是没做：这些界面是打包后的 webview，文案硬编码在产物里，没有经过国际化抽取，语言包机制无法触及。相关进展见仓库中的 issue。

想让 AI 用中文回复，在项目里建一个引导文档 `.kiro/steering/language.md`：

```markdown
始终使用简体中文回复。
```

## 报告问题与参与翻译

译文问题、术语建议、新增语言都欢迎：

- 提交 issue：<https://github.com/CHANGE-ME-owner/kiro-language-pack/issues>
- 术语约定见仓库 `src/i18n/zh-cn/glossary.json`

## 许可与声明

MIT 许可。编辑器主体的译文基线来自 MIT 许可的 [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc)，详见随包的 `NOTICE`。

本项目为独立社区项目，与 Amazon Web Services, Inc. 及 Microsoft Corporation 无隶属关系，也未获其背书。产品名称仅用于说明兼容性。

---

<a id="english"></a>

## English

Simplified Chinese user interface for the [Kiro IDE](https://kiro.dev/). Community maintained, unofficial.

**Install** from the extension view, or download a `.vsix` from
[Releases](https://github.com/CHANGE-ME-owner/kiro-language-pack/releases) and run
`Extensions: Install from VSIX...`.

**Switch the language** with the **Configure Display Language** command, or set
`"locale": "zh-cn"` in `~/.kiro/argv.json` and restart Kiro. A language pack contributes
no settings of its own; the display language is owned by the editor.

**Two editions** are published. The full edition is self-contained and covers both the
editor workbench and the Kiro specific UI. The `-addon` edition carries only the Kiro
strings, for people who already run the official VS Code language pack. Both declare the
`zh-cn` language id, so install exactly one.

**Scope.** Command titles, view names, spec editor toolbars and tree view welcome text of
Kiro are translated. Text rendered inside Kiro's webview panels (chat, spec, hook editor,
powers) is compiled into the bundles without an i18n layer, so it cannot be reached by any
language pack. See the repository issues for upstream progress.

MIT licensed. The workbench baseline is derived from the MIT licensed
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc); see the bundled `NOTICE`.
Not affiliated with or endorsed by Amazon Web Services, Inc. or Microsoft Corporation.
