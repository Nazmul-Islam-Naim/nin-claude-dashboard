---
id: "009"
title: Pipeline tab
date: 2026-10-05
status: frozen
---

## Original request

Dashboard brainstorm: a "Requirement pipeline" view (Extracted -> Confirmed -> Spec Written) per project ("sob gulo" = all three views).

Sheet row R-07: "Pipeline tab: Extracted / Confirmed / Spec Written / Rejected চারটা column, project filter" (source: Dashboard design session 2026-10-05, Section 3).

## Assumptions & corrections

- Data comes from `useApi('/api/pipeline')`; with a filter the URL is `/api/pipeline?project=<name>` (`encodeURIComponent`). The filter behaves as in spec 008: native `<select>`, names from `useApi('/api/projects')`, state kept in the page, falls back to "সব project" if the selected project disappears.
- Desktop: four equal columns side by side. Below 768px the columns stack vertically; no horizontal scroll. Each column header shows its name and count, for example "Confirmed ৩".
- Card: id and title, project name (link to `#/projects/<name>`), priority badge (text: High / Medium / Low), summary clipped to two lines (full text on hover), and "spec {id}" on Spec Written cards. Order inside a column is the API order; no sorting.
- The Rejected column is shown, muted, as scope history. The user left this choice to the best fit, so it stays visible and muted.
- An empty column shows "কিছু নেই". When all four are empty, one EmptyState "কোনো requirement নেই" is shown.
- Projects whose Sheet is missing or unreadable do not appear in the pipeline, so a small note reads "{n}টা project-এর Sheet পড়া যায়নি বা যুক্ত নেই", computed from `/api/projects`; it is hidden when n is 0.
- States: Skeleton columns on first load; ErrorNote only in the board area; a failed later poll keeps the previous data (spec 005).
- Read-only: no drag-and-drop, no status changes; the Sheet is the only source.

## Agreed scope

- `PipelinePage`, `PipelineColumn`, `RequirementCard`.

## Out of scope

- Editing or moving requirements, sorting, any new API.
