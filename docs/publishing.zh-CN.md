# 发布语言包

Kiro 的扩展市场默认走 **[Open VSX](https://open-vsx.org/)**。请**先上 Open VSX**，用户才能在
Kiro 里搜到 **Kiro Language Pack**。VS Code Marketplace 是可选渠道，**不会**出现在 Kiro
默认搜索里。

[`config.json`](../config.json) 里的 `publisher` 当前是 `polang233`。这个字符串必须同时等于
Open VSX 的**命名空间（namespace）**，以及（若也上 VS Marketplace）那边的**出版商
（publisher）**名。

## 两个市场，两套账号（先读这段）

| | Open VSX（Kiro 用户需要） | VS Code Marketplace（可选） |
| --- | --- | --- |
| 运营方 | Eclipse Foundation | Microsoft |
| 扩展地址 | `open-vsx.org/extension/<命名空间>/<名>` | `marketplace.visualstudio.com/items?itemName=<出版商>.<名>` |
| 你的 id 叫什么 | **Namespace（命名空间）** | **Publisher（出版商）** |
| 登录 | [open-vsx.org](https://open-vsx.org/)，用 **Eclipse** 账号 | [出版商管理页](https://marketplace.visualstudio.com/manage)，用 **Microsoft** 账号 |
| 令牌环境变量 | `OVSX_PAT` | `VSCE_PAT` |
| 一次性创建 id | `npx ovsx create-namespace polang233` | 在管理页创建出版商 `polang233` |
| 发布命令 | `npm run publish:ovsx` | `npm run publish:vsce` |

二者**互不相通**：Open VSX 声明了命名空间，**不会**自动给你 VS Marketplace 出版商，反过来也一样。两边尽量用同一个 id（`polang233`），扩展身份就一直是 `polang233.kiro-language-pack`。

**命名空间 / 出版商** ≈ 你发布扩展时的品牌前缀。用户看到的是 `polang233.kiro-language-pack`。
用**你本人控制的账号**申请一次即可（个人 Eclipse / Microsoft 账号完全可以，不必先注册公司）。选一个长期能用的 id，事后改名很麻烦。

## 准备

```bash
npm install
npm run package          # 产出 dist/kiro-language-pack-<version>.vsix
```

确认 `config.json` 的 `version` 与即将打的 tag 一致（CI 在 `v*` tag 上会校验）。

市场页面的内容分别来自哪里，改文案时对着看：

| 页面上的位置 | 来源 |
| --- | --- |
| 页面正文 | `src/marketplace/README.md`，`npm run build` 时复制进 `.vsix` |
| 标题与简介 | `config.json` 的 `pack.displayName`、`pack.description` |
| 搜索关键词 | `src/manifest.template.json` 的 `keywords`，再加上打包进去的 locale id |

不管包里带了几种语言，两个市场都只显示一个页面，并且都会检索页面文字——这就是那个页面写成多语言的原因。

## Open VSX（Kiro 用户能搜到，优先）

1. 用 **GitHub** 登录 [open-vsx.org](https://open-vsx.org/)（至少登录一次，管理员才能在库里找到你）。
2. 在 Eclipse / Open VSX 侧签好 **Publisher Agreement**（未签署时无法成为 Owner，发布也可能被拦）。
3. 在个人资料里创建 **Personal Access Token**，这就是 `OVSX_PAT`。
4. 一次性创建命名空间（须与 `config.json` 的 `publisher` 一致）：

```powershell
$env:OVSX_PAT = "你的令牌"
npx ovsx create-namespace polang233
```

此时你通常是 **contributor**（可以发版），但命名空间仍可能显示为 **unverified**。  
若该名字已被别人占用，先改 `config.json` 的 `publisher`，再用新名字创建。

5. （推荐）申请 **Owner / verified**：用 GitHub 账号 `polang233` 开 Issue  
   [Claim namespace ownership](https://github.com/EclipseFdn/open-vsx.org/issues/new?template=claim-namespace-ownership.yml)。  
   对个人发布者最省事的填法：Namespace = `polang233`；勾选「未被占用」与「GitHub 满 12 个月」；选 **Option 3**（不是 VS Marketplace 出版商）→ 勾「命名空间与提出申请的 GitHub ID 一致」。  
   管理员通过后命名空间会显示为 verified；**没通过前一般仍可先 `publish:ovsx` 上架**。

6. 本机发布：

```powershell
$env:OVSX_PAT = "你的令牌"
npm run publish:ovsx
```

试运行：`npm run publish:ovsx -- --dry-run`。

7. **CI：** 在 GitHub 仓库 Secrets 里配置 `OVSX_PAT`，然后：

```bash
git tag v1.0.0
git push origin v1.0.0
```

[`.github/workflows/release.yml`](../.github/workflows/release.yml) 会打包、挂到 GitHub
Release，并执行 `npm run publish:ovsx`。

发布后页面应为：

https://open-vsx.org/extension/polang233/kiro-language-pack

该页在返回 200 之前，根 README 会引导用户先用 GitHub Releases。

## VS Code Marketplace（可选）

Kiro 默认不用这个源。只有当你也想出现在
[marketplace.visualstudio.com](https://marketplace.visualstudio.com/) 时才需要（例如给原版
VS Code 用户装，或额外曝光）。

1. 打开 [Marketplace 发布者管理](https://marketplace.visualstudio.com/manage)，用 Microsoft
   账号登录。
2. 创建 **Publisher**，名称尽量与 `config.json` 的 `publisher` 相同（`polang233`）。
   这就是常说的「VS Code 出版商账户」：挂在你 Microsoft 登录下的发布者资料，本身不等于要买
   Azure 订阅；向导可能会让你关联一个 Azure DevOps 组织，按页面提示即可。
3. 在 Azure DevOps 创建具有 **Marketplace → Manage** 权限的 Personal Access Token。
   这是 `VSCE_PAT`（和 `OVSX_PAT` 不是同一个）。
4. 发布：

```powershell
$env:VSCE_PAT = "你的令牌"
npm run publish:vsce
```

## 发布之后

- 提醒用户先卸载冲突的官方 VS Code 语言包再装本包。
- Open VSX 扩展页真正可访问后，把根 README 的安装说明从「先用 Release」改回直链。
- 下一版发布前先 bump `config.json` 与 `package.json` 的 `version`。

English: [publishing.md](publishing.md).
