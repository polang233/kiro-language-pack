# 进阶：打补丁到 Kiro 安装目录

**这是可选功能。** 正常使用只需安装语言包扩展。补丁会直接改写 Kiro 安装目录里的文件，用来
翻译任何扩展都碰不到的字符串。请先阅读 [README.zh-CN.md](../README.zh-CN.md) 里的常规安装流程。

## 什么时候可能需要

扩展已经覆盖了语言包机制能触及的几乎全部界面。以下部分会保持英文，除非打补丁：

| 界面 | 扩展为什么碰不到 |
| --- | --- |
| SPECS 视图标题、树视图引导文案及其按钮、多数 MCP 命令、Kiro 设置项描述 | 76 条清单字符串是直接写死的英文字面量，没有 `%key%` 间接层 |
| 欢迎页里的工作流描述 | `dist/extension.js` 里的普通字面量，未走 `vscode.l10n.t()` |
| 聊天 UI 里的 `Let's build`、自动驾驶提示、已更改文件条等 | webview 打包时没有做国际化抽取 |

中文这边补丁可多覆盖 **89 条**，只涉及三个文件。`npm run audit` 生成的报告会列出每一条无法
触及的字符串，供向上游提交 i18n 需求时使用。

## 命令

```bash
npm run patch -- --list        # 找到了哪些 Kiro 安装、哪些语言能打补丁
npm run patch                  # 试运行，什么都不写
npm run patch -- --apply       # 真的执行
npm run patch -- --status      # 当前安装打过补丁没有，补丁还在不在
npm run patch -- --restore     # 还原被改写的文件（不会卸载语言包扩展）
```

需要 Node.js 18.17+、本仓库的克隆，以及本机已安装的 Kiro。

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

如果 `dist/*.vsix` 不存在，改写照样成功，只是这一步会跳过并给出警告。想一次做完就先
`npm run package`。

另有两个参数用来缩小改写范围，主要给排查问题用：`--no-webview` 不动聊天 UI 的 bundle，
`--no-extension-strings` 不动 `dist/extension.js`。

## 会改什么（中文）

| 文件 | 条数 | 内容 |
| --- | --- | --- |
| `extensions/kiro.kiro-agent/package.json` | 72 | `SPECS` 标题、三块树视图引导文案及其按钮、MCP 命令、信任与工具卡片设置项 |
| `extensions/kiro.kiro-agent/dist/extension.js` | 4 | 欢迎页里的工作流描述 |
| `extensions/kiro.kiro-agent/packages/kiro-ui-agent-chat/dist/assets/*.js` | 13 | `Let's build`、自动驾驶模式提示、已更改文件条 |

**这个清单之外的任何文件都不会被读取、写入、移动或删除。** 试运行会打印文件清单，并把每一条
改动前后的完整对照写进 `reports/patch-plan-<locale>.json`，你可以在应用前逐条审阅。应用之后同一份
清单会连哈希一起存到 `extensions/kiro.kiro-agent/.kiro-language-pack-patch.json`。

## 风险与限制

- **Kiro 升级会把改过的文件覆盖回去。** 每次升级后重跑；`--status` 会告诉你是否已被覆盖。
- 它会修改应用程序目录。原始文件会复制到
  `extensions/kiro.kiro-agent/.kiro-language-pack-backup/`，并连哈希一起记录。
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
