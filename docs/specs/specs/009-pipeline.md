---
id: "009"
title: Pipeline tab
status: built
date: 2026-10-05
instruction: docs/specs/instructions/009-pipeline.md
---

## Summary

The `#/pipeline` tab: a read-only board that shows every requirement across projects in four status columns, filterable by project.

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

- `board = useApi(project ? '/api/pipeline?project=' + encodeURIComponent(project) : '/api/pipeline')`, shape `{ Extracted: [], Confirmed: [], 'Spec Written': [], Rejected: [] }`, each row `{ project, id, title, summary, source, priority, status, spec }`.
- `projects = useApi('/api/projects')` for the select options and the unreadable-Sheet count (`requirements.status !== 'ok'`).

**Layout**

1. `h1` "Pipeline", the project `<select>` ("সব project" first). The selection resets to "সব project" if that project leaves the names list.
2. If the count of projects with a missing or unreadable Sheet is above 0, a muted note: "{n}টা project-এর Sheet পড়া যায়নি বা যুক্ত নেই".
3. Board: `display: grid` with four columns from 768px up, one column below. Each `PipelineColumn` has a header "{status} {count}" and its cards; an empty column shows "কিছু নেই". The Rejected column uses muted colours.
4. `RequirementCard`: id and title, project name as a link to `#/projects/<name>`, a priority badge with text, the summary clipped to two lines (`title` attribute holds the full text), and "spec {id}" when `spec` is set.

**States**: first load -> `Skeleton` columns; all four columns empty -> a single `EmptyState` "কোনো requirement নেই"; error with no data -> `ErrorNote` in the board area; a later failed poll keeps the previous board.

**Components**: `PipelinePage.jsx`, `PipelineColumn.jsx`, `RequirementCard.jsx`. The project `<select>` is the same component as in the Live feed (008).

## Acceptance & Test criteria

1. Each requirement appears in the column matching its `status`; column headers show the right counts.
2. Order inside a column matches the API order.
3. Choosing a project requests `/api/pipeline?project=<encoded name>`; "সব project" requests `/api/pipeline`.
4. A project name links to `#/projects/<name>`; Spec Written cards show "spec {id}".
5. An empty column shows "কিছু নেই"; with all four empty only the single EmptyState shows.
6. The note counts projects with `no-sheet` or `error` and is hidden when that count is 0.
7. The Rejected column is visibly muted but still readable (text contrast stays accessible).
8. At 360px the columns stack and there is no horizontal page scroll; at 1280px there are four columns.
9. Priority and status are readable as text, not colour alone.

The unreadable-Sheet count and the URL builder get unit tests; the board is checked by hand against the real dashboard data.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.
