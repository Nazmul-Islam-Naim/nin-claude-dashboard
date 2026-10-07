---
id: "005"
title: UI shell and design tokens
status: built
date: 2026-10-05
instruction: docs/specs/instructions/005-ui-shell.md
---

## Summary

The React + Tailwind frontend skeleton for the dashboard: design tokens, top-tab layout, hash routing, a polling data hook and shared loading/empty/error components. The Projects, Feed and Pipeline pages plug into it.

## Problem & Goal

Every page needs the same look, navigation, refresh behaviour and failure display. Building that once keeps R-04 to R-07 small and consistent with the chosen Clean Console direction.

## Scope

- Tokens, `Layout` with `Tabs`, hash routing, `useApi`, `Skeleton`, `EmptyState`, `ErrorNote`.
- Placeholder pages for the three tabs so the shell can be run and checked.

## Analysis

- Impact on existing work: consumes the endpoints from spec 003 (`/api/projects`, `/api/feed`, `/api/pipeline`). The reference look is `design-samples/2-clean-console.html`.
- Risks: polling load (5 s UI poll against the 2 s server cache is fine for a single user), flicker on refresh (mitigated by keeping previous data), hash routes breaking on unknown paths (fall back to Projects).
- Assumption: one user, local machine, so no auth and no dark mode now.

## Design

**Stack**: Vite, React, Tailwind. Build output is served as static files by the Express server of spec 003. In dev, Vite proxies `/api` to the server.

**Tokens** (Tailwind theme, backed by CSS variables)

| Role | Value |
|---|---|
| background | `#f6f7fb` |
| panel | `#ffffff` |
| border | `#e5e8f0` |
| text | `#161b2e` |
| muted | `#6b7490` |
| primary | `#4f46e5` |
| success | `#10b981` |
| radius (card) | 12px, light shadow |
| font | Inter |

**Routing**: `useHashRoute()` reads `location.hash` and returns `{ tab, project }`. `#/projects`, `#/feed`, `#/pipeline`, `#/projects/<name>`. Unknown hash resolves to `projects`.

**Layout**: `<header>` with the app name and `<nav>` tabs (the active one has `aria-current="page"` and an indigo underline), then `<main>` with max-width 1600px and a 16px gutter (32px from 640px up) (instruction 016). On narrow screens the tab row scrolls horizontally.

**useApi(url)**: fetches on mount and every 5 seconds, returns `{ data, loading, error }`. `loading` is true only until the first response. A failed poll sets `error` but keeps the last `data`. Polling pauses while `document.hidden` and resumes with an immediate fetch when visible. Cleans up its timer on unmount or URL change.

**State components**: `Skeleton` (grey pulsing blocks, used on first load), `EmptyState({ message })`, `ErrorNote({ message })` (inline, scoped to the section it sits in). A section renders: first load -> Skeleton; error with no data -> ErrorNote; empty data -> EmptyState; otherwise content (with a small ErrorNote if a later poll failed).

**Components**: `Layout`, `Tabs`, `Skeleton`, `EmptyState`, `ErrorNote`, hook files `useApi.js`, `useHashRoute.js`.

## Acceptance & Test criteria

1. Opening `#/feed` shows the Live feed tab as active; an unknown hash shows Projects.
2. Changing the hash switches tabs without a reload; browser back works.
3. `useApi`: first response sets `loading: false`; later polls do not set `loading` again; a failed poll keeps the previous `data` and sets `error`.
4. `useApi` stops polling while the page is hidden and fetches immediately when visible again.
5. At 360px width there is no horizontal page scroll and the tab row scrolls horizontally.
6. Active tab has `aria-current="page"`; keyboard focus is visibly outlined on tabs.
7. Skeleton, EmptyState and ErrorNote each render their message and do not affect sibling sections.

`useApi` and `useHashRoute` get small unit tests with a mocked `fetch` and fake timers; the layout items are checked by hand in the browser at 360px and 1280px.

## Deploy notes

`npm run build` outputs static files; the Express server serves them next to `/api`. Fonts load from Google Fonts (needs internet); fall back to the system sans-serif when offline.

## Open questions

None.

## Change log

- 2026-10-07 (instruction 016): the content container is 1600px wide (was 1080px) for all pages.
