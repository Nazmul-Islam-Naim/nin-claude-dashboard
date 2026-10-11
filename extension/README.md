# Claude Dashboard

See which projects you are working on with Claude Code, right inside VS Code: sessions per project (read from `~/.claude/projects`), a live feed, and each project's requirement status (from its Google Sheet or `docs/specs/MAP.md`).

## Use

- **Claude Dashboard: Open** shows the dashboard in a VS Code tab.
- **Claude Dashboard: Open in Browser** opens the same dashboard in your browser.
- Click **Claude Dashboard** in the status bar for a shortcut.

The dashboard runs a small server on `127.0.0.1` only. Nothing leaves your machine except the Google Sheets requests you configure.

## Settings

| Setting | Purpose |
|---|---|
| `claudeDashboard.keyPath` | Path to a Google service account key (.json). Share each project's Sheet with that account (Viewer). Optional: without it, requirement status comes from `docs/specs/MAP.md`. |
| `claudeDashboard.port` | Local port. `0` (default) picks a free one. |
| `claudeDashboard.editorCommand` | Command for the "Open in VS Code" button. Empty uses `code`. |

Each project lists its Sheet in `docs/specs/prd-tracking-sheet.txt`.
