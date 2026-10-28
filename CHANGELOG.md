\# Changelog



Versions are git tags. A version is tagged only after it has been tested in the browser.



\## v1.2 - 2026-10-28 (split stage 2)

\- Scripts moved out of "Card catalog v2.html" to src/runtime.js, src/app.js, src/wishlist.js and src/i18n.js.

\- Load order unchanged.

\- No logic changes.

\- Lossless check passed: the four files match the original script bodies byte for byte.



\## v1.1 - 2026-10-28 (split stage 1)

\- Moved the <style> block, the sets array and the showcase holder image out of

&#x20; "Card catalog v2.html" into src/ (globals PK\_SETS and PK\_HOLDER).

\- Fixed energy icons in the Binders, Decks and Showcase side panels after the CSS split.

\- Updated CLAUDE.md and PROJECT-NOTES.md to describe the new files.



\## v1.0 - 2026-10-27 build, first commit 2026-10-28

Baseline of "Card catalog v2.html" (single file, \~1.24 MB), the sidebar-shell rebuild of 2026-10-21:

\- Pages: Home, Scan, Binders, Decks, Showcase, Cards, Wish list, Stats (with Value), Tools, card page, Living Pokédex

\- Decks builder with move engine, decklist import and test deck

\- Binders: file and text import, compact view, breakdown, delete selected

\- Wish list: priorities, saved views, price refresh, mark as owned, CSV export

\- Living Pokédex with greyed placeholders and "Wish all missing"

\- xlsx: weakness/resistance columns, price\_updated and details\_updated, short Card ID

\- Greek UI toggle (EN/ΕΛ)

\- Full detail in PROJECT-NOTES.md, section 1



\## Before v1.0 - 2026-10-21 baseline

\- Original single-file app (Home, Scan, Binders, Decks, Cards, Stats, Tools)

\- Value sub-tab under Stats and Collection value on Home

\- Set completion lists the names of missing cards

\- Greek UI toggle (EN/ΕΛ)

