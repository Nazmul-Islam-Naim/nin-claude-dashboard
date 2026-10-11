---
id: "008"
title: Live feed tab
status: built
date: 2026-10-05
instruction: docs/specs/instructions/008-live-feed.md
---

## Summary

The `#/feed` tab: a newest-first list of recent session activity across all projects, filterable by project.

## Problem & Goal

The Projects page shows state per project; the user also wants a running view of "what just happened, anywhere". Goal: a single scannable list that updates itself and can be narrowed to one project.

## Scope

- `FeedPage` with a project `<select>` and a list of `FeedItem`.

## Analysis

- Impact on existing work: consumes `GET /api/feed` and `GET /api/projects` (003), the shell and state components (005), and the relative-time helper (006). No backend change.
- Risks: the list changing under the cursor on each 5 s poll (acceptable for read-only rows), a stale selected project (falls back to all), a very long title (single-line ellipsis).
- The "live" feel comes from polling plus the Active badge; no push channel in v1.

## Design

**Data**

- `feed = useApi(project ? '/api/feed?project=' + encodeURIComponent(project) : '/api/feed')`, items `{ project, sessionId, title, lastActivity }`.
- `projects = useApi('/api/projects')` for the select options and `activeMinutes`.

**Layout**

1. `h1` "Live feed" and a `<select>` with "All projects" first, then project names. If the selected name is no longer in `projects`, reset the selection to "All projects".
2. A `<ul>` of `FeedItem`. Each item: project name as a link to `#/projects/<name>`, the title (empty -> "(untitled)", single-line ellipsis, full text in `title` attribute), relative time (`title` attribute holds the full local date), and an "Active" badge when `now - lastActivity <= activeMinutes`.
3. When the list has 100 items, a muted note: "Showing the latest 100".

**States**: first load -> `Skeleton`; empty list -> `EmptyState` "No activity"; error with no data -> `ErrorNote` in the list area only; later poll errors keep the previous list and show a small `ErrorNote`.

**Components**: `FeedPage.jsx`, `FeedItem.jsx`. The active check is a pure helper shared with the detail page (007).

## Acceptance & Test criteria

1. Items appear newest first and match the API order.
2. Choosing a project requests `/api/feed?project=<encoded name>`, and the list shows only that project's items; "All projects" requests `/api/feed`.
3. Names with spaces or non-ASCII characters are encoded correctly in the request.
4. A session within `activeMinutes` shows "Active"; an older one does not.
5. An empty title shows "(untitled)"; a long title is one line with an ellipsis.
6. A project name links to `#/projects/<name>`.
7. With exactly 100 items the note appears; with fewer it does not.
8. If the selected project vanishes from the list, the filter returns to "All projects".
9. At 360px there is no horizontal page scroll.

The URL builder and the active check get unit tests; the rest is checked by hand against the real dashboard data.

## Deploy notes

None beyond the shell (spec 005).

## Open questions

None.

## Change log

- 2026-10-11 (spec 017): UI text is English only.
