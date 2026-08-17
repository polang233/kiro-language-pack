# Agent notes (kiro-language-pack)

Persistent instructions for coding agents. Human docs: [README.md](README.md),
[docs/publishing.md](docs/publishing.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## Secrets — never write these to the repo

| Secret | Where it lives | Used by |
| --- | --- | --- |
| `OVSX_PAT` | GitHub Actions secret on `polang233/kiro-language-pack` | `.github/workflows/release.yml` → `npm run publish:ovsx` |
| `VSCE_PAT` | not configured | optional VS Marketplace publish |

Do **not** commit tokens, put them in markdown, or print them. Confirm only the **name**:
`gh secret list`. Rotate: Open VSX profile → new token → `gh secret set OVSX_PAT` (stdin).

Local publish (token from [open-vsx.org](https://open-vsx.org/) profile, not from git):

```powershell
$env:OVSX_PAT = "<token>"
npm run package
npm run publish:ovsx
```

## Shipping a release

1. Bump **both** `config.json` → `version` and `package.json` / lockfile **root** version (same string).
2. `npm run verify` against the local Kiro install (`npm run detect`).
3. Commit, then `git tag v<version>` and push **main + the tag**.
4. Tag `v*` runs [`.github/workflows/release.yml`](.github/workflows/release.yml): package, GitHub Release, Open VSX.
5. Listing: https://open-vsx.org/extension/polang233/kiro-language-pack  
   CLI “Published …” can precede the public page by several minutes. If it never appears, check
   [user-settings/extensions](https://open-vsx.org/user-settings/extensions) for Inactive / Under review.

Do not ask the maintainer for `OVSX_PAT` on a normal release — CI already has it.

## After a Kiro IDE update

```bash
npm run check-upgrade
# translate new keys in src/i18n/zh-cn/ (new core*.i18n.json is fine)
node scripts/convert-zh-tw.mjs
npm run sync && npm run verify
```

Then add the Kiro version to `config.target.verifiedKiroVersions`, update README coverage
numbers and `CHANGELOG.md`, bump the pack version, tag, push.

Moved keys: rename the **module path**, do not retranslate. Orphans can stay; the build filters them.

## Live product

- Extension id: `polang233.kiro-language-pack`
- Open VSX (Kiro’s gallery): https://open-vsx.org/extension/polang233/kiro-language-pack
- GitHub Releases: https://github.com/polang233/kiro-language-pack/releases
- Store page body: `src/marketplace/README.md` (copied into the `.vsix`)
