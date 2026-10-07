---
id: "014"
title: View the dashboard from the same network
date: 2026-10-07
status: frozen
---

## Original request

"okay but same network kora jete pare" (can it be made available on the same network?)

## Assumptions & corrections

- Goal: view the dashboard from another device on the same Wi-Fi/LAN (phone, another PC). Opening VS Code on the other device is not possible and not part of this.
- New setting `HOST` (default `127.0.0.1`). `HOST=0.0.0.0` makes the server listen on all interfaces.
- When `HOST` is not a loopback address, `DASHBOARD_TOKEN` is required (at least 16 characters); otherwise the server refuses to start and says why. The dashboard shows session titles, project paths and Sheet URLs, so it must not be open to a whole network.
- Token flow: opening `http://<ip>:<port>/?key=<token>` sets an HttpOnly, SameSite=Strict cookie (30 days) and redirects to the same path without `key`. With a valid cookie everything works; without one, `/api/*` returns 401 JSON and pages return a short Bangla 401 page that explains how to enter. Comparison is timing-safe.
- Requests from the same machine (loopback peer) never need the token.
- `POST /api/open` stays same-machine-only (spec 013): from any other device it returns 403, and `canOpen` is false there.
- On start with a token the server prints the LAN URLs with the key, one per local IPv4 address.
- Windows Firewall will ask once to allow Node on private networks; the dashboard does not change firewall settings.
- Limit: plain HTTP, so the token can be seen by someone sniffing the network. Fine for a trusted home network, not for a public or office Wi-Fi. HTTPS is a separate requirement.

## Agreed scope

- `HOST` and `DASHBOARD_TOKEN` handling, the auth middleware, the 401 page, the startup message, contract and `.env` notes.

## Out of scope

- HTTPS, user accounts, per-device tokens, firewall changes.
