---
id: "012"
title: Sheet link on project card and detail page
date: 2026-10-07
status: frozen
---

## Original request

"card sheet er link add kora jete pare" (can a link to the Sheet be added to the card?)

## Assumptions & corrections

- The Sheet URL is already read from `docs/specs/prd-tracking-sheet.txt` (spec 002) but is not exposed. The Sheet reader now returns `sheetUrl`, the aggregator passes it as `requirements.sheetUrl`, and the contract is updated.
- Safety: `sheetUrl` is set only when the URL starts with `https://docs.google.com/spreadsheets/` and contains a Sheet ID. Anything else (`javascript:`, another site) counts as an invalid URL and no link is shown, because the text in the file is not trusted.
- The link opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.
- Card: a small text link "Sheet ↗" beside the requirement block. The card is a link to the detail page, and an `<a>` inside an `<a>` is invalid HTML, so the project name becomes the main link with a stretched click area (the whole card still opens the detail page) and the Sheet link sits above it. Clicking "Sheet ↗" opens the Sheet, not the detail page. Keyboard users get two separate tab stops.
- The link is shown whenever a valid `sheetUrl` exists, including when reading the Sheet failed (that is when opening it is most useful). MAP-based and Sheet-less projects have no link.
- Detail page header: the same link, labelled "Google Sheet খুলুন ↗".

## Agreed scope

- In-place updates to specs 002, 003, 006 and 007 and to `docs/specs/contracts/003-api.md`.

## Out of scope

- Editing the Sheet from the dashboard, any change to how the `.txt` file is created.
