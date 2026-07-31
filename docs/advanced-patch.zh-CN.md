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
npm run patch                  # 试运行，什么都不写
npm run patch -- --apply       # 应用补丁，并安装 dist/kiro-language-pack-<版本>.vsix
npm run patch -- --status      # 当前安装打过补丁没有，补丁还在不在
npm run patch -- --restore     # 还原被改写的文件（不会卸载语言包扩展）
```

`--apply` 可用参数：

- `--no-extension` — 只改安装目录，不装 `.vsix`
- `--vsix=<path>` — 指定要装的包，默认 `dist/kiro-language-pack-<version>.vsix`

若还没有打出 `.vsix`，文件改写仍会成功；想一次完成「补丁 + 扩展」请先 `npm run package`。

需要 Node.js 18.17+、本仓库的克隆，以及本机已安装的 Kiro。若 `npm run detect` 找不到 Kiro，
请设置 `KIRO_INSTALL_DIR`。

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

## 安全规则

清单字段是**按结构**替换的，只处理宿主真正会渲染的字段（`title`、`contents`、`description`…），
所以译文表里的英文词不可能被塞进命令 id 或 `when` 子句。bundle 里的字面量是文本替换，因此表里
只放长且唯一的整句 —— `src/i18n/zh-cn/patch/kiro.kiroAgent.json` 开头记了一条被否掉的反例。

贡献者请参阅 [CONTRIBUTING.md](../CONTRIBUTING.md#contributing-to-the-patcher) 了解如何安全地
添加补丁条目。
