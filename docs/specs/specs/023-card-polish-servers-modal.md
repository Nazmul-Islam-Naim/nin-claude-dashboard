---
id: "023"
title: Card polish, Servers modal and live favicon
status: built
date: 2026-10-13
instruction: docs/specs/instructions/023-card-polish-servers-modal.md
---

## Summary

Project cards get an action bar (filled "Servers" button, icon-only VS Code and Sheet buttons). "Servers" opens a modal to set ports and start or stop each service; a running project shows a status line with `localhost:<port>` links. The favicon is a spark mark that shows live state and follows a user-chosen accent colour.

## Problem & Goal

Card buttons looked flat and equal, and starting a server meant leaving the list for the detail page. Goal: clear hierarchy, run servers from the card, and see at a glance (card and browser tab) what is running.

## Scope

- Web only: `ProjectCard.jsx`, `OpenButton.jsx`, `ServicesModal.jsx`, `ServiceRow.jsx`, `ServicesPanel.jsx`, `Layout.jsx`, `AccentPicker.jsx`, `hooks/useTheme.js`, `hooks/useApi.js`, `lib.js`, `public/favicon.svg`.

## Analysis

- Impact on existing work: replaces the card actions of spec 006 and the "Servers →" link of spec 021; the detail page keeps its Servers panel (same `ServiceRow`). No API change.
- Risks: a link built from untrusted data (only integer ports 1-65535 on host `localhost` are linked), the favicon poll running in hidden tabs (separate 8 s poll, tiny request), `localStorage` unavailable (wrapped in try/catch, falls back to indigo).

## Design

- **Card**: running services listed as `● N running` plus `localhost:<port> ↗` (`serviceUrl`, `rel=noopener noreferrer`). Actions row: Servers button (green dot and count while running), then VS Code and Sheet icon buttons (`title` and `aria-label`, 40 px touch target on phones, hover lift, press scale, reduced-motion safe).
- **Modal**: native `<dialog>` (focus trap, Esc, backdrop click closes, bottom sheet on phones). Rows: command, `localhost` link when running, Running/Stopped, port input (saves on blur/Enter), Start/Stop. Footer: error or hint, plus Start all / Stop all when there are 2+ services (sequential `/api/run`, stops at the first error and shows it).
- **Refresh**: after any run/stop/port call a `dashboard:refresh` window event makes `useApi` lists refetch immediately.
- **Favicon**: `faviconSvg({ accent, running, active })` returns an SVG data URI set on `<link rel=icon>`; `useLiveFavicon` polls `/api/projects` every 8 s and also sets `document.title` to `● N running · Nin Dashboard`. Static `favicon.svg` is the no-JS fallback.
- **Accent**: `AccentPicker` (6 presets, radiogroup) sets `--color-primary` and the favicon colour; stored under `nin-accent`.

## Acceptance & Test criteria

1. Start from the modal: card shows `● 1 running`, a working `localhost:<port>` link and a green dot on Servers within one refresh.
2. Port busy: modal shows "Port N is used by …" and nothing starts.
3. Esc, backdrop and ✕ close the modal; Tab stays inside while open.
4. Accent choice recolours buttons and favicon and survives reload; works with storage blocked.
5. Non-numeric ports never become links (unit tested).
6. Favicon has a green dot only while a server runs, a ring only while a session is active (unit tested).

## Deploy notes

`cd web && npm run build`. No server restart needed beyond serving the new build.

## Open questions

- None.

## Change log

- 2026-10-13: created and built.
