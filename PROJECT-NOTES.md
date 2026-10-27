# Card catalog: project notes (2026-10-28)

Describes `Card catalog v2.html` (md5 46b1241f…, 1.24 MB, ~10,300 lines) as deployed on 2026-10-27.
Supersedes the 2026-10-21 baseline in CLAUDE.md and CHANGELOG.md, which are now out of date (not edited).
Single-file local app, opened over file:// in desktop Chrome/Edge. No server, no AI at runtime.

## 1. What changed since 2026-10-21

**What "v2" means.** On 2026-10-21 the baseline (CLAUDE.md calls it `Card catalog.html`) was rebuilt as `Card catalog v2.html`
(exact rename time unverified; first backup 20:01). v2 = a sidebar shell plus full pages for Home, Binders, Decks, Showcase,
Tools and later Wish list and Living Pokédex, each built to match a prototype in `Claude outputs/*-prototype.html`.
Most new pages are shadow-DOM hosts. The card page is its own screen with an address (`#card/<id>`).
Each change below has a backup `backups/Card catalog v2 - before <name>.html`; the names are the best record of order.

**10-21 (evening):** decks rebuilt (builder, move engine that remembers a card's original binder slot, decklist import,
test deck); editable dropdown lists (list editor, energy types, sets); clickable Home; Ace Spec and Radiant rules; basic-energy limit;
Tools overhaul (health check, utilities); folder menu moved.
**10-22:** Binders page, Decks page, Showcase page, sidebar, Home page, deck delete, "get official picture" (artwork), page width.
**10-23:** Tools page, unique counts and score cards, binder filter bar, Home hover, Greek fixes, compact Stats overview, "where else" links.
**10-24 (largest day):**
- Binders: compact view, size slider, breakdown panel, kind tab, file import (xlsx/csv, `bdRunImport`), per-page text import (`bkTextImport`), update details, delete selected cards (`bkDelete`), page-strip dimming.
- Decks: favourite star, toolbar merge, builder page, copy-decklist menu, "where else" panel, shelf arrows instead of scrollbar, copy-by-copy selection ("Copy x of n" arrows, Cards view only).
- Showcase: restyled toolbar, ring, chips, tiles, breakdown, stats.
- Card page: merged card panel, collapsible panels, location label, default card, hover effect, set logos, regulation badge, 5-tile Neighbours strip, inline evolution map (with photos), Neighbours and Other cards moved to the right.
- Rarity tiles and symbols, set symbols (TCGdex), rarity/energy menus; Tools: activity tab removed.
- Edit form: dropdowns (Rarity, Variant, Regulation mark) restyled to match the Number field; edit banners.
- xlsx: `price_updated` and `details_updated` timestamps; weakness/resistance columns (4); short Card ID (`pkId`, `pkIdChip`) in every card panel and as a Cards-list column.
- Living Pokédex as a full page (`openLivingDex`, `ldxMount`); missing species show greyed TCGdex art placeholders.
- Sidebar Undo text overflow fixed; selection bar themed to match; "Pokémon Tool" filter chip under Trainer.
- **Wish list page (10-24, ~19:59; module `WL*`/`wl*`):** table and picture views; kind chips; saved views (high priority, at or under target, price dropped, ordered); set/rarity/sort filters; select mode with themed bar; side panel (progress ring, card editor, breakdown, closest sets to complete); add via TCGdex search; text import; CSV export; mark as owned (into binder pocket, deck, showcase or unplaced) with undo; price refresh once a day on opening the page; "Add the N missing" per set.
- **10-25:** only an xlsx backup. **10-27:** hearts on greyed-out Pokédex pockets plus "Wish all missing" (`ldxWish`, `ldxWishAll`); those wish items carry `fromDex:true`.

## 2. Structure

**Split stage 1 (2026-10-28, branch `split-assets`):** the `<style>` block now lives in `src/styles.css` + `src/energy.css` + `src/styles-2.css`
(linked in that order; `energy.css` = the three `.en` rules, linked into shadow panels by `pkEnCss`), the sets array in `src/data/sets.js`
(`window.PK_SETS`) and `SC_HOLDER`'s data URI in `src/data/holder.js` (`window.PK_HOLDER`). HTML is ~0.9 MB. Line numbers below are pre-split.

Former `<style>` block (lines ~11–1726: tokens `--bg --sheet --ink --muted --line --pocket --pocket-edge --accent --accent-ink --brand --danger --ok --warn`,
light/dark/auto, all main-DOM styling) and SheetJS loaded from cdn.sheetjs.com. Four inline scripts, all classic (no modules):

1. **PKL** (~2112–2581), `var PKL=(function(){...})()`. Folder access, xlsx storage, OCR, TCGdex.
   Inside it (NOT global): `COLS`, `MAP`, `toRow`, `fromRow`, `workbook`, `load`, `save`, `schedule`, `useDir`, `folderRaw`.
   Exposed on `PKL`: `enrich, findFor, details, priceOf, artwork, cardById, setCards, setRow, tget, updateDetails, rowEnrich, identifyAll, P`.
   Also the TCGdex matchers (`match`, `sim`), `refreshPrices`, `fetchArt`, `updateSets`.
2. **Main app** (~2582–9079, ~6,500 lines). Section comments mark: storage/helpers/render (Cards list), collection value, Stats (value, analytics),
   decks engine and builder, shell (`SCREENS`, `buildShell`, `show`, `showSub`), Tools (`healthChecks`, `toolsRefresh`), card page (`cp*`),
   Binders page (`bk*`, shadow host `#bkHost`), Decks page (`dk*`, `dp*`, `#dkHost`), Showcase (`sc*`, `scp*`, `#scHost`), Home (`v2Home`, `renderHome`),
   editor (`openEditor`, `ed*`), Living Pokédex (`ldx*`), sidebar IIFE (`sbRefresh`, `sbActive`, `sbUndo`).
   Key globals: `S` (state: cards, binders, activity, decksMeta, scMeta, lists, formats, wish, screen, store, raw, cp), `UNDO`/`TX`
   (`txBegin`, `txEnd`, `undoLast`, `logAct`), `makeStore` (S.store.add/set/del/bset), `phistOf`, `unitVal`, `eur`, `esc`, `plural`, `cardKey`,
   `locLabel`, `dexOf`, `binderNums`, `binderName`, `deckNames`, `scCaseNames`, `askConfirm`, `askBulk`, `pkProgress`, `cpToast`, `richSelect`,
   `VARIANTS`, `CONDITIONS`, `ICO`. Second, unrelated `COLS` (Cards-list column defs, ~line 3062) exists in this script.
3. **Wish list** (~9080–9521): `WLCSS`, `WLP` (priority map), `WL` (view state), `WLU` (undo stack), `wlInit`, `wlRender`, `wlSide`, `wlAddPicked`,
   `wlOwnGo`, `wlImport`/`wlParse`, `wlAddMissing`, `wlExport`, `wlRefreshPrices`, `wlOnShow`; shadow host `#wlHost`.
4. **Greek layer** `PKI18N` (~9522–10332): dictionary `D`, regex rules `R`, `tr`, `set`; MutationObserver translates the DOM; EN/ΕΛ button `#pkLang`.

Screens: home, scan, binders, decks, showcase, collection (Cards), wishlist, stats, tools, card, pokedex (pokedex counts as Stats in the nav).

## 3. Data and storage

Folder (git-ignored, never delete): `collection.xlsx` (1,193 card rows on 10-27), `artwork/<setid - name>/` (28 sets), `photos/` (hashed jpgs),
`backups/` (dated xlsx plus ~150 HTML build backups, ~157 MB), `exports/` (backup json, collection report, working xlsx copies),
`sets.json` (set list cache), `ui/` (showcase holder images), `Claude outputs/` (prototypes; its `Card catalog v2.html` is an old 10-22 copy, ignore).
Other: `.git` (one commit, baseline), `CLAUDE.md`, `CHANGELOG.md` (v1.0 only), empty `_w.tmp`, `~$*.xlsx` lock files are git-ignored.

`collection.xlsx` sheets: **Cards**, **Binders** (binder, name, json), **Activity** (time, label; newest 200), **Meta** (hidden; key,json rows:
decks, formats, lists, showcases, **wishlist** — verified present on 10-27).
Cards columns (33): id, name, set, series, set_code, number, reg_mark, rarity, variant, qty, condition, location, binder, page, slot, deck, notes,
pokedex, hp, types, **weakness, weakness_amount, resistance, resistance_amount**, cardmarket_trend_eur, cardmarket_low_eur, **price_updated**,
**details_updated**, tcgdex_id, picture, added, details_json, extra_json. Bold = added since 10-21 (detail columns derive from `details_json`, which is the source of truth).
`extra_json` holds unmapped fields: `trail` (moves, last 60), `phist` (daily prices, last 180), `price`, `tcgImage`, `origin` (deck return slot), etc.
Wish items (Meta `wishlist`): id, name, set, series, setCode, number, regMark, rarity, variant, tcgdexId, tcgImage, price, phist, dex, kind, prio (high/med/low),
target, status (watching/ord), note, added, optional fromDex.
localStorage: `pk-*` view settings (theme, screen, sizes, `pk-dexph` Pokédex placeholder cache), plus fallback mirrors `pokemon-catalog-*-v1` incl. `-wish-v1`.
TCGdex: `https://api.tcgdex.net/v2/en` (`/cards/{id}`, `/cards?name=`, `/sets`); image URL + `/low.webp` or `/high.webp`.

## 4. Known issues and cautions

- Copies of one card in a row share a single `id` (qty rows), so Card ID is identical across copies (unverified how often rows hold qty>1). Splitting rows is not built.
- `collection.xlsx` open in Excel: saves are rejected or conflict; close it and retry.
- Energy cards from TCGdex sets `sve` and `mee` have no image (API gap, not a bug).
- Pokédex placeholders use one TCGdex card per species (cached); wish items from the Pokédex pick a non-promo set card (`/p$/` set ids excluded), which may not be the printing you want.
- Wish list: strings not in the Greek dictionary (unverified); mark-as-owned undo is the page's own toast, not the sidebar Undo; a Firebase backend path exists in the code with no wish hook (unverified whether used).
- Nested `<button>` breaks HTML parsing (priority pills are buttons, so wish cards are `div role=button`). Dialogs and `querySelector` inside shadow pages need the shadow root.
- Editing rules: change both `COLS` and `MAP`/`toRow`/`fromRow` together; keep functions global and unrenamed; do not touch the sprite blobs (in `src/*.css`) or the sets array (`src/data/sets.js`);
  whole-file reprints are costly (HTML is ~0.9 MB), so use targeted replaces that assert one match.
- Deploy method used so far: edit copy, test in headless Chromium against sample data, back up as `before <name>.html`, write with a NEW file name, verify md5 on disk.
  Re-using one staged filename once produced a stale copy.
- CLAUDE.md is out of date: it lists 3 scripts and the name `Card catalog.html`.

## 5. Ideas discussed, not built

- Split multi-copy rows into one row per physical card so each has its own ID (per-card button or bulk Tools option).
- Image for energy cards without API art: stand-in printing, generated tile, your own photo, or two of these.
- Neighbours strip: currently 5 tiles including the current card; the alternative is 5 neighbours excluding it.
- Delete key in a binder performing a real delete; sortable Card ID column; retreat-cost column; a History sheet in the xlsx for card trails.
- Add-card redesign (`add-card-prototype.html` exists; waits for your go-ahead); `card-catalog-improvement-suggestions.md` (waits for you to pick items).
- Splitting the single HTML file into several files (stated goal; CLAUDE.md rules require classic script tags). Stage 1 (CSS, sets, holder) done 2026-10-28.
