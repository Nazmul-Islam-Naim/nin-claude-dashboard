---
id: "017"
title: English-only UI
date: 2026-10-11
status: frozen
---

## Original request

"age dashboard ta pura puri english kore dao ekhane bangal bad dao jehetu extension convert korbo" (first make the whole dashboard English and remove the Bangla, since it will be converted to an extension).

## Assumptions & corrections

- Applies to everything a user sees: web UI text, server error messages, and the tests that assert on that text. Logic and layout do not change.
- Frozen instruction files and `design-samples/` keep their Bangla. Specs that quote UI text are updated to the new English text, each with a Change log line.
- Each Bangla string is replaced with a short, plain English equivalent (for example "VS Code-এ খুলুন" becomes "Open in VS Code").
- This is a prerequisite for the VS Code extension (instruction 018).

## Agreed scope

- `web/src/components/*`, `web/src/pages/*`, `web/src/lib.js`, `server/server.js`, `server/openProject.js`, `server/auth.js`, the README line, and the tests `web/src/lib.test.js` and `server/test/open-auth.test.js`.
- Quoted UI text in specs 006, 007, 008, 009, 013, 014 and 015.

## Out of scope

- Translation or a language switcher, new features, and changes to frozen instructions or `design-samples/`.
