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

## Run servers with fixed ports

On a project's detail page, "Servers" lists each runnable service (Laravel, Django, FastAPI, npm `dev`/`start`). Type a port (1024-65535) and press Enter to keep it; Start and Stop control the process, and the badge shows Running or Stopped. A saved port is always used: if something else holds it, the start is blocked and the message says who (another project or an external program). Leave the port empty to get a free one. Ports are stored in `~/.claude-dashboard/ports.json` and server output in `~/.claude-dashboard/logs/` (change the folder with `DASHBOARD_DATA_DIR`). Works on Linux, macOS and Windows, from the machine the server runs on. After the dashboard itself restarts, servers it started earlier show as Stopped.

On the Projects page, the card's "Servers" button opens the same controls in a modal, and a running project shows `localhost:<port>` links on the card. The tab icon is a live spark mark: a green dot while a server runs, a ring while a session is active, and the tab title shows how many servers run. Pick an accent colour with the swatches in the header (saved in your browser); it recolours the UI and the icon.

## Claude plugins per project

The detail page also lists installed Claude plugins with a switch each. A switch writes only that plugin's entry under `enabledPlugins` in `<project>/.claude/settings.local.json` (per user, normally gitignored); the committed `settings.json` and your user settings are never changed, and plugins are never uninstalled. Changes apply to new Claude sessions; run `/reload-plugins` in open ones. A file that is not valid JSON is left untouched and an error is shown.

## LAN access (optional)

By default the server listens on `127.0.0.1` only. To view the dashboard from another device on the same Wi-Fi, set both in `server/.env`:

```
HOST=0.0.0.0
DASHBOARD_TOKEN=<at least 16 characters>
```

Restart, allow Node on private networks in the Windows Firewall prompt, then open one of the `http://<ip>:47615/?key=<token>` URLs printed at start-up (once per device; it sets a cookie). The server refuses to start on a non-loopback `HOST` without a token. The "VS Code" button never works from other devices. The connection is plain HTTP, so use it only on a trusted network.

## VS Code extension

`extension/` packages this dashboard as a VS Code extension (command "Claude Dashboard: Open", webview or browser). Build with `cd web && npm run build`, then `cd extension && npm install && npm run package`. Publish with `npx vsce login <publisher>` and `npm run publish`; set `publisher` in `extension/package.json` first.
