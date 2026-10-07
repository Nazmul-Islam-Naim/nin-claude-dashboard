---
id: "001"
title: Session scanner
date: 2026-10-05
status: frozen
---

## Original request

"ami emon ekta dashboard design korte cai jetar maddho system coloman ki ki project er maddhome development coltece segulo monitoring kora jabe"

Sheet row R-01: "Session scanner: ~/.claude/projects/**/*.jsonl পড়ে cwd থেকে project বের করা; শেষ activity, session সংখ্যা, active/idle flag; নষ্ট লাইন skip" (source: Dashboard design session 2026-10-05, Section 1-2).

## Assumptions & corrections

- Each `.jsonl` file under `~/.claude/projects/` is one session; lines carry `cwd`, `timestamp`, `sessionId`.
- Not every line has `cwd` (146 of 232 in a sampled file), so the project path is the first `cwd` found. The encoded folder name is never decoded (lossy).
- "Active" means the last timestamp is within 5 minutes; the threshold is configurable.
- Sub-agent sessions (`isSidechain: true`) are not counted as separate sessions.
- Malformed or half-written lines are skipped. The scanner is read-only.
- Several folders that resolve to the same `cwd` are merged into one project.

## Agreed scope

- A Node module `sessionScanner` that returns, per project: `{ path, sessions, lastActivity, active }`.

## Out of scope

- Sheet reading, aggregation, API and UI (R-02 to R-08).
- Writing to or modifying any transcript file.
