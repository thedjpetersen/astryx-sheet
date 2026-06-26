# Astryx Sheet

Astryx Sheet is an open-source virtual spreadsheet editor prototype built with [Astryx](https://astryx.atmeta.com/), React, and Vite.

It demonstrates how to combine design-system primitives with high-performance spreadsheet interaction patterns: large-grid virtualization, fixed headers, editable cells, formulas, multi-cell selection, row/column resizing, and ref-driven hot paths.

## Features

- Astryx Y2K theme and component primitives for the app shell, toolbar, buttons, inputs, badges, tokens, progress, status, and inspector table
- 100,000 × 2,000 logical grid with a small virtualized render window
- Fixed column header and fixed numeric row sidebar
- Sparse `Map`-based row-height and column-width overrides
- Drag multi-cell selection with a DOM overlay updated outside the React render loop
- Row and column resizing with transient dimensions stored in refs
- Editable cells via double-click, `Enter`, typing, formula bar, and context menu
- Formula evaluation for `SUM`, `AVERAGE` / `AVG`, `MIN`, `MAX`, `COUNT`, `CONCAT`, cell references, ranges, and basic arithmetic
- Right-click context menu for edit, clear, copy, resize, and sample formula actions
- Live inspector panel showing mounted cells, sparse overrides, effect-registered geometry, and approximate FPS

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
npm run build    # production build
npm run preview  # preview the production build
```

## Project structure

```text
src/main.jsx     # full spreadsheet prototype
index.html       # Vite entry point
package.json     # scripts and dependencies
```

## Notes

This is a prototype, not a full spreadsheet engine. The goal is to demonstrate UI architecture and performance patterns with Astryx, not complete Excel parity.

## License

MIT
