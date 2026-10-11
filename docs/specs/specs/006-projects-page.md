---
id: "006"
title: Projects page
status: built
date: 2026-10-05
instruction: docs/specs/instructions/006-projects-page.md
---

## Summary

The home tab of the dashboard: three KPI cards, a filter and a grid of project cards showing session activity and requirement progress for every project.

## Problem & Goal

Answer "which projects are under development right now and how far along are they" in one glance. Goal: a scannable page built on the shell (spec 005) and the API (spec 003).

## Scope

- `ProjectsPage` with `KpiCard`, `FilterBar`, `ProjectCard`.

## Analysis

- Impact on existing work: consumes `GET /api/projects` (003) and the shell, tokens and state components (005). Cards link to the detail route of R-05.
- Risks: relative time going stale between polls (recomputed on each poll, 5 s), a long project list (grid only; no pagination in v1), the Sheet progress bar being misread (label states the exact numbers).
- Reference look: `design-samples/2-clean-console.html`.

## Design

**Data**: `const { data, loading, error } = useApi('/api/projects')`; `data = { activeMinutes, kpis, projects[] }`.

**Layout** (inside the 005 `Layout`)

1. Row of four `KpiCard`: Active projects, Sessions today, Open requirements, Built (`kpis.built` / `kpis.totalRequirements`). Under the row a muted hint: "Active = last {activeMinutes} min".
2. `FilterBar`: All / Active / Idle, each with a count, `aria-pressed` on the selected one. Filtering is done in the page on `projects[].active`.
3. Grid of `ProjectCard` (`display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`).

**ProjectCard** (instruction 012): the project name is the main `<a href="#/projects/<name>">` with a stretched click area (`after:absolute after:inset-0` on a `relative` card), so the whole card still opens the detail page without nesting links. It contains:

- Name and a badge reading "Active" or "Idle".
- Line: `Last session {relative} · {sessions} sessions`, relative time from `Intl.RelativeTimeFormat('en', { numeric: 'auto' })`.
- When `requirements.sheetUrl` is present (also when the Sheet failed to read), a small text link "Sheet ↗" beside the requirement block, above the stretched link (`relative z-10`), with `href = sheetUrl`, `target="_blank"`, `rel="noopener noreferrer"`. No link without `sheetUrl`.
- Requirement block from `requirements`:
  - `status === 'ok'` and `total > 0`: a main line "Development: B/T Built" (`B = counts.Built`, `T = total = sum(counts) - counts.Rejected`), a stacked bar (Built green, Spec Written indigo, Confirmed and Extracted grey), and a text line such as "মোট ৮ · Built ৪ · Spec Written ৩ · Confirmed ১ · Extracted ০". `Rejected` is shown as a separate "Rejected N" only when above zero and is not part of the total. If `source === 'map'` the card shows a small grey label "from MAP" and the text line lists only Built and Spec Written.
  - `status === 'ok'` and `total === 0`: the text "No requirements".
  - `status === 'no-sheet'`: "No Sheet or MAP".
  - `status === 'error'`: "Could not read Sheet".

**States**: first load shows `Skeleton` cards; `error` with no data shows `ErrorNote`; no projects shows `EmptyState` "কোনো Project not found"; a filter with no matches shows `EmptyState` "No projects match this filter".

**Components**: `ProjectsPage.jsx`, `KpiCard.jsx`, `FilterBar.jsx`, `ProjectCard.jsx`, plus a small pure helper `progress(requirements)` that returns `{ done, total }`.

## Acceptance & Test criteria

1. `progress` returns `done = Built`, `total = all − Rejected`; counts of `{ Extracted: 1, Confirmed: 1, 'Spec Written': 2, Built: 2, Rejected: 1 }` give `2/6`.
2. A card with `no-sheet` or `error` shows the matching text and still shows its session line.
3. The four KPI values render from `kpis` (Built shows `built/totalRequirements`), and the hint shows the API's `activeMinutes`.
3a. A card with `source: 'map'` shows the "from MAP" label and lists only Built and Spec Written; a card with `Rejected` above zero shows it apart from the total.
4. The Active filter shows only active projects; the count beside each filter matches the number shown.
5. A card's link points to `#/projects/<name>` and can be opened with the keyboard.
5a. With `sheetUrl` the card shows "Sheet ↗" opening the Sheet in a new tab with `rel="noopener noreferrer"`, without opening the detail page; without `sheetUrl` no such link exists; the markup has no `<a>` inside an `<a>`; the link and the name are separate tab stops.
6. Badge shows the words "Active" or "Idle", not colour alone.
7. Empty states: no projects, and a filter with no matches, each show their own message.
8. At 360px the grid is one column with no horizontal page scroll.

`progress` and the filter logic get unit tests; the rest is checked by hand with the real dashboard data and one fixture with a failing Sheet.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.

## Change log

- 2026-10-07 (instruction 012): added the "Sheet ↗" link and restructured the card link as a stretched name link.
- 2026-10-07 (instruction 011): requirement block now centres on Built (main line, stacked bar, count text); added the "from MAP" source label; `progress()` now counts `Built`; fourth KPI card "Built"; `no-sheet` text is "No Sheet or MAP".
- 2026-10-11 (spec 017): UI text is English only.
