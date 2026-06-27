# Astryx Sheet

Astryx Sheet is an open-source virtual spreadsheet editor prototype built with [Astryx](https://astryx.atmeta.com/), React, and Vite.

## Demo

Live demo: https://thedjpetersen.github.io/astryx-sheet/

![Astryx Sheet screenshot](public/screenshot.png)

It demonstrates how to combine design-system primitives with high-performance spreadsheet interaction patterns: large-grid virtualization, fixed headers, editable cells, formulas, multi-cell selection, row/column resizing, and ref-driven hot paths.

## Features

- Astryx themes and component primitives for the app shell, toolbar, buttons, inputs, badges, tokens, progress, status, and inspector table
- 100,000 × 2,000 logical grid with a small virtualized render window
- Fixed column header and fixed numeric row sidebar
- Sparse `Map`-based row-height and column-width overrides
- Drag multi-cell selection with a DOM overlay updated outside the React render loop
- Row and column resizing with transient dimensions stored in refs
- Undoable row and column size changes committed through the workbook engine
- Editable cells via double-click, `Enter`, typing, formula bar, and context menu
- Undo/redo command history for engine-backed cell edits and clears
- Engine-backed copy/paste for TSV selection data
- Grouped workbook commands and range-copy helpers for compound undo, metadata-preserving copies, and relative formula translation
- Formula dependency graph utilities for dirty-cell discovery and recalculation ordering
- Cached recalculation helpers for full-sheet and dirty-formula updates
- Command dispatch wrapper that derives changed cells and refreshes dependent formula caches
- React spreadsheet cell edits, clears, paste actions, and history navigation use the recalculating engine path
- Inspector metrics for formula cells, cached formula results, and formula errors
- Engine-level number, currency, percent, date, and text formatting with undoable range format commands
- React toolbar actions for applying common engine-backed number formats to the current selection
- Undoable engine range sorting with header-aware, numeric, date, and text comparison
- React toolbar actions for sorting the selected range by the active column
- CSV and TSV import/export helpers for embedding and data interchange
- Workbook-level named ranges with undo/redo and snapshot serialization
- Named ranges participate in formula dependency tracking and cached recalculation
- Multi-sheet workbook commands for adding, activating, renaming, and removing sheets with undo/redo
- React sheet tabs for switching, adding, renaming, and removing workbook sheets from the embedded UI
- Sheet filter state with criteria evaluation, visible-row selectors, undo/redo, and snapshot serialization
- React toolbar filtering that collapses hidden rows through the virtualized row metrics
- Merged range metadata with overlap validation, undo/redo, selectors, and snapshot serialization
- Data validation rules with list, number, and text predicates plus undo/redo and snapshot serialization
- Inspector metrics for merged ranges, validation rules, and named ranges
- Formula evaluation for `SUM`, `AVERAGE` / `AVG`, `MIN`, `MAX`, `COUNT`, `CONCAT`, cell references, ranges, and basic arithmetic
- Right-click context menu for edit, clear, copy, resize, and sample formula actions
- Live inspector panel showing mounted cells, sparse overrides, effect-registered geometry, and approximate FPS
- Demo options for theme selection (default: Neutral), dark mode, inspector visibility, compact row density, and high-contrast selection
- Embeddable source package exports for the React `Spreadsheet` component and a React-independent workbook engine
- `onWorkbookChange` callback for host applications that need workbook state after cell, sheet, history, format, filter, sort, clipboard, or resize commands
- Workbook engine primitives for sparse sheets, active-sheet state, cells, formulas, commands, undo/redo, TSV clipboard data, and JSON snapshots

## Why this exists

Spreadsheet UIs are a good stress test for generated React code. Many interactions — drag selection, scroll-linked headers, resize guides — should not push every pixel through React state. This repo keeps semantic state in React while using refs, `requestAnimationFrame`, and direct DOM transforms for frame-by-frame interaction feedback.

```text
React state:
- active cell
- committed selection
- visible virtual window
- persisted edits / dimensions version

Mutable refs:
- live scroll position
- live drag selection extent
- row and cell geometry maps
- sparse row height / column width maps

Direct DOM updates:
- selection overlay transform / size
- resize guide position
- fixed header transforms on scroll
```

## Getting started

```bash
npm install
npm run dev
```

Then open the Vite URL printed in your terminal.

## Useful commands

```bash
npm run dev      # start local development
npm test         # run React-independent workbook engine tests
npm run build    # production build
npm run build && rm -rf docs && cp -R dist docs  # refresh GitHub Pages demo
npm run preview  # preview the production build
```

## Project structure

```text
src/main.jsx                    # Vite demo bootstrap
src/index.js                    # package exports for embedding
src/app/                        # demo app + Astryx theme registry
src/spreadsheet/Spreadsheet.jsx # embeddable spreadsheet component
src/spreadsheet/components/     # toolbar, cells, menus, inspector, picker
src/spreadsheet/engine/         # workbook core, commands, undo/redo, clipboard
src/spreadsheet/model/          # addresses, formulas, dimensions, selections
src/hooks/                      # reusable React runtime hooks
test/                           # engine behavior tests runnable with node:test
index.html                      # Vite entry point
package.json                    # scripts, dependencies, source exports
```

See [docs/architecture.md](docs/architecture.md) for the current extension boundaries and the intended path toward a full workbook engine.

## Notes

This is still a staged implementation, not complete Excel parity. The current focus is a durable embeddable foundation: a performant virtualized React surface backed by a growing workbook engine that can eventually own Excel-scale behavior.

## License

MIT
