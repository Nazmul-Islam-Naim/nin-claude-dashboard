---
id: "005"
title: UI shell and design tokens
date: 2026-10-05
status: frozen
---

## Original request

Direction pick: "ami 2 nibo" (Clean Console: light theme, Inter, indigo accent, top tabs, card grid).

Sheet row R-08: "UI shell ও tokens: Clean Console (Inter, indigo), top tabs, responsive, loading/empty/error state, polling refresh" (source: Dashboard design session 2026-10-05, Section 3).

## Assumptions & corrections

- Vite + React + Tailwind. The built files are served by the Express server from spec 003 (one port, no CORS); in dev, Vite proxies `/api`.
- Tokens live in the Tailwind theme: background `#f6f7fb`, panel `#fff`, border `#e5e8f0`, text `#161b2e`, muted `#6b7490`, primary `#4f46e5`, success `#10b981`; font Inter; card radius 12px with a light shadow.
- Light theme only. Tokens are CSS variables so dark mode can be added later.
- Three tabs (Projects, Live feed, Pipeline) routed by URL hash (`#/projects`, `#/feed`, `#/pipeline`); project detail is `#/projects/<name>`. No router library.
- Layout: top nav, content max-width 1080px, 16px side gutter; tabs scroll horizontally on small screens; no horizontal page scroll.
- A `useApi(url)` hook polls every 5 seconds and returns `{ data, loading, error }`; polling pauses while the tab is hidden.
- Shared state components: Skeleton (first load), EmptyState (with message), ErrorNote (scoped to its section). During a poll the previous data stays visible.
- Accessibility: nav landmark, `aria-current` on the active tab, visible focus ring, status never conveyed by colour alone.
- UI text: sentences in Bangla, technical terms in English.

## Agreed scope

- App shell, tokens, hash routing, `useApi`, Skeleton / EmptyState / ErrorNote.

## Out of scope

- The page contents (R-04 to R-07), dark mode, authentication.
