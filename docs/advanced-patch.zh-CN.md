# 进阶：打补丁到 Kiro 安装目录

**这是可选功能。** 正常使用只需安装语言包扩展。补丁会直接改写 Kiro 安装目录里的文件，用来
翻译任何扩展都碰不到的字符串。请先阅读 [README.md](../README.md) 里的常规安装流程。

## 什么时候可能需要

扩展已经覆盖了语言包机制能触及的几乎全部界面。以下部分会保持英文，除非打补丁：

| 界面 | 扩展为什么碰不到 |
| --- | --- |
| SPECS 视图标题、树视图引导文案及其按钮、多数 MCP 命令、Kiro 设置项描述 | 部分清单字符串直接写死为英文，没有 `%key%` 间接层 |
| 欢迎页里的工作流描述 | `dist/extension.js` 里的普通字面量，未走 `vscode.l10n.t()` |
| 聊天 UI 里的 `Let's build`、自动驾驶提示、已更改文件条等 | webview 打包时没有做国际化抽取 |

匹配的字符串和文件数量随 Kiro 版本变化，以当前安装的预览结果为准。`npm run audit` 会列出语言包机制无法触及的字符串。

## 命令

```bash
npm run patch -- --list        # 找到了哪些 Kiro 安装、哪些语言能打补丁
npm run patch                  # 预览，在用户目录生成报告
npm run patch -- --apply       # 真的执行
npm run patch -- --status      # 当前安装打过补丁没有，补丁还在不在
npm run patch -- --restore     # 还原被改写的文件（不会卸载语言包扩展）
```

本页命令面向源码仓库。自动选择系统语言的 npm 入口见 README。源码运行需要 Node.js 18.17+、本仓库，以及本机已安装的 Kiro。

## 选安装目录和语言

只要候选不止一个，脚本就会问你，所以在终端里不需要背参数：

```
Which Kiro installation?
   1. C:\Users\me\AppData\Local\Programs\Kiro  (Kiro 1.0.228)
   2. D:\Kiro                                  (Kiro 1.0.242)
  Choose 1-2 [1]:

Which language should this install be patched to?
   1. zh-cn  中文（简体） (Chinese Simplified)
   2. zh-tw  中文（繁體） (Chinese Traditional)
  Choose 1-2 [1]:
```

显式指定就不会再问——写进脚本时必须指定，因为非交互 shell 不会替你猜：

```bash
npm run patch -- --install-dir="D:\Kiro" --locale=zh-tw --apply
```

- `--install-dir=<路径>` 指的是包含 `resources/app` 的那一层目录；macOS 上是 `Kiro.app/Contents`。
  设环境变量 `KIRO_INSTALL_DIR` 等价。
- `--locale=<id>` 必须是 `config.json` 里已启用**且**存在
  `src/i18n/<id>/patch/kiro.kiroAgent.json` 的语言。`--list` 会把两类都列出来；语言包支持的语言
  比补丁能覆盖的多。
- `--yes` 所有确认都取默认值，全程不提问。

## `--apply` 具体做什么

按顺序四步。第一步是补丁本身，后三步的存在是为了让一次全新安装最终能真的显示中文，而不是
「补丁打了但界面还是英文」。

| 步骤 | 跳过参数 |
| --- | --- |
| 改写够不到的文案，动之前先备份 | — |
| 把语言包 `.vsix` 装进同一个 Kiro | `--no-extension`，或 `--vsix=<路径>` |
| 卸载与本包冲突的语言包 | `--keep-official` |
| 把 `argv.json` 的 `locale` 设成所选语言 | `--no-set-locale` |

冲突检测的依据是：已安装扩展中，是否有人为当前语言声明了 `vscode` 这个翻译 id —— 实际上就是
`ms-ceintl.vscode-language-pack-*`。判断看声明而不是看发布者，所以被重新打包过的语言包同样会被
认出来；卸载前会先问你。

最后一步写入的就是扩展里那个语言选择器写的同一个字段，用的也是同一份代码
（`scripts/lib/argv.mjs` 从 `src/extension/main.cjs` 加载）。之后要重启 Kiro：显示语言是启动参数，
重载窗口不算。

当前版本的 VSIX 缺失或扩展安装失败时，命令返回失败，并保留已完成的补丁和恢复数据。可先执行 `npm run package`，再运行相同安装命令重试。重复安装、切换语言及更新补丁会从校验后的原文重新生成，无需先恢复。

另有两个参数用来缩小改写范围，主要给排查问题用：`--no-webview` 不动聊天 UI 的 bundle，
`--no-extension-strings` 不动 `dist/extension.js`。

## 会改什么（中文）

| 文件 | 内容 |
| --- | --- |
| `extensions/kiro.kiro-agent/package.json` | 视图标题、引导文案、命令和设置说明 |
| `extensions/kiro.kiro-agent/dist/extension.js` | 工作流描述 |
| `extensions/kiro.kiro-agent/packages/*/dist/**/*.js` | 聊天与会话界面文案 |

预览会列出程序文件及每条文案的改动。报告位于用户目录的 `~/.kiro/kiro-language-pack/installs/<install>/builds/<build>/reports/`，同一版本目录中的 `patch.json` 和 `backup/` 保存哈希、记录与原文。安装命令还会安装语言扩展、处理冲突语言包，并设置 `argv.json` 的显示语言。

## 风险与限制

- **Kiro 升级会把改过的文件覆盖回去。** 每次升级后重跑；`--status` 会告诉你是否已被覆盖。
- 它会修改应用程序目录。原文备份保存在用户目录，按安装路径和应用版本区分；也兼容原来放在安装目录中的备份。恢复失败时保留未解决的备份和记录。
- AWS 不会为被改动过的安装提供支持。给 Kiro 提 bug 之前请先 `--restore`。
- 这些内容不会进 `.vsix`。语言包仍是受支持的路径，补丁只是叠加在它之上。`--apply` 在
  `dist/*.vsix` 存在时会顺带安装该语言包。
- `--restore` 只还原对安装目录的改写。扩展仍然装着，`argv.json` 里的显示语言也保持不变——这两样
  在 Kiro 里就能改回去。

## 安全规则

清单字段是**按结构**替换的，只处理宿主真正会渲染的字段（`title`、`contents`、`description`…），
所以译文表里的英文词不可能被塞进命令 id 或 `when` 子句。bundle 里的字面量是文本替换，因此表里
只放长且唯一的整句 —— `src/i18n/zh-cn/patch/kiro.kiroAgent.json` 开头记了一条被否掉的反例。

贡献者请参阅 [CONTRIBUTING.md](../CONTRIBUTING.md#contributing-to-the-patcher) 了解如何安全地
添加补丁条目。
