---
id: "020"
title: Easy first-run setup for the extension
date: 2026-10-11
status: frozen
---

## Original request

"ekjon user jeno khub easily use korte pare seta follow koro" (make it so that a user can use it very easily).

## Assumptions & corrections

- Google Sheets is optional. Without a key the dashboard still shows sessions and `docs/specs/MAP.md` status.
- New command "Claude Dashboard: Select Google Key File" opens a file picker and saves the path to the user setting; the dashboard restarts by itself.
- First "Open" with no key shows one non-blocking prompt: Select key file / Continue without Sheets (silences it for good) / How to get a key. Dismissing it asks again next time.
- Sheet errors in the dashboard say what to do (key not set, key not found, Sheet not shared).
- New command "Claude Dashboard: Get Started" and a Welcome walkthrough explain how to get a service account key. Creating the key stays a manual step in Google Cloud.
- README gets a three-step quick start.
- Version 0.2.0.

## Agreed scope

- `extension/` (command, prompt, walkthrough, README, changelog), `web/src/components/ReqSummary.jsx` error texts, and a test.

## Out of scope

- Automating Google Cloud setup, other sign-in methods (OAuth), a settings UI inside the dashboard.
