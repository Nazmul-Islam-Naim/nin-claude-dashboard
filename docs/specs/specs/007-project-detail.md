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

**Data**: `const { data, loading, error } = useApi('/api/projects')`, then `project = data.projects.find(p => p.name === routeName)`.

**Layout**

1. Header: link "← Projects" (`#/projects`), `h1` name, muted full path, Active/Idle badge, line `শেষ session {relative} · {sessions} sessions`.
2. `h2` "Sessions": `SessionsTable` with `sessionList` sorted by `lastActivity` descending, first 50. Columns: title (empty -> "(শিরোনাম নেই)"), last activity (relative, `title` attribute holds the full local date), and an "Active" badge when `now - lastActivity <= activeMinutes`.
3. `h2` "Requirements": the summary line `N/M Spec Written` (from `progress()`), then `RequirementsTable` with columns id, title, priority, status badge (text), spec. Status other than `ok` shows the 006 messages ("Sheet যুক্ত নেই" / "Sheet পড়া যায়নি") in place of the table; zero rows shows "কোনো requirement নেই".

**States**: first load -> `Skeleton`; error with no data -> `ErrorNote`; no matching project -> `EmptyState` "project পাওয়া যায়নি" plus the back link. Each table sits in a `overflow-x-auto` box. On mount the page calls `window.scrollTo(0, 0)`.

**Components**: `ProjectDetailPage.jsx`, `SessionsTable.jsx`, `RequirementsTable.jsx`.

## Acceptance & Test criteria

1. `#/projects/<name>` shows that project's header and sections; an unknown name shows "project পাওয়া যায়নি" and the back link.
2. Sessions are newest first and capped at 50; an empty title shows "(শিরোনাম নেই)".
3. A session within `activeMinutes` shows the "Active" badge; an older one does not.
4. Requirements show id, title, priority, status and spec for every row, in Sheet order; the summary equals `progress()` for the same data.
5. `no-sheet` and `error` show the matching message instead of the table, and the Sessions section still renders.
6. Status is readable as text, not colour alone.
7. At 360px the page has no horizontal scroll; each table scrolls inside its own box.
8. If the project vanishes on a later poll, the page shows the not-found state instead of crashing.

Pure logic (selecting the project, sorting and capping sessions, the active check) gets small unit tests; layout is checked by hand at 360px and 1280px.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.
