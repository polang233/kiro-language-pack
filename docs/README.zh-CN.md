# 文档索引

安装与使用见根目录 [README.zh-CN](../README.zh-CN.md) / [README](../README.md)。
本目录下的内容面向贡献者与维护者。

| 文档 | 语言 | 内容 |
| --- | --- | --- |
| [architecture.zh-CN.md](architecture.zh-CN.md) · [EN](architecture.md) | 简体中文 · EN | 为什么做成一个自包含扩展、本地化如何解析、构建流水线、运行时 |
| [advanced-patch.zh-CN.md](advanced-patch.zh-CN.md) · [EN](advanced-patch.md) | 简体中文 · EN | 可选的安装目录补丁：命令行、改动的文件清单、风险 |
| [publishing.zh-CN.md](publishing.zh-CN.md) · [EN](publishing.md) | 简体中文 · EN | Open VSX、Marketplace、GitHub Releases |
| [history.md](history.md) | 简体中文 | 调研与决策记录。不是安装指南，也不作为准则 |
| [images/](images/README.md) | — | README 用到的截图 |

两个不在本目录、但很容易漏掉的地方：

- **新增语言** — [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-language)。语言列表在
  `config.json` 里，不需要改脚本。
- **扩展市场页面** — `src/marketplace/README.md`。构建时会复制进 `.vsix`。它是刻意写成多语言的：
  商店对所有内置语言只显示同一个页面，而且会检索页面文字。
- **给后续 AI 的发布说明** — 根目录 [AGENTS.md](../AGENTS.md)（Open VSX secret 名、打 tag 发版流程）

贡献流程、译文规则、提 PR 前的检查项：[CONTRIBUTING.md](../CONTRIBUTING.md)。
