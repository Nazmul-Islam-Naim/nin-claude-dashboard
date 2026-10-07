---
id: "015"
title: Project insights (models, plugins, skills)
status: built
date: 2026-10-07
instruction: docs/specs/instructions/015-insights.md
---

## Summary

For one project, show which models answered, which plugins and skills were involved, and what share each one has, read from the Claude Code transcripts.

## Problem & Goal

The dashboard shows when a project was active but not how it was worked on. Goal: per project, the share of responses by model, by plugin and by skill, plus output tokens per model, on the project detail page.

## Scope

- `server/insightsReader.js`, `GET /api/insights`, `web` "Insights" section on the detail page (007).

## Analysis

- Impact on existing work: reuses the scanner's directory walk and `cwd` normalisation (spec 001); adds one `GET` endpoint to the server (spec 003) and one section to the detail page (spec 007).
- Observed on this machine: assistant lines carry `message.id`, `message.model`, `message.usage.output_tokens`, `attributionSkill`, `attributionPlugin`, `timestamp`, `isSidechain`. Lines per response repeat (472 lines for 209 responses in one project), subagent transcripts live in sub-folders (59 of 214 responses in the same project were sidechain), and `attributionSkill` / `attributionPlugin` appear only on assistant lines.
- Risks: double counting (solved by counting `message.id`), large histories (per-file cache and a request only when the detail page is open), a file still being written (partial last line is skipped), names that differ in form (`plugin:skill` versus a plain skill name).

## Design

**Interface**

```js
readInsights(projectPath, { root, days, now })
// -> { status: 'ok' | 'none', days: 7 | 30 | null,
//      totals: { responses, outputTokens },
//      models:  [{ model, responses, percent, outputTokens }],
//      plugins: [{ plugin: string | null, responses, percent }],
//      skills:  [{ skill, plugin: string | null, responses, percent }] }
```

**Files of a project**: a helper exported from the scanner (for example `filesByProject(root)`) maps each normalised project path to all its `.jsonl` files, including sub-folders and files that contain only sidechain lines (the scanner counts sessions without them, insights must not skip them).

**Per file** (cached by `path + mtime + size`): parse line by line, skip lines that fail `JSON.parse`. For each assistant line with a `message.id` keep one record per id: `{ id, model, outputTokens (max seen), ts (first timestamp), skill, plugin }`, where `skill` and `plugin` are taken from `attributionSkill` / `attributionPlugin` of any line of that id. A model of `<synthetic>` or an empty model excludes the record.

**Aggregate**: merge the records of all files (an id seen in two files counts once). If `days` is 7 or 30, keep records with `ts >= now - days`. A record's plugin is `plugin`, else the part before `:` in `skill` when it contains one, else `null`.

- `totals.responses` is the record count, `totals.outputTokens` the sum of `outputTokens`.
- `models`: grouped by model, sorted by `responses` descending.
- `plugins`: grouped by plugin including `null` (shown as "plugin ছাড়া"), sorted descending.
- `skills`: records with a `skill`, grouped by skill (its `plugin` as above), top 10 by `responses`.
- `percent = responses / totals.responses * 100`, one decimal; `0` when there are no responses.

**Endpoint**: `GET /api/insights?project=<name>&days=<n>`. The name is looked up in the current scan to find the project path (first match). Unknown project or no transcripts returns 200 `{ status: 'none', days, totals: { responses: 0, outputTokens: 0 }, models: [], plugins: [], skills: [] }`. No client path is accepted. An unexpected error returns 500 `{ error }`.

**Web**: `InsightsSection({ project })` on the detail page calls `useApi('/api/insights?project=<encoded name>&days=<n>')` (no `days` for all time). A `<select>` "সব সময় / শেষ ৩০ দিন / শেষ ৭ দিন" holds the range in page state. Three blocks, each a list of rows with a horizontal bar (width = percent), the name, the percent and the count: Models (plus output tokens), Plugins, Skills. States: `Skeleton` on first load, `EmptyState` "এখনো কোনো তথ্য নেই" for `status: 'none'` or zero responses, `ErrorNote` scoped to the section. Percent text always accompanies a bar. On narrow screens the rows stack their numbers under the name; no horizontal page scroll.

**Components**: `server/insightsReader.js`, a small change in `server.js` and in `scanner.js` (the exported helper), `web/src/components/InsightsSection.jsx`, helpers in `web/src/lib.js`.

## Acceptance & Test criteria

Reader tests use fixture `.jsonl` files in a temp directory:

1. Three lines with one `message.id` count as one response; `outputTokens` is the largest value among them.
2. Model percentages are computed over responses; a `<synthetic>` model is ignored; percentages add up to 100 within rounding.
3. A response whose `attributionPlugin` is set counts to that plugin; one with only `attributionSkill` of the form `p:s` counts to `p`; one with a skill without `:` or with no attribution counts to `null`.
4. The skills list has at most 10 rows, sorted descending, each carrying its plugin.
5. A file that holds only sidechain lines (a subagent transcript) is included; the same `message.id` in two files counts once.
6. `days: 7` keeps only records from the last 7 days relative to `now`; an unsupported value means all time.
7. A malformed or truncated line is skipped without throwing.
8. An unchanged file is not parsed twice (cache hit by path, mtime and size); a file whose mtime or size changed is parsed again.
9. Unknown project or empty transcripts returns `status: 'none'` with empty lists.
10. Output contains only names and numbers; a fixture message text never appears in the result.

Endpoint tests: unknown `project` returns 200 with `status: 'none'`; a `path` query parameter is ignored. Web tests (Vitest): the helpers that format percent and counts, and the empty/zero cases. By hand: the three blocks on a real project, and the range select.

## Deploy notes

Reads `~/.claude/projects` (or `CLAUDE_PROJECTS_DIR`) read-only. No credentials, no network.

## Open questions

None.

## Change log

- 2026-10-07 (instruction 016): Insights layout redesigned as three cards side by side with collapsed rows (see "Redesign" below); data and endpoint unchanged.

## Redesign (instruction 016)

The three blocks become three cards (Models, Plugins, Skills) in a grid: one column on small screens, three from 1024px. Each card has a title and rows. A row has the name (with the plugin in muted text for skills) and the percent on one line, the bar under it, and a small count line (responses, plus output tokens for models). Each card shows 5 rows, with "সব দেখান (N)" when it has more. The range select stays at the top right of the section. The data, the endpoint and the states (Skeleton, EmptyState, ErrorNote) do not change. Percent text always accompanies the bar.

Acceptance: at 1280px the three cards sit side by side and at 360px they stack with no horizontal scroll; a card with more than 5 rows shows 5 and a "সব দেখান (N)" control that reveals the rest; every bar has its percent as text.
