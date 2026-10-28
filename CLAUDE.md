# Pokémon Card Catalog

Single-page HTML app for cataloguing my Pokémon TCG collection: `Card catalog v2.html` plus `src/`.
Runs locally in desktop Chrome/Edge, opened by double-click (file://). No server, no AI at runtime.
Background, data format, known issues and load-order constraints are in PROJECT-NOTES.md; read it only when needed.

## Data: NOT in git, never touch
collection.xlsx, artwork/, photos/, backups/, exports/, sets.json and Claude outputs/ live in this
folder and are git-ignored (so are Excel lock files ~$*.xlsx and _w.tmp). Never read their
contents, commit, delete, move, rename or modify them. The app writes collection.xlsx itself. ui/ is tracked.

## File map (load order; search by name)
All classic scripts sharing one global scope. Code that runs at load may only use names from the
same file or files above it; code inside functions that run later may use any file.
- `Card catalog v2.html`: markup only. Head: SheetJS (CDN), fonts, the three CSS links. Body: gate
  `#pkGate`, dialogs (`binderDlg` `bulkDlg` `confirmDlg` `editor`), then the scripts below.
- `src/styles.css`, `src/energy.css`, `src/styles-2.css`: main-DOM CSS in this order (cascade order matters).
  Rarity sprite `.rs` in styles.css. energy.css holds only the `.en` rules (energy sprite `.en.sp`); `pkEnCss()`
  links it into the Binders/Decks/Showcase shadow panels, so keep them there. Never print the base64 sprites.
- `src/data/sets.js`: `window.PK_SETS` (`[id,name,code,official,total,series,date]`); `P.sets` starts as it,
  `sets.json` replaces it. `src/data/holder.js`: `window.PK_HOLDER`, the showcase holder image.
- `src/runtime.js`: `var PKL=(function(){…})()`: folder, xlsx, OCR, TCGdex. Inside: `COLS` `MAP` `toRow` `fromRow`
  `load` `save` `refreshPrices` `fetchArt` `updateSets`. On `PKL`: `P` `enrich` `findFor` `details` `priceOf`
  `artwork` `cardById` `updateDetails` `identifyAll`. Also `window.pkProgress`.
- Main app, six files that must load in this order. The boot (`buildShell();render();initStore();`)
  must stay in the last one, together with Showcase and Home.
  - `src/app-cards.js`: state `S`, `makeStore`, undo `UNDO` `TX` `txBegin` `txEnd` `undoLast` `logAct`,
    `initStore`; helpers `esc` `en` `cardKey` `locLabel`; Cards list `render` and its `COLS`; value `eur`
    `unitVal`; Stats `renderOverview` `renderValue` `renderCharts`; Living Pokédex `openLivingDex` `ldxMount`.
  - `src/app-decks-shell.js`: decks `renderDecks` `openBuilder` `openDeckImport`; shell `SCREENS` `ICO` `buildShell`
    (makes the shadow hosts) `show` `showSub`; panels `pkColInit` `pkEnCss`; `renderHome` `hmReady`; Tools `healthChecks`.
  - `src/app-cardpage-binders.js`: card page `cp*` (`openCardPage` `cpRender` `cpToast` `cpRoute`);
    Binders page `bk*` (`BKCSS` `bkInit` `bkRefresh`); the Decks page CSS `DPCSS`.
  - `src/app-deckspage-editor.js`: Decks page `dp*` (`dpInit` `dpRefresh`); `v2Home`; sidebar (`sbRefresh`
    `sbUndo` `sbActive`); `renderBinder` `renderReview`; scanning; editor `F` `openEditor` `richSelect`.
  - `src/app-lists-views.js`: lists `CONDITIONS` `LISTREG` `applyLists` `refreshLists` `lstLoad`; types and
    sets `applyExt` `xDraw`; columns `sortBy`; formats `fmtOf`; views `v2PillInit` `v2Views` `selEntries`.
  - `src/app-showcase-home.js`: import/backup (`parseCSV` `bkTextImport` `bdRunImport`),
    `askConfirm` `plural`, drag (`endDrag`), multi-select, the boot, Showcase `sc*`/`scp*`
    (`renderShowcase` `scReady` `scpRefresh`), Home `hm*` (`hmInit` `hmRefresh`), `ptKpis`.
- `src/wishlist.js`: wish list page `WL*`/`wl*` (`wlInit` `wlRender` `wlSide` `wlImport` `wlOnShow`).
- `src/i18n.js`: `window.PKI18N` Greek layer: dictionary `D`, regex rules `R`, `tr`, `set`.

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
