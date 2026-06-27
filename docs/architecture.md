# Architecture

Astryx Sheet is now split as a source package instead of a single demo file. The current boundary is intentionally conservative: the rendered spreadsheet remains React-based, while model logic and hot-path helpers are isolated so they can be replaced with fuller Excel-grade systems over time.

## Public Surface

- `src/index.js` is the package entry point.
- `Spreadsheet` is the embeddable component. It accepts grid sizing, initial cell data, initial row/column dimensions, theme defaults or controlled theme values, toolbar and inspector visibility flags, and change callbacks.
- `src/styles.css` remains a separate stylesheet export for host applications.

## Internal Layers

- `src/app/` contains demo application wiring and Astryx theme registration.
- `src/spreadsheet/Spreadsheet.jsx` owns workbook interaction orchestration: scroll virtualization, selection, editing, resizing, formula bar state, and context menu actions.
- `src/spreadsheet/components/` contains replaceable UI pieces such as cells, row fragments, the toolbar, function picker, context menu, and inspector panel.
- `src/spreadsheet/engine/` contains the React-independent workbook core: sheets, sparse cells, commands, undo/redo, clipboard helpers, and snapshot serialization.
- `src/spreadsheet/model/` contains spreadsheet primitives: addresses, default data, formulas, dimensions, selections, and initial-state normalization.
- `src/hooks/` contains reusable React infrastructure for requestAnimationFrame scheduling, element measurement, and controlled/uncontrolled props.

## Growth Path

The next substantial split is to move the React component from direct sparse maps onto the workbook engine. The engine already owns sheets, ranges, commands, undo/redo, TSV clipboard import/export, and persistence snapshots. It still needs formula dependency tracking, recalculation scheduling, rich formatting, merged cells, named ranges, filters, sorting, workbook-level metadata, and import/export adapters before it can credibly approach Excel parity.

The React layer should become a view/controller over the engine rather than the source of workbook truth. That preserves embeddability: host applications should be able to use the engine without React, use the React grid with their own toolbar, or mount the complete Astryx-flavored experience.
