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

1. Row of three `KpiCard`: Active projects, Sessions today, Open requirements. Under the row a muted hint: "Active = শেষ {activeMinutes} মিনিট".
2. `FilterBar`: All / Active / Idle, each with a count, `aria-pressed` on the selected one. Filtering is done in the page on `projects[].active`.
3. Grid of `ProjectCard` (`display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`).

**ProjectCard** is an `<a href="#/projects/<name>">` containing:

- Name and a badge reading "Active" or "Idle".
- Line: `শেষ session {relative} · {sessions} sessions`, relative time from `Intl.RelativeTimeFormat('bn', { numeric: 'auto' })`.
- Requirement block from `requirements`:
  - `status === 'ok'` and `total > 0`: a bar filled to `Spec Written / total` plus the text `N/M Spec Written`, where `total = sum(counts) - counts.Rejected`.
  - `status === 'ok'` and `total === 0`: the text "কোনো requirement নেই".
  - `status === 'no-sheet'`: "Sheet যুক্ত নেই".
  - `status === 'error'`: "Sheet পড়া যায়নি".

**States**: first load shows `Skeleton` cards; `error` with no data shows `ErrorNote`; no projects shows `EmptyState` "কোনো project পাওয়া যায়নি"; a filter with no matches shows `EmptyState` "এই filter-এ কোনো project নেই".

**Components**: `ProjectsPage.jsx`, `KpiCard.jsx`, `FilterBar.jsx`, `ProjectCard.jsx`, plus a small pure helper `progress(requirements)` that returns `{ done, total }`.

## Acceptance & Test criteria

1. `progress` returns `done = Spec Written`, `total = all − Rejected`; counts of `{ Extracted: 1, Confirmed: 1, 'Spec Written': 2, Rejected: 1 }` give `2/4`.
2. A card with `no-sheet` or `error` shows the matching text and still shows its session line.
3. The three KPI values render from `kpis`, and the hint shows the API's `activeMinutes`.
4. The Active filter shows only active projects; the count beside each filter matches the number shown.
5. A card's link points to `#/projects/<name>` and can be opened with the keyboard.
6. Badge shows the words "Active" or "Idle", not colour alone.
7. Empty states: no projects, and a filter with no matches, each show their own message.
8. At 360px the grid is one column with no horizontal page scroll.

`progress` and the filter logic get unit tests; the rest is checked by hand with the real dashboard data and one fixture with a failing Sheet.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.
