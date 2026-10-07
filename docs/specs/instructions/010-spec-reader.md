---
id: "010"
title: Spec reader (Built status from MAP and spec files)
date: 2026-10-07
status: frozen
---

## Original request

"ekhan theke sudue dekha jasse kato gulo spec hoice but total summery bojah jay nah like kato gulo spec ace tar vitor kato gulo developemtn sesh etc.. aro informative lagbe." and "je sob jaygay sheet nai. sekhane to map.md ace" and "ha map theke nea ja".

## Assumptions & corrections

- The Sheet now has a fifth status `Built` (`prd-to-requirements` and `parallel-build` already say so). `Built` means development is finished.
- For projects without a Sheet the data comes from `docs/specs/MAP.md`. The reliable "built" signal is the `status:` line in each spec file's frontmatter (`built` or `draft`), not any free text in MAP rows, because the wording differs between projects.
- MAP rows are not specs: `updates` rows point at an existing spec. Specs are counted by distinct spec path.
- Spec file status wins over the Sheet: a Sheet row whose `spec` column (a MAP id) points at a spec file with `status: built` counts as `Built`, even if the Sheet row still says `Spec Written` (older projects whose Sheet was never updated). Rows without a matching spec keep their Sheet status.
- A project with a Sheet that reads fine uses the Sheet rows. A project with no Sheet but a MAP uses the MAP. A Sheet read error stays an error (it is not hidden by the MAP fallback). No Sheet and no MAP means no data.
- A spec whose status is neither `built` nor `draft`, or whose file cannot be read, is `Unknown`.
- Read-only: nothing is written.

## Agreed scope

- A Node module `specReader` returning `{ status, specs }` for a project path (`status`: `ok` or `none`; each spec `{ id, title, path, status }`).

## Out of scope

- Writing frontmatter or MAP, parsing free text in MAP rows, the changes to the API and UI (instruction 011).
