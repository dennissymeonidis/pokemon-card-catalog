# Changelog

Versions are git tags, newest first. A version is tagged only after it has been tested in the browser.

## v1.3 - 2026-10-28 (split stage 3)

- src/app.js split into six feature files, loaded in this order: src/app-cards.js, src/app-decks-shell.js,
  src/app-cardpage-binders.js, src/app-deckspage-editor.js, src/app-lists-views.js and src/app-showcase-home.js.
- Load order unchanged.
- No logic changes.
- Lossless check passed: the six files joined in order match the old src/app.js byte for byte.
  Load-time check passed: no load-time statement calls code in a later file.
- CLAUDE.md and PROJECT-NOTES.md updated to describe the new files.

## v1.2 - 2026-10-28 (split stage 2)

- The four inline scripts moved out of "Card catalog v2.html" to src/runtime.js, src/app.js, src/wishlist.js
  and src/i18n.js.
- Load order unchanged.
- No logic changes.
- Lossless check passed: the four files match the original script bodies byte for byte.
- CLAUDE.md and PROJECT-NOTES.md updated; this changelog got its v1.1 entry and a corrected v1.0 heading.

## v1.1 - 2026-10-28 (split stage 1)

- Moved the `<style>` block to src/styles.css, src/energy.css and src/styles-2.css, the sets array to
  src/data/sets.js (global PK_SETS) and the showcase holder image to src/data/holder.js (global PK_HOLDER).
- Fixed energy icons in the Binders, Decks and Showcase side panels after the CSS split
  (the side panels now link src/energy.css).
- Added PROJECT-NOTES.md; updated CLAUDE.md to describe the new files.

## v1.0 - 2026-10-28 (baseline)

First commit: "Card catalog v2.html" as built on 2026-10-27 (single file, ~1.24 MB), the sidebar-shell rebuild
of 2026-10-21, together with CLAUDE.md, this changelog, .gitignore and ui/showcase-holder.png/.svg.

- Pages: Home, Scan, Binders, Decks, Showcase, Cards, Wish list, Stats (with Value), Tools, card page, Living Pokédex
- Decks builder with move engine, decklist import and test deck
- Binders: file and text import, compact view, breakdown, delete selected
- Wish list: priorities, saved views, price refresh, mark as owned, CSV export
- Living Pokédex with greyed placeholders and "Wish all missing"
- xlsx: weakness/resistance columns, price_updated and details_updated, short Card ID
- Greek UI toggle (EN/ΕΛ)
- Full detail in PROJECT-NOTES.md, section 1

## Before v1.0 - 2026-10-21 (not in git)

- Original single-file app (Home, Scan, Binders, Decks, Cards, Stats, Tools)
- Value sub-tab under Stats and Collection value on Home
- Set completion lists the names of missing cards
- Greek UI toggle (EN/ΕΛ)
