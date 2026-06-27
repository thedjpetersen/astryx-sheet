# Architecture

Astryx Sheet is now split as a source package instead of a single demo file. The current boundary is intentionally conservative: the rendered spreadsheet remains React-based, while model logic and hot-path helpers are isolated so they can be replaced with fuller Excel-grade systems over time.

## Public Surface

- `src/index.js` is the package entry point.
- `Spreadsheet` is the embeddable component. It accepts grid sizing, initial cell data, initial row/column dimensions, initial merged ranges, initial data validation rules, theme defaults or controlled theme values, toolbar and inspector visibility flags, cell/selection callbacks, and a workbook-level change callback for host persistence.
- `createWorkbookController` is the headless workbook runtime for applications that need command dispatch, subscriptions, history, recalculation, and snapshots without React.
- `createWorkbookPersistence` binds a controller to host storage for snapshot save/load flows without depending on browser globals.
- Command journal helpers record and replay controller commands for collaboration, audit logging, and host-side synchronization experiments.
- `src/styles.css` remains a separate stylesheet export for host applications.

## Internal Layers

- `src/app/` contains demo application wiring and Astryx theme registration.
- `src/spreadsheet/Spreadsheet.jsx` owns workbook interaction orchestration: scroll virtualization, selection, editing, resizing, formula bar state, sheet-tab commands, workbook metadata commands, and context menu actions.
- `src/spreadsheet/components/` contains replaceable UI pieces such as cells, row fragments, sheet tabs, the toolbar, function picker, context menu, and inspector panel.
- `src/spreadsheet/engine/` contains the React-independent workbook core: sheets, sparse cells, a headless controller, persistence and journal helpers, commands, undo/redo, clipboard helpers, dependency graph utilities, and snapshot serialization.
- `src/spreadsheet/model/` contains spreadsheet primitives: addresses, default data, formulas, dimensions, selections, and initial-state normalization.
- `src/hooks/` contains reusable React infrastructure for requestAnimationFrame scheduling, element measurement, and controlled/uncontrolled props.

## Growth Path

The next substantial split is to move the React component from direct sparse maps onto the workbook engine. The engine already owns sheets, active-sheet state, ranges, named ranges, merged ranges, data validation, commands, undo/redo, CSV/TSV/HTML-table import/export, formula dependency graph utilities, cached recalculation helpers, common formula functions, range formatting, range sorting, filters, controller persistence snapshots, and storage bindings. It still needs automatic recalculation scheduling, richer workbook metadata, and file adapters before it can credibly approach Excel parity.

The React layer should remain a view/controller over the engine rather than the source of workbook truth. That preserves embeddability: host applications can use the headless controller without React, use the React grid with their own toolbar, or mount the complete Astryx-flavored experience.
