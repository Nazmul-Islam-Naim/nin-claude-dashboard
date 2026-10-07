---
id: "001"
title: Session scanner
status: built
date: 2026-10-05
instruction: docs/specs/instructions/001-session-scanner.md
---

## Summary

A read-only Node module that scans Claude Code transcripts and reports, per project, session count, last activity and active/idle state.

## Problem & Goal

The dashboard needs to know which projects are under development. Claude Code stores one `.jsonl` transcript per session under `~/.claude/projects/<encoded-folder>/`. Goal: turn those files into a per-project summary without modifying them.

## Scope

- Scan a root directory (default `~/.claude/projects`) for `*.jsonl` files, including subfolders.
- Output one record per project.

## Analysis

- Impact on existing work: none, greenfield.
- Observed format (sampled on this machine): JSON lines with `cwd`, `timestamp`, `sessionId`, `isSidechain`. `cwd` is missing on about 37% of lines, so it must be taken from the first line that has one.
- Folder names are an encoded path (`f--naim-nin-claude-dashboard`); decoding is lossy, so `cwd` is the only source of the project path.
- Risks: very large transcripts (read cost), a file being appended while read (partial last line), Windows path casing and slash differences.

## Design

**Interface**

```js
scanSessions({ root, activeMinutes = 5, now = Date.now() })
// -> { activeMinutes, projects: [{ path, sessions, lastActivity, active, sessionList: [{ sessionId, title, lastActivity }] }] }
```

- `path`: normalized `cwd` (backslashes to forward slashes, trailing slash removed, drive letter lowercased).
- `sessions`: number of `.jsonl` files with at least one non-sidechain line.
- `lastActivity`: ISO string, the newest `timestamp` across the project's sessions.
- `active`: `now - lastActivity <= activeMinutes`.
- `sessionList`: one entry per counted session. `sessionId` from the lines, `title` from the transcript's `aiTitle` line (empty string if absent), `lastActivity` the session's newest `timestamp`. `sessions` equals `sessionList.length`.

**Per file**

1. Read the file as text, split on newline.
2. `JSON.parse` each line in try/catch; skip failures.
3. Take the first `cwd` seen as the file's project path and the max `timestamp` as the file's last activity.
4. Skip the file if every parsed line has `isSidechain: true`, or no `cwd` is found.

**Per project**: group files by normalized `path`, count files, take the max last activity.

Large files: read once, no streaming in v1. Streaming (read tail only) is the upgrade if scan time becomes noticeable.

**Components**: `scanner.js` (pure functions plus the directory walk). No dependencies beyond Node `fs` and `path`.

## Acceptance & Test criteria

Tests run against fixture `.jsonl` files:

1. Two sessions in one project give `sessions: 2` and the newest `lastActivity`.
2. A line without `cwd` before the first line with `cwd` still resolves the project.
3. A malformed or truncated line is skipped; the file still counts.
4. A file containing only `isSidechain: true` lines is not counted.
5. `lastActivity` 3 minutes before `now` gives `active: true`; 10 minutes gives `false`.
6. Two folders with `cwd` differing only by slash style or drive-letter case merge into one project.
7. An empty or missing root returns `{ activeMinutes, projects: [] }`, no throw.
8. The result's `activeMinutes` equals the value passed in (default 5).
9. `sessionList` has one entry per session with the right `sessionId` and per-session `lastActivity`; `sessions` equals its length.
10. A session with an `aiTitle` line gets that title; one without gets an empty string.

## Deploy notes

Runs inside the local dashboard server. No credentials, no network. Reads only; never writes to `~/.claude`.

## Open questions

None.

## Change log

- 2026-10-05 (instruction 004): added `sessionList` per project for the feed and Sessions table (spec 003).
- 2026-10-05: Decided the "active" threshold is shown in the UI. The scanner result carries `activeMinutes` so the API (R-03) can pass it to the Projects page (R-04), which shows it as a hint such as "Active = last 5 min".
