---
id: "021"
title: Fixed project ports with run, stop and status
status: built
date: 2026-10-13
instruction: docs/specs/instructions/021-fixed-ports-run-stop.md
---

## Summary

Each project (or each service inside it, such as backend and frontend) can have a fixed port stored by the dashboard. Start and Stop buttons control the dev server on Linux, macOS and Windows, and a badge shows Running or Stopped. A busy port blocks the start and names its owner.

## Problem & Goal

Run today picks a random free port every time, works on Windows only, cannot be stopped from the dashboard and never checks whether a port is taken. With several projects running together, and some needing a standard port, the user needs predictable ports and clear conflicts.

## Scope

- Port registry, `server/runManager.js`, `/api/run`, `/api/stop`, `/api/port`, `services` in `/api/projects`, web `ServiceRow`, tests, contract.

## Analysis

- Impact on existing work: replaces the `cmd /c start` branch of `runProject` in `server/openProject.js`; keeps `detectRun`, `detectOne`, `withPort`, `waitPort`, `freePort`. Spec 013 contract wording ("all GET except open") widens to include the new endpoints. `run[]` stays in `/api/projects` for compatibility.
- Assumptions: a service key is the detect label `<reldir>: <cmd>`; process groups let Stop kill the whole tree.
- Risks: killing the wrong process (only PIDs the dashboard started are ever stopped), a port taken between check and bind (race, reported as a start failure), the owner lookup tool missing on a machine (falls back to "external process"), registry file corruption (atomic write; unreadable file is reported, not reset).

## Design

**Registry** `<data dir>/ports.json`, data dir = `DASHBOARD_DATA_DIR` or `~/.claude-dashboard`: `{ "<projectPath>": { "<serviceKey>": <port> } }`. Written by temp file + rename.

**runManager**
- `start(project, serviceKey)`: port = registry value, else `freePort()`. Check `portOwner(port)`. Busy -> 409 `{ ok:false, error:"port-busy", port, owner }` where owner is `{ project }` for a tracked run or `{ external:true, pid? }` (best effort via `ss -ltnp` or `lsof` on Linux/macOS, `netstat -ano` on Windows). Free -> spawn the command detached with `PORT` set, new process group (POSIX) or own console-less process (Windows), output to `<data dir>/logs/<project>-<service>.log`; wait for the port with `waitPort`; record `{ pid, port, cmd, startedAt }`; open the browser as today for the first web service.
- `stop(project, serviceKey)`: `process.kill(-pid)` (POSIX) or `taskkill /pid <pid> /T /F` (Windows); only for tracked PIDs; clear the record.
- `status()`: for each tracked record check the PID is alive; dead records are dropped.

**Endpoints** (all use the same guard as `POST /api/open`: loopback peer, Origin check, JSON, per-project rate limit):
- `POST /api/run` body `{ project, run? }` (`run` = service key, default the first service) -> 200 `{ ok:true, port }`, 409 port-busy, 404 unknown project.
- `POST /api/stop` body `{ project, run? }` -> 200 `{ ok:true }`, 404 not running.
- `PUT /api/port` body `{ project, run, port }` (integer 1024-65535, `null` clears) -> 200 `{ ok:true }`, 400 invalid, 409 `{ error:"port-taken", owner:{ project } }` when another project holds it.
- `GET /api/projects`: each project gets `services: [{ key, cmd, port|null, state:"running"|"stopped", pid? }]`; empty for non-loopback callers like `run[]`.

**Web**: `ServiceRow` (port input, Start/Stop, badge, inline port-busy message) on the card (compact) and detail header (full).

## Acceptance & Test criteria

1. With port 3000 saved for project A, Start launches it on 3000 and the badge shows Running.
2. Starting project B with 3000 saved returns port-busy naming project A; B is not started.
3. Saving 3000 for B while A holds it returns port-taken.
4. Stop ends the process tree; the port is free and the badge shows Stopped.
5. An external process on the port is reported as external, not killed.
6. Non-loopback caller, bad Origin, non-JSON body: 403/415 as for `/api/open`.
7. Works on Linux (manual) and is unit-tested with a fake spawner and a temp data dir.

## Deploy notes

No new dependencies. Creates `~/.claude-dashboard/` on first save or start.

## Open questions

- None. Known limit: after a dashboard restart, running servers show Stopped.

## Change log

- 2026-10-13: created.
