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
cd server && npm start     # http://127.0.0.1:4000
```

## Layout

- `server/` Node + Express API (session scanner, Sheet reader, aggregator)
- `web/` React + Tailwind UI (Projects, Live feed, Pipeline)
- `docs/specs/` instructions, specs, MAP.md and the API contract
- `design-samples/` the three visual directions considered (Clean Console was chosen)
