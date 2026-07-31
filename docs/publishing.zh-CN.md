# 发布语言包

Kiro 的扩展市场默认走 **[Open VSX](https://open-vsx.org/)**。请**先上 Open VSX**，用户才能在
Kiro 里搜到 **Kiro Language Pack**。VS Code Marketplace 是可选渠道，**不会**出现在 Kiro
默认搜索里。

[`config.json`](../config.json) 里的 `publisher` 必须与你声明的命名空间一致（当前为
`polang233`）。

## 准备

```bash
npm install
npm run package          # 产出 dist/kiro-language-pack-<version>.vsix
```

确认 `config.json` 的 `version` 与即将打的 tag 一致（CI 在 `v*` tag 上会校验）。

## Open VSX（Kiro 用户能搜到，优先）

1. 用 Eclipse 账号登录 [open-vsx.org](https://open-vsx.org/)。
2. 在个人资料里创建 **Personal Access Token**。
3. 一次性声明命名空间（须与 `config.json` 的 `publisher` 一致）：

```bash
npx ovsx create-namespace polang233
```

4. 本机发布：

```powershell
$env:OVSX_PAT = "你的令牌"
npm run publish:ovsx
```

试运行：`npm run publish:ovsx -- --dry-run`。

5. **CI：** 在 GitHub 仓库 Secrets 里配置 `OVSX_PAT`，然后：

```bash
git tag v1.0.0
git push origin v1.0.0
```

[`.github/workflows/release.yml`](../.github/workflows/release.yml) 会打包、挂到 GitHub
Release，并执行 `npm run publish:ovsx`。

发布后页面应为：

https://open-vsx.org/extension/polang233/kiro-language-pack

## VS Code Marketplace（可选）

Kiro 默认不用这个源。只有当你也想出现在
[marketplace.visualstudio.com](https://marketplace.visualstudio.com/) 时才需要。

1. 在 [Marketplace 发布者管理](https://marketplace.visualstudio.com/manage) 创建 Publisher
   （尽量与 `config.json` 的 `publisher` 同名）。
2. 创建具有 **Marketplace → Manage** 权限的 Personal Access Token。
3. 发布：

```powershell
$env:VSCE_PAT = "你的令牌"
npm run publish:vsce
```

## 发布之后

- 提醒用户先卸载冲突的官方 VS Code 语言包再装本包。
- README / 市场页链接指向 Open VSX 扩展页。
- 下一版发布前先 bump `config.json` 与 `package.json` 的 `version`。

English: [publishing.md](publishing.md).
