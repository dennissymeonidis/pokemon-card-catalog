\# Pokémon Card Catalog



Single-file HTML app (`Card catalog v2.html`) for cataloguing my Pokémon TCG collection

(binders with 9-pocket pages, and deck boxes). Runs locally in desktop Chrome/Edge,

opened by double-click (file://). No server, no AI at runtime.



\## Data (NOT in git, never touch)

collection.xlsx, artwork/, photos/, backups/, exports/, sets.json live in this folder

but are git-ignored. Never commit, delete, move or modify them.



\## Current structure of Card catalog.html

\- <head>: SheetJS loaded from cdn.sheetjs.com

\- Script 1: PKL local runtime (folder access, xlsx storage, OCR, TCGdex, identify overrides)

\- Script 2: original app (UI, editor, scan review, stats, tools)

\- Script 3: PKI18N Greek UI layer

\- Embedded blobs: energy/rarity sprite data URIs and the P.sets array.

&#x20; Do not read or edit the blobs unless the task is about them.



\## Rules

\- Make targeted edits. Never reprint a whole file.

\- Use classic <script src> tags. No ES modules (they break on file://).

\- Everything stays global; do not rename functions or variables during refactors.

\- A refactor moves text only. Behaviour changes go in separate commits.

\- Work on a branch for anything risky. Commit after each working change with a clear message.

\- After a change, tell me exactly what to test in the browser.

\- Ask before running any command that deletes files.



\## Notes

\- Greek UI: add missing strings to D (dictionary) or R (regex rules) in the i18n script.

\- Card names, set names, rarities and energy types stay in English.

\- Pictures are never deleted from disk (deletes are a no-op so undo stays safe).

\- TCGdex API: https://api.tcgdex.net/v2/en

