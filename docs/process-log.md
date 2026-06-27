# Process Log

## 2026-06-27

- Split the original single-file demo into an embeddable source package: `src/main.jsx` is now only the Vite bootstrap, while `src/index.js` exposes package APIs.
- Moved theme registration into `src/app/`, reusable React utilities into `src/hooks/`, UI pieces into `src/spreadsheet/components/`, and model helpers into `src/spreadsheet/model/`.
- Added `Spreadsheet` props for host integration: grid sizing, initial sparse cell data, initial row/column dimensions, controlled or uncontrolled theme state, toolbar and inspector visibility, theme wrapping, and cell/selection callbacks.
- Added the first React-independent workbook engine in `src/spreadsheet/engine/`.
- Covered the engine with `node:test` tests for sparse edits, formula display, undo/redo, TSV paste/copy, clearing ranges, resizing, and snapshot round trips.
- Routed spreadsheet cell edits and selection clears through the workbook command dispatcher while preserving the virtual grid's ref-driven resize path.
- Added toolbar and keyboard undo/redo actions backed by the engine history.
- Added toolbar and keyboard copy/paste actions backed by the engine TSV helpers.
- Routed row and column size commits through engine resize commands while keeping drag feedback ref-driven.
- Added grouped commands so compound actions undo/redo as one history entry.
- Added workbook-range copy commands that preserve cell metadata and translate relative formula references.
- Added formula dependency graph utilities for dirty-dependent discovery and recalculation ordering.
- Added cached recalculation helpers for full-sheet and dirty formula updates.
- Added a dispatch-with-recalculation engine API that derives changed cells from commands and refreshes dependent formula caches.
- Connected React cell edits, clears, paste actions, and history navigation to the recalculating engine path.
- Surfaced formula count, cached formula count, and formula error metrics in the inspector.
- Added engine-level display formatting and undoable range format commands.
- Moved rendered grid display through the engine display formatter and added toolbar actions for common formats.
- Added undoable, header-aware range sorting in the engine.
- Added toolbar actions for sorting the current selection by the active column through the recalculating engine path.
- Added CSV/TSV delimited text import/export helpers and routed TSV clipboard parsing through the shared adapter.
- Added workbook-level named ranges with command history and snapshot serialization.
- Integrated named ranges into formula expansion, dependency discovery, and cached recalculation.
- Added sheet filter state, criteria evaluation, visible-row selectors, command history, and snapshot serialization.
- Connected filter state to the React toolbar, virtualized row metrics, and inspector metrics.
- Added merged range metadata with overlap validation, command history, selectors, and snapshot serialization.
- Added data validation rules with command history, selectors, predicate evaluation, and snapshot serialization.
- Surfaced merged range, validation rule, and named range counts in the inspector.
- Added active-sheet commands, fixed generated sheet id collisions, and preserved the previous active sheet when undoing sheet creation.
- Added a modular sheet-tab React component for switching, adding, renaming, and removing workbook sheets.
- Added an `onWorkbookChange` callback so embedded hosts can observe workbook-level changes beyond cell edits.
- Added `initialValidations` support plus React edit, clear, paste, and cell-render validation feedback.
- Added `initialMerges` support and virtual-grid rendering for workbook merged ranges.
- Added toolbar commands for creating and clearing workbook merge and validation metadata through the engine history.
- Added a headless workbook controller for non-React embedding with subscriptions, command dispatch, recalculation, history, and snapshots.
- Added HTML table clipboard import/export helpers and made React copy/paste prefer `text/html` when the browser clipboard exposes it.
- Added headless workbook persistence helpers for saving/loading controller snapshots through host-provided storage adapters.
- Added command journal helpers for recording, pausing, subscribing to, and replaying controller commands.

## Current Direction

The package should grow around two public layers:

- A workbook engine that can run without React and eventually own Excel-scale state, formulas, commands, history, import/export, and collaboration hooks.
- A virtualized React grid that consumes the engine and can be embedded with or without the Astryx toolbar and themes.

The next implementation pass should continue expanding formula and file-format coverage, then tighten the React shell around the headless controller APIs.
