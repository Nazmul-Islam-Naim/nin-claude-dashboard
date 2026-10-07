---
id: "013"
title: Open a project in VS Code from its card
status: built
date: 2026-10-07
instruction: docs/specs/instructions/013-open-in-editor.md
---

## Summary

A button on each project card (and on the detail page) that opens the project folder in VS Code through the local server, reusing an existing window when the folder is already open.

## Problem & Goal

From the dashboard the user can see which projects are active but must switch to VS Code and find the folder by hand. Goal: one click opens (or focuses) the project in VS Code, without creating a way for anything else to run programs on the machine.

## Scope

- `server/openProject.js`, `POST /api/open`, `canOpen` in `/api/projects`, `OpenButton` in the web app.

## Analysis

- Impact on existing work: adds one non-`GET` endpoint to the server of spec 003, whose "all GET, read-only" statement becomes "all GET except this endpoint". The project card (006) and the detail page (007) get a button. The contract is updated.
- The VS Code CLI `code <folder>` focuses the window that already has the folder open, or opens a new one, so no window tracking is needed.
- On Windows `code` is a `.cmd` file, which Node cannot spawn directly without a shell (since the 2024 security fix). It is therefore run as `cmd.exe /d /s /c code "<path>"` with verbatim arguments; this is safe only because the path and command are strictly validated.
- Risks: a web page in the user's browser posting to `localhost` (blocked by the peer, Origin and content-type checks), a path with shell-special characters (rejected), rapid repeated clicks (rate limit), `code` not on PATH (clear error).

## Design

**openProject({ path, command, platform })** -> `{ ok: true }` or `{ ok: false, error }`

1. `command` defaults to `process.env.EDITOR_COMMAND || 'code'` and must match `/^[A-Za-z0-9._-]+$/`; otherwise error "অবৈধ editor কমান্ড".
2. `path` must be absolute, exist and be a directory (`fs.statSync`), and must not contain `& | < > ^ % ! "` or a line break; otherwise error "folder পাওয়া যায়নি" or "অবৈধ পথ".
3. Windows: `spawn('cmd.exe', ['/d', '/s', '/c', command, '"' + path + '"'], { windowsVerbatimArguments: true, detached: true, stdio: 'ignore', windowsHide: true })`. Other systems: `spawn(command, [path], { detached: true, stdio: 'ignore' })`.
4. Wait for the child's `error` (command missing, error "`<command>` কমান্ড পাওয়া যায়নি") or `exit` event for up to 3 seconds. Exit code 0 or a timeout counts as success; a non-zero exit is the same "কমান্ড পাওয়া যায়নি" error. Then `child.unref()`.

**POST /api/open**

- Request: `Content-Type: application/json`, body `{ "project": "<name>" }`.
- Checks, in order: peer address is `127.0.0.1`, `::1` or `::ffff:127.0.0.1` (else 403 `{ ok: false, error: "শুধু এই machine থেকে" }`); if an `Origin` header exists it equals `http://127.0.0.1:<port>` or `http://localhost:<port>` (else 403); content type is JSON (else 415); `project` is a string matching a name from the current scan (else 404, first match wins when names repeat); at most one open per project every 2 seconds (else 429).
- Success: 200 `{ ok: true }`. Failure from `openProject`: 500 `{ ok: false, error }`.

**canOpen**: `/api/projects` returns a top-level `canOpen` that is true when the request's peer is loopback, false otherwise.

**Web**

- `OpenButton({ project })` (text button "VS Code-এ খুলুন") posts `{ project }` to `/api/open`. States: idle, "খুলছে…" (disabled), "খোলা হয়েছে" (2 s, then idle), error text from the response (`error`), shown in place of the label for 4 s.
- Placed beside the "Sheet ↗" link on `ProjectCard` (`relative z-10`, own tab stop) and in the `ProjectDetailPage` header. Rendered only when `canOpen` is true. It is a `<button>`, not a link.

**Components**: `server/openProject.js`, a small change in `server.js`, `web/src/components/OpenButton.jsx`.

## Acceptance & Test criteria

Server tests inject a fake spawner and a temp-directory project:

1. A valid project name and an existing folder run the command once with the folder as its only path argument, and return `{ ok: true }`.
2. A request body with a `path` field is ignored; only `project` is used. An unknown project returns 404.
3. A folder containing any of `& | < > ^ % ! "` is rejected without running anything; a missing folder gives "folder পাওয়া যায়নি".
4. A peer address that is not loopback gets 403; a foreign `Origin` gets 403; a non-JSON content type gets 415.
5. `EDITOR_COMMAND` values with spaces, slashes or shell characters are rejected.
6. A spawn `error` (command missing) returns 500 with the "কমান্ড পাওয়া যায়নি" text; a timeout without an event counts as success.
7. Two opens of the same project within 2 seconds: the second returns 429.
8. `canOpen` is true for a loopback request and false for any other peer.

Web tests (Vitest) cover the button state machine with a mocked `fetch`: idle -> opening -> opened -> idle, and the error text path. By hand: with VS Code closed the click opens it; with the folder already open the click brings that window forward.

## Deploy notes

Requires the `code` command on PATH (VS Code: "Shell Command: Install 'code' command in PATH" on macOS; installed by default on Windows). `EDITOR_COMMAND` in `server/.env` can point to another editor's CLI.

## Open questions

None.
