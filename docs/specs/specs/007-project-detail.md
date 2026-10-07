---
id: "007"
title: Project detail page
status: built
date: 2026-10-05
instruction: docs/specs/instructions/007-project-detail.md
---

## Summary

The page at `#/projects/<name>`: one project's header, its sessions and its requirements, built from data the Projects API already returns.

## Problem & Goal

After spotting a project on the Projects page, the user wants to see what is going on inside it: which sessions ran recently and where each requirement stands. Goal: that view, with no extra backend work.

## Scope

- `ProjectDetailPage`, `SessionsTable`, `RequirementsTable`.

## Analysis

- Impact on existing work: reads `GET /api/projects` (003) and takes `{ name, path, active, lastActivity, sessions, sessionList, requirements }` from one entry. Uses the shell and state components (005), `progress()` and the relative-time helper from the Projects page (006).
- Risks: two projects with the same last path segment (first match wins; single-user local use makes this rare), a project disappearing between polls (page falls back to the not-found state), large `sessionList` (capped at 50 in the UI).
- The detail page reuses the whole-list endpoint on purpose; the payload is small for one machine and avoids a second endpoint to maintain.

## Design

> Layout and section order below are superseded by "Redesign (instruction 016)" at the end of this spec. The data rules (project lookup, sessions cap, requirements source and messages) still hold.

**Data**: `const { data, loading, error } = useApi('/api/projects')`, then `project = data.projects.find(p => p.name === routeName)`.

**Layout**

1. Header: link "← Projects" (`#/projects`), `h1` name, muted full path, Active/Idle badge, line `শেষ session {relative} · {sessions} sessions`, and, when `requirements.sheetUrl` is present, a link "Google Sheet খুলুন ↗" (new tab, `rel="noopener noreferrer"`).
2. `h2` "Sessions": `SessionsTable` with `sessionList` sorted by `lastActivity` descending, first 50. Columns: title (empty -> "(শিরোনাম নেই)"), last activity (relative, `title` attribute holds the full local date), and an "Active" badge when `now - lastActivity <= activeMinutes`.
3. `h2` "Requirements": the summary line `N/M Built` (from `progress()`), then `RequirementsTable` with columns id, title, priority, status badge (text; `Built` is green), spec. When `source === 'map'` a small grey "MAP থেকে" label sits beside the heading and the priority column is empty. Status other than `ok` shows the 006 messages ("Sheet বা MAP নেই" / "Sheet পড়া যায়নি") in place of the table; zero rows shows "কোনো requirement নেই".

**States**: first load -> `Skeleton`; error with no data -> `ErrorNote`; no matching project -> `EmptyState` "project পাওয়া যায়নি" plus the back link. Each table sits in a `overflow-x-auto` box. On mount the page calls `window.scrollTo(0, 0)`.

**Components**: `ProjectDetailPage.jsx`, `SessionsTable.jsx`, `RequirementsTable.jsx`.

## Acceptance & Test criteria

1. `#/projects/<name>` shows that project's header and sections; an unknown name shows "project পাওয়া যায়নি" and the back link.
2. Sessions are newest first and capped at 50; an empty title shows "(শিরোনাম নেই)".
3. A session within `activeMinutes` shows the "Active" badge; an older one does not.
4. Requirements show id, title, priority, status and spec for every row, in the API's row order; the summary reads `N/M Built` and equals `progress()` for the same data. A MAP-based project (`source: 'map'`) shows the "MAP থেকে" label.
5. `no-sheet` and `error` show the matching message instead of the table, and the Sessions section still renders.
6. Status is readable as text, not colour alone.
7. At 360px the page has no horizontal scroll; each table scrolls inside its own box.
8. If the project vanishes on a later poll, the page shows the not-found state instead of crashing.

Pure logic (selecting the project, sorting and capping sessions, the active check) gets small unit tests; layout is checked by hand at 360px and 1280px.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.

## Change log

- 2026-10-07 (instruction 016): redesign (wide layout, requirement cards, compact sessions); see the Redesign section.
- 2026-10-07 (instruction 015): the page gains an "Insights" section (models, plugins, skills) from `GET /api/insights`; see spec 015.
- 2026-10-07 (instruction 012): header shows the "Google Sheet খুলুন ↗" link when a Sheet URL exists.
- 2026-10-07 (instruction 011): the requirements summary is now `N/M Built`; `Built` badge is green; MAP-based projects show a "MAP থেকে" label; the no-source message is "Sheet বা MAP নেই".

## Redesign (instruction 016)

**Page order**: header panel, progress summary, Requirements (card grid), Insights (spec 015), Sessions. The container is 1600px wide (spec 005).

- **DetailHeader**: back link, `h1` name with the Active badge, the path in muted monospace, the line `শেষ session {relative} · {sessions} sessions`, and the "Google Sheet ↗" and "VS Code-এ খুলুন" buttons at equal size (right on wide screens, below on narrow ones; each shown only when it applies, as before).
- **ProgressSummary**: "B/T Built" in large type, the stacked bar (Built green, Spec Written indigo, Confirmed and Extracted grey) with per-status counts, from `progress()` and the `ReqSummary` bar logic. The existing messages ("Sheet বা MAP নেই", "Sheet পড়া যায়নি", "কোনো requirement নেই") replace it when there is no data.
- **RequirementsGrid**: 1 column, 2 from 640px, 3 from 1024px, 4 from 1440px. A card shows the id and a status badge (text; coloured left edge), the title (2 lines), the summary (2 lines, full text in `title`), the priority and the spec number. Order is the API order. The "MAP থেকে" label stays beside the heading for `source: 'map'`.
- **Filters**: chips All / Built / Spec Written / Confirmed / Extracted / Rejected with counts (`aria-pressed`), plus a search box (`aria-label`) matching the id or the title, case-insensitive. Nothing matching shows "কোনো requirement মেলেনি". The first 24 cards show; "আরও দেখান (N বাকি)" adds 24 more per click; changing the chip or the search resets the limit to 24.
- **Sessions**: a compact list (title, when, Active badge), the first 8; "সব দেখান (N)" shows up to 50.

**Components**: `DetailHeader.jsx`, `ProgressSummary.jsx`, `RequirementsGrid.jsx`, `SessionsTable.jsx` (now a compact list); `RequirementsTable.jsx` is replaced by the grid. Pure helpers in `lib.js`: `countByStatus(rows)`, `filterRequirements(rows, { status, query })`, `limitList(list, limit)`.

**Acceptance (redesign)**

R1. `countByStatus` returns the five counts; `filterRequirements` filters by status and by a case-insensitive id or title match, and returns all rows for `All` and an empty query.
R2. `limitList` returns the first N items and the number left over; the grid shows 24, then 48 after one click, and returns to 24 when the filter or search changes.
R3. Grid columns are 1, 2, 3 and 4 at widths below 640, from 640, from 1024 and from 1440; there is no horizontal page scroll at 360px.
R4. A status chip shows its count and `aria-pressed`; the search box has an accessible name; the status is readable as text in every card.
R5. With zero matches the text "কোনো requirement মেলেনি" appears; with no data the existing messages appear instead of the summary and the grid.
R6. The header buttons keep their rules: the Sheet link only with a valid `sheetUrl`, the VS Code button only when `canOpen`.
R7. Sessions show 8 rows with a "সব দেখান (N)" control when more exist, capped at 50.

Unit tests (Vitest) for R1 and R2; the rest by hand with agent-flow (56 requirements) at 360, 800 and 1440px.
