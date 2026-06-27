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

## Current Direction

The package should grow around two public layers:

- A workbook engine that can run without React and eventually own Excel-scale state, formulas, commands, history, import/export, and collaboration hooks.
- A virtualized React grid that consumes the engine and can be embedded with or without the Astryx toolbar and themes.

The next implementation pass should move resizing fully onto the engine dispatcher and add richer paste semantics for formulas, formatting, and larger clipboard payloads.
