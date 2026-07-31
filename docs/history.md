# Kiro 界面语言包 — 调研结论与实现记录（历史文档）

> **这不是安装指南，也不是当前产品说明。**
> 想装语言包或了解用法 → [README.md](../README.md) / [README.zh-CN.md](../README.zh-CN.md)
> 想贡献译文或跑构建 → [CONTRIBUTING.md](../CONTRIBUTING.md)
> 想看现行技术设计 → [architecture.md](architecture.md) /
> [architecture.zh-CN.md](architecture.zh-CN.md)
>
> 本文档仅保留调研过程、踩坑与决策变更，供维护者回溯。**若与 README / docs 冲突，一律以
> README 与 docs 为准**，忽略下文里已推翻的旧结论。

> 状态快照：流水线与 zh-cn 译文已完成并本地跑通；首个 locale `zh-cn`；单扩展多语言形态，
> `config.json` 已预置 13 种语言；勘查环境 Kiro 1.0.228 @ `F:\AI\Kiro`；记录止于 2026-07-27。

> **重要修正（见 §9）**：本文档 §2.5、§3、§4.1 最初把 Settings 面板和会话列表判为
> 「webview 不可达」，这个结论是**错的**。它们是 Kiro 加进 Code OSS 内核的 NLS 模块，完全可译。
> 由此产品形态也从「与官方包并存的互补版」改为「自包含单扩展」。下面保留原始记录，§9 给出
> 证据与结论变更。§4.1 等早期章节描述的「与官方包并存」形态，已在 §9 修正为「自包含单扩展
> 替代官方包」。

---

## 1. 目标

Kiro 只有英文界面，且没有切换自有面板语言的入口。编辑器通用界面可以用 VS Code 官方中文包
解决（已实测有效），**唯一的空缺是 Kiro 自有界面**。本项目填这个空缺，并做成可上架、可被
社区扩展到多语言的开源包。

（目标在 §9 之后收紧为：一个扩展汉化整个 Kiro，含内核里的 Kiro 自有界面。）

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

### 4.1 主推共存版 —— 已实测确认

原先担心同 locale 两个语言包会互斥，所以一度把自包含的完整版当主推。**装机实测推翻了这个
担心**：宿主不是二选一，而是**合并**。

`%APPDATA%\Kiro\languagepacks.json` 的结构是：

```
zh-cn: { label, hash,
         extensions:   [ 每个贡献该语言的扩展 ],
         translations: { "vscode": 路径, "vscode.git": 路径, "kiro.kiroAgent": 路径, ... } }
```

`translations` 是一张扁平的 `id -> 路径` 表，所有声明同一 `languageId` 的扩展都会往里写。
官方包 + 本包同装后的实测结果：

```
contributor: <本项目的 Kiro 版> 0.1.0
contributor: ms-ceintl.vscode-language-pack-zh-hans 1.106.0
vscode         -> ms-ceintl...\translations\main.i18n.json
vscode.git     -> ms-ceintl...\translations\extensions\vscode.git.i18n.json
kiro.kiroAgent -> <本项目的 Kiro 版>\translations\extensions\kiro.kiroAgent.i18n.json
```

**只有争抢同一个 id 才会冲突。** 本包只声明 `kiro.kiroAgent`，官方包不提供它，所以两者
天然互补。于是形态调整为：

- **Kiro 版**（`kiro-language-pack-zh-cn`，11 KB）：只含 Kiro 译文，与官方包配套。**默认发布**。
- **Standalone 版**（`-standalone` 后缀，430 KB）：vscode-loc 基线 + Kiro 译文，替代官方包。
  `config.json` 里默认关闭，需要单扩展安装时再打开。

这个决定也符合用户的实际偏好：大多数人已经在用官方包，不愿意为了汉化 Kiro 面板换掉它。

注意 `languagepacks.json` 在 Kiro 启动时重建，用 CLI 装完扩展后要重启一次才会更新。

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
| `build` | Kiro 版 1 文件 4 KiB；Standalone 93 文件 1372 KiB（过滤丢 8108，修复丢 21） |
| `validate` | 通过（Standalone 时另有 3 条无害的换行数警告） |
| `coverage` | `kiro.kiroAgent` **72/72 = 100%**；Standalone core 14184/15630 = **90.7%** |
| `package` | `kiro-language-pack-zh-cn-0.1.0.vsix` 11 KB；Standalone 430 KB |
| 装机 | 两版都装过；官方包 + Kiro 版共存已通过 `languagepacks.json` 验证（见 4.1） |

**尚未验证**：重启后逐项核对界面文案的实际渲染效果（视图标题、规格工具栏、命令面板）。
这一步只能手动看。

---

## 6. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| ~~同 locale 两个语言包冲突~~ | 已排除 | 实测宿主合并 `translations` 表，只争抢同一 id 才冲突；本包只声明 `kiro.kiroAgent` |
| 用户同时装 Standalone 版和官方包 | 两者都声明 `vscode` id，行为不可预期 | Standalone 默认关闭；README 明确警告 |
| Kiro 升级导致 72 条 key 变动 | 对应条目回退英文（不崩） | 每版重跑 `extract` + `coverage`，按 `untranslated` 补齐 |
| vscode-loc 与 Kiro 内核版本继续拉大 | 被丢弃的译文变多，覆盖率下降 | 把 `upstream.ref` 锁到接近 1.107 的 tag |
| 聊天面板始终无 i18n | 最有辨识度的界面译不了 | README 讲清边界；用 audit 报告推上游 |
| Kiro 是闭源 fork（AWS-IPL），内部结构可变 | 探测脚本失效 | 兼容两种 NLS 布局，失败给明确提示，不硬编码路径 |
| 商标 / 署名争议 | 下架风险 | NOTICE + README 双处非官方声明，命名规避 |

---

## 7. 待办

- [x] 验证与官方中文包并存的行为 —— 机制成立，但范围不够，见 §9
- [x] 装机实测安装流程（CLI 安装，双击 `.vsix` 会被 Visual Studio 安装器截走）
- [x] 翻译内核里 Kiro 自有的 1404 条字符串（§9）
- [x] 把 `config.json` 里的 `publisher` / `repository` / `homepage` / `bugs` 换成真实值
      —— 取 `gh auth status` 里的 GitHub 账号 `polang233`
- [x] 重启后核对界面渲染效果 —— Settings 面板已确认为中文；剩余英文项已定位（见 §10）
- [x] 验证「一个扩展多 localizations 条目」（§10.3）
- [ ] 用 `ovsx create-namespace polang233` 声明 Open VSX 命名空间，配置 `OVSX_PAT` secret
- [ ] 补截图
- [ ] 给 [kirodotdev/Kiro](https://github.com/kirodotdev/Kiro) 提 issue，附
      `reports/manifest-audit-kiro.kiroAgent.json`，请求：
      1. 把 76 条硬编码清单字符串外部化为 `%key%`
      2. 给 webview 加 i18n 抽取（他们已经有 `@vscode/l10n-dev` 依赖）
      3. 或者至少让前端消费已经注入的 `window.l10n.bundleUri`
- [ ] 给第二种语言补 Kiro 译文（日语基线已能构建，缺 `src/i18n/ja/`）

---

## 8. 参考

- [VS Code — Display Language](https://code.visualstudio.com/docs/getstarted/locales)
- [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) · [LICENSE (MIT)](https://github.com/Microsoft/vscode-loc/blob/main/LICENSE.md)
- [`extHostLocalizationService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostLocalizationService.ts) — 内置扩展从语言包读取 l10n bundle 的实现
- [Kiro Docs — Custom extension registry](https://kiro.dev/docs/editor/extension-registry/)
- 本机勘查：`F:\AI\Kiro\resources\app\{package.json, product.json, out/, extensions/kiro.kiro-agent/}`、`C:\Users\Polang\.kiro\{argv.json, extensions/}`

*外部资料内容均已改写以符合许可限制。*

---

## 9. 结论修正：Settings 面板可译，形态改为自包含单扩展

起因是装机后的实际观感：官方包 + 互补版都装上，命令面板和侧边栏视图名是中文了，但智能体聚焦
模式的会话列表、Settings 面板整片还是英文。按 §2.5 的结论这属于 webview，无解。重新探测后
发现结论错了。

### 9.1 证据

在 `resources/app/out/nls.messages.json` 里直接命中：

```
vs/workbench/contrib/kiroStandalone/electron-browser/kiroStandaloneSessions.contribution
  kiroStandalone.startupMode       = "Startup Mode"
  kiroStandalone.agentAutonomy     = "Agent Autonomy"
  kiroStandalone.themeDescription  = "Choose the color theme for Kiro"
  kiroStandalone.usageSummary      = "Usage Summary"
  kiroStandalone.giveFeedback      = "Give Feedback"
```

这些正是截图里那些英文。它们在**内核 NLS 表**里，不在 webview bundle 里。§2.5 只检查了
`packages/kiro-ui-agent-chat` 这类前端产物，漏掉了 fork 往 `vs/workbench/contrib/` 里加的模块。

真正在 webview 里、确实不可达的是账户与用量弹窗：`Estimated Usage`、`Credits`、`Manage Plan`
在内核 NLS 表和 `kiro.kiro-agent` 的全部 js 里都搜不到。聊天面板本体、钩子编辑器、能力包面板
同理。所以 §2.5 的方向没错，只是把 Settings 面板错误地归进去了。

### 9.2 规模：不是 142 条，是 1404 条

一开始只统计了模块路径里带 `kiro` 字样的部分（10 个模块 142 条）。正确的判据是「本机 key 集合
减去 vscode-loc 基线覆盖的部分」，这就是 `npm run gap` 做的事：

```
内核 15616 条 key（已排除 test 模块）
  vscode-loc zh-hans 覆盖不到          1404 条
    ├─ 上游完全没有的模块              约 146 个
    └─ 其余模块里的零散缺口
```

按体量排前列的模块：

| 条数 | 模块 | 界面 |
| --- | --- | --- |
| 90 | `chat/browser/chat.contribution` | 聊天相关设置项描述 |
| 87 | `kiroStandalone/…/kiroStandaloneSessions.contribution` | **Settings 面板全部条目**、会话列表 |
| 57 | `chat/common/chatContextKeys` | when 子句文档 |
| 24 | `supervisedDiff/browser/supervisedDiffActions` | 逐块审阅 |
| 22 | `kiroStandalone/…/kiroStandaloneSessionsList` | 会话项、工作树选择器 |
| 20 | `welcomeDialog/…/welcomeCarousel` | 欢迎轮播 |
| 17 | `spec/browser/specToolbar` | 规格工具栏 |

fork 自己新增的模块还包括 `spec/`、`steering/`、`inlineDiff/`、`editorLicense/`、
`agentColors`、`editorGroupAgentWatermark`、`signInToKiroAction` / `signOutOfKiroAction`、
`kiroConfig`。

### 9.3 为什么必须放弃「并存」

§4.1 实测出的合并行为本身没错，但由此推出的「只声明 `kiro.kiroAgent` 就够了」建立在
「Kiro 自有界面不可达」这个错前提上。这 1404 条挂在 `vscode` id 下。

从 `out/vs/code/node/cliProcessMain.js` 扒出的构建逻辑（压缩产物，已还原变量语义）：

```js
for (const c of localization.translations)
  entry.translations[c.id] = join(extension.location.fsPath, c.path);
```

`translations` 是 `id -> 单一路径`，遍历扩展时**直接覆盖赋值**，没有按 key 合并。于是：

- 只声明 `kiro.kiroAgent` → 碰不到那 1404 条
- 声明 `vscode` 但只放 1404 条 → 抢赢官方包时，主体其余 1.4 万条全回退英文
- 声明 `vscode` 且自带 vscode-loc 基线 → 可行，但等于替代官方包

第三条是唯一出路。代价可接受：主体译文与官方包同源（都来自 MIT 的 vscode-loc），而且本构建还会
额外丢掉标记漂移的坏译文。风险是两个包同装时按扫描顺序决胜负、行为不确定，README 与市场页都写了
明确警告。

### 9.4 形态调整

| 变更 | 前 | 后 |
| --- | --- | --- |
| 主推形态 | 每语言一个互补包，与官方包并存 | 单扩展、自包含、含所有已启用语言 |
| 翻译 id | 仅 `kiro.kiroAgent` | `vscode` + 92 个内置扩展 + `kiro.kiroAgent` |
| `config.json` 模式 | `kiro` / `standalone` | `full`（默认开）/ `companion`（默认关，保留旧形态） |
| 语言选择 | 每语言一个 vsix | 一个 vsix 多个 `localizations` 条目，宿主按显示语言选 |
| 译文源 | `kiro/<extId>.i18n.json` | 增加 `kiro/core*.i18n.json`，合并进 `vscode` id |

「识别本地语言」不需要写代码：内核在装语言包时若匹配系统区域会主动询问并重启，字符串就在
`vs/workbench/contrib/localization/electron-browser/localization.contribution` 的 `updateLocale`
里。缺失的 key 静默回退英文，所以「没配置的语言默认英语」也是机制自带的。

### 9.5 验证记录（修正后）

| 步骤 | 结果 |
| --- | --- |
| `gap` | 1404 条待译 → 全部完成，100% |
| `build` | 93 个译文文件 / 1471 KiB；过滤丢 8108，修复丢 19 |
| `validate` | 通过。4 条 `CHANGE-ME` 占位符警告 + 3 条继承自 vscode-loc 的换行数警告 |
| `coverage` | 内核 15588/15607 = **99.9%**（原 90.7%）；Kiro 自有内核 1404/1404 = **100%**；`kiro.kiroAgent` 72/72 = **100%** |
| `package` | `kiro-language-pack-0.1.0.vsix`，459 KiB |
| 装机 | 已卸载旧的互补版、装上新包，`--list-extensions` 只剩 `change-me-publisher.kiro-language-pack` |

**尚未验证**：`languagepacks.json` 在 Kiro 启动时才重建，本机那份还是旧内容，需要重启 Kiro
后再核对界面渲染。这一步只能手动看。

### 9.6 教训

判断「某段界面能不能翻」不能只看它长得像不像 webview。可靠判据只有一条：**它的英文原文在不在
`out/nls.messages.json` 或某个 `package.nls.json` 里**。fork 会把自己的界面塞进内核，模块路径
也不一定带产品名（`spec/`、`supervisedDiff/`、`inlineDiff/` 都不带 `kiro`）。`npm run gap` 就是
为了把这个判断自动化，以后每次 Kiro 升级重跑即可。

---

## 10. 装机复核：剩余英文项的定位与处理

重启后 Settings 面板已确认为中文。侧边栏和聊天面板仍有英文，逐项定位如下。

### 10.1 判据

对每条英文分别在三个地方搜索：内核 `out/nls.messages.json`、扩展的 `package.nls.json`、
扩展的全部 js/json 文件。落点决定它属于哪一类：

| 界面文案 | 落点 | 类别 |
| --- | --- | --- |
| `SPECS` 视图标题 | `package.json` → `contributes.views.kiro[1].name: "Specs"` | 清单硬编码 |
| `Create a project plan…` + `Create New Spec` | `contributes.viewsWelcome[2].contents` | 清单硬编码 |
| `Automate tasks like…` + `Create New Hook` | `contributes.viewsWelcome[4].contents` | 清单硬编码 |
| `Guide agent behavior…` + `Generate Steering Docs` | `contributes.viewsWelcome[3].contents` | 清单硬编码 |
| `Spec` / `Plan` / `Bug Fix` / `Quick Spec` 的描述 | `dist/extension.js` 里的对象字面量 | 运行时字面量 |
| `Let's build`、`Plan, search, or build anything`、`Start with a workflow`、`See all` | `packages/kiro-ui-agent-chat/dist/assets/*.js` | webview |
| `30 files changed`、`View changes (30)`、`Revert changes (30)` | 同上 | webview |
| `Autopilot ON: Kiro will make changes on your behalf.` | 同上 | webview |

三类都不在语言包能触及的范围内：清单硬编码没有 `%key%` 间接层；运行时字面量需要 Kiro 调
`vscode.l10n.t()`；webview 没有 i18n 抽取层。

注意 `30 files changed` 有个巧合：内核里确实有 `chatInputPart :: chatEditingSession.manyFiles.1
= "{0} files changed"`，我们也翻了，但截图里那条属于聊天 webview 自己渲染的
`[fileCount," ",n===1?"file changed":"files changed"]`，是另一处实现。

### 10.2 处理：可选的安装目录补丁

既然语言包机制到此为止，就加了一条不走该机制的后路：`npm run patch`，直接改写已安装的 Kiro。

- 清单字段**按结构**替换：只遍历 `title` / `shortTitle` / `category` / `label` / `name` /
  `description` / `markdownDescription` / `deprecationMessage` / `contents` /
  `enumDescriptions` / `enumItemLabels` 这些宿主真正渲染的字段，且跳过 `^%.+%$`。这样
  `Enable`、`Chat` 这类短词不可能被塞进命令 id 或 `when` 子句。
- bundle 字面量按**文本**替换，按长度从长到短处理（否则 `file changed` 会命中
  `files changed` 内部）。脚本拒绝短于 6 字符的条目。
- 备份到 `extensions/kiro.kiro-agent/.kiro-language-pack-backup/`，记录原始与打补丁后的
  sha256，支持 `--status` / `--restore`；默认试运行，必须显式 `--apply`。

中文这边试运行结果：**89 处替换 / 2 个文件**（72 清单字段 + 4 条 extension.js 字面量 + 13 条
webview 字面量）。

踩到的坑：最初把 `(optional)` 放进 webview 表，试运行显示它还命中了 `clarity-*.js` 和
`fortran-free-form-*.js` —— 那是内置的 TextMate 语法定义，里面的 `(optional)` 是文档而不是界面
文案。这就是「只放长且唯一的整句」这条规则的来由，已写进 CONTRIBUTING 和补丁文件的注释。

代价写在 README 里：Kiro 升级会覆盖回去，改过的安装不受官方支持，这些内容不进 `.vsix`。

### 10.3 多语言机制已验证

之前只是推断。这次做了实测：临时启用 `ja`，`sync` 拉到日语基线（92 个文件），构建输出

```
kiro-language-pack: 185 translation file(s), 3323 KiB
  translations/zh-cn/…   93 个
  translations/ja/…      92 个（少 kiro.kiroAgent，因为 src/i18n/ja/ 还没有译文）
```

`validate` 对两个 locale 都通过。另外把从 `cliProcessMain.js` 扒出的 `languagepacks.json`
构建函数原样跑在生成的清单上，结果：

```
zh-cn  label=中文（简体）  93 个 id   vscode -> translations/zh-cn/main.i18n.json
ja     label=日本語        92 个 id   vscode -> translations/ja/main.i18n.json
```

一个扩展、两个 `languageId` 条目，路径各自正确。同一函数再喂进官方中文包后：

```
zh-cn 的 vscode -> C:\official\translations\main.i18n.json
contributors: polang233.kiro-language-pack, ms-ceintl.vscode-language-pack-zh-hans
```

后扫描到的扩展直接覆盖，两个包都在 `extensions` 数组里但只有一个赢得 `vscode` —— §9.3 的结论
得到独立确认。构建后已还原 `config.json`（`ja` 重新关闭）。

### 10.4 发布信息已落实

`publisher` 取 `gh auth status` 里的实际 GitHub 账号 `polang233`，仓库地址同步为
`https://github.com/polang233/kiro-language-pack`。装机后扩展 id 为
`polang233.kiro-language-pack`，`validate` 的 4 条占位符警告消失，只剩 3 条继承自 vscode-loc
的无害换行数警告。发布前还需 `ovsx create-namespace polang233` 声明命名空间。

---

## 11. 加一层薄运行时：语言选择与冲突检测

### 11.1 起因

三个问题：

1. 「能用插件解决的一定要用插件解决，解决不了的才提示用脚本。」
2. 「脚本做了什么必须描述清楚，且只做最小限度的操作。」
3. 「按安装者本地化语言」不够用 —— 很多人没装过语言包（系统是英文，宿主的
   `updateLocale` 提示永远不出现），或者已有官方包会被顶掉。

第 3 点是真实的体验缺陷：装完什么都没变，用户会认为扩展坏了。

### 11.2 语言包可以带代码

`contributes.localizations` 和 `main` 不互斥 —— 语言包只是「恰好不带代码」的扩展，宿主对它没有
特殊限制。于是加了 `src/extension/main.cjs`（约 250 行，零依赖）：

- 设置项 `kiroLanguagePack.language`：`auto` / 包内各语言 / `en`，`scope: "application"`
- 命令 **Language Pack: Select Display Language**
- `auto` 时只在「显示语言不在包内语言里」且未被永久忽略时提示一次
- 启动时扫描其他声明了 `vscode` 翻译 id 且语言重叠的扩展，直接点名让用户卸载

自身的提示语走 `vscode.l10n.t()`，译文从 `src/i18n/<locale>/extension.l10n.json` 生成到
`dist/<pack>/l10n/bundle.l10n.<locale>.json`。有意思的是这些提示大多在界面还是英文时出现，
所以英文原文本身就是对的，译文只是锦上添花。

`config.json` 的构建模式新增 `runtime` 开关，设 `false` 得到纯粹无代码的语言包。

### 11.3 最小操作原则的落地

运行时只碰这些，文件头注释、README 表格、市场页三处保持一致：

| 操作 | 路径 |
| --- | --- |
| 读 | `<appRoot>/product.json`（取 `dataFolderName`，不硬编码 `.kiro`） |
| 读 | `~/<数据目录>/argv.json` |
| 写 | `~/<数据目录>/argv.json` 的 `locale` 一个字段，且必须用户确认 |
| 读 | 已安装扩展的清单 |
| 写 | 本扩展 globalState 的两个忽略标记 |

`argv.json` 是 JSONC，`JSON.parse` + 重新序列化会吃掉注释，所以用正则做**定点替换**：命中
`^[ \t]*"locale"[ \t]*:[ \t]*"…"` 就原地换值，没有该字段就在 `}` 前插一行并自行判断是否需要逗号。

这是整个语言包里唯一有破坏性的操作（写坏了 Kiro 可能起不来），所以给它写了 `npm test`：把
`vscode` 模块用 `Module._load` 打桩，在临时目录上跑真实函数，断言

- 替换已有 locale：只变一行，注释与其他字段一字不动，去注释后仍可 `JSON.parse`
- 补充缺失 locale：原有每一行都还在，只多一行，逗号正确
- 空对象 `{}`、只有注释的对象、文件不存在三种边界

第一版有个测试自己写错了（把插入后的行差算成 ≤2，实际是 3），改成「原始每一行都仍存在 + 只多一行」
这种直接表达意图的断言。

`--check`/lint 层面还踩了一个坑：仓库 `package.json` 有 `"type": "module"`，`src/extension/main.js`
会被当成 ESM，`require` 报错。改名 `.cjs`，构建时仍复制成 `extension.js` —— vsix 里的清单没有
`type` 字段，所以在运行时又是 CommonJS。

### 11.4 补丁脚本的透明度

按第 2 点补齐：

- 试运行现在打印**它会碰的每一个文件**，并附一句「这个清单之外的任何文件都不会被读取、写入、
  移动或删除」
- 同时写出 `reports/patch-plan-<locale>.json`，逐条记录 `{english, translated, count}`
- 应用后同一份清单连哈希一起存进 `.kiro-language-pack-patch.json`

当前中文实测：89 处替换，仅 3 个文件（`package.json` 72 / `dist/extension.js` 4 /
`kiro-ui-agent-chat` 的一个 chunk 13）。

按第 1 点，README 与市场页的措辞也调整了：先说「扩展能做的都已经在扩展里做了」，再把补丁定位成
「任何扩展都碰不到的部分」的最后手段。

### 11.5 与同类项目的差异

社区里有 [awhg23/kiro-Chinese](https://github.com/awhg23/kiro-Chinese)，思路相同：能翻的翻，
不能翻的用脚本最小限度改写。本项目的不同之处在于多语言：`config.json` 预置了 `vscode-loc` 全部
13 种语言，一个扩展承载多个 `localizations` 条目（§10.3 已实测），加语言不需要改代码，补丁数据
也按 locale 分目录（`src/i18n/<locale>/patch/`）。

### 11.6 验证

| 步骤 | 结果 |
| --- | --- |
| `npm test` | 16 项断言全过 |
| `build` | 93 个译文文件 + `extension.js` + `l10n/bundle.l10n.zh-cn.json` |
| `validate` | 通过；新增校验：`main` 指向的文件存在、有 `activationEvents`、设置项枚举覆盖所有已声明 locale、枚举与描述数量一致、l10n bundle 非空、有 `configuration` 就必须有代码 |
| `package` | 466 KiB（比无运行时的 460 KiB 多 6 KiB） |
| 装机 | `polang233.kiro-language-pack`，目录下含 `extension.js` 与 `l10n/` |

**尚未验证**：运行时在真实会话里的行为（提示、快速选择、写 argv.json、冲突警告）要重启 Kiro
后手动点一遍。

### 11.7 补丁已实际应用并复核

`npm run patch -- --apply` 已在本机执行（Kiro 1.0.228 @ `F:\AI\Kiro`），89 处替换、3 个文件。
应用后逐项复核：

| 检查 | 结果 |
| --- | --- |
| 三个文件的当前 sha256 == 记录里的 `patched` | 全部一致 |
| 备份的 sha256 == 记录里的 `original` | 全部一致 |
| `package.json` 仍可解析 | 是 |
| 结构与原文件逐字段同形（只有字符串值变化） | 是 |
| 贡献点集合、命令数量（74） | 未变 |
| `%key%` 引用（117 处）是否有悬空 | 无 |
| 命令 id / 视图 id / `when` 子句 / 设置项键名 | 逐字节未变 |
| 打过补丁的 webview chunk 与 `extension.js` 语法 | `node --check` 均通过 |

抽查几个易错点：`views.kiro[1].name` = `规格`、`activitybar[0].title` = `聊天`，而
`activitybar[1].title`（`Kiro`）与 `chatParticipants[0].name`（`Kiro`，@ 提及用的句柄）保持
英文原样 —— 「按结构替换 + 译文表里 `Kiro` 映射到自身」这两道保险都生效了。

webview chunk 体积 2,011,470 → 2,011,514 字节（+44），符合 13 条短字面量的替换量级。

`--status` 输出：`patched with zh-cn on 2026-07-27T14:07:27Z / 3 file(s) still carry the patch`。
