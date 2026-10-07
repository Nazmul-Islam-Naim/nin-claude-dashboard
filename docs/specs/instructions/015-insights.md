---
id: "015"
title: Project insights (models, plugins, skills)
date: 2026-10-07
status: frozen
---

## Original request

"ekhane project wise kisu insight add korte cai. jemon kon project ki ki model use korece, ki ki plugin use korece tar percent etc"

## Assumptions & corrections

- Source: the project's Claude Code transcripts (`.jsonl`), including subagent transcripts in sub-folders. A file belongs to a project through its `cwd`, as in spec 001.
- The counting unit is a response, identified by `message.id`. One response is written over several lines (a sampled project had 472 lines for 209 responses), so lines are never counted. Output tokens use the largest `output_tokens` seen for an id.
- Observed in the real files: `attributionSkill` and `attributionPlugin` are written on the assistant lines themselves, so the share of responses that ran under a plugin or skill is measured directly, not estimated.
- Model share: responses per model, with the response count and output tokens; `<synthetic>` is ignored; names are shown as they are.
- Plugin share: responses attributed to the plugin divided by all responses. The plugin is `attributionPlugin`, or the part before `:` of `attributionSkill` when only the skill is present. Responses with no plugin are shown as "plugin ছাড়া", so the shares add up to 100%.
- Skill list: skill name, its plugin, responses and share of all responses, at most 10 rows. Skills started by a slash command are included because they are found through attribution.
- Time range: `?days=7` or `?days=30`; anything else means all time.
- Shown only on the project detail page as a new "Insights" section (three blocks with horizontal bars, name, % and count). The cards do not change.
- Separate endpoint `GET /api/insights?project=<name>&days=<n>`, called only when the detail page is open. Per-file results are cached in memory by (path, mtime, size), so only changed files are parsed again.
- Privacy: only names and counts leave the reader, never message text. Broken lines are skipped. The reader only reads. The LAN token (spec 014) covers the endpoint.

## Agreed scope

- `insightsReader` module, the endpoint, the "Insights" section on the detail page, a contract update.

## Out of scope

- Cost estimates, insights on the project cards, per-session breakdowns, input and cache tokens.
