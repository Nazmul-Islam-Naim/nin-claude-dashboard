---
id: "019"
title: Default port 47615
date: 2026-10-11
status: frozen
---

## Original request

"port 4000 ekta common port jekono application er sathe conflict hote pare emon ekta port use koro jeta conflict hobe nah" (port 4000 is common and can clash; use a port that will not).

## Assumptions & corrections

- New default port is 47615 (registered range, below the OS ephemeral range, not used by common tools). The user first asked about a 9xxx port, then chose 47615.
- `PORT` still overrides it. The VS Code extension already picks a free port itself and is unchanged.

## Agreed scope

- `server/server.js`, `web/vite.config.js` (dev proxy), README, `contracts/003-api.md`, spec 003 Change log.

## Out of scope

- Automatic port fallback when 47615 is busy.
