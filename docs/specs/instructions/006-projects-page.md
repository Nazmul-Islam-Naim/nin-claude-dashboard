---
id: "006"
title: Projects page
date: 2026-10-05
status: frozen
---

## Original request

"ami emon ekta dashboard design korte cai jetar maddho system coloman ki ki project er maddhome development coltece segulo monitoring kora jabe" and "active er sima dekhanbe" (show the active threshold).

Sheet row R-04: "Projects page: KPI card (Active, আজকের session, Open requirement), filter, project card grid" (source: Dashboard design session 2026-10-05, Section 3).

## Assumptions & corrections

- Data comes from `useApi('/api/projects')` (spec 003); no other fetch.
- Three KPI cards: Active projects, Sessions today, Open requirements, from `kpis`. A hint reads "Active = শেষ {activeMinutes} মিনিট".
- Filter: All / Active / Idle with counts, applied on the client; the state lives in the page, not the URL.
- Card content: name, Active/Idle badge (text, not colour alone), "শেষ session ২ মিনিট আগে · ৮ sessions", requirement bar. Order is as returned by the API.
- Relative time uses `Intl.RelativeTimeFormat('bn')` and is recomputed on every poll.
- Requirement bar: `Spec Written ÷ (total − Rejected)`, label "N/M Spec Written". With a total of 0 there is no bar and the text "কোনো requirement নেই".
- Sheet status on the card: `no-sheet` shows "Sheet যুক্ত নেই", `error` shows "Sheet পড়া যায়নি". Session data still shows normally.
- The whole card is a link to `#/projects/<name>`; the detail page is R-05.
- Grid is `auto-fill` with a 300px minimum, one column at 360px.
- States: Skeleton on first load; "কোনো project পাওয়া যায়নি" when there are none; "এই filter-এ কোনো project নেই" when the filter matches nothing.

## Agreed scope

- `ProjectsPage`, `KpiCard`, `ProjectCard`, `FilterBar`.

## Out of scope

- Project detail (R-05), Live feed (R-06), Pipeline (R-07).
