# Pokémon Card Catalog

Single-page HTML app for cataloguing my Pokémon TCG collection. The main HTML file is in
the project root (currently `Card catalog v2.html`). Runs locally in desktop Chrome/Edge,
opened by double-click (file://). No server, no AI at runtime.
Background, history, data format and the file-split plan are in PROJECT-NOTES.md.
Read it only when a task needs it.

## Data: NOT in git, never touch
collection.xlsx, artwork/, photos/, backups/, exports/, sets.json, Claude outputs/, _w.tmp
live in this folder but are git-ignored. Never read their contents, commit, delete, move,
rename or modify them. The app writes collection.xlsx itself.

## Structure of the main HTML file (search by name; line numbers go stale)
- <style> block (contains two base64 sprite sheets; do not read or print them)
- Script 1: PKL local runtime (folder storage, xlsx, OCR, TCGdex) with const P (sets array)
- Script 2: main app, ~56% of the file (Home, Scan, Binders, Decks, Showcase, Cards,
  Stats, Tools, card page, editor, Living Pokédex, sidebar)
- Script 3: wish list (WL*, wl*)
- Script 4: PKI18N Greek UI layer (dictionary D, regex rules R)

## Working rules
- Small, targeted edits. Never reprint a whole file. Search first, read only what is needed.
- Classic <script src> and <link> only. No ES modules, no import, no fetch of local files.
- Everything stays global. Do not rename functions or variables during a refactor.
- A refactor moves text only. Behaviour changes go in separate commits.
- No new dependencies or CDN links without asking.
- After a change, tell me exactly what to test in the browser. You cannot run the app.
- If a change touches saving, scanning/OCR or the xlsx format, say so and explain the risk first.
- Ask before running any command that deletes files.

## Git rules
- Work on a named branch. Never commit to main, never push to main, never force-push.
- Commit after each completed, working change with a clear message.
- Before every commit run git status; stop and tell me if a data file or large image is staged.
- Merge, tag and push only when I ask, after I have tested.
- Never change git config.