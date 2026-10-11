---
id: "018"
title: VS Code extension for the Marketplace
date: 2026-10-11
status: frozen
---

## Original request

"ami caiteci ei project ta ke vs code extension hisebe vs code market place add korbo" (I want to turn this project into a VS Code extension and add it to the VS Code Marketplace).

## Assumptions & corrections

- The dashboard opens inside VS Code in a Webview panel ("Claude Dashboard: Open") and also in the external browser ("Claude Dashboard: Open in Browser"). Both commands use the same server.
- The extension starts the existing server as a child process on a free localhost port and stops it when the extension deactivates.
- The Google service account key path is a VS Code setting. The key and any `.env` are never packaged.
- The server and `web/dist` are bundled into the extension (esbuild). The existing server and web code stay as they are, apart from instruction 017.
- The user creates the publisher ID and Personal Access Token (Azure DevOps / Marketplace) and runs `vsce publish`.
- Depends on instruction 017 (English-only UI).

## Agreed scope

- An `extension/` package: manifest, activate/deactivate, server launcher, Webview, settings, packaging to `.vsix`, Marketplace listing files (README, icon, LICENSE, changelog).

## Out of scope

- Publishing to Open VSX (planned for a later release), a rewrite of the server in the extension host, new dashboard features.
