---
id: "004"
title: Session scanner returns a per-session list
date: 2026-10-05
status: frozen
---

## Original request

Change to spec 001, needed by spec 003 (feed and Sessions table): "০০১-এ ছোট একটা সংযোজন, যাতে scanner প্রতিটা session-এর sessionId, title, lastActivity-ও দেয়".

## Assumptions & corrections

- Each project record gains `sessionList: [{ sessionId, title, lastActivity }]`.
- `title` comes from the transcript's `aiTitle` line when present, otherwise an empty string.
- `sessions` stays equal to `sessionList.length`.

## Agreed scope

- Add `sessionList` to the scanner output and tests.

## Out of scope

- Reading message content or any prompt text.
