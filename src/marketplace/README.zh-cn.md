# Kiro Language Pack

[Kiro IDE](https://kiro.dev/) 社区语言包。**一个扩展**同时覆盖编辑器主体与 Kiro 自有界面。

当前含**简体中文**与**繁体中文**；装完后选择显示语言。

## 安装

1. 先卸载其他语言包（本包**替代**官方 VS Code 语言包）。
2. 扩展视图安装，或打开 [Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack)。
3. **Language Pack: Select Display Language** → 重启。

## 扩展 vs 补丁

- **扩展（本页）：** 推荐、受支持，覆盖绝大部分界面。
- **可选补丁**（仓库里 `npm run patch`）：再多约 89 条，直接改安装目录；不受支持，升级会丢。见 [advanced-patch.zh-CN.md](https://github.com/polang233/kiro-language-pack/blob/main/docs/advanced-patch.zh-CN.md)。

## 局限

聊天面板、钩子编辑器、能力面板、账户弹窗仍可能是英文（上游限制）。

## 隐私

仅在你确认后写入 `argv.json` 的 `locale`。不联网、不上报。

## 许可

MIT。与 AWS / Microsoft 无隶属关系。完整说明：[README.zh-CN.md](https://github.com/polang233/kiro-language-pack/blob/main/README.zh-CN.md)。

---

## English

One community pack for Kiro: workbench + Kiro UI. Ships `zh-cn` and `zh-tw`. Uninstall other language packs first, install, then **Language Pack: Select Display Language**. Chat/hook/powers/account may stay English.
