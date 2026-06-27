# Architecture

Astryx Sheet is now split as a source package instead of a single demo file. The current boundary is intentionally conservative: the rendered spreadsheet remains React-based, while model logic and hot-path helpers are isolated so they can be replaced with fuller Excel-grade systems over time.

## Public Surface

- `src/index.js` is the package entry point.
- `Spreadsheet` is the embeddable component. It accepts grid sizing, initial cell data, initial row/column dimensions, initial merged ranges, initial data validation rules, initial conditional formatting rules, an optional host-provided `workbookController`, theme defaults or controlled theme values, toolbar visibility flags, cell/selection callbacks, and a workbook-level change callback for host persistence.
- `createWorkbookController` is the headless workbook runtime for applications that need command dispatch, subscriptions, history, automatic/manual calculation modes, recalculation, and snapshots without React.
- `createWorkbookPersistence` binds a controller to host storage for snapshot save/load flows without depending on browser globals.
- Command journal helpers record and replay controller commands for collaboration, audit logging, and host-side synchronization experiments.
- The formula model exports a function catalog and formula-template helper so React and host applications can discover supported functions without duplicating evaluator-specific lists.
- `src/styles.css` remains a separate stylesheet export for host applications.

## Internal Layers

- `src/app/` contains demo application wiring and Astryx theme registration.
- `src/spreadsheet/Spreadsheet.jsx` owns workbook interaction orchestration: scroll virtualization, selection, editing, resizing, formula bar state, sheet-tab commands, workbook metadata commands, and context menu actions. Workbook mutations route through the headless controller rather than direct engine command calls.
- `src/spreadsheet/components/` contains replaceable UI pieces such as cells, row fragments, sheet tabs, the toolbar, function picker, and context menu.
- `src/spreadsheet/engine/` contains the React-independent workbook core: sheets, sparse cells, a headless controller with calculation modes, persistence and journal helpers, commands, undo/redo, clipboard and fill helpers, sheet/workbook dependency graph utilities, and snapshot serialization.
- `src/spreadsheet/model/` contains spreadsheet primitives: addresses, default data, formulas, dimensions, selections, and initial-state normalization.
- `src/hooks/` contains reusable React infrastructure for requestAnimationFrame scheduling, element measurement, and controlled/uncontrolled props.

## Growth Path

The next substantial split is to keep reducing React-only workbook assumptions now that the component consumes the headless controller for workbook commands. The engine already owns sheets, active-sheet state, ranges, referenced-sheet-bounded whole-column and whole-row range references, workbook-scoped named ranges, merged ranges, cell notes, cell hyperlinks, data validation, conditional formatting, commands, undo/redo, row/column structural edits, CSV/TSV/HTML-table/SpreadsheetML import/export, sheet/workbook formula dependency graph utilities, cached recalculation helpers, controller-level automatic/manual calculation modes with selective explicit calculation, cross-sheet formula references, mixed function/arithmetic formula expressions, Excel-style expression operators, dotted function names, volatile formula functions, spreadsheet-style formula error propagation, common aggregate, conditional aggregate, lookup/reference, logical, information, statistical, math, and text formula functions, range formatting, cell styling, range sorting, filters, controller persistence snapshots, and storage bindings. It still needs incremental graph reuse, richer workbook metadata, richer formula semantics, and fuller file adapters before it can credibly approach Excel parity.

The React layer should remain a view/controller over the engine rather than the source of workbook truth. That preserves embeddability: host applications can use the headless controller without React, use the React grid with their own toolbar, or mount the complete Astryx-flavored experience.
