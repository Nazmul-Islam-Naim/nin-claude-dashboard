---
id: "002"
title: Sheet reader
date: 2026-10-05
status: frozen
---

## Original request

"project wise sheet alada" (each project has its own tracking Sheet) and "google api er khetre ami jeta kori seta holo goole console theke service accoutn use kori. then sei service accoutn ta ke sheet share kore deu eta hole ki colbe".

Sheet row R-02: "Sheet reader: Service account (Viewer) দিয়ে প্রতি project-এর docs/specs/prd-tracking-sheet.txt-এর Sheet পড়া; ৬০ সেকেন্ড cache; না পড়া গেলে শুধু ওই project-এ error" (source: Dashboard design session 2026-10-05, Section 1-2).

## Assumptions & corrections

- The service account key path comes from env/config (`GOOGLE_APPLICATION_CREDENTIALS`), never from inside the repo.
- Scope is `spreadsheets.readonly`, so the account can be Viewer or Editor on the Sheet.
- No new dependency: JWT signing with Node `crypto`, requests with `fetch`.
- The Sheet ID is parsed from the URL; the tab is the first tab, range `A:G`; the header row `id | title | summary | source | priority | status | spec` defines object keys.
- Cache is 60 seconds per Sheet ID; the access token is cached until it expires.
- Result status is `ok | no-sheet | error`. The reader never throws, so one failing project cannot block the others.
- Projects pointing at the same Sheet cause one fetch (served from cache).

## Agreed scope

- A Node module `sheetReader` exposing `readRequirements(projectPath)` that returns `{ status, rows }`.

## Out of scope

- Writing to the Sheet, joining with sessions, API and UI (R-03 to R-08).
- Choosing a tab other than the first.
