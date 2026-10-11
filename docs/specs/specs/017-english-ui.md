---
id: "017"
title: English-only UI
status: built
date: 2026-10-11
instruction: docs/specs/instructions/017-english-ui.md
---

## Summary

Replace every Bangla string in the dashboard (web UI, server messages, tests, README) with English.

## Problem & Goal

The UI and server mix in Bangla text. The dashboard will ship as a VS Code extension for a general audience, so it must be English only. Goal: no Bangla characters in shipped code.

## Scope

- Web: `web/src/components/*` (OpenButton, FilterBar, ReqSummary, InsightsSection, RequirementsGrid, SessionsTable, ProjectCard, ProjectSelect, PipelineColumn, FeedItem, DetailHeader, Badge, States), `web/src/pages/*`, `web/src/lib.js`.
- Server: `server/server.js`, `server/openProject.js`, `server/auth.js`.
- Tests: `web/src/lib.test.js`, `server/test/open-auth.test.js`.
- README: the Bangla line.
- Specs that quote UI text: 006, 007, 008, 009, 013, 014, 015 (Change log line each).

## Analysis

- Impact on existing: text only. Tests that assert on strings change with them; nothing else depends on the wording.
- Assumptions: none beyond the instruction.
- Risks: a missed string, or a test asserting old text. Both are caught by the grep and the test run below.

## Design

Mechanical replacement, file by file. Find every occurrence with a search for characters in the Bangla range (U+0980 to U+09FF). Replace each with short English, keeping the same meaning and length where possible so layouts do not shift. Examples:

| Bangla | English |
|---|---|
| VS Code-এ খুলুন | Open in VS Code |
| খুলছে… | Opening… |
| খোলা হয়েছে | Opened |
| খোলা যায়নি | Could not open |
| `<command>` কমান্ড পাওয়া যায়নি | `<command>` command not found |
| folder পাওয়া যায়নি | Folder not found |
| অবৈধ পথ | Invalid path |
| অবৈধ editor কমান্ড | Invalid editor command |
| শুধু এই machine থেকে | Only from this machine |

Other strings follow the same style. Update test expectations to the new text, then update the quoted text in the listed specs.

## Acceptance & Test criteria

- A search for U+0980 to U+09FF over `web/src`, `server` (excluding `node_modules`) and `README.md` finds nothing.
- Web and server test suites pass.
- Loading the dashboard shows English everywhere: Projects, Project detail, Live feed, Pipeline, error and empty states, the open button states.

## Deploy notes

Rebuild the web app (`npm run build` in `web/`) so `dist` carries the new text.

## Open questions

None.

## Change log

- 2026-10-11: created.
