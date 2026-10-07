---
id: "003"
title: Aggregator and read-only API
date: 2026-10-05
status: frozen
---

## Original request

"sob gulo" (all three views: project list, live feed, requirement pipeline) from the dashboard brainstorm.

Sheet row R-03: "Aggregator ও read-only API: Session ও Sheet project path দিয়ে জোড়া; /api/projects, /api/feed, /api/pipeline" (source: Dashboard design session 2026-10-05, Section 2).

## Assumptions & corrections

- Spec 001 is extended with a per-session list (see instruction 004) because the feed and Sessions table need it.
- The server binds to `127.0.0.1` only; endpoints are read-only `GET`; no login.
- `/api/projects` returns `activeMinutes`, `kpis { activeProjects, sessionsToday, openRequirements }` and `projects[]`.
- Project `name` is the last segment of `path`. "Open requirement" means status `Extracted` or `Confirmed`. "Sessions today" means sessions whose last activity falls on today (local time).
- `/api/feed`: all projects' sessions merged, newest first, at most 100, filter with `?project=`.
- `/api/pipeline`: rows grouped into `Extracted`, `Confirmed`, `Spec Written`, `Rejected`, each row carrying its project name, filter with `?project=`.
- A Sheet error affects only that project's `requirements.status`.
- The scan result is cached in memory for 2 seconds.
- The aggregator is a pure function (scan and sheets in, JSON out).

## Agreed scope

- Express server with three endpoints and a pure `aggregate` module.

## Out of scope

- UI (R-04 to R-08), writing anything, authentication.
