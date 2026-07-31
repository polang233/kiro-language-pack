# Documentation

Installing and using the pack is covered in the root [README](../README.md) /
[README.zh-CN](../README.zh-CN.md). Everything here is for contributors and maintainers.

| Document | Language | What it covers |
| --- | --- | --- |
| [architecture.md](architecture.md) · [zh-CN](architecture.zh-CN.md) | EN · 简体中文 | Why one self-contained extension, how localization resolves, the build pipeline, the runtime |
| [advanced-patch.md](advanced-patch.md) · [zh-CN](advanced-patch.zh-CN.md) | EN · 简体中文 | The optional install-directory patch: CLI, exact file list, risks |
| [publishing.md](publishing.md) · [zh-CN](publishing.zh-CN.md) | EN · 简体中文 | Open VSX, Marketplace, GitHub Releases |
| [history.md](history.md) | 简体中文 | Research and decision log. Not an install guide, and not authoritative |
| [images/](images/README.md) | — | Screenshots used by the README |

Two things that live outside this folder and are easy to miss:

- **Adding a language** — [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-language). The locale
  list is in `config.json`; no script changes are needed.
- **The extension marketplace page** — `src/marketplace/README.md`. It is copied into the
  `.vsix` at build time and is deliberately multilingual, because the store shows one page for
  all bundled languages and searches its text.

Contributor workflow, translation rules and the pre-pull-request checks:
[CONTRIBUTING.md](../CONTRIBUTING.md).
