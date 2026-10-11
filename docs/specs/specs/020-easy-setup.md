---
id: "020"
title: Easy first-run setup for the extension
status: built
date: 2026-10-11
instruction: docs/specs/instructions/020-easy-setup.md
---

## Summary

A new user installs the extension, runs one command and sees the dashboard. Connecting Google Sheets is optional and guided.

## Problem & Goal

Before this, the user had to open Settings and type a key path, and a missing key only showed "Could not read Sheet". Goal: zero required setup, and clear next steps for the optional Sheet connection.

## Scope

- Extension commands, first-run prompt, walkthrough, README.
- Friendlier Sheet error text in the web app (specs 006, 007 messages).

## Analysis

- Impact on existing: spec 018 gains two commands and a walkthrough; the 006/007 error message for `status: 'error'` now depends on `requirements.error` (already in the API, spec 003). No API change.
- Risks: the prompt could nag (one prompt per Open, silenced by "Continue without Sheets"); a changed setting restarts the server and reopens the panel.

## Design

- `claudeDashboard.selectKey`: `showOpenDialog` (.json) then `update('keyPath', path, Global)`. The existing configuration listener stops the server and, if the panel was open, reopens it.
- `askForKey(context)`: on Open, when `keyPath` is empty and `globalState.skipKey` is not set, show the three-button prompt (does not block opening).
- `claudeDashboard.getStarted`: opens the walkthrough `<extension id>#start` (`contributes.walkthroughs`, text in `walkthrough/start.md`).
- `sheetErrorText(error)` in `ReqSummary.jsx` maps `no key path configured`, `key file missing or unreadable` and `HTTP 403/404` to actionable text; anything else stays "Could not read Sheet". `reqMessage` uses it.

## Acceptance & Test criteria

- With no key, Open shows the dashboard and one prompt; "Continue without Sheets" stops it for good.
- "Select Google Key File" picks a JSON, the open dashboard reloads and Sheets load.
- A project whose Sheet is not shared shows "Sheet is not shared with the service account (Viewer access)."
- Web tests pass, including `sheetError.test.js`.

## Deploy notes

Ship as extension 0.2.0.

## Open questions

None.

## Change log

- 2026-10-11: created and built.
