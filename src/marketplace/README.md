# Language Pack for Kiro

Community language pack for the [Kiro IDE](https://kiro.dev/). One extension, every
available language, the whole interface.

## What it translates

- The editor workbench: menus, Command Palette, settings, source control, terminal,
  notifications
- Built-in extensions: Git, Markdown, npm, language support, themes
- **Kiro's own interface**, which no other language pack reaches: the session and project
  list, the Settings panel, Agent Focus, the spec and steering toolbars, supervised diff
  review, command titles and view names

## Install

Install this extension, then pick a language:

- **Language Pack: Select Display Language** in the Command Palette, or
- the `kiroLanguagePack.language` setting

Either writes the display language for you and offers to restart. If your OS language
already matches one of the bundled languages, Kiro offers to switch on its own.

> **Uninstall any other language pack first.** This pack is self-contained: it provides the
> workbench translations as well as Kiro's, so it replaces the official VS Code language
> pack rather than sitting next to it. Two packs claiming the same language resolve
> unpredictably, and the symptom is a partly translated UI. The pack checks for this on
> startup and names the extension to remove.

## Scope

Kiro's chat panel, hook editor, powers panel and the account/usage popup are compiled
webviews with no internationalization layer, and 76 of its manifest strings are inline
English literals. Neither can be reached by any extension. Everything else is covered.

The repository ships an optional script that translates those remaining strings by editing
the installed Kiro. It is a deliberate last resort - a Kiro update reverts it, and it makes
your install unsupported - so it is not part of this extension. See the repository README if
you want it.

## What this extension does besides translate

Nothing you did not ask for. It reads `product.json` to find your user data folder, reads
and - only when you confirm - writes the single `locale` field of `argv.json`, and reads
installed extension manifests to warn about a conflicting language pack. No network access,
no telemetry.

## Not official

An independent community project, not affiliated with or endorsed by Amazon Web Services,
Inc. or Microsoft Corporation. Workbench translations are derived from
[microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) (MIT); see the bundled
NOTICE file. MIT licensed.
