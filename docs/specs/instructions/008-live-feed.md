---
id: "008"
title: Live feed tab
date: 2026-10-05
status: frozen
---

## Original request

Dashboard brainstorm: a "Live activity feed" view showing what is running right now ("sob gulo" = all three views).

Sheet row R-06: "Live feed tab: সব project মিলিয়ে সময়ের উল্টো ক্রমে activity, project filter" (source: Dashboard design session 2026-10-05, Section 3).

## Assumptions & corrections

- Data comes from `useApi('/api/feed')`; with a filter the URL is `/api/feed?project=<name>` (`encodeURIComponent`).
- The filter is a native `<select>` ("সব project" plus the names) populated from `useApi('/api/projects')`. The filter state lives in the page, not the URL.
- Each row: project name (link to `#/projects/<name>`), session title (empty shows "(শিরোনাম নেই)"), relative time (full date on hover), and an "Active" badge when the session is within `activeMinutes` (from `/api/projects`).
- The list is a `<ul>` of at most 100 items (as the API returns). When 100 are shown a small note reads "সর্বশেষ ১০০টা দেখানো হচ্ছে".
- No day grouping and no highlight animation. The 5-second poll replaces the list; previous data stays until new data arrives (spec 005 rule).
- States: Skeleton on first load; "কোনো activity নেই" when empty; ErrorNote only in the list area.
- If the selected project disappears from the names list on a later poll, the filter falls back to "সব project".
- Small screens: one column; a long title is cut to one line with an ellipsis (full text on hover); no horizontal scroll.

## Agreed scope

- `FeedPage`, `FeedItem`.

## Out of scope

- Day grouping, new-item highlighting, any new API.
