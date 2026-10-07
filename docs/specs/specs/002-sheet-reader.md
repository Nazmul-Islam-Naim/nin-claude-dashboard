---
id: "002"
title: Sheet reader
status: built
date: 2026-10-05
instruction: docs/specs/instructions/002-sheet-reader.md
---

## Summary

A read-only Node module that, given a project path, finds the project's tracking Sheet URL and returns its requirement rows using a Google service account.

## Problem & Goal

Each project keeps its requirements in its own Google Sheet, linked from `docs/specs/prd-tracking-sheet.txt`. The dashboard needs those rows per project without OAuth prompts and without one broken Sheet affecting the rest.

## Scope

- Resolve Sheet URL from a project path, fetch rows, return them as objects.
- Cache, and report failures as data instead of exceptions.

## Analysis

- Impact on existing work: uses the project path produced by spec 001 (`path`); otherwise independent.
- Proven on this machine: JWT (RS256) signed with `crypto` against `https://oauth2.googleapis.com/token`, then `GET /v4/spreadsheets/{id}/values/A:G` works with a service account shared on the Sheet.
- Risks: Sheet not shared with the service account (403), key missing or wrong (token request fails), Google rate limits (mitigated by cache), header row edited by hand (missing columns).

## Design

**Interface**

```js
readRequirements(projectPath, { keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS, ttlMs = 60000, now = Date.now() })
// -> { status: 'ok' | 'no-sheet' | 'error', rows: [{ id, title, summary, source, priority, status, spec }], sheetUrl?: string, error?: string }
```

**Flow**

1. Read `<projectPath>/docs/specs/prd-tracking-sheet.txt`; missing or empty returns `{ status: 'no-sheet', rows: [] }`.
2. Parse the Sheet ID from the URL (`/spreadsheets/d/<id>`). The URL must start with `https://docs.google.com/spreadsheets/` and contain an ID; otherwise the result is `error` ("invalid Sheet URL") with no `sheetUrl`. A valid URL is trimmed and returned as `sheetUrl` in every later result, `ok` or `error`.
3. If a cache entry for that ID is younger than `ttlMs`, return it.
4. Get an access token (cached until 60 s before expiry): sign a JWT with the key's `client_email` and `private_key`, scope `https://www.googleapis.com/auth/spreadsheets.readonly`.
5. `GET /v4/spreadsheets/{id}/values/A:G` on the first tab. Map each row to an object using the header row; blank rows are dropped.
6. Any failure (key missing, token error, HTTP 403/404/5xx, network) returns `{ status: 'error', rows: [], error: <short message> }`. The message never contains key material.

**Components**: `sheetReader.js` (token cache, Sheet cache, row mapping). No dependencies beyond Node.

## Acceptance & Test criteria

Tests mock `fetch` and use a throwaway generated RSA key:

1. Valid txt and a 200 response with 2 data rows returns `ok` and 2 row objects keyed by header names.
2. Missing or empty txt returns `no-sheet`, no network call.
3. A URL without `/spreadsheets/d/<id>`, or one that does not start with `https://docs.google.com/spreadsheets/` (for example `javascript:alert(1)` or another site), returns `error` and no `sheetUrl`.
4. Two calls within 60 s trigger one Sheets request; after 60 s a second request is made.
5. Two projects with the same Sheet URL trigger one Sheets request.
6. HTTP 403 returns `error` and does not throw; the error text does not contain `private_key`.
7. Missing key file returns `error`.
8. Blank rows are dropped; a missing trailing column yields an empty string.
9. A valid URL gives `sheetUrl` on an `ok` result and also on an `error` result caused by HTTP 403; `no-sheet` has none.

## Deploy notes

Needs a service account key file outside the repo, its path in `GOOGLE_APPLICATION_CREDENTIALS`, and each project's Sheet shared with the service account email (Viewer is enough). Add the key path to `.gitignore` if it ever sits inside a project.

## Open questions

None.

## Change log

- 2026-10-07 (instruction 012): returns `sheetUrl` for valid Google Sheet URLs (ok and error results) and rejects other URLs.
