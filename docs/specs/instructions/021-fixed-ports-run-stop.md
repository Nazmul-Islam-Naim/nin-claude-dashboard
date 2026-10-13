---
id: "021"
title: Fixed project ports with run, stop and status
date: 2026-10-13
status: frozen
---

## Original request

"jakhon dashboard theke server run kora hoy takhon sekhane theke port define kore dea jabe karon eksate multiple project run korara proyjon hote pare. abar kisu project er jonno standard port thake so ei bisoy ta nia ekta plan korte hobe."
(When a server is run from the dashboard, the port can be defined there, because several projects may run at once and some projects have a standard port.)

## Assumptions & corrections

- Ports are stored in a dashboard-owned registry (`~/.claude-dashboard/ports.json`), not inside the projects. Confirmed by the user.
- A busy port blocks the start and names the owner; there is no silent fallback to another port. Confirmed by the user.
- Run must work on Linux, macOS and Windows (it is Windows-only today) and gets Stop and Running/Stopped status. Confirmed by the user.
- Ports are 1024-65535; one port cannot be assigned to two projects.
- After a dashboard restart, previously started servers show as Stopped (no PID persistence in v1).

## Agreed scope

- Port registry, `server/runManager.js`, `POST /api/run` (extended), `POST /api/stop`, `PUT /api/port`, `services` in `/api/projects`, web `ServiceRow`, contract and README, tests.
- The existing undocumented run feature is specified here.

## Out of scope

- Persisting PIDs across dashboard restarts, log viewer, remote (non-loopback) run, ports below 1024.
