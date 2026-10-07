---
id: "013"
title: Open a project in VS Code from its card
date: 2026-10-07
status: frozen
---

## Original request

"ekhane prottek ta card ek ekta project so so ami ei card ekta option add korte cai jekahen click korle open thaka terminal or vs code open hobe ar jodi open nah thake tobe vs code open hobe" (each card is one project; add an option so a click opens the already-open terminal or VS Code, and opens VS Code if it is not open).

## Assumptions & corrections

- The browser cannot start programs, so the local server does it, on the same machine as VS Code.
- The server runs the VS Code CLI (`code <folder>`). That command already focuses the window that has the folder open and opens a new window otherwise, which gives the requested "use the open one, else open VS Code" behaviour.
- Terminal windows are not handled: finding and focusing the right terminal is not reliable on Windows. A separate "open in terminal" button can be a later requirement.
- Security (this is the first endpoint that runs something):
  - `POST /api/open` with a JSON body `{ "project": "<name>" }`. The server looks the project up in its own scan and never accepts a path from the client.
  - The path must exist and be a directory, and must not contain `& | < > ^ % ! "` or a newline.
  - The request must come from the same machine (the connection's peer is `127.0.0.1` or `::1`) and, if an `Origin` header is present, it must be `http://127.0.0.1:<port>` or `http://localhost:<port>`. The content type must be `application/json`.
  - The command is run with separated arguments, never through a joined shell string.
- The command name comes from `EDITOR_COMMAND` (default `code`) and may contain only letters, digits, `.`, `_` and `-`.
- `/api/projects` gains `canOpen` (true when the request comes from the same machine). The button is only shown when it is true.
- UI: a text button "VS Code-এ খুলুন" beside the "Sheet ↗" link on each card (above the stretched card link, its own tab stop) and in the detail page header. States: "খুলছে…", "খোলা হয়েছে" (2 s), or an error text such as "খোলা যায়নি: code কমান্ড পাওয়া যায়নি" or "folder পাওয়া যায়নি".
- The API is no longer purely read-only: this one endpoint is the exception.

## Agreed scope

- `openProject` module, `POST /api/open`, `canOpen`, the button on cards and on the detail page, contract update.

## Out of scope

- Focusing or opening a terminal, other editors beyond `EDITOR_COMMAND`, access from other devices (instruction 014).
