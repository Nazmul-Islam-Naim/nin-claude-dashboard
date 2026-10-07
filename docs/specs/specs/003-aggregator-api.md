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

- Impact on existing work: consumes `scanSessions` (001, extended with `sessionList`, see instruction 004) and `readRequirements` (002). No changes to 002.
- Risks: scan cost on every request (2 s memory cache), many projects calling Sheets at once (002's cache absorbs repeats), a slow Sheet delaying the whole response (calls run in parallel; each is independent and never throws).
- Assumption: a requirement count per status is enough for project cards; full rows are returned for the detail view.

## Design

**aggregate(scan, sheets, now) -> JSON** (pure)

- `scan`: output of `scanSessions`. `sheets`: map of project `path` to the `readRequirements` result.
- Project record: `{ name, path, sessions, lastActivity, active, sessionList, requirements: { status, counts: { Extracted, Confirmed, 'Spec Written', Rejected }, rows } }`. `name` is the last segment of `path`. `counts` are zero when the status is not `ok`.
- `kpis`: `activeProjects` (count with `active`), `sessionsToday` (sessions whose `lastActivity` is today in local time), `openRequirements` (sum of `Extracted` + `Confirmed`).

**Endpoints** (all `GET`, JSON, server bound to `127.0.0.1`)

| Path | Response |
|---|---|
| `/api/projects` | `{ activeMinutes, kpis, projects[] }`, projects sorted active first, then by `lastActivity` descending |
| `/api/feed?project=<name>` | `[{ project, sessionId, title, lastActivity }]`, newest first, at most 100 |
| `/api/pipeline?project=<name>` | `{ Extracted: [...], Confirmed: [...], 'Spec Written': [...], Rejected: [...] }`, each row `{ project, ...row }` |

**Flow per request**: get the scan (cached 2 s), call `readRequirements` for every project in parallel, run `aggregate`, return JSON. An unknown `?project=` returns an empty result, not an error. Unexpected exceptions return HTTP 500 with `{ error }`.

**Components**: `aggregate.js` (pure), `server.js` (Express wiring, scan cache). Dependency: `express`.

## Acceptance & Test criteria

`aggregate` is tested with fixture scan and sheet inputs, no server needed:

1. `name` is the last path segment; projects sort active first, then by `lastActivity` descending.
2. `counts` match the rows' statuses; they are all zero for `no-sheet` and `error`.
3. `kpis.openRequirements` counts only `Extracted` and `Confirmed`.
4. `kpis.sessionsToday` counts only sessions with activity on the same local day as `now`.
5. A project whose Sheet status is `error` still appears with its session data; other projects are unaffected.
6. Feed is newest first and capped at 100; `?project=` filters by name.
7. Pipeline groups rows into the four statuses and tags each with its project name.

One smoke test starts the server on a free port and checks that the three endpoints return 200 and a `127.0.0.1` bind.

## Deploy notes

Runs locally with `node server.js`; reads the key path from `GOOGLE_APPLICATION_CREDENTIALS` (spec 002). Binds `127.0.0.1` only; do not expose it to the network.

## Open questions

None.
