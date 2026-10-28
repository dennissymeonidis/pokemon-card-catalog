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
- `Card catalog v2.html`: markup only. Head: SheetJS (CDN), fonts, the three CSS links. Body: gate
  `#pkGate`, dialogs (`binderDlg` `bulkDlg` `confirmDlg` `editor`), then the scripts below.
- `src/styles.css`, `src/energy.css`, `src/styles-2.css`: main-DOM CSS in this order (cascade).
  Rarity sprite `.rs` in styles.css, energy sprite `.en.sp` in energy.css; never print base64.
  energy.css holds only the `.en` rules: `pkEnCss()` links it into the shadow panels. Keep them there.
- `src/data/sets.js`: `window.PK_SETS` (`[id,name,code,official,total,series,date]`); `P.sets`
  starts as it, `sets.json` replaces it. `src/data/holder.js`: `window.PK_HOLDER` (`SC_HOLDER`).
- `src/runtime.js`: `var PKL=(function(){…})()`: folder, xlsx load/save, OCR, TCGdex. Private
  `COLS` `MAP` `toRow` `fromRow` `load` `save`; on `PKL`: `P` `enrich` `findFor` `details`
  `priceOf` `artwork` `cardById` `updateDetails` `identifyAll` `refreshPrices` `updateSets`.
- Main app: six consecutive parts of the old app.js. Keep their order; the boot must stay in the last.
  - `src/app-cards.js`: state `S`, `makeStore`, undo `txBegin`/`txEnd`/`logAct`, `initStore`,
    helpers `esc` `en` `cardKey` `locLabel`, Cards list `render` + its `COLS`, value `eur`
    `unitVal`, Stats `renderOverview`/`renderValue`/`renderCharts`, Pokédex `ldx*`, `deckNames`.
  - `src/app-decks-shell.js`: decks engine `dk*`, `renderDecks`, `openBuilder`, `openDeckImport`;
    shell `SCREENS` `buildShell` `show` `showSub`; panels `pkColInit` `pkEnCss`; Tools `healthChecks`.
  - `src/app-cardpage-binders.js`: card page `cp*` (`openCardPage` `cpRender` `cpToast`
    `cpRoute`), Binders page `bk*` (`BKCSS` `bkInit` `bkRefresh`), also `DPCSS`.
  - `src/app-deckspage-editor.js`: Decks page `dp*`, `v2Home`, sidebar IIFE (`sbActive`),
    `renderBinder`, `renderReview`, scanning, editor `F` `openEditor` `richSelect` `setRarity`.
  - `src/app-lists-views.js`: lists `LISTREG` `applyLists` `refreshLists` `lstLoad`, types/sets
    `applyExt` `xDraw`, add/export, columns `sortBy`, formats `fmtOf`, views `v2*` `selEntries`.
  - `src/app-showcase-home.js`: import/backup (`parseCSV` `bdRunImport`), `askConfirm` `plural`,
    drag, multi-select, BOOT (`buildShell();render();initStore();`), Showcase `sc*`/`scp*`
    (`renderShowcase`, `scReady`), Home `hm*` (`hmRefresh`, `hmReady=true`), `ptKpis`.
- `src/wishlist.js`: `WLCSS` `WLP` `WL` `wlInit` `wlRender` `wlSide` `wlImport` `wlExport` `wlOnShow`.
- `src/i18n.js`: `window.PKI18N` Greek layer: dictionary `D`, regex rules `R`; missing strings go there.

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