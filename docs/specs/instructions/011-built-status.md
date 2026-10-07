---
id: "011"
title: Built status and MAP fallback in API and UI
date: 2026-10-07
status: frozen
---

## Original request

Same request as instruction 010: make the project cards show how many requirements exist, how many have a spec and how many are built, using the Sheet when there is one and MAP.md otherwise.

## Assumptions & corrections

- Statuses are five: `Extracted`, `Confirmed`, `Spec Written`, `Built`, plus `Rejected` kept apart. `Spec Written` means the spec exists but is not built; `Built` means development is done.
- API: `requirements` gains `source` (`sheet`, `map` or `none`) and `counts` gains `Built`. Each Sheet row's `status` is the effective status: `Built` when its spec file says built, otherwise the Sheet value. MAP-based rows are `{ id, title, summary: "", source: "MAP", priority: "", status, spec }` with status `Built`, `Spec Written` (draft) or `Unknown`.
- `kpis` gains `built` and `totalRequirements` (everything except `Rejected`); `openRequirements` becomes `Extracted + Confirmed + Spec Written`.
- Card: a main line "Development: B/T Built" with a stacked bar (Built green, Spec Written indigo, Confirmed and Extracted grey) and a text line such as "মোট ৮ · Built ৪ · Spec Written ৩ · Confirmed ১ · Extracted ০". `Rejected` is shown separately and only when above zero, and is not part of the total. For MAP-based projects the card shows a small grey "MAP থেকে" label and only Built and Spec Written.
- `progress()` returns `done = Built`, `total = all − Rejected`.
- Fourth KPI card "Built" shows built/total across projects.
- Pipeline has five columns (Extracted, Confirmed, Spec Written, Built, Rejected) and shows only projects whose requirements come from a Sheet; the note counts projects without a readable Sheet. The detail page's Requirements list uses a green Built badge with text and a "MAP থেকে" label for MAP-based projects.
- The Sheet rows R-01 to R-08 are set to `Built` only after the rebuild passes (by the build step, as the updated `parallel-build` skill requires), not before: the running dashboard does not know `Built` yet and would drop those rows from its counts. Until then the specs changed by this instruction (003, 006, 007, 009) are `draft`.

## Agreed scope

- In-place updates to specs 003, 006, 007 and 009 and to `docs/specs/contracts/003-api.md`.

## Out of scope

- The spec reader itself (instruction 010), Sheet-side tooling, any change to the plugin skills.
