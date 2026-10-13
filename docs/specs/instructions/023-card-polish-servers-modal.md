---
id: "023"
title: Card polish, Servers modal and live favicon
date: 2026-10-13
status: frozen
---

## Original request

"card er button gulo dekhte valo lagtece nah ektu interactive hole valo hoy ... server on korar jonno details page jete hoy ... ami cassi card theke ee kora jabe like jakhon server button click korbe ekta modal asbe sekhane theke port bosbae and run korbe and card e status thakbe je project run ace with link ... favicon er poriborton korb"
Follow-up: "Card buttons: A. Favicons jehetu claude er dashboard + cusomtization kisu ekta interactive koro"

## Assumptions & corrections

- Card buttons use direction A (action bar): one filled "Servers" button, icon-only VS Code and Sheet buttons. Chosen by the user from samples.
- The modal reuses the detail page's server rows and the existing `/api/run`, `/api/stop`, `/api/port`; no server change.
- "Interactive favicon" is read as: a Claude-style spark mark that reflects live state (green dot when a server runs, ring when a session is active, tab title shows the running count) and takes the user's chosen accent colour.
- The accent colour is a per-browser setting (6 presets, localStorage) that also recolours the UI primary colour.
- The Marketplace extension icon is not changed.

## Agreed scope

- `ProjectCard`, `OpenButton`, `ServicesModal`, `ServiceRow`, `Layout` accent picker, `useTheme` hooks, `web/public/favicon.svg`, lib helpers and tests.

## Out of scope

- Server changes, custom colour input, extension icon.
