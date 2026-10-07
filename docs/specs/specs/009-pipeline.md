---
id: "009"
title: Pipeline tab
status: built
date: 2026-10-05
instruction: docs/specs/instructions/009-pipeline.md
---

## Summary

The `#/pipeline` tab: a read-only board that shows every requirement across projects in five status columns, filterable by project.

## Problem & Goal

The Projects page shows only a progress bar per project. The user also needs to see which individual requirements sit at which stage. Goal: a board that mirrors the Sheet statuses without letting the dashboard change them.

## Scope

- `PipelinePage`, `PipelineColumn`, `RequirementCard`.

## Analysis

- Impact on existing work: consumes `GET /api/pipeline` and `GET /api/projects` (003), the shell and state components (005) and the project filter pattern of the Live feed (008). No backend change.
- Risks: projects with an unreadable Sheet silently missing from the board (addressed by the note), many requirements making a column long (columns grow; no pagination in v1), narrow screens (columns stack).
- Decision: Rejected stays visible but muted, because the tracking rules treat it as history, not as deletion.

## Design

**Data**

- `board = useApi(project ? '/api/pipeline?project=' + encodeURIComponent(project) : '/api/pipeline')`, shape `{ Extracted: [], Confirmed: [], 'Spec Written': [], Built: [], Rejected: [] }` (only projects whose requirements come from a Sheet), each row `{ project, id, title, summary, source, priority, status, spec }`.
- `projects = useApi('/api/projects')` for the select options and the unreadable-Sheet count (`requirements.source !== 'sheet'`).

**Layout**

1. `h1` "Pipeline", the project `<select>` ("সব project" first). The selection resets to "সব project" if that project leaves the names list.
2. If the count of projects without a Sheet board (no Sheet, an unreadable Sheet, or MAP-only) is above 0, a muted note: "{n}টা project-এর Sheet পড়া যায়নি বা যুক্ত নেই (এগুলোর অবস্থা Projects পাতায়)".
3. Board: `display: grid` with five columns from 768px up (Extracted, Confirmed, Spec Written, Built, Rejected), one column below. The Built column header is green. Each `PipelineColumn` has a header "{status} {count}" and its cards; an empty column shows "কিছু নেই". The Rejected column uses muted colours.
4. `RequirementCard`: id and title, project name as a link to `#/projects/<name>`, a priority badge with text, the summary clipped to two lines (`title` attribute holds the full text), and "spec {id}" when `spec` is set.

**States**: first load -> `Skeleton` columns; all five columns empty -> a single `EmptyState` "কোনো requirement নেই"; error with no data -> `ErrorNote` in the board area; a later failed poll keeps the previous board.

**Components**: `PipelinePage.jsx`, `PipelineColumn.jsx`, `RequirementCard.jsx`. The project `<select>` is the same component as in the Live feed (008).

## Acceptance & Test criteria

1. Each requirement appears in the column matching its effective `status` (a row the API reports as `Built` is in the Built column); column headers show the right counts.
2. Order inside a column matches the API order.
3. Choosing a project requests `/api/pipeline?project=<encoded name>`; "সব project" requests `/api/pipeline`.
4. A project name links to `#/projects/<name>`; Spec Written cards show "spec {id}".
5. An empty column shows "কিছু নেই"; with all five empty only the single EmptyState shows.
6. The note counts projects whose `requirements.source` is not `sheet` (including MAP-only projects) and is hidden when that count is 0.
7. The Rejected column is visibly muted but still readable (text contrast stays accessible).
8. At 360px the columns stack and there is no horizontal page scroll; at 1280px there are five columns.
9. Priority and status are readable as text, not colour alone.

The unreadable-Sheet count and the URL builder get unit tests; the board is checked by hand against the real dashboard data.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.

## Change log

- 2026-10-07 (instruction 011): the board has five columns (added Built); only Sheet-sourced projects appear; the note now counts every project without a Sheet board, MAP-only ones included.
