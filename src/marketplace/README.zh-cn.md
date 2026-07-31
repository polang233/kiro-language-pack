# Kiro Language Pack

![Kiro Language Pack icon](../../media/icon.png)

[Kiro IDE](https://kiro.dev/) 社区语言包。

本扩展在**同一扩展包**中提供简体中文（`zh-cn`）与繁体中文（`zh-tw`），覆盖编辑器主体与 Kiro 自有界面。安装后请在命令面板中选择显示语言。

**重要：** 本扩展替代 VS Code 官方语言包。安装前请先卸载其他语言包，请勿并存。

## 支持的语言

| Locale | 语言 |
| --- | --- |
| `zh-cn` | 简体中文 |
| `zh-tw` | 繁體中文 |

其他语言可通过 GitHub 贡献；启用后由宿主按显示语言加载。

## 安装

1. 先卸载其他语言包。
2. 从扩展视图、[Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack) 或 [GitHub Release](https://github.com/polang233/kiro-language-pack/releases) 安装。
3. 命令面板 → **Language Pack: Select Display Language** → 选择语言 → 重启。

切换已包含的语言无需重装扩展。

## 覆盖范围

包含：编辑器主体（基于 [vscode-loc](https://github.com/microsoft/vscode-loc)），以及 Kiro 界面（会话与项目列表、Settings、聚焦智能体 / 聚焦智慧體、工具栏、`kiro.kiroAgent` 清单文案等）。

仍为英文（上游未外置）：聊天面板、钩子编辑器、能力面板、账户 / 用量弹窗。

实测 Kiro **1.0.228**。

## 参与贡献

欢迎提交译文改进，或贡献新语言：

- [GitHub 仓库](https://github.com/polang233/kiro-language-pack) 提 Issue / Pull Request
- 贡献说明：[CONTRIBUTING.md](https://github.com/polang233/kiro-language-pack/blob/main/CONTRIBUTING.md)

## 隐私

仅在你确认后写入 `argv.json` 的 `locale`。不联网、不采集遥测。

## 许可

MIT。与 AWS / Microsoft 无隶属关系。完整说明：[README.zh-CN.md](https://github.com/polang233/kiro-language-pack/blob/main/README.zh-CN.md)。
