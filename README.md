# nin-claude-dashboard

A local dashboard that shows which projects are under development: Claude Code sessions per project (from `~/.claude/projects`) and each project's requirement status (from its own Google Sheet).

## Run

```
cd web && npm install && npm run build
cd ../server && npm install
```

Put the service account key path in `server/.env`:

```
GOOGLE_APPLICATION_CREDENTIALS=<path to the service account key .json>
```

Share each project's Sheet with the service account email (Viewer is enough) and put the Sheet URL in that project's `docs/specs/prd-tracking-sheet.txt`. Then:

```
cd server && npm start     # http://127.0.0.1:47615
```

## Layout

- `server/` Node + Express API (session scanner, Sheet reader, aggregator)
- `web/` React + Tailwind UI (Projects, Live feed, Pipeline)
- `docs/specs/` instructions, specs, MAP.md and the API contract
- `design-samples/` the three visual directions considered (Clean Console was chosen)

## Open a project in VS Code

Each project card has a "Open in VS Code" button. The server runs `code <folder>` (change the command with `EDITOR_COMMAND` in `server/.env`), which focuses the window that already has the folder open or opens a new one. It only works from the machine the server runs on.

## LAN access (optional)

By default the server listens on `127.0.0.1` only. To view the dashboard from another device on the same Wi-Fi, set both in `server/.env`:

```
HOST=0.0.0.0
DASHBOARD_TOKEN=<at least 16 characters>
```

Restart, allow Node on private networks in the Windows Firewall prompt, then open one of the `http://<ip>:47615/?key=<token>` URLs printed at start-up (once per device; it sets a cookie). The server refuses to start on a non-loopback `HOST` without a token. The "VS Code" button never works from other devices. The connection is plain HTTP, so use it only on a trusted network.

## VS Code extension

`extension/` packages this dashboard as a VS Code extension (command "Claude Dashboard: Open", webview or browser). Build with `cd web && npm run build`, then `cd extension && npm install && npm run package`. Publish with `npx vsce login <publisher>` and `npm run publish`; set `publisher` in `extension/package.json` first.
