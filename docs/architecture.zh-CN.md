# 架构说明

Kiro Language Pack 的技术设计文档。安装与日常使用见 [README.zh-CN.md](../README.zh-CN.md)。

## 单个自包含扩展

语言包同时携带来自
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) 的编辑器主体基线**和**本项目
自己写的 Kiro 译文。因此它占用 `vscode` 这个翻译 id，会**替代** VS Code 官方语言包。两者不要
同时安装。

这不是偏好，而是 Kiro 的实现决定的。Kiro 是一个 fork，把自己的界面直接编译进了 Code OSS
内核：

```
resources/app/out/nls.messages.json
  vs/workbench/contrib/kiroStandalone/…       会话列表、Settings 面板、聚焦智能体
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
还会额外丢掉占位符已经和原文对不上的继承译文（见[标记修复](#标记修复)）。

| 版本 | 扩展名 | 内容 | 默认 |
| --- | --- | --- | --- |
| **完整版** | `kiro-language-pack` | 主体基线 + Kiro 译文，含所有已启用语言 | 发布 |
| **互补版** | `kiro-language-pack-<locale>-companion` | 仅 `kiro.kiroAgent` 清单字符串 | 仅本地构建 |

两者体积差三个数量级：完整版每种语言约 1.5 MB 压缩过的译文 JSON，互补版只有一个很小的 bundle。
当前语言集合的准确数字由 `npm run build` 打印，打包成 `.vsix` 后还会明显更小。

互补版能与官方包并存，因为它从不声明 `vscode`。代价是范围：它只能覆盖那 72 条清单字符串
（命令标题、视图名、规格工具栏），碰不到 Kiro 编译进内核的任何东西 —— Settings 面板仍是英文。
它在 `config.json` 里默认关闭，只有在实在不能放弃官方包时才启用。

## 本地化机制

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

## 构建流水线

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

- **过滤**：丢掉 Kiro 里不存在的 key —— 每种语言约 8000 条，差不多是上游基线的三分之一。
  否则包里会带着一大堆这个 fork 根本没有的 VS Code 译文。
- **修复**：`vscode-loc` 跟的是最新版 VS Code，而 Kiro 的内核偏旧，于是有些继承来的译文
  已经和原文对不上了 —— 多出来的 `{2}` 会原样显示成字面量 `{2}`，被翻译过的 `command:`
  目标会让链接变成死文本。构建会把这些丢掉（每种语言二十来条），让它回退成英文，而不是显示错的
  内容。属于本仓库维护的文件里出现同类问题则会报警而不是静默丢弃，因为那是我们自己的 bug。
- **差异分析**：`npm run gap` 把本机 key 集合与上游基线做差。差出来的部分（Kiro 1.1.14 上是 1365 条，1.0.437 上是 1336 条，1.0.395 上是 1335 条，1.0.309 上是 1159 条，1.0.242 上是 979 条）
  正是本项目必须自己翻译的范围，报告会连英文原文一起列出每一条。
- **覆盖率**：给 `coverage` 一个真实的分母，而不是估算。

这份快照是可选的，所以 CI 在没装 Kiro 的情况下也能构建，只是过滤、修复和差异分析会跳过。

## 运行时

语言包本来不需要代码，译文没有它也生效。这里仍然带了一个很小的文件，只做宿主没做的两件事：
**Language Pack: Select Display Language** 语言选择器，以及当另一个扩展也声明了编辑器主体译文时
给出警告 —— 否则症状是每次重启后界面汉化程度都不一样。

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
    kiro/<extId>.i18n.json        内置扩展 manifest 字符串（kiro.kiroAgent）
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

## 调研记录

历史调研与决策过程见 [history.md](history.md)。若与本文或 README 不一致，以本文和
[README.zh-CN.md](../README.zh-CN.md) 为准。
