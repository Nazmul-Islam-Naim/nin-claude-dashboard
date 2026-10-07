---
id: "016"
title: Project detail page redesign (wide layout, requirement cards)
date: 2026-10-07
status: frozen
---

## Original request

"design ta improve korte hobe. onek besi poriman requirement thakle er eta nice thakle dekha tough hobe so car gulo pasa pasi hole valo hoy" (the design must improve; with many requirements the long list is hard to read, so cards side by side would be better), plus a screenshot with red boxes showing the large empty space on both sides of the content.

## Assumptions & corrections

- The content sits in a `max-w-[1080px]` column with empty space on both sides. The container becomes `max-w-[1600px]` with a `px-4 sm:px-8` gutter for all pages. The Projects grid keeps its `auto-fill` rule, so it simply fits more cards per row.
- Detail page order: header panel, progress summary, Requirements (card grid), Insights (three cards side by side), Sessions (compact list). The user cares most about requirements and insights; Sessions go last.
- Header panel: name with the Active badge, muted monospace path, last session and count, and the "Google Sheet ↗" and "VS Code-এ খুলুন" buttons at equal size (right on wide screens, below on narrow ones).
- Progress summary: "B/T Built" in large type, the stacked bar (Built green, Spec Written indigo, Confirmed and Extracted grey) and the per-status counts, reusing the existing `ReqSummary` logic and `progress()`.
- Requirements grid: 1 column, 2 from 640px, 3 from 1024px, 4 from 1440px. Each card: id and a status badge with text (coloured left edge), title (2 lines), summary (2 lines, full text on hover), priority and spec number. Order is the API order.
- With many requirements: status filter chips with counts, a search box (id or title), and the first 24 cards with "আরও দেখান (N বাকি)" (24 more per click). Changing the filter or search resets the limit.
- Insights: three cards (Models, Plugins, Skills) in a grid, one column on small screens. Each row has the name and the percent on one line, the bar under it and a small count line. The first 5 rows show with "সব দেখান (N)". The range select stays at the top right.
- Sessions: a compact list (title, when, Active badge), the first 8 with "সব দেখান (N)" (still capped at 50).
- No backend or contract change. Status is always readable as text; filter chips and buttons work by keyboard; no horizontal page scroll.

## Agreed scope

- Layout width, `DetailHeader`, `ProgressSummary`, `RequirementsGrid` (cards, chips, search, show more), the Insights and Sessions layouts, helpers in `lib.js`, and the matching updates to specs 005, 007 and 015.

## Out of scope

- Redesign of the Projects, Live feed and Pipeline pages beyond the wider container, sorting, any API change.
