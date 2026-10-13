---
id: "022"
title: Enable and disable Claude plugins per project
status: built
date: 2026-10-13
instruction: docs/specs/instructions/022-project-plugin-toggle.md
---

## Summary

The project detail page lists installed Claude plugins with a toggle per plugin. Toggling writes only that plugin's entry under `enabledPlugins` in `<project>/.claude/settings.local.json`.

## Problem & Goal

Plugins are on for every project by default, which adds noise and token cost where they are not needed. The user wants to turn plugins on or off per project without editing JSON by hand.

## Scope

- `server/pluginsReader.js`, `GET` and `PUT /api/projects/:name/plugins`, web `PluginsPanel`, tests, contract.

## Analysis

- Impact on existing work: first code to read `.claude` settings and plugin data; spec 015 only reads transcripts. The contract note "never writes to `~/.claude`" stays true (the write goes to the project folder).
- Assumptions: `enabledPlugins` merges per key with precedence user < project `settings.json` < project `settings.local.json`; a missing key inherits.
- Risks: corrupting a settings file (strict parse, refuse on failure, atomic write, other keys preserved), leaking secrets from settings (only `enabledPlugins` is ever returned), writing arbitrary keys (id must be an installed plugin or an existing key), a project where `settings.local.json` is not gitignored (response includes a warning).

## Design

**List** (`GET /api/projects/:name/plugins`): read `~/.claude/plugins/installed_plugins.json`; split each key on the last `@` into plugin and marketplace; skip entries whose `installPath` is missing; honor `scope`/`projectPath`. Description from `<installPath>/.claude-plugin/plugin.json`, fallback to the marketplace manifest. Effective `enabled` and `source` (`user`|`project`|`local`|`default`) from the merged settings. Keys present in settings but not installed are returned with `installed:false`. Response: `{ plugins:[{ id, name, marketplace, version, description, enabled, source, installed }], note }`.

**Toggle** (`PUT`): body `{ id, enabled }` (boolean). Same guard as `POST /api/open`. Read `<project>/.claude/settings.local.json` (missing -> `{}`), strict `JSON.parse` (failure -> 422 and nothing written), set `enabledPlugins[id]`, write 2-space JSON plus newline via temp file + rename, create `.claude/` if needed. Never touches `installed_plugins.json`, the plugin cache or `~/.claude/settings.json`.

**Web**: `PluginsPanel` with search, toggle, source badge and the note "Applies to new Claude sessions; run /reload-plugins in open ones."

## Acceptance & Test criteria

1. Merge precedence: local overrides project overrides user; missing key shows inherited state.
2. Toggle writes only `enabledPlugins[id]`; all other keys and unrelated plugins stay unchanged.
3. Invalid JSON in the file -> 422, file byte-for-byte unchanged.
4. Unknown id -> 400. Non-loopback, bad Origin, non-JSON -> 403/415.
5. Response never contains `env`, `hooks`, `permissions` or other settings content.

## Deploy notes

None. No new dependencies.

## Open questions

- None.

## Change log

- 2026-10-13: created.
