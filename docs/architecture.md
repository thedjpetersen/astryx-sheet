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

## Progressive Composition

Host applications can choose how much of the sheet to use:

- Complete spreadsheet: mount `Spreadsheet` with the Astryx toolbar, formula editor, workbook tabs, themes, and built-in command ribbon.
- Controlled spreadsheet: pass a `workbookController` and hide optional UI with `showToolbar`, `showStats`, `showThemeControls`, and `withTheme` when the host owns surrounding navigation or persistence.
- Headless workbook: use `createWorkbookController`, command builders, serialization, persistence, import/export adapters, recalculation, and history without mounting React.
- Focused primitives: use exported address helpers, selection utilities, default-data helpers, formula catalog/template functions, clipboard adapters, and command helpers independently when a product needs only one progressive spreadsheet behavior.

This split lets a host start with the full sheet, then peel away pieces as its product-specific UI hardens. It also supports the inverse path: start with formula evaluation or workbook commands in a non-React service, then add the virtualized grid later.

## Internal Layers

- `src/app/` contains demo application wiring and Astryx theme registration, including the default Astryx brand theme (`astryxTheme.js`, defined locally with `defineTheme`): near-black ink accents, cream body, Figtree typography, +4px radii, pill buttons, and a `--color-brand` blue reserved for the logo mark.
- `src/spreadsheet/Spreadsheet.jsx` owns workbook interaction orchestration: scroll virtualization, selection, editing, resizing, formula bar state, sheet-tab commands, workbook metadata commands, and context menu actions. Workbook mutations route through the headless controller rather than direct engine command calls.
- `src/spreadsheet/components/` contains replaceable UI pieces such as cells, row fragments, sheet tabs, the toolbar, function picker, and context menu.
- `src/spreadsheet/engine/` contains the React-independent workbook core: sheets, sparse cells, a headless controller with calculation modes, persistence and journal helpers, commands, undo/redo, clipboard and fill helpers, sheet/workbook dependency graph utilities, and snapshot serialization.
- `src/spreadsheet/model/` contains spreadsheet primitives: addresses, default data, formulas, dimensions, selections, and initial-state normalization.
- `src/hooks/` contains reusable React infrastructure for requestAnimationFrame scheduling, element measurement, and controlled/uncontrolled props.

## Performance Boundaries

The grid treats viewport work and workbook mutations as separate concerns. Visible cells render through a small virtual window, while workbook state remains sparse: cells, dimensions, filters, validations, conditional formats, and now large range-level formats/styles are stored as metadata instead of expanded records. Header-sized style and format operations use sparse `rangeStyles` and `rangeFormats` rules, and oversized sorts are rejected before the engine or calculation scheduler enumerates the full header selection.

Bulk behavior is covered by `npm run profile:bulk`, which runs the V8 CPU profiler against whole-column style, whole-column format, changed-cell tracking, and the large-sort guard.

## Growth Path

The next substantial split is to keep reducing React-only workbook assumptions now that the component consumes the headless controller for workbook commands. The engine already owns sheets, active-sheet state, ranges, referenced-sheet-bounded whole-column and whole-row range references, workbook-scoped named ranges, merged ranges, cell notes, cell hyperlinks, data validation, conditional formatting, commands, undo/redo, row/column structural edits, CSV/TSV/HTML-table/SpreadsheetML import/export, sheet/workbook formula dependency graph utilities, cached recalculation helpers, controller-level automatic/manual calculation modes with selective explicit calculation, cross-sheet formula references, mixed function/arithmetic formula expressions, Excel-style expression operators, dotted function names, volatile formula functions, spreadsheet-style formula error propagation, common aggregate, conditional aggregate, lookup/reference, logical, information, statistical, math, and text formula functions, range formatting, cell styling, range sorting, filters, controller persistence snapshots, and storage bindings. It still needs incremental graph reuse, richer workbook metadata, richer formula semantics, and fuller file adapters before it can credibly approach Excel parity.

The React layer should remain a view/controller over the engine rather than the source of workbook truth. That preserves embeddability: host applications can use the headless controller without React, use the React grid with their own toolbar, or mount the complete Astryx-flavored experience.
