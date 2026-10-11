---
id: "003"
title: Aggregator and read-only API
status: built
date: 2026-10-05
instruction: docs/specs/instructions/003-aggregator-api.md
---

## Summary

A local Express server that joins session data (spec 001) with each project's Sheet rows (spec 002) and exposes three read-only JSON endpoints for the dashboard UI.

## Problem & Goal

The UI needs one place to ask "what projects exist, what are they doing, and what requirements do they have". Goal: combine the two sources by project path and serve ready-to-render JSON, with failures isolated per project.

## Scope

- `aggregate` pure module, Express server, three `GET` endpoints.

## Analysis

- Impact on existing work: consumes `scanSessions` (001, extended with `sessionList`, see instruction 004) and `readRequirements` (002), and, since instruction 011, `readSpecs` (010) for Built status and the MAP fallback. No changes to 002.
- Risks: scan cost on every request (2 s memory cache), many projects calling Sheets at once (002's cache absorbs repeats), a slow Sheet delaying the whole response (calls run in parallel; each is independent and never throws).
- Assumption: a requirement count per status is enough for project cards; full rows are returned for the detail view.

## Design

**aggregate(scan, sheets, specs, now) -> JSON** (pure)

- `scan`: output of `scanSessions`. `sheets`: map of project `path` to the `readRequirements` result. `specs`: map of project `path` to the `readSpecs` result (spec 010).
- Project record: `{ name, path, sessions, lastActivity, active, sessionList, requirements: { status, source, counts: { Extracted, Confirmed, 'Spec Written', Built, Rejected }, rows, sheetUrl? } }`. `name` is the last segment of `path`. `counts` are zero unless `status` is `ok`.
- `requirements.sheetUrl` is copied from the Sheet reader result whenever it is present (also when the Sheet read failed); it is absent for MAP-only and Sheet-less projects.
- `requirements` is resolved per project by `resolveRequirements(sheet, specs)`:
  - Sheet `ok`: `source: 'sheet'`, rows from the Sheet. A row whose `spec` value (a MAP id) maps through `specStatusById` to a `built` spec gets `status: 'Built'`; every other row keeps its Sheet status. `counts` are tallied on these effective statuses.
  - Sheet `error`: `status: 'error'`, `source: 'none'`; the MAP fallback is not used, so the failure stays visible.
  - Sheet `no-sheet` and specs `ok` with at least one spec: `status: 'ok'`, `source: 'map'`, one row per spec `{ id, title, summary: "", source: "MAP", priority: "", status, spec: id }` with `status` `Built` (built), `Spec Written` (draft) or `Unknown`. `counts` tally Built and Spec Written only.
  - Otherwise (`no-sheet` and no specs): `status: 'no-sheet'`, `source: 'none'`.
- `kpis`: `activeProjects` (count with `active`), `sessionsToday` (sessions whose `lastActivity` is today in local time), `openRequirements` (sum of `Extracted` + `Confirmed` + `Spec Written`), `built` (sum of `Built`), `totalRequirements` (sum of all counts except `Rejected`).

**Endpoints** (all `GET`, JSON, except `POST /api/open` from spec 013; server bound to `HOST`, default `127.0.0.1`, see spec 014)

| Path | Response |
|---|---|
| `/api/projects` | `{ activeMinutes, kpis, projects[] }`, projects sorted active first, then by `lastActivity` descending |
| `/api/feed?project=<name>` | `[{ project, sessionId, title, lastActivity }]`, newest first, at most 100 |
| `/api/pipeline?project=<name>` | `{ Extracted: [...], Confirmed: [...], 'Spec Written': [...], Built: [...], Rejected: [...] }`, each row `{ project, ...row }`, only from projects whose `requirements.source` is `sheet` |

**Flow per request**: get the scan (cached 2 s), call `readRequirements` and `readSpecs` for every project in parallel, run `aggregate`, return JSON. An unknown `?project=` returns an empty result, not an error. Unexpected exceptions return HTTP 500 with `{ error }`.

**Components**: `aggregate.js` (pure), `server.js` (Express wiring, scan cache). Dependency: `express`.

## Acceptance & Test criteria

`aggregate` is tested with fixture scan and sheet inputs, no server needed:

1. `name` is the last path segment; projects sort active first, then by `lastActivity` descending.
2. `counts` match the rows' effective statuses; they are all zero for `no-sheet` and `error`.
3. `kpis.openRequirements` counts `Extracted`, `Confirmed` and `Spec Written`; `kpis.built` and `kpis.totalRequirements` match the counts (Rejected excluded from the total).
4. `kpis.sessionsToday` counts only sessions with activity on the same local day as `now`.
5. A project whose Sheet status is `error` still appears with its session data; other projects are unaffected.
6. Feed is newest first and capped at 100; `?project=` filters by name.
7. Pipeline groups rows into the five statuses and tags each with its project name; MAP-based projects are left out.
8. A Sheet row whose `spec` id maps to a built spec counts as `Built` even when the Sheet says `Spec Written`; a row with no matching spec keeps its Sheet status.
9. With no Sheet but specs: `source: 'map'`, one row per spec, `Built` / `Spec Written` / `Unknown` as read by `readSpecs`.
10. With a Sheet `error` and specs present, the project stays `status: 'error'` (no MAP fallback).
11. With no Sheet and no specs the project is `no-sheet`, `source: 'none'`.
12. `requirements.sheetUrl` is present for a project with a valid Sheet URL (ok or error) and absent for MAP-only and Sheet-less projects.

One smoke test starts the server on a free port and checks that the three endpoints return 200 and a `127.0.0.1` bind.

## Deploy notes

Runs locally with `node server.js`; reads the key path from `GOOGLE_APPLICATION_CREDENTIALS` (spec 002). Binds `127.0.0.1` by default; network access is only through spec 014 (token required).

## Open questions

None.

## Change log

- 2026-10-07 (instructions 013, 014): `/api/projects` gains `canOpen`; the server gains `POST /api/open` (spec 013) and the `HOST` / `DASHBOARD_TOKEN` handling (spec 014).
- 2026-10-07 (instruction 012): passes `requirements.sheetUrl` through to the API.
- 2026-10-07 (instruction 011): added the `Built` status, `requirements.source`, the MAP fallback through `readSpecs` (spec 010), new KPIs (`built`, `totalRequirements`) and the new `openRequirements` definition.
- 2026-10-11 (instruction 019): default `PORT` is now `47615` (was `4000`).
