# Agent notes (kiro-language-pack)

User instructions define the authorized scope. Human docs: [README.md](README.md), [npm maintenance](docs/npm.md), [publishing](docs/publishing.md) / [简体中文](docs/publishing.zh-CN.md).

## Package and extension contract

- The npm package `@polang233/kiro-language-pack` is public. Keep npm, VSIX and lockfile versions aligned.
- Extension id stays `polang233.kiro-language-pack`. Do not derive its publisher/name from the scoped npm name.
- `npx @polang233/kiro-language-pack@latest` defaults to `install`. Also support `install/preview/status/restore`, `--locale=zh-cn/zh-tw` and `--dir=path`. Source entry point: `node bin/cli.mjs`.
- Detect system locale: TW/HK/MO or zh-Hant selects `zh-tw` with the existing Taiwan terminology; everything else selects `zh-cn`.
- Recommend Node 22+; runtime minimum is 18.17. Bundle this version's VSIX so end users need neither source checkout nor build.
- After an app update, users rerun install. `restore` restores only app files; the extension and display language can be switched in the app.

## Upgrade workflow

1. Run `npm run check-upgrade`, `npm run detect` and `npm run extract` against the updated Kiro installation.
2. `check-upgrade` archives the previous snapshot under `reports/baselines/`; use `--baseline=<snapshot>` to repeat a comparison. Review changed English even when a translation exists. Inspect added, deleted and moved keys and changed English text. Translate new keys in `src/i18n/zh-cn/`, reuse translations for moved module paths and review obsolete keys. Do not count filtered-out keys as translated.
3. Run `node scripts/convert-zh-tw.mjs`, inspect the diff and preserve Taiwan terminology.
4. Update `target.verifiedKiroVersions` and relevant documentation. Keep README, English README and Chinese copies in sync.
5. Align versions in `config.json`, `package.json`, `package-lock.json` and `package-lock.json.packages[""]`. The scoped npm package and VSIX use the same version; keep package/lock names aligned too. Aligning with a new Kiro build is a patch bump; new pack capabilities, such as this CLI, justify a minor bump.

## Required checks

```bash
npm ci
npm run sync -- --strategy=api
npm run verify
npm test
npm run package:npm
```

- `verify` retains the original coverage/build/manifest checks and needs extracted local app metadata.
- `test:cli` checks CLI/locale behavior; `npm test` also covers upgrade comparisons, extension runtime, and interrupted patch installation/restoration.
- `package:npm` builds the current VSIX, prepares bundled assets, runs npm pack into dist and validates the actual tarball.
- For optional retesting, `npm run test:package` retests dist's current-version TGZ. Install it outside the checkout and run the installed CLI against isolated app/profile fixtures. Check archive contents, matching VSIX, locale selection, preview/status/install/repeated install/restore and paths with spaces. Do not touch a real app or user profile.
- The release workflow runs `npm run test:published` on Windows, macOS and Linux after npm publication. Run the same command locally to verify the public registry tarball and actual npx installs in isolated fixtures. It checks real OS language selection, simulated regions and manual overrides.
- CI runs npm ci, npm test, API sync, package:npm and manifest validation on Windows, macOS and Linux. The package:npm step already runs the full tarball fixture suite. Do not suppress failures or replace archive tests with source-only tests.

## Release authorization and credentials

Do not commit, tag, push, publish, register namespaces, change remote secrets, configure trusted publishers or enable repository variables without explicit user authorization. A documentation/CI request does not grant release authorization.

| Credential | Storage and use |
| --- | --- |
| `OVSX_PAT` | GitHub Actions secret for Open VSX, Kiro's in-app gallery |
| `VSCE_PAT` | Optional VS Marketplace credential |
| npm | OIDC trusted publishing; no long-lived publish token |

Never write or print tokens. Inspect secret names only. Do not commit `.cursor/` or local IDE state.

[release.yml](.github/workflows/release.yml) tests before sync/package and validates manifests; package:npm runs the full real-tarball fixture suite. GitHub Releases attach only the exact current-version VSIX and TGZ. Open VSX retries skip only after the public API confirms the exact namespace, name and version. npm tarball paths must start with `./` or be absolute; bare `dist/name.tgz` is parsed as a GitHub repository shorthand. Preserve existing Open VSX publishing behavior and secret handling.

npm automation runs only when `vars.NPM_PUBLISH_ENABLED == 'true'` and the event is a tag push or manual `publish=true`. Manual `publish=false` must never publish to any registry, even when a tag is selected. The npm job uses Node 24, npm ≥11.5.1, `registry-url: https://registry.npmjs.org` and job-level `id-token: write`. Skip an existing version only after confirming the exact package/version; registry/network errors must fail.

The user authorized initial npm publication and trusted publisher setup on 2026-10-25. The package is bound to GitHub owner `polang233`, repository `kiro-language-pack` and `release.yml`, with direct publish allowed; `NPM_PUBLISH_ENABLED` is `true`. Do not broaden permissions without explicit authorization. See [docs/npm.md](docs/npm.md).

Store body: `src/marketplace/README.md`; title/description: `config.json` → `pack.displayName` / `pack.description`; search terms: `src/manifest.template.json` → `keywords`. Keep Chinese search terms visible.

When a commit is authorized, use a short Chinese message explaining why.
