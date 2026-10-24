# npm 维护

`@polang233/kiro-language-pack@1.2.0` 待首次发布；扩展 id 保持 `polang233.kiro-language-pack`。推荐用户使用 Node.js 22+，实际最低 18.17。日常用户通过 npx 使用包内同版本 VSIX，无需下载源码或构建。

## 源码联调与产物

在仓库根目录执行：

```bash
npm ci
npm run sync -- --strategy=api
npm test
npm run package:npm
node bin/cli.mjs preview --locale=zh-tw
node bin/cli.mjs status
```

按需复测已有产物可单独运行 `npm run test:package`；`package:npm` 已包含同一套完整 tarball 测试。

首次发布前也可用本地 TGZ 演示 npx，以下命令运行本地产物：

```bash
npx --yes --package="./dist/polang233-kiro-language-pack-1.2.0.tgz" kiro-language-pack preview
```

源码入口与 npx 使用相同参数：默认 `install`，也支持 `install/preview/status/restore`、`--locale=zh-cn/zh-tw` 和 `--dir="路径"`。实际安装前退出应用；联调安装与恢复时使用隔离 fixture。系统语言含 TW/HK/MO 或 zh-Hant 时选 `zh-tw`，沿用台湾用词；其余选 `zh-cn`。

| 命令 | 职责 |
| --- | --- |
| `npm run test:cli` | 纯 CLI/locale 测试，不构建、不要求真实应用 |
| `npm test` | 扩展运行时、CLI/语言检测与补丁安装恢复的隔离测试 |
| `npm run verify` | 原有构建、manifest、覆盖率检查，需要先 detect/extract 本机应用 |
| `npm run package:npm` | 构建本版本 VSIX、准备包内 assets、执行 npm pack 到 dist，再验证真实 TGZ |
| `npm run test:package` | 重新测试 dist 中本版本已有 TGZ，可重复运行，不依赖重新打包 |

`test:package` 必须把 `dist/polang233-kiro-language-pack-<version>.tgz` 安装到仓库外的临时目录，从安装后的包运行 CLI，不能借用源码或开发依赖。检查 CLI/译文/同版本 VSIX 都在包内，并逐条核对自维护内置扩展译文确实存在于 VSIX 的 package 区段，并用临时应用与用户配置 fixture 覆盖 preview、status、install、重复安装、restore、语言选择和带空格的 `--dir`。测试不能修改真实应用或用户配置。

CI 在 Windows、macOS、Linux 分别执行 npm ci、npm test、API sync、package:npm 和 manifest 校验，package:npm 已含真实 tarball 的完整 fixture 测试。本机发布前另跑 verify。应用更新后用户重跑 install；restore 只恢复程序文件，扩展和显示语言可在应用内切换。

## 首次发布与后续 OIDC

首次发布及以下配置需要后续明确授权，用户也可授权代理完成。自动发布初始关闭：

1. 登录 npm，注册或确认 `polang233` 账号及 `@polang233` scope 所有权。npm scope 与 Open VSX namespace 互不代替。
2. 完成上述检查后，首次发布确定的 `dist/polang233-kiro-language-pack-1.2.0.tgz`，使用 `npm publish <该TGZ路径> --access public`，并在 npm 确认包名和版本。
3. 在该 npm 包的 Settings → Trusted publishing 配置 GitHub Actions：

| 字段 | 值 |
| --- | --- |
| Organization or user | `polang233` |
| Repository | `kiro-language-pack` |
| Workflow filename | `release.yml`，只填文件名 |
| Environment | 留空，与当前工作流一致 |
| Allowed actions | 允许直接 `npm publish` |

4. 配置并核对后，再将该 GitHub 仓库变量 `NPM_PUBLISH_ENABLED` 设为字符串 `true`。未设置或为 `false` 时 npm job 跳过。仅在用户授权后更改变量或远程配置。

之后，经授权的 `v<version>` tag 与同版本 VSIX 一起发布 npm 包；手动 dispatch 只有 `publish=true` 才能发布。`publish=false` 对所有 registry 都生效，包括在 tag 上运行时。

[官方 trusted publishing 要求](https://docs.npmjs.com/trusted-publishers/)为 Node ≥22.14.0、npm ≥11.5.1。发布 job 选 Node 24，显式检查 npm 下限，配置 `registry-url: https://registry.npmjs.org` 和 job 级 `id-token: write`，通过 OIDC 发布已测试的确定 TGZ，无需 npm 长期发布令牌。

工作流查询精确包名/版本，确认已发布才 skip；只有 HTTP 404 才进入发布，超时、网络、鉴权、服务端或响应解析错误均失败。发布本身的错误也保持失败。版本、覆盖率与升级流程见[发布说明](publishing.zh-CN.md)。
