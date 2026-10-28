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

## File map (load order; search by name, line numbers go stale)
All classic scripts sharing one global scope; later files use names from earlier ones.
- `Card catalog v2.html`: markup only. Head: SheetJS (CDN), fonts, the three CSS links.
  Body: gate `#pkGate`, dialogs (`binderDlg`, `bulkDlg`, `confirmDlg`, `editor`), then the
  script tags below. Shadow hosts (`#bkHost` `#dkHost` `#scHost` `#wlHost`) are made by JS.
- `src/styles.css`, `src/energy.css`, `src/styles-2.css`: main-DOM CSS, linked in this order
  (cascade order matters). Tokens (`--bg --ink --accent`…) and rarity sprite `.rs` in
  styles.css, energy sprite `.en.sp` in energy.css. Never read or print the base64.
- `src/energy.css`: only the `.en` rules. `pkEnCss()` links it into the Binders/Decks/Showcase
  shadow panels (cssRules of a file:// stylesheet cannot be read). Keep `.en` rules there.
- `src/data/sets.js`: `window.PK_SETS`, built-in set list (`[id,name,code,official,total,
  series,date]`). `P.sets` starts as it; `sets.json` replaces it when the folder loads.
- `src/data/holder.js`: `window.PK_HOLDER`, showcase holder data URI (`SC_HOLDER` in app.js).
- `src/runtime.js`: `var PKL=(function(){…})()`: folder access, xlsx load/save, OCR, TCGdex.
  Private: `COLS`, `MAP`, `toRow`, `fromRow`, `load`, `save`, `useDir`, `folderRaw`.
  On `PKL`: `P`, `enrich`, `findFor`, `details`, `priceOf`, `artwork`, `cardById`, `setCards`,
  `setRow`, `updateDetails`, `identifyAll`; also `refreshPrices`, `fetchArt`, `updateSets`.
- `src/app.js` (~680 KB): main app. State `S`; undo `UNDO`/`TX` (`txBegin` `txEnd` `undoLast`
  `logAct`); `makeStore`; shell `SCREENS` `buildShell` `show` `showSub`; Cards list (its own
  `COLS`), Stats, Tools (`healthChecks`), card page `cp*`, editor `openEditor`/`ed*`, Binders
  `bk*`, Decks `dk*`/`dp*`, Showcase `sc*`/`scp*`, Home `v2Home`/`renderHome`, Living Pokédex
  `ldx*`, sidebar `sbRefresh`/`sbUndo`, side panels `pkColInit`/`pkEnCss`. Helpers: `esc`
  `eur` `plural` `cardKey` `locLabel` `askConfirm` `cpToast` `richSelect`.
- `src/wishlist.js`: wish list page: `WLCSS` `WLP` `WL` `WLU` `wlInit` `wlRender` `wlSide`
  `wlImport`/`wlParse` `wlAddMissing` `wlExport` `wlRefreshPrices` `wlOnShow`.
- `src/i18n.js`: `window.PKI18N` Greek layer: dictionary `D`, regex rules `R`, `tr`, `set`,
  MutationObserver, EN/ΕΛ button `#pkLang`. Missing Greek strings go in D or R.

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