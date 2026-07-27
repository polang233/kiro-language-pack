# Kiro 界面语言包 — 调研结论与实现记录

> 状态：仓库骨架与流水线已完成并本地跑通，产物已生成
> 首个 locale：`zh-cn`；架构支持多语言
> 勘查与验证环境：Kiro 1.0.228 @ `F:\AI\Kiro`
> 最后更新：2026-07-27

面向使用者的说明在 [README.md](README.md) / [README.zh-CN.md](README.zh-CN.md)。
本文档只保留调研过程、被验证或否证的假设，以及后续决策依据。

---

## 1. 目标

Kiro 只有英文界面，且没有切换自有面板语言的入口。编辑器通用界面可以用 VS Code 官方中文包
解决（已实测有效），**唯一的空缺是 Kiro 自有界面**。本项目填这个空缺，并做成可上架、可被
社区扩展到多语言的开源包。

---

## 2. 实测数据

### 2.1 Kiro 本体

| 项 | 值 | 来源 |
| --- | --- | --- |
| 安装目录 | `F:\AI\Kiro` | — |
| Kiro 版本 | `1.0.228` | `resources/app/product.json` |
| 内核 Code OSS 版本 | **`1.107.1`** | `product.json` → `vsCodeVersion` |
| commit | `97cab79aeeb45a5c409d0017055f8a43ca1598d2` | `product.json` |
| quality | `stable` | `product.json` |
| `dataFolderName` | `.kiro` | `product.json` |
| Electron | `39.6.0` | `resources/app/package.json` |

注意：`resources/app/package.json` 的 `version` 是 Kiro 自己的版本号（1.0.228），
**不是** 内核版本。`engines.vscode` 必须对着 `vsCodeVersion` 写。这是个容易踩的坑，
`scripts/lib/kiro-paths.mjs` 里把两者分开返回。

### 2.2 本地化链路 —— 已验证可用

| 项 | 值 |
| --- | --- |
| NLS 元数据布局 | `out/nls.keys.json` + `out/nls.messages.json`（新布局，无 `nls.metadata.json`） |
| `nls.keys.json` 格式 | `[[moduleId, [key, ...]], ...]` |
| `nls.messages.json` 格式 | `[englishMessage, ...]`，与 keys 扁平化后同序 |
| core 规模 | 1385 个模块 / 15630 个 key |
| 内置扩展 | 95 个，其中 92 个带 `package.nls.json` |
| locale 配置 | `~/.kiro/argv.json`，实测 `"locale": "zh-cn"` 生效 |
| 已装语言包 | `ms-ceintl.vscode-language-pack-zh-hans-1.106.0-universal` |

**结论：原先列为最大风险的 R1（构建剥离 NLS 元数据）不存在。** 官方 1.106.0 的包能装进
1.107.1 内核并生效，说明 fork 没有改坏 NLS 加载。两个 json 同序这一点很关键 —— 它让我们
能重建"英文原文 → key"的映射，覆盖率统计和后面的译文修复都建立在这上面。

### 2.3 目标扩展 `kiro.kiroAgent`

| 项 | 值 |
| --- | --- |
| 扩展 id | `kiro.kiroAgent`（`publisher.name`） |
| 磁盘目录 | `resources/app/extensions/kiro.kiro-agent` |
| 版本 | `1.0.406` |
| `package.nls.json` | **72 条** |
| 清单中可本地化字符串 | **183 条** |
| 其中走 `%key%` | **107 条（58.5%）** |
| 其中硬编码英文 | **76 条** |
| `package.nls` 被清单引用 | 56 条；另有 16 条未被引用 |
| webview 产物 | 346 个 js bundle，约 12.9 MiB |

目录名和扩展 id 不一致（`kiro.kiro-agent` vs `kiro.kiroAgent`），
`contributes.localizations.translations[].id` 必须用后者。

### 2.4 `l10n` 探测 —— 部分推翻了原假设

清单里有 `"l10n": "./l10n"`，一度让我以为运行时字符串也能翻。查 VS Code 源码
[`extHostLocalizationService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostLocalizationService.ts)
确认：**内置扩展的运行时译文包由语言包提供**（`$fetchBuiltInBundleUri`，读
`result.contents.bundle`），机制上确实可行。

但实际探测结果是不可行的：

- `dist/extension.js`（22 MB）里 `l10n` 只出现 6 次，全部是 `vscode.l10n.uri`，**没有一处
  `l10n.t(` 调用**
- 扩展根目录没有 `l10n/` 目录
- `packages/` 下 342 个 js 文件里 **完全没有** `l10n` 引用

有意思的是 `extension.js` 第 390357 行附近，扩展会把 `vscode.l10n.uri` 转成 webview URI
注入成 `window.l10n = { bundleUri }`。管道搭好了，前端却没人消费。

所以：`contents.bundle` 目前无可译内容，但构建仍然输出这一段 —— Kiro 哪天开始调
`l10n.t()`，译文立刻生效，不需要改任何代码。

### 2.5 webview 层 —— 确认不可达

主界面是 `packages/kiro-ui-agent-chat/dist/session-view/main.js`（只有 433 字节的加载
stub，真正的应用在 `assets/` 下的 chunk 里），以及 `hook-editor`、`kiro-ui-powers`、
`autocomplete`。都是压缩后的 React 产物，文案硬编码，没有 i18n 抽取层。语言包机制对这一层
无效，这是上游的限制。

---

## 3. 最终范围

| 层级 | 可达 | 结论依据 |
| --- | --- | --- |
| 编辑器主体（15630 key） | 是 | vscode-loc 基线，仅完整版 |
| 内置扩展（92 个 bundle） | 是 | vscode-loc 基线，仅完整版 |
| Kiro 命令 / 视图名 / 规格工具栏 / 树视图欢迎文案 | 是 | 72 条 `package.nls.json`，**本项目核心交付** |
| Kiro 设置项描述、部分命令标题、部分视图名 | 否 | 76 条硬编码在清单里 |
| Kiro 聊天 / Spec / 钩子 / 能力包面板 | 否 | 346 个 webview bundle 无 i18n |
| Kiro 运行时消息 | 待上游 | 机制可行，Kiro 未调用 `l10n.t()` |

对外表述：**"Kiro 界面语言包"，覆盖命令与视图层**，不承诺聊天面板。

---

## 4. 已定的设计决策

### 4.1 双版本，而不是单一形态

同 locale 两个语言包时宿主的选择行为不确定，所以：

- **完整版**（`kiro-language-pack-zh-cn`，430 KB）：vscode-loc 基线 + Kiro 译文，自包含，
  替代官方包。**主推**。
- **补充版**（`-addon` 后缀，10 KB）：只含 Kiro 译文，给坚持用官方包的人。

两者都声明 `zh-cn`，README 明确要求只装一个。补充版能否与官方包稳定并存仍需装机实测，
这是唯一一个还没验证的行为。

### 4.2 不手写译文，做流水线

```
Kiro 安装 ──(extract)──> metadata/kiro.json ────────────┐
                                                        │
vscode-loc ──(sync)──> upstream/<locale>/ ───────────────┼──(build)──> dist/<pack>/ ──(package)──> .vsix
                                                        │
src/i18n/<locale>/{overrides,kiro,glossary} ────────────┘
                                                        └──(validate + coverage)──> reports/
```

人工只维护 `src/i18n/<locale>/`。新增语言 = 加一个 config 条目 + 一个目录，零代码改动。

### 4.3 sync 用 metadata 策略，绕开 GitHub API 限额

一开始用 GitHub trees API 列文件，匿名请求直接 403。改成：从 `metadata/kiro.json` 拿到
本机实际安装的扩展 id，逐个去 `raw.githubusercontent.com` 试取（404 视为上游没有该包）。
93 个候选，92 个命中，唯一缺的正是 `kiro.kiroAgent` —— 完全符合预期。API 策略保留给 CI
（有 `GITHUB_TOKEN`）。

### 4.4 顺手修掉上游的坏译文

写完校验器第一次跑就抓出 27 条问题，绝大多数是 vscode-loc（跟最新 VS Code）与 Kiro 内核
1.107.1 的版本错位。举两个真实例子：

```
en: Model: {0}
tr: 模型                      ← 占位符丢了

en: Current position: line {0}, column {1}. {2}
tr: 转到行。键入行号，可选择后跟冒号和列号。   ← 整句对不上

en: [Start Debugging](command:javascript-walkthrough.commands.debugJsFile)
tr: [开始调试](命令: javascript-walkthrough.commands.debugJsFile)   ← 微软自己把 command: 译了，链接失效
```

这类译文装上去会显示字面量 `{2}` 或者点不动的链接。构建现在会检查 `{n}` / `$(icon)` /
`(command:...)` 三类标记是否与英文原文一致，不一致的**丢弃**（回退英文，正确），中文包丢了
21 条。属于本仓库维护的文件里出现同类问题则报警而不丢弃 —— 那是我们自己的 bug。

这算是个意外收获：在这一点上本包质量高于官方包。

---

## 5. 验证记录

全流程本地跑通：

| 步骤 | 结果 |
| --- | --- |
| `extract` | core 1385 模块 / 15630 key；95 内置扩展 / 92 带 nls；`kiro.kiroAgent` 72 条 |
| `audit` | 183 条清单字符串，107 externalized（58.5%），76 硬编码；webview 346 bundle / 12.9 MiB |
| `sync` | metadata 策略，93 候选 → 92 下载 + 1 上游缺失 |
| `build` | addon 1 文件 4 KiB；full 93 文件 1372 KiB（过滤丢 8108，修复丢 21） |
| `validate` | 通过，仅 3 条无害的换行数警告 |
| `coverage` | full: core 14184/15630 = **90.7%**，`kiro.kiroAgent` **72/72 = 100%** |
| `package` | `kiro-language-pack-zh-cn-0.1.0.vsix` 430 KB；`-addon-0.1.0.vsix` 10 KB |

**尚未验证**：把 `.vsix` 装进 Kiro 看实际界面效果，以及补充版与官方包并存的行为。
这两项需要重启 IDE，只能手动做。

---

## 6. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 补充版与官方包同 locale 冲突 | 官方包可能失效 | 装机实测；主推自包含的完整版 |
| Kiro 升级导致 72 条 key 变动 | 对应条目回退英文（不崩） | 每版重跑 `extract` + `coverage`，按 `untranslated` 补齐 |
| vscode-loc 与 Kiro 内核版本继续拉大 | 被丢弃的译文变多，覆盖率下降 | 把 `upstream.ref` 锁到接近 1.107 的 tag |
| 聊天面板始终无 i18n | 最有辨识度的界面译不了 | README 讲清边界；用 audit 报告推上游 |
| Kiro 是闭源 fork（AWS-IPL），内部结构可变 | 探测脚本失效 | 兼容两种 NLS 布局，失败给明确提示，不硬编码路径 |
| 商标 / 署名争议 | 下架风险 | NOTICE + README 双处非官方声明，命名规避 |

---

## 7. 待办

- [ ] 把 `config.json` 里的 `publisher` / `repository` / `homepage` / `bugs` 换成真实值
- [ ] 装机实测两个版本，补截图
- [ ] 验证补充版与官方中文包并存的行为，据此决定是否双发
- [ ] 申请 Open VSX 发布者，配置 `OVSX_PAT` secret
- [ ] 给 [kirodotdev/Kiro](https://github.com/kirodotdev/Kiro) 提 issue，附
      `reports/manifest-audit-kiro.kiroAgent.json`，请求：
      1. 把 76 条硬编码清单字符串外部化为 `%key%`
      2. 给 webview 加 i18n 抽取（他们已经有 `@vscode/l10n-dev` 依赖）
      3. 或者至少让前端消费已经注入的 `window.l10n.bundleUri`

---

## 8. 参考

- [VS Code — Display Language](https://code.visualstudio.com/docs/getstarted/locales)
- [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) · [LICENSE (MIT)](https://github.com/Microsoft/vscode-loc/blob/main/LICENSE.md)
- [`extHostLocalizationService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostLocalizationService.ts) — 内置扩展从语言包读取 l10n bundle 的实现
- [Kiro Docs — Custom extension registry](https://kiro.dev/docs/editor/extension-registry/)
- 本机勘查：`F:\AI\Kiro\resources\app\{package.json, product.json, out/, extensions/kiro.kiro-agent/}`、`C:\Users\Polang\.kiro\{argv.json, extensions/}`

*外部资料内容均已改写以符合许可限制。*
