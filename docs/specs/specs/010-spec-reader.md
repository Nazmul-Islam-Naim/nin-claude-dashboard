---
id: "010"
title: Spec reader (Built status from MAP and spec files)
status: built
date: 2026-10-07
instruction: docs/specs/instructions/010-spec-reader.md
---

## Summary

A read-only Node module that lists a project's specs from `docs/specs/MAP.md` and reads each spec's `status:` frontmatter line, so the dashboard can show "built" and "spec written" without a Sheet.

## Problem & Goal

Most projects have no Google Sheet but do have `docs/specs/MAP.md` and spec files. The dashboard should still show how many specs exist and how many are built, and it should correct stale Sheet rows (still `Spec Written`) when a spec file says `built`. Goal: one module that turns a project path into a reliable list of specs with a status.

## Scope

- `specReader.readSpecs(projectPath)` plus a small helper `specStatusById(specs)`.

## Analysis

- Impact on existing work: new module next to the scanner (001) and Sheet reader (002); used by the aggregator (003, updated by instruction 011).
- Observed on this machine: MAP wording about "built" varies (in `date`, in `relation`, in the title), so MAP text is not parsed for status. Spec frontmatter `status: built | draft` is consistent. MAP rows can outnumber specs (`updates` rows), e.g. 12 rows for 3 specs in one project.
- Risks: a missing or hand-edited `status` line (becomes `unknown`), CRLF line endings, a `spec` path that does not exist (`unknown`), a malformed MAP table (returns what could be parsed).

## Design

**Interface**

```js
readSpecs(projectPath)
// -> { status: 'ok' | 'none', specs: [{ id, title, path, status: 'built' | 'draft' | 'unknown' }] }
```

**Flow**

1. Read `<projectPath>/docs/specs/MAP.md`. Missing or unreadable returns `{ status: 'none', specs: [] }`.
2. Parse the Markdown table: split each `|` row; the header row names the columns (`id`, `title`, `spec`, `relation`). Skip the separator row and rows with too few cells.
3. Keep rows whose `relation` starts with `creates`. Group by `spec` path (distinct); `id` and `title` come from the first such row.
4. For each distinct spec path, read `<projectPath>/docs/specs/<spec path>`. Take the `status:` value from the first frontmatter block (between the first two `---` lines), strip quotes, lowercase. `built` gives `built`, `draft` gives `draft`, anything else or any read failure gives `unknown`.
5. Return `{ status: 'ok', specs }`; an `ok` result with an empty list means MAP exists but has no `creates` rows.

**specStatusById(specs)** maps every MAP id (including ids of `updates` rows, via a second pass over the table) to that row's spec status, so a Sheet row whose `spec` column holds `004` resolves to the spec behind it. Ids that match nothing are absent from the map.

The function never throws and never writes. CRLF is handled by splitting on `\r?\n`.

**Components**: `server/specReader.js`. No dependencies.

## Acceptance & Test criteria

Tests use fixture projects in a temp directory:

1. Three `creates` rows and two `updates` rows pointing at existing specs give 3 specs, not 5.
2. A spec file with `status: built` gives `built`; `status: "draft"` (quoted) gives `draft`; any other value gives `unknown`.
3. A `spec` path whose file is missing gives `unknown`; other specs are unaffected.
4. Free text containing "built" in a MAP row (title, relation or date) does not change a spec's status.
5. A missing MAP returns `{ status: 'none', specs: [] }`.
6. CRLF line endings in MAP and in spec frontmatter parse the same as LF.
7. `specStatusById` resolves an `updates` row's id to the status of the spec it points at, and omits unknown ids.
8. A malformed MAP (no header row) returns `{ status: 'ok', specs: [] }` without throwing.

## Deploy notes

Runs inside the local server; reads project folders only; no credentials.

## Open questions

None.
