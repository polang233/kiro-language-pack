# Publishing the language pack

Kiro’s extension gallery uses **[Open VSX](https://open-vsx.org/)** by default. Publish
there first so users can search **Kiro Language Pack** inside Kiro. The VS Code
Marketplace is optional and does **not** appear in Kiro’s default search.

The publisher id in [`config.json`](../config.json) must match the namespace you claim
(`polang233`).

## Prerequisites

```bash
npm install
npm run package          # produces dist/kiro-language-pack-<version>.vsix
```

Confirm `config.json` → `version` matches the tag you will push (CI enforces this on `v*`).

## Open VSX (required for Kiro users)

1. Sign in at [open-vsx.org](https://open-vsx.org/) with an Eclipse Foundation account.
2. Create a **Personal Access Token** (Access Tokens in your profile).
3. Claim the namespace once (must match `publisher` in `config.json`):

```bash
npx ovsx create-namespace polang233
```

4. Publish locally:

```bash
# Windows PowerShell
$env:OVSX_PAT = "your-token"
npm run publish:ovsx

# macOS / Linux
export OVSX_PAT=your-token
npm run publish:ovsx
```

Or dry-run: `npm run publish:ovsx -- --dry-run`.

5. **CI path:** add repository secret `OVSX_PAT`, then:

```bash
git tag v1.0.0
git push origin v1.0.0
```

[`.github/workflows/release.yml`](../.github/workflows/release.yml) builds the `.vsix`,
attaches it to the GitHub Release, and runs `npm run publish:ovsx`.

After publish, the page should be:

https://open-vsx.org/extension/polang233/kiro-language-pack

## VS Code Marketplace (optional)

Kiro does not use this registry by default. Use it only if you also want the pack on
[marketplace.visualstudio.com](https://marketplace.visualstudio.com/).

1. Create a publisher at the [Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage)
   page (Azure DevOps). Use the same id as `config.json` → `publisher` when possible.
2. Create a Personal Access Token with **Marketplace → Manage** scope.
3. Publish:

```bash
# Windows PowerShell
$env:VSCE_PAT = "your-token"
npm run publish:vsce

# macOS / Linux
export VSCE_PAT=your-token
npm run publish:vsce
```

## After publishing

- Uninstall any conflicting official VS Code language pack in Kiro before installing this one.
- Point README / marketplace links at the Open VSX extension URL.
- Bump `config.json` → `version` (and `package.json`) before the next release.

中文说明见 [publishing.zh-CN.md](publishing.zh-CN.md)。
