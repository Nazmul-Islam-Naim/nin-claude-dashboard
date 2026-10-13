---
id: "022"
title: Enable and disable Claude plugins per project
date: 2026-10-13
status: frozen
---

## Original request

"dashboard theke project wise claude plugin enable and disable korar ekta features add korte hobe"
(Add a feature to enable and disable Claude plugins per project from the dashboard.)

## Assumptions & corrections

- The dashboard writes only `enabledPlugins[<plugin>@<marketplace>]` in `<project>/.claude/settings.local.json` (per-user, gitignored). Confirmed by the user.
- Disable means `false`; plugins are never uninstalled and `~/.claude/settings.json` is never touched.
- A settings file that is not valid JSON is never overwritten; the user sees an error.
- Changes apply to new Claude sessions; open sessions need `/reload-plugins` or a restart.

## Agreed scope

- `server/pluginsReader.js`, `GET` and `PUT /api/projects/:name/plugins`, web `PluginsPanel` on the detail page, contract, tests.

## Out of scope

- Installing or uninstalling plugins, editing the committed `settings.json`, user-level toggles, marketplace management.
