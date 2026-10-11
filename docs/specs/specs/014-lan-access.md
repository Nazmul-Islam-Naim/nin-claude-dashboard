---
id: "014"
title: View the dashboard from the same network
status: built
date: 2026-10-07
instruction: docs/specs/instructions/014-lan-access.md
---

## Summary

An optional mode in which the server listens on the local network and protects everything behind a shared token, so the dashboard can be viewed from other devices on the same Wi-Fi/LAN.

## Problem & Goal

The dashboard only answers on `127.0.0.1`, so it cannot be seen from a phone or another PC. Goal: allow viewing over the LAN without exposing session titles, project paths and Sheet URLs to everyone on that network, and without letting other devices run anything on this machine.

## Scope

- `HOST` and `DASHBOARD_TOKEN` settings, an auth middleware, a 401 page, the startup message.

## Analysis

- Impact on existing work: changes how `server.js` (spec 003) starts and adds one middleware in front of all routes. The same-machine-only rule of `POST /api/open` and `canOpen` (spec 013) already hold for any non-loopback peer and are not changed.
- Risks: plain HTTP means the token can be read by someone watching the network (acceptable for a trusted home network only); a weak token (a minimum length is enforced); forgetting the token when binding to all interfaces (the server refuses to start).

## Design

**Startup**

- `HOST = process.env.HOST || '127.0.0.1'`. A loopback host is `127.0.0.1`, `::1` or `localhost`.
- If `HOST` is not loopback: `DASHBOARD_TOKEN` must exist and have at least 16 characters, otherwise print an explanation and exit with a non-zero code.
- `app.listen(PORT, HOST)`. When a token is set, print one URL per non-internal IPv4 address from `os.networkInterfaces()`: `http://<ip>:<port>/?key=<token>`.

**Auth middleware** (registered before all routes, active only when `DASHBOARD_TOKEN` is set)

1. Peer is loopback: allow, no token needed.
2. Cookie `dash_auth` equals `sha256(token)` (hex, compared with `crypto.timingSafeEqual`): allow.
3. Query `key` equals the token (timing-safe): set `dash_auth=sha256(token)` as `HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`, then redirect (302) to the same URL without `key`.
4. Otherwise: for paths starting with `/api/` respond 401 `{ "error": "token needed" }`; for everything else respond 401 with a short HTML page in English: "A token is required to open this dashboard. Add ?key=<your token> to the end of the address."

The check takes `isLocal(req)` as an injected function (default: peer address), so tests can simulate a remote peer.

**Settings**: `HOST` and `DASHBOARD_TOKEN` are read from the environment (and therefore from `server/.env` through `--env-file-if-exists`). The README gets a short "LAN access" note that includes the firewall prompt and the plain-HTTP limit.

**Components**: changes in `server.js`, new `auth.js` (middleware, token comparison), no web changes.

## Acceptance & Test criteria

1. `HOST=0.0.0.0` without a token, or with a token shorter than 16 characters, refuses to start (non-zero exit and a message).
2. Default `HOST` starts as before, with no token required.
3. A simulated remote request with no cookie and no `key` gets 401 JSON on `/api/projects` and the Bangla 401 page on `/`.
4. A remote request with `?key=<token>` receives the cookie (`HttpOnly`, `SameSite=Strict`) and a redirect to the URL without `key`; with that cookie `/api/projects` returns 200.
5. A wrong `key` or a wrong cookie gets 401; the comparison uses `timingSafeEqual` on equal-length digests.
6. A loopback request works with no token and no cookie.
7. A simulated remote request to `POST /api/open` is rejected with 403 even with a valid cookie, and `canOpen` is false for it.
8. The startup message lists a `?key=` URL for each local IPv4 address and never prints the token when no token is set.

## Deploy notes

To view from another device: set `HOST=0.0.0.0` and a `DASHBOARD_TOKEN` of 16 or more characters in `server/.env`, restart, allow Node on private networks in the Windows Firewall prompt, then open the printed URL on the other device once. Use only on a trusted network.

## Open questions

None.

## Change log

- 2026-10-11 (spec 017): UI text is English only.
