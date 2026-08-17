# Publishing the language pack

Kiro’s extension gallery uses **[Open VSX](https://open-vsx.org/)** by default. Publish
there first so users can search **Kiro Language Pack** inside Kiro. The VS Code
Marketplace is optional and does **not** appear in Kiro’s default search.

The id in [`config.json`](../config.json) → `publisher` is currently `polang233`. That same
string must match the Open VSX **namespace** and (if you publish there) the VS Marketplace
**publisher** name.

## Two registries, two accounts (read this first)

| | Open VSX (needed for Kiro) | VS Code Marketplace (optional) |
| --- | --- | --- |
| Who runs it | Eclipse Foundation | Microsoft |
| URL of your extension | `open-vsx.org/extension/<namespace>/<name>` | `marketplace.visualstudio.com/items?itemName=<publisher>.<name>` |
| Your id is called | **Namespace** | **Publisher** |
| Sign-in | [open-vsx.org](https://open-vsx.org/) with an **Eclipse** account | [Marketplace publisher management](https://marketplace.visualstudio.com/manage) with a **Microsoft** account |
| Token env var | `OVSX_PAT` | `VSCE_PAT` |
| Create the id once | `npx ovsx create-namespace polang233` | Create publisher `polang233` in the manage UI |
| Publish command | `npm run publish:ovsx` | `npm run publish:vsce` |

They are **independent**. Claiming a namespace on Open VSX does **not** create a VS Marketplace
publisher, and vice versa. Reuse the same id (`polang233`) on both so the extension identity
stays `polang233.kiro-language-pack` everywhere.

**Namespace / publisher** ≈ your brand prefix under which extensions are published. Users see
`polang233.kiro-language-pack`. You create it **once with the account that owns the project**
(your personal Eclipse / Microsoft login is fine; no separate “company approval” is required
for a personal publisher). Pick an id you control long-term; renaming later is painful.

## Prerequisites

```bash
npm install
npm run package          # produces dist/kiro-language-pack-<version>.vsix
```

Confirm `config.json` → `version` matches the tag you will push (CI enforces this on `v*`).

What the store page is built from, in case a listing needs fixing:

| Shown as | Source |
| --- | --- |
| Page body | `src/marketplace/README.md`, copied into the `.vsix` by `npm run build` |
| Title and short description | `config.json` → `pack.displayName`, `pack.description` |
| Search keywords | `src/manifest.template.json` → `keywords`, plus the packaged locale ids |

Both registries show one page per extension no matter how many locales the pack bundles, and
both index its text - which is why that page is written in several languages.

## Open VSX (required for Kiro users)

1. Sign in at [open-vsx.org](https://open-vsx.org/) with **GitHub** at least once (admins must
   see your user in their database).
2. Sign the Open VSX / Eclipse **Publisher Agreement** (required before ownership can be granted).
3. Create a **Personal Access Token** (Access Tokens in your profile). This is `OVSX_PAT`.
4. Create the namespace once (must match `publisher` in `config.json`):

```bash
# PowerShell — set the token for this shell first
$env:OVSX_PAT = "your-token"
npx ovsx create-namespace polang233
```

That usually makes you a **contributor** (you can publish). The namespace may still show as
**unverified** until you are granted ownership. If the name is taken, change
`config.json` → `publisher` and create that id instead.

5. (Recommended) Request **Owner / verified** via
   [Claim namespace ownership](https://github.com/EclipseFdn/open-vsx.org/issues/new?template=claim-namespace-ownership.yml)
   while logged into GitHub as `polang233`. Easiest personal path: Namespace `polang233`;
   confirm it is unowned and your GitHub account is ≥12 months old; pick **Option 3**
   (not a VS Marketplace publisher) → check that the namespace **matches your GitHub ID**.
   You can usually `publish:ovsx` before the issue is granted; verification is separate.

6. Publish locally:

```bash
# Windows PowerShell
$env:OVSX_PAT = "your-token"
npm run publish:ovsx

# macOS / Linux
export OVSX_PAT=your-token
npm run publish:ovsx
```

Or dry-run: `npm run publish:ovsx -- --dry-run`.

7. **CI path:** repository secret `OVSX_PAT` is already configured on
   `polang233/kiro-language-pack`. Push a matching tag:

```bash
git tag v1.1.0
git push origin v1.1.0
```

[`.github/workflows/release.yml`](../.github/workflows/release.yml) builds the `.vsix`,
attaches it to the GitHub Release, and runs `npm run publish:ovsx`. If the log says
`OVSX_PAT secret is not set`, the secret was deleted — recreate it with
`gh secret set OVSX_PAT` (token on stdin, never committed). Confirm the **name** only
with `gh secret list`.

After publish, the page is:

https://open-vsx.org/extension/polang233/kiro-language-pack

## VS Code Marketplace (optional)

Kiro does not use this registry by default. Use it only if you also want the pack on
[marketplace.visualstudio.com](https://marketplace.visualstudio.com/) (e.g. for people who
install into stock VS Code, or for discoverability outside Kiro).

1. Open [Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage)
   and sign in with a Microsoft account.
2. Create a **Publisher** whose name matches `config.json` → `publisher` when possible
   (`polang233`). That is the “VS Code 出版商账户”: a publisher profile under your Microsoft
   login, not a paid Azure subscription by itself. You may be asked to link an Azure DevOps
   org; follow the Marketplace wizard.
3. Create an Azure DevOps **Personal Access Token** with **Marketplace → Manage** scope.
   That token is `VSCE_PAT` (different from `OVSX_PAT`).
4. Publish:

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
- Bump `config.json` → `version` (and `package.json`) before the next release.

中文说明见 [publishing.zh-CN.md](publishing.zh-CN.md)。
