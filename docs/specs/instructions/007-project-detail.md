---
id: "007"
title: Project detail page
date: 2026-10-05
status: frozen
---

## Original request

Dashboard brainstorm, Section 3: clicking a project card opens its detail (sessions, feed, requirements).

Sheet row R-05: "Project detail: Sessions table, সেই project-এর feed, তার requirement তালিকা" (source: Dashboard design session 2026-10-05, Section 3).

## Assumptions & corrections

- Data comes from `useApi('/api/projects')`; the page picks one project by name. No new API.
- "Sessions table" and "feed" are the same data (`sessionList`), so the page shows a single Sessions list. A per-project feed is available through the `?project=` filter of the Live feed (R-06).
- Header: "← Projects" back link, project name, full path (muted), Active/Idle badge, and "শেষ session {relative} · {n} sessions".
- Sessions list: at most 50, newest first. Columns: title (empty shows "(শিরোনাম নেই)"), last activity (relative time, full date on hover), and an "Active" badge beside a session that is currently active.
- Requirements list: columns id, title, priority, status (badge with text), spec. Row order as in the Sheet, no sorting. A summary line "N/M Spec Written" reuses `progress()` from spec 006.
- On `no-sheet` or `error` the Requirements section shows the same messages as the Projects page; the Sessions section is unaffected.
- A name that matches no project shows an EmptyState "project পাওয়া যায়নি" and the back link. If two projects share the same last path segment, the first is shown.
- On small screens each table scrolls horizontally inside its own box, never the page.
- Opening the page scrolls to the top; Sessions and Requirements are separate `h2` sections.

## Agreed scope

- `ProjectDetailPage`, `SessionsTable`, `RequirementsTable`.

## Out of scope

- Editing requirements, a separate per-project feed, sorting and filtering of the tables.
