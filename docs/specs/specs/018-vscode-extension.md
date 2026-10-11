---
id: "018"
title: VS Code extension for the Marketplace
status: draft
date: 2026-10-11
instruction: docs/specs/instructions/018-vscode-extension.md
---

## Summary

Package the dashboard as a VS Code extension that starts its own server and shows the dashboard in a Webview, ready to publish on the VS Code Marketplace.

## Problem & Goal

Today the dashboard needs a manual `npm install`, a build and `npm start`, then a browser tab. Goal: install from the Marketplace, run one command, see the dashboard inside VS Code.

## Scope

- New `extension/` package. Server and web code are reused unchanged.
- Command, Webview, settings, status bar item, packaging, Marketplace listing.

## Analysis

- Impact on existing: the server (003) is started by the extension instead of `npm start`; the open button (013) can call VS Code directly instead of the `code` CLI. The server's loopback-only default (014) is kept.
- Assumptions: see the instruction.
- Risks: Webview CSP when framing localhost; running Node for the child process (use `process.execPath` with `ELECTRON_RUN_AS_NODE=1`); native dependencies in the server; secrets leaking into the `.vsix`; Marketplace review rules (icon, README, repository link).

## Design

- `extension/package.json`: `name`, `publisher`, `engines.vscode`, `activationEvents` (command), `contributes.commands` (`claudeDashboard.open` for the Webview, `claudeDashboard.openInBrowser` for the external browser via `vscode.env.openExternal`), `contributes.configuration`: `claudeDashboard.keyPath` (service account key), `claudeDashboard.port` (0 = auto), `claudeDashboard.editorCommand`.
- `extension/extension.js` (plain JS, no compile step):
  1. On `claudeDashboard.open`, start the server once: spawn the bundled `server.js` with env `HOST=127.0.0.1`, `PORT`, `GOOGLE_APPLICATION_CREDENTIALS` from settings.
  2. Wait for the server's health response, then create the Webview panel showing `http://127.0.0.1:<port>` through `vscode.env.asExternalUri` with a matching CSP (`frame-src`).
  3. `openInBrowser` starts the same server if needed and opens `http://127.0.0.1:<port>` in the default browser.
  4. Status bar item "Claude Dashboard" re-opens the panel. `deactivate()` kills the child process.
- Build: `extension/build.mjs` bundles the server into `extension/dist/server.mjs`; `web/dist` is copied to `extension/dist/web`. `.vscodeignore` excludes sources, `node_modules`, `.env`, `*.json` keys.
- Packaging: `vsce package` produces the `.vsix`; `vsce publish` uploads it.
- Data flow: Webview -> localhost server -> reads `~/.claude/projects` and the Google Sheet, as today.

## Acceptance & Test criteria

- F5 (Extension Development Host): both commands open the dashboard with data, in the Webview and in the browser.
- Closing VS Code leaves no orphan server process.
- `vsce ls` lists no `.env`, key file or source maps with paths.
- The `.vsix` installs on a clean VS Code profile and works after setting `keyPath`.
- `vsce publish` succeeds and the listing shows README, icon and version.

## Deploy notes

Create the Marketplace publisher and PAT, set `publisher` and `repository` in the manifest, add icon (128x128 PNG), LICENSE and CHANGELOG, bump version for each release.

## Open questions

- None. Open VSX publishing is deferred to a later release.

## Change log

- 2026-10-11: created. Added browser command; Open VSX deferred.
- 2026-10-11: implemented. `server.js` gained a `WEB_DIST` env override. `vsce package` gives a 12-file .vsix with no `.env` or key. Not yet checked in a live VS Code (F5) and not published.
- 2026-10-11: published as `NazmulIslamNaim.nin-claude-dashboard` (name `claude-dashboard` was taken on the Marketplace).
