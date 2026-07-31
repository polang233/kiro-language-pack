# Kiro Language Pack

![Kiro Language Pack icon](../../media/icon.png)

Community language pack for [Kiro IDE](https://kiro.dev/). **One extension** for the workbench and Kiro-specific UI.

Ships **Simplified Chinese** and **Traditional Chinese**. More locales can be enabled when translations land.

## Install

1. Uninstall any other language pack first (this pack **replaces** the official VS Code one).
2. Install from Extensions, or [Open VSX](https://open-vsx.org/extension/polang233/kiro-language-pack).
3. **Language Pack: Select Display Language** → restart.

## Extension vs patch

- **Extension (this):** supported path for almost all UI.
- **Optional patch** (`npm run patch` in the repo): ~89 extra strings by editing the Kiro install; unsupported, reverted by updates. See [advanced-patch.md](https://github.com/polang233/kiro-language-pack/blob/main/docs/advanced-patch.md).

## Limits

Chat panel, hook editor, powers panel, and account popup stay English (upstream).

## Privacy

Writes only `locale` in `argv.json` when you confirm. No network, no telemetry.

## License

MIT. Not affiliated with AWS or Microsoft. Full docs: [README](https://github.com/polang233/kiro-language-pack#readme).
