import test from 'node:test';
import assert from 'node:assert/strict';
import {cellAddress, parseRange} from '../src/spreadsheet/model/address.js';
import {completeFormulaFunctionDraft, completeFormulaIdentifierDraft, completeFormulaSheetNameDraft, createFormulaTemplate, cycleFormulaReferenceDraft, diagnoseFormulaDraft, formulaReferenceForSelection, getFormulaEditorHint, getFormulaFunctionHelp, getFormulaEditorReferenceHighlights, getFormulaEditorSuggestions, getFormulaSignatureParts, insertFormulaReferenceDraft, isFormulaVolatile, listFormulaFunctions, replaceFormulaFunctionNameDraft, replaceFormulaIdentifierNameDraft, replaceFormulaSheetReferenceDraft, tokenizeFormulaEditorDraft} from '../src/spreadsheet/model/formulas.js';
import {
  CalculationMode,
  CommandType,
  ConditionalFormatType,
  buildWorkbookDependencyGraph,
  commandRequiresFullRecalculation,
  createCopyRangeCommand,
  createImportDelimitedCommand,
  createImportHtmlTableCommand,
  createCommandJournal,
  createFillDownCommand,
  createFillRightCommand,
  bindWorkbookCommandJournal,
  createMemoryWorkbookStorage,
  createPasteTsvCommand,
  createWorkbook,
  createWorkbookController,
  createWorkbookPersistence,
  deserializeWorkbook,
  dispatchCommand,
  dispatchCommandWithRecalculation,
  expandNamedRangesInFormula,
  extractFormulaReferences,
  getChangedCellKeysForCommand,
  getFormulaRecalculationOrder,
  getWorkbookFormulaRecalculationOrder,
  getCachedCellDisplayValue,
  getCellDisplayValue,
  getCellRawValue,
  getCellRecord,
  getConditionalFormatRulesForCell,
  getConditionalFormatStyle,
  getMergeAtCell,
  getVisibleRowsForSheet,
  getNamedRange,
  listMergedRanges,
  listNamedRanges,
  NumberFormatType,
  parseDelimited,
  parseHtmlTable,
  previewFormulaDraft,
  recalculateWorkbook,
  rangeToDelimited,
  rangeToHtmlTable,
  rangeToTsv,
  replayCommandJournal,
  redo,
  serializeWorkbook,
  spreadsheetMLToWorkbook,
  translateFormulaReferences,
  undo,
  validateCellValue,
  workbookToSpreadsheetML,
  workbookCellKey,
} from '../src/spreadsheet/engine/index.js';

test('workbook commands update sparse cells and evaluate formulas', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1', name: 'Model', rowCount: 100, colCount: 50}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: '2'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 1, value: '3'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 2, formula: 'SUM(A1:B1)'});

  assert.equal(cellAddress(0, 2), 'C1');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 2), '=SUM(A1:B1)');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 2), '5');
  assert.equal(workbook.history.length, 3);
});

test('undo and redo restore previous workbook state', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 1, col: 1, value: 'Original'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 1, col: 1, value: 'Changed'});
  workbook = dispatchCommand(workbook, {type: CommandType.RESIZE_COLUMN, col: 1, size: 180});

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Changed');
  assert.equal(workbook.sheets.get('sheet-1').colWidths.get(1), 180);
  workbook = undo(workbook);
  assert.equal(workbook.sheets.get('sheet-1').colWidths.has(1), false);
  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Original');
  workbook = redo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Changed');
  workbook = redo(workbook);
  assert.equal(workbook.sheets.get('sheet-1').colWidths.get(1), 180);
});

test('cell note commands preserve values and restore with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: 'Revenue'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_NOTE, row: 0, col: 0, note: 'Check source workbook'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_NOTE, row: 1, col: 1, note: 'Empty cell note'});

  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'Revenue');
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 0).note, 'Check source workbook');
  assert.equal(getCellRecord(workbook, 'sheet-1', 1, 1).note, 'Empty cell note');

  workbook = dispatchCommand(workbook, {type: CommandType.CLEAR_CELL_NOTE, row: 0, col: 0});
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'Revenue');
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 0).note, undefined);

  workbook = undo(workbook);
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 0).note, 'Check source workbook');
  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.equal(getCellRecord(restored, 'sheet-1', 0, 0).note, 'Check source workbook');
  assert.equal(getCellRecord(restored, 'sheet-1', 1, 1).note, 'Empty cell note');
});

test('cell link commands preserve values and restore with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: 'Astryx'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_LINK, row: 0, col: 0, href: 'https://astryx.com'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_LINK, row: 1, col: 1, href: 'mailto:finance@example.com'});

  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'Astryx');
  assert.deepEqual(getCellRecord(workbook, 'sheet-1', 0, 0).link, {href: 'https://astryx.com'});
  assert.deepEqual(getCellRecord(workbook, 'sheet-1', 1, 1).link, {href: 'mailto:finance@example.com'});

  workbook = dispatchCommand(workbook, {type: CommandType.CLEAR_CELL_LINK, row: 0, col: 0});
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'Astryx');
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 0).link, undefined);

  workbook = undo(workbook);
  assert.deepEqual(getCellRecord(workbook, 'sheet-1', 0, 0).link, {href: 'https://astryx.com'});
  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.deepEqual(getCellRecord(restored, 'sheet-1', 0, 0).link, {href: 'https://astryx.com'});
  assert.deepEqual(getCellRecord(restored, 'sheet-1', 1, 1).link, {href: 'mailto:finance@example.com'});
});

test('workbook controller dispatches commands and notifies subscribers', () => {
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  const events = [];
  const unsubscribe = controller.subscribe((event) => events.push(event));

  const result = controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 0, value: '42'});

  assert.equal(getCellRawValue(controller.getWorkbook(), 'sheet-1', 0, 0), '42');
  assert.equal(result.workbook, controller.getWorkbook());
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'command');
  assert.equal(events[0].command.type, CommandType.SET_CELL);
  assert.equal(events[0].activeSheetId, 'sheet-1');

  controller.dispatch({type: CommandType.ADD_SHEET, sheet: {name: 'Generated'}});
  assert.equal(events.length, 2);
  assert.equal(events[1].command.type, CommandType.ADD_SHEET);
  assert.equal(typeof events[1].command.sheet.id, 'string');
  assert.equal(controller.getActiveSheet().name, 'Generated');

  unsubscribe();
  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 1, value: 'ignored event'});
  assert.equal(events.length, 2);
});

test('workbook controller preserves host event detail around command and history events', () => {
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  const events = [];
  controller.subscribe((event) => events.push(event));

  controller.dispatch(
    {type: CommandType.SET_CELL, row: 0, col: 0, value: '42'},
    {getDefaultCellValue: () => '', event: {source: 'cell', surface: 'react-grid'}},
  );
  controller.undo({getDefaultCellValue: () => '', event: {surface: 'toolbar'}});

  assert.equal(events[0].source, 'cell');
  assert.equal(events[0].surface, 'react-grid');
  assert.equal(events[0].command.type, CommandType.SET_CELL);
  assert.equal(events[1].source, 'history');
  assert.equal(events[1].action, 'undo');
  assert.equal(events[1].surface, 'toolbar');
});

test('workbook controller handles history, snapshots, and formula recalculation', () => {
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  const events = [];
  controller.subscribe((event) => events.push(event), {emitCurrent: true});

  controller.dispatch({
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, formula: '=A1+1'},
    ],
  });
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '3');

  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 0, value: '4'});
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '5');

  controller.undo();
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '3');
  controller.redo();
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '5');

  const snapshot = controller.serialize();
  const restoredController = createWorkbookController(snapshot);
  assert.equal(getCachedCellDisplayValue(restoredController.getActiveSheet(), 0, 1), '5');
  assert.equal(events[0].source, 'subscribe');
  assert.equal(events.some((event) => event.source === 'history' && event.action === 'undo'), true);
});

test('workbook controller supports manual calculation and explicit recalculation', () => {
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]}, {calculation: {mode: CalculationMode.MANUAL}});
  const events = [];
  controller.subscribe((event) => events.push(event), {emitCurrent: true});

  assert.equal(controller.getCalculationMode(), CalculationMode.MANUAL);
  assert.equal(controller.getWorkbook().metadata.calculationMode, CalculationMode.MANUAL);
  assert.equal(events[0].calculationMode, CalculationMode.MANUAL);

  const initial = controller.dispatch({
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, formula: '=A1+1'},
    ],
  });

  assert.deepEqual(initial.recalculated, []);
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), undefined);
  assert.equal(controller.getCalculationState().needsRecalculation, true);
  assert.deepEqual(controller.getCalculationState().dirty.sheets['sheet-1'], ['0:0', '0:1']);

  const calculated = controller.calculate({event: {surface: 'toolbar'}});
  assert.deepEqual(calculated.recalculated, ['0:1']);
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '3');
  assert.equal(controller.getCalculationState().needsRecalculation, false);

  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 0, value: '4'});
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '3');

  const automatic = controller.setCalculationMode(CalculationMode.AUTOMATIC);
  assert.equal(automatic.calculationMode, CalculationMode.AUTOMATIC);
  assert.equal(getCachedCellDisplayValue(controller.getActiveSheet(), 0, 1), '5');
  assert.equal(controller.serialize().metadata.calculationMode, CalculationMode.AUTOMATIC);
  assert.equal(events.some((event) => event.source === 'calculation' && event.action === 'calculate' && event.surface === 'toolbar'), true);
  assert.equal(events.some((event) => event.source === 'calculation' && event.action === 'set-mode'), true);
});

test('manual workbook calculation uses tracked dirty cells across sheets', () => {
  const controller = createWorkbookController({sheets: [
    {id: 'inputs', name: 'Inputs'},
    {id: 'model', name: 'Model'},
    {id: 'fy-2026', name: 'FY 2026'},
  ], activeSheetId: 'model'}, {calculation: {mode: CalculationMode.MANUAL}});

  controller.dispatch({
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
    ],
  });
  controller.dispatch({type: CommandType.SET_CELL, sheetId: 'fy-2026', row: 0, col: 0, value: '21'});
  controller.dispatch({
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=Inputs!A1+Inputs!A2'},
      {row: 1, col: 0, formula: '=A1+1'},
      {row: 2, col: 0, formula: "='FY 2026'!A1*2"},
    ],
  });

  let result = controller.calculate();
  assert.deepEqual(result.recalculatedBySheet.model, ['0:0', '2:0', '1:0']);
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 1, 0), '6');
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 2, 0), '42');

  controller.dispatch({type: CommandType.SET_CELL, sheetId: 'inputs', row: 0, col: 0, value: '10'});
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 1, 0), '6');

  result = controller.calculate();
  assert.deepEqual(result.recalculatedBySheet.model, ['0:0', '1:0']);
  assert.deepEqual(result.recalculatedBySheet['fy-2026'], []);
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 0, 0), '13');
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 1, 0), '14');
  assert.equal(getCachedCellDisplayValue(controller.getWorkbook().sheets.get('model'), 2, 0), '42');
});

test('workbook persistence saves controller snapshots to storage and loads them', async () => {
  const storage = createMemoryWorkbookStorage();
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  const persistence = createWorkbookPersistence(controller, {key: 'embedded-book', storage});

  controller.dispatch({type: CommandType.SET_CELL, row: 4, col: 2, value: 'Persisted'});
  await persistence.flush();

  const rawSnapshot = storage.getItem('embedded-book');
  assert.equal(typeof rawSnapshot, 'string');
  assert.equal(JSON.parse(rawSnapshot).activeSheetId, 'sheet-1');

  const restoredController = createWorkbookController();
  const restoredPersistence = createWorkbookPersistence(restoredController, {key: 'embedded-book', storage});
  const loadedSnapshot = await restoredPersistence.load();

  assert.equal(loadedSnapshot.activeSheetId, 'sheet-1');
  assert.equal(getCellRawValue(restoredController.getWorkbook(), 'sheet-1', 4, 2), 'Persisted');

  restoredPersistence.destroy();
  restoredController.dispatch({type: CommandType.SET_CELL, row: 4, col: 2, value: 'Unsaved'});
  await restoredPersistence.flush();

  assert.equal(getCellRawValue(deserializeWorkbook(JSON.parse(storage.getItem('embedded-book'))), 'sheet-1', 4, 2), 'Persisted');
});

test('command journals capture controller commands and replay them', () => {
  const controller = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  const journal = createCommandJournal();
  const binding = bindWorkbookCommandJournal(controller, {journal, source: 'client-a'});
  const observed = [];
  const unsubscribe = journal.subscribe((entry) => observed.push(entry));

  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 0, value: 'A'});
  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 1, value: 'B'});

  assert.equal(journal.entries().length, 2);
  assert.equal(observed.length, 2);
  assert.equal(journal.entries()[0].source, 'client-a');
  assert.equal(journal.entries()[0].command.type, CommandType.SET_CELL);

  binding.pause();
  controller.dispatch({type: CommandType.SET_CELL, row: 0, col: 2, value: 'Not replayed'});
  assert.equal(journal.entries().length, 2);
  binding.resume();

  const replayController = createWorkbookController({sheets: [{id: 'sheet-1'}]});
  replayCommandJournal(replayController, journal);

  assert.equal(getCellRawValue(replayController.getWorkbook(), 'sheet-1', 0, 0), 'A');
  assert.equal(getCellRawValue(replayController.getWorkbook(), 'sheet-1', 0, 1), 'B');
  assert.equal(getCellRawValue(replayController.getWorkbook(), 'sheet-1', 0, 2), '');

  unsubscribe();
  binding.destroy();
});

test('batch commands undo and redo as one history entry', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.BATCH,
    label: 'Batch edit',
    commands: [
      {type: CommandType.SET_CELL, row: 0, col: 0, value: 'A'},
      {type: CommandType.SET_CELL, row: 0, col: 1, value: 'B'},
    ],
  });

  assert.equal(workbook.history.length, 1);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'A');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 1), 'B');

  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), '');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 1), '');

  workbook = redo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0), 'A');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 1), 'B');
});

test('sheet commands create unique ids and restore active sheet history', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'sheet-1', name: 'Inputs'},
    {id: 'sheet-2', name: 'Model'},
  ], activeSheetId: 'sheet-2'});

  workbook = dispatchCommand(workbook, {type: CommandType.ADD_SHEET, sheet: {name: 'Forecast'}});
  const addedSheetId = workbook.activeSheetId;
  assert.notEqual(addedSheetId, 'sheet-1');
  assert.notEqual(addedSheetId, 'sheet-2');
  assert.equal(workbook.sheets.get(addedSheetId).name, 'Forecast');

  workbook = undo(workbook);
  assert.equal(workbook.activeSheetId, 'sheet-2');
  assert.equal(workbook.sheets.has(addedSheetId), false);

  workbook = redo(workbook);
  assert.equal(workbook.activeSheetId, addedSheetId);

  workbook = dispatchCommand(workbook, {type: CommandType.SET_ACTIVE_SHEET, sheetId: 'sheet-1'});
  assert.equal(workbook.activeSheetId, 'sheet-1');
  workbook = undo(workbook);
  assert.equal(workbook.activeSheetId, addedSheetId);
  workbook = redo(workbook);
  assert.equal(workbook.activeSheetId, 'sheet-1');

  workbook = dispatchCommand(workbook, {type: CommandType.RENAME_SHEET, sheetId: addedSheetId, name: 'Plan'});
  assert.equal(workbook.sheets.get(addedSheetId).name, 'Plan');

  workbook = dispatchCommand(workbook, {type: CommandType.SET_ACTIVE_SHEET, sheetId: addedSheetId});
  workbook = dispatchCommand(workbook, {type: CommandType.REMOVE_SHEET});
  assert.equal(workbook.activeSheetId, 'sheet-1');
  workbook = undo(workbook);
  assert.equal(workbook.activeSheetId, addedSheetId);
  assert.equal(workbook.sheets.get(addedSheetId).name, 'Plan');

  assert.throws(() => dispatchCommand(workbook, {type: CommandType.SET_ACTIVE_SHEET, sheetId: 'missing'}), /Unknown sheet/);
  assert.throws(() => dispatchCommand(workbook, {type: CommandType.ADD_SHEET, sheet: {id: 'sheet-1'}}), /already exists/);
});

test('range clear and TSV paste are command-compatible', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, createPasteTsvCommand('Name\tScore\nAda\t42', {row: 0, col: 0}));

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), 'Ada');
  assert.equal(rangeToTsv(workbook, {r1: 0, c1: 0, r2: 1, c2: 1}), 'Name\tScore\nAda\t42');

  workbook = dispatchCommand(workbook, {type: CommandType.CLEAR_RANGE, range: {r1: 0, c1: 0, r2: 1, c2: 1}});
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), '');
  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), 'Ada');
});

test('delimited import and export handle csv quoting', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, createImportDelimitedCommand('"Name","Note"\n"Ada","quote ""inside"""\n"Grace","line, comma"', {row: 0, col: 0}));

  assert.deepEqual(parseDelimited('"A,B",C'), [['A,B', 'C']]);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'quote "inside"');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 2, 1), 'line, comma');
  assert.equal(rangeToDelimited(workbook, {r1: 0, c1: 0, r2: 2, c2: 1}), 'Name,Note\nAda,"quote ""inside"""\nGrace,"line, comma"');
});

test('html table import and export support clipboard-shaped tables', () => {
  const html = '<table><tbody><tr><th>Name</th><th>Score</th></tr><tr><td rowspan="2">Ada&nbsp;L.</td><td>42</td></tr><tr><td>43 &amp; rising</td></tr></tbody></table>';
  assert.deepEqual(parseHtmlTable(html), [
    ['Name', 'Score'],
    ['Ada L.', '42'],
    ['', '43 & rising'],
  ]);

  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, createImportHtmlTableCommand(html, {row: 1, col: 1}));

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Name');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 2, 1), 'Ada L.');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 3, 2), '43 & rising');
  assert.equal(rangeToHtmlTable(workbook, {r1: 1, c1: 1, r2: 1, c2: 2}), '<table><tbody><tr><td>Name</td><td>Score</td></tr></tbody></table>');
});

test('copy range command preserves metadata and translates relative formulas', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, cell: {value: '10', style: {fontWeight: 'bold'}}},
      {row: 0, col: 1, cell: {formula: '=A1*2', note: 'doubled'}},
    ],
  });

  workbook = dispatchCommand(workbook, createCopyRangeCommand(workbook, {r1: 0, c1: 0, r2: 0, c2: 1}, {row: 1, col: 1}));

  assert.deepEqual(workbook.sheets.get('sheet-1').cells.get('1:1').style, {fontWeight: 'bold'});
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 2), '=B2*2');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 1, 2), '20');
  assert.equal(workbook.sheets.get('sheet-1').cells.get('1:2').note, 'doubled');
});

test('fill commands copy source edges and translate formulas through the engine', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, cell: {value: '10', style: {fontWeight: 'bold'}}},
      {row: 0, col: 1, formula: '=A1*2'},
      {row: 4, col: 0, value: '5'},
      {row: 5, col: 0, formula: '=A5+1'},
    ],
  });

  workbook = dispatchCommandWithRecalculation(workbook, createFillDownCommand(workbook, {r1: 0, c1: 0, r2: 2, c2: 1})).workbook;

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), '10');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), '=A2*2');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 1, 1), '20');
  assert.deepEqual(workbook.sheets.get('sheet-1').cells.get('1:0').style, {fontWeight: 'bold'});

  workbook = dispatchCommandWithRecalculation(workbook, createFillRightCommand(workbook, {r1: 4, c1: 0, r2: 5, c2: 2})).workbook;

  assert.equal(getCellRawValue(workbook, 'sheet-1', 4, 1), '5');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 5, 1), '=B5+1');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 5, 2), '=C5+1');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 5, 2), '6');

  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 5, 1), '');
});

test('formula translation handles whole-row and whole-column references', () => {
  assert.equal(
    translateFormulaReferences('=SUM(A:A)+SUM($A:B)+SUM(1:1)+SUM($1:2)+Inputs!A1+"A:A"&Revenue_2026', 1, 2),
    '=SUM(C:C)+SUM($A:D)+SUM(2:2)+SUM($1:3)+Inputs!C2+"A:A"&Revenue_2026',
  );
  assert.equal(translateFormulaReferences('=SUM(A:A)', 0, -1), '=SUM(#REF!)');
  assert.equal(translateFormulaReferences('=SUM(1:1)', -1, 0), '=SUM(#REF!)');
});

test('formula dependency graph finds dirty dependents in recalculation order', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '1'},
      {row: 0, col: 1, formula: '=A1+1'},
      {row: 0, col: 2, formula: '=SUM(A1:B1)'},
      {row: 1, col: 0, formula: '=C1*2'},
    ],
  });

  assert.deepEqual(extractFormulaReferences('=SUM($A$1:B2)').map((ref) => ref.key), ['0:0', '0:1', '1:0', '1:1']);

  const {dirty, order} = getFormulaRecalculationOrder(workbook.sheets.get('sheet-1'), new Set(['0:0']));

  assert.deepEqual([...dirty], ['0:1', '0:2', '1:0']);
  assert.deepEqual(order, ['0:1', '0:2', '1:0']);
});

test('formula dependency extraction ignores string literal references', () => {
  assert.deepEqual(
    extractFormulaReferences('="A1"&SUM(B1:B2)&"Inputs!C3"', {rowCount: 5, colCount: 5}).map((ref) => ref.key),
    ['0:1', '1:1'],
  );

  let workbook = createWorkbook({sheets: [{id: 'sheet-1', rowCount: 5, colCount: 5}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '100'},
      {row: 0, col: 1, value: '2'},
      {row: 1, col: 1, value: '3'},
      {row: 0, col: 2, formula: '="A1"&SUM(B1:B2)'},
    ],
  });

  assert.deepEqual(getFormulaRecalculationOrder(workbook.sheets.get('sheet-1'), new Set(['0:0'])).order, []);
  assert.deepEqual(getFormulaRecalculationOrder(workbook.sheets.get('sheet-1'), new Set(['0:1'])).order, ['0:2']);
});

test('formula ranges support whole columns and whole rows with dependency tracking', () => {
  assert.deepEqual(parseRange('A:C', {rowCount: 5}), {r1: 0, r2: 4, c1: 0, c2: 2});
  assert.deepEqual(parseRange('1:2', {colCount: 4}), {r1: 0, r2: 1, c1: 0, c2: 3});
  assert.deepEqual(extractFormulaReferences('=SUM(A:A)', {rowCount: 3}).map((ref) => ref.key), ['0:0', '1:0', '2:0']);
  assert.deepEqual(extractFormulaReferences('=SUM(1:1)', {colCount: 3}).map((ref) => ref.key), ['0:0', '0:1', '0:2']);

  let workbook = createWorkbook({sheets: [{id: 'sheet-1', rowCount: 8, colCount: 6}]});
  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 0, col: 1, value: '4'},
      {row: 2, col: 2, formula: '=SUM(A:A)'},
      {row: 2, col: 3, formula: '=SUM(1:1)'},
      {row: 3, col: 2, formula: '=COUNTIF(A:A,">2")'},
    ],
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 2), '5');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 3), '6');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 3, 2), '1');

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 1, col: 0, value: '10'}, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 2), '12');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 3), '6');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 3, 2), '1');
  assert.deepEqual(result.recalculatedBySheet['sheet-1'], ['2:2', '3:2']);

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 0, col: 1, value: '8'}, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 2), '12');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 3), '10');
  assert.deepEqual(result.recalculatedBySheet['sheet-1'], ['2:3']);
});

test('workbook dependency graph schedules cross-sheet dirty formulas selectively', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs'},
    {id: 'model', name: 'Model'},
    {id: 'fy-2026', name: 'FY 2026'},
    {id: 'bobs-plan', name: "Bob's Plan"},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'inputs',
    row: 0,
    col: 0,
    value: '2',
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=Inputs!A1+1'},
      {row: 1, col: 0, formula: '=A1+1'},
      {row: 2, col: 0, formula: "='FY 2026'!A1"},
    ],
  });

  const graph = buildWorkbookDependencyGraph(workbook);
  const dirty = getWorkbookFormulaRecalculationOrder(workbook, new Map([['inputs', new Set(['0:0'])]]));

  assert.deepEqual(
    [...graph.dependentsByCell.get(workbookCellKey('inputs', 0, 0))],
    [workbookCellKey('model', 0, 0)],
  );
  assert.deepEqual(dirty.order, [workbookCellKey('model', 0, 0), workbookCellKey('model', 1, 0)]);
});

test('workbook dependency graph tracks cross-sheet whole-column references', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 6, colCount: 4},
    {id: 'model', name: 'Model', rowCount: 6, colCount: 4},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'model',
    row: 0,
    col: 0,
    formula: '=SUM(Inputs!A:A)',
  });

  const graph = buildWorkbookDependencyGraph(workbook);
  const dirty = getWorkbookFormulaRecalculationOrder(workbook, new Map([['inputs', new Set(['3:0'])]]));

  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('inputs', 3, 0))], [workbookCellKey('model', 0, 0)]);
  assert.deepEqual(dirty.order, [workbookCellKey('model', 0, 0)]);
});

test('cross-sheet whole-row and whole-column ranges use referenced sheet dimensions', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 6, colCount: 5},
    {id: 'model', name: 'Model', rowCount: 3, colCount: 2},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 4, col: 0, value: '10'},
      {row: 0, col: 3, value: '4'},
    ],
  });

  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=SUM(Inputs!A:A)'},
      {row: 1, col: 0, formula: '=SUM(Inputs!1:1)'},
    ],
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '12');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '6');

  const graph = buildWorkbookDependencyGraph(workbook);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('inputs', 4, 0))], [workbookCellKey('model', 0, 0)]);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('inputs', 0, 3))], [workbookCellKey('model', 1, 0)]);

  result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'inputs',
    row: 4,
    col: 0,
    value: '20',
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.deepEqual(result.recalculatedBySheet.model, ['0:0']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '22');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '6');

  result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'inputs',
    row: 0,
    col: 3,
    value: '8',
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.deepEqual(result.recalculatedBySheet.model, ['1:0']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '22');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '10');
});

test('volatile formulas recalculate with dependents on dirty workbook calculation', () => {
  const randomValues = [0.1, 0.8, 0.2, 0.4];
  let workbook = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, formula: '=RAND()'},
      {row: 0, col: 1, formula: '=A1+1'},
      {row: 0, col: 2, formula: '=RANDBETWEEN(10,20)'},
      {row: 0, col: 3, value: 'seed'},
    ],
  }, {formulaOptions: {random: () => randomValues.shift()}}).workbook;
  let sheet = workbook.sheets.get('sheet-1');

  assert.equal(sheet.cells.get('0:0').computedValue, 0.1);
  assert.equal(sheet.cells.get('0:1').computedValue, 1.1);
  assert.equal(sheet.cells.get('0:2').computedValue, 18);
  assert.equal(isFormulaVolatile('=RAND()'), true);
  assert.equal(isFormulaVolatile('=RANDARRAY()'), true);
  assert.equal(isFormulaVolatile('="RAND()"'), false);
  assert.equal(isFormulaVolatile('=OFFSET(A1,1,0)'), true);
  assert.equal(isFormulaVolatile('="OFFSET(A1,1,0)"'), false);

  const result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    row: 0,
    col: 3,
    value: 'changed',
  }, {formulaOptions: {random: () => randomValues.shift()}});
  workbook = result.workbook;
  sheet = workbook.sheets.get('sheet-1');

  assert.deepEqual(result.recalculatedBySheet['sheet-1'], ['0:0', '0:1', '0:2']);
  assert.equal(sheet.cells.get('0:0').computedValue, 0.2);
  assert.equal(sheet.cells.get('0:1').computedValue, 1.2);
  assert.equal(sheet.cells.get('0:2').computedValue, 14);
});

test('RANDARRAY spills and recalculates dependents through the headless engine', () => {
  const randomValues = [0, 0.24, 0.5, 0.99, 0.75, 0.49, 0.25, 0.01];
  let workbook = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, formula: '=RANDARRAY(2,2,1,4,TRUE)'},
      {row: 0, col: 2, formula: '=SUM(A1#)'},
      {row: 0, col: 3, value: 'seed'},
    ],
  }, {formulaOptions: {random: () => randomValues.shift()}}).workbook;
  let sheet = workbook.sheets.get('sheet-1');

  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 0), '1');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 1), '1');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 1, 0), '3');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 1, 1), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), '9');

  const result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    row: 0,
    col: 3,
    value: 'changed',
  }, {formulaOptions: {random: () => randomValues.shift()}});
  workbook = result.workbook;
  sheet = workbook.sheets.get('sheet-1');

  assert.deepEqual(result.recalculatedBySheet['sheet-1'], ['0:0', '0:2']);
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 0), '4');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 1), '2');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 1, 0), '2');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 1, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), '9');
});

test('recalculation caches full and dirty formula results', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, formula: '=A1+1'},
      {row: 0, col: 2, formula: '=B1+1'},
    ],
  });

  let result = recalculateWorkbook(workbook);
  workbook = result.workbook;
  assert.deepEqual(result.recalculated, ['0:1', '0:2']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 2), '4');

  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: '10'});
  result = recalculateWorkbook(workbook, {changedKeys: new Set(['0:0'])});
  workbook = result.workbook;

  assert.deepEqual(result.recalculated, ['0:1', '0:2']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '11');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 2), '12');
});

test('dispatch with recalculation updates dependent formula caches from command changes', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, formula: '=A1+1'},
      {row: 0, col: 2, formula: '=B1+1'},
    ],
  });
  workbook = result.workbook;

  assert.deepEqual(result.recalculated, ['0:1', '0:2']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 2), '4');

  assert.deepEqual([...getChangedCellKeysForCommand({type: CommandType.SET_CELL, row: 0, col: 0, value: '9'})], ['0:0']);

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: '9'});
  workbook = result.workbook;

  assert.deepEqual([...result.changedKeys], ['0:0']);
  assert.deepEqual(result.recalculated, ['0:1', '0:2']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 2), '11');
  assert.equal(workbook.history.length, 2);
});

test('LET range variables evaluate and recalculate through dependency graph', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '1'},
      {row: 1, col: 0, value: '2'},
      {row: 2, col: 0, value: '3'},
      {row: 3, col: 0, value: '4'},
      {row: 0, col: 1, formula: '=LET(r,A1:A4,SUM(r))'},
      {row: 1, col: 1, formula: '=LET(r,A1:A4,ROWS(r)+INDEX(r,2))'},
      {row: 2, col: 1, formula: '=LET(r,A1:A4,total,SUM(r),total/ROWS(r))'},
    ],
  });
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '10');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 1, 1), '6');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 1), '2.5');

  const graph = buildWorkbookDependencyGraph(workbook);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('sheet-1', 2, 0))], [
    workbookCellKey('sheet-1', 0, 1),
    workbookCellKey('sheet-1', 1, 1),
    workbookCellKey('sheet-1', 2, 1),
  ]);

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 2, col: 0, value: '30'});
  workbook = result.workbook;

  assert.deepEqual(result.recalculated, ['0:1', '1:1', '2:1']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '37');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 1, 1), '6');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 2, 1), '9.25');
});

test('dynamic array formulas can feed scalar formulas through the headless engine', () => {
  let result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: 'A'},
      {row: 1, col: 0, value: 'B'},
      {row: 2, col: 0, value: 'B'},
      {row: 3, col: 0, value: 'C'},
      {row: 4, col: 0, value: 'A'},
      {row: 0, col: 1, value: '10'},
      {row: 1, col: 1, value: '30'},
      {row: 2, col: 1, value: '50'},
      {row: 3, col: 1, value: '20'},
      {row: 4, col: 1, value: '40'},
      {row: 0, col: 2, formula: '=SUM(FILTER(B1:B5,A1:A5="B"))'},
      {row: 1, col: 2, formula: '=ROWS(UNIQUE(A1:A5))'},
      {row: 2, col: 2, formula: '=INDEX(SORT(A1:B5,2,-1),1,1)'},
      {row: 3, col: 2, formula: '=INDEX(TRANSPOSE(A1:B2),2,1)'},
      {row: 4, col: 2, formula: '=SUM(SEQUENCE(3,2,1,1))'},
      {row: 5, col: 2, formula: '=LET(f,FILTER(B1:B5,A1:A5="B"),AVERAGE(f))'},
      {row: 6, col: 2, formula: '=FILTER(B1:B5,A1:A5="B")'},
      {row: 7, col: 2, formula: '=FILTER(B1:B5,A1:A5="Z","empty")'},
      {row: 8, col: 2, formula: '=SEQUENCE(2,2)'},
      {row: 8, col: 4, formula: '=D10'},
      {row: 8, col: 5, formula: '=SUM(C9#)'},
      {row: 9, col: 5, formula: '=INDEX(C9#,2,2)'},
      {row: 11, col: 2, formula: '=SEQUENCE(1,2)'},
      {row: 11, col: 3, value: 'block'},
      {row: 11, col: 4, formula: '=SUM(C12#)'},
      {row: 13, col: 0, value: '1'},
      {row: 14, col: 0, value: '2'},
      {row: 13, col: 1, formula: '=FILTER(A14:A15,A14:A15>0)'},
      {row: 13, col: 2, formula: '=B15'},
      {row: 15, col: 2, formula: '=SORT(A1:B5,2,0)'},
      {row: 16, col: 2, formula: '=SORT(A1:B5,3,1)'},
      {row: 17, col: 2, formula: '=SEQUENCE(0,1)'},
      {row: 19, col: 2, formula: '=HSTACK(A1:A2,B1:B2)'},
      {row: 22, col: 2, formula: '=VSTACK(A1:B1,A2:B2)'},
      {row: 25, col: 2, formula: '=TAKE(A1:B5,-2,1)'},
      {row: 28, col: 2, formula: '=DROP(A1:B5,1,1)'},
      {row: 33, col: 2, formula: '=CHOOSECOLS(A1:B5,2,1)'},
      {row: 39, col: 2, formula: '=CHOOSEROWS(A1:B5,2,-1)'},
      {row: 42, col: 2, formula: '=CHOOSECOLS(A1:B5,0)'},
      {row: 43, col: 2, formula: '=DROP(A1:B5,5)'},
      {row: 44, col: 2, formula: '=SUM(HSTACK(B1:B2,B3:B4))'},
      {row: 46, col: 2, formula: '=HSTACK(A1:A3,B1:B2)'},
      {row: 50, col: 2, formula: '=VSTACK(A1:B1,A2:A2)'},
      {row: 54, col: 2, formula: '=TOCOL(A1:B2)'},
      {row: 59, col: 2, formula: '=TOROW(A1:B2,,TRUE)'},
      {row: 61, col: 2, formula: '=WRAPROWS(A1:A5,2,"pad")'},
      {row: 65, col: 2, formula: '=WRAPCOLS(B1:B5,2,0)'},
      {row: 68, col: 2, formula: '=EXPAND(A1:B2,3,4,"")'},
      {row: 72, col: 2, formula: '=EXPAND(A1:B2,1,2)'},
      {row: 73, col: 2, formula: '=WRAPROWS(A1:B2,2)'},
      {row: 74, col: 2, formula: '=TOCOL(HSTACK(A1:A3,B1:B2),2)'},
      {row: 80, col: 2, formula: '=TOCOL(A1:B2,9)'},
      {row: 81, col: 2, formula: '=SUM(TOROW(B1:B5))'},
      {row: 83, col: 2, formula: '=TEXTSPLIT("Q1,Q2|10,20",",","|")'},
      {row: 86, col: 2, formula: '=SUM(TEXTSPLIT("1,2,3",","))'},
      {row: 87, col: 2, formula: '=TEXTSPLIT("a--b","-",,TRUE)'},
      {row: 89, col: 2, formula: '=TEXTSPLIT("Ada|Lovelace","|","",FALSE,1)'},
      {row: 91, col: 2, formula: '=TEXTSPLIT("a,b",,,FALSE)'},
      {row: 93, col: 2, formula: '=SORTBY(A1:B5,B1:B5,-1,A1:A5,1)'},
      {row: 99, col: 2, formula: '=SORTBY(A1:B5,A1:A4,1)'},
      {row: 100, col: 2, formula: '=INDEX(SORTBY(A1:B5,B1:B5,-1),1,2)'},
    ],
  });
  let workbook = result.workbook;
  let sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), '80');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 2), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 2), 'B');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 2), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 2), '21');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 2), '40');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 2), '30');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 2), 'empty');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 8, 2), '1');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 8, 3), '2');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 9, 2), '3');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 9, 3), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 3), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 4), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 5), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 5), '4');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 11, 2), '#SPILL!');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 11, 3), 'block');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 4), '#SPILL!');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 2), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 2), '#VALUE!');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 19, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 19, 3), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 20, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 20, 3), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 22, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 22, 3), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 23, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 23, 3), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 25, 2), 'C');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 26, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 28, 2), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 31, 2), '40');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 33, 2), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 33, 3), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 37, 2), '40');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 37, 3), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 39, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 39, 3), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 40, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 40, 3), '40');
  assert.equal(getCachedCellDisplayValue(sheet, 42, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 43, 2), '#CALC!');
  assert.equal(getCachedCellDisplayValue(sheet, 44, 2), '110');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 48, 3), '#N/A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 51, 3), '#N/A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 54, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 55, 2), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 56, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 57, 2), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 59, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 59, 3), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 59, 4), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 59, 5), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 61, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 61, 3), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 63, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 63, 3), 'pad');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 65, 2), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 65, 3), '50');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 65, 4), '40');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 66, 2), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 66, 3), '20');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 66, 4), '0');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 68, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 68, 3), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 68, 4), '');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 70, 5), '');
  assert.equal(getCachedCellDisplayValue(sheet, 72, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 73, 2), '#VALUE!');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 74, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 75, 2), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 76, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 77, 2), '30');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 78, 2), 'B');
  assert.equal(getCachedCellDisplayValue(sheet, 80, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 81, 2), '150');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 83, 2), 'Q1');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 83, 3), 'Q2');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 84, 2), '10');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 84, 3), '20');
  assert.equal(getCachedCellDisplayValue(sheet, 86, 2), '6');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 87, 2), 'a');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 87, 3), 'b');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 89, 2), 'Ada');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 89, 3), 'Lovelace');
  assert.equal(getCachedCellDisplayValue(sheet, 91, 2), '#VALUE!');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 93, 2), 'B');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 93, 3), '50');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 94, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 94, 3), '40');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 97, 2), 'A');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 97, 3), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 99, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 100, 2), '50');

  const graph = buildWorkbookDependencyGraph(workbook);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('sheet-1', 8, 2))], [
    workbookCellKey('sheet-1', 8, 4),
    workbookCellKey('sheet-1', 8, 5),
    workbookCellKey('sheet-1', 9, 5),
  ]);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('sheet-1', 13, 1))], [workbookCellKey('sheet-1', 13, 2)]);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('sheet-1', 14, 1))], [
    workbookCellKey('sheet-1', 13, 1),
    workbookCellKey('sheet-1', 13, 2),
  ]);
  assert.deepEqual([...graph.dependentsByCell.get(workbookCellKey('sheet-1', 11, 3))], [workbookCellKey('sheet-1', 11, 2)]);

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 14, col: 0, value: '20'});
  workbook = result.workbook;
  sheet = workbook.sheets.get('sheet-1');

  assert.deepEqual(result.recalculated, ['13:1', '13:2']);
  assert.equal(getCachedCellDisplayValue(sheet, 13, 2), '20');

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 11, col: 3, cell: null});
  workbook = result.workbook;
  sheet = workbook.sheets.get('sheet-1');

  assert.deepEqual(result.recalculated, ['11:2', '11:4']);
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 11, 2), '1');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 11, 3), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 4), '3');
});

test('formula context commands force recalculation without direct changed cells', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, formula: '=SUM(Revenue)'},
    ],
  }).workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '#NAME?');
  assert.equal(commandRequiresFullRecalculation({type: CommandType.SET_NAMED_RANGE}), true);

  const result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Revenue',
    sheetId: 'sheet-1',
    range: {r1: 0, c1: 0, r2: 0, c2: 0},
  });
  workbook = result.workbook;

  assert.equal(result.fullRecalculation, true);
  assert.deepEqual(result.recalculatedBySheet['sheet-1'], ['0:1']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '2');
});

test('formula evaluator supports logical, text, and scalar functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '12'},
      {row: 0, col: 1, value: '  ada  lovelace  '},
      {row: 0, col: 2, formula: '=IF(A1>=10,"ok","no")'},
      {row: 0, col: 3, formula: '=ROUND(A1/10,1)'},
      {row: 0, col: 4, formula: '=POWER(A1,2)'},
      {row: 0, col: 5, formula: '=UPPER(TRIM(B1))'},
      {row: 0, col: 6, formula: '=AND(A1>5,D1=1.2)'},
      {row: 0, col: 7, formula: '=LEN(F1)'},
      {row: 0, col: 8, formula: '=CONCAT(F1,"-",C1)'},
      {row: 0, col: 9, formula: '=LET(value,A1,double,value*2,double+1)'},
      {row: 0, col: 10, formula: '=LET(label,"Row",label&"-"&A1)'},
      {row: 0, col: 11, formula: '=LET(total,SUM(A1:A1),IF(total>10,total,0))'},
      {row: 0, col: 12, formula: '=LET(A1,2,A1)'},
      {row: 0, col: 13, formula: '="literal"'},
      {row: 0, col: 14, formula: '=NO_SUCH_NAME'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), 'ok');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 3), '1.2');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 4), '144');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 5), 'ADA LOVELACE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 6), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 7), '12');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 8), 'ADA LOVELACE-ok');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 9), '25');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 10), 'Row-12');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 11), '12');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 12), '#NAME?');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 13), 'literal');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 14), '#NAME?');
});

test('formula evaluator supports arithmetic expressions around function calls', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 2, col: 0, value: '4'},
      {row: 0, col: 1, formula: '=SUM(A1:A3)+1'},
      {row: 1, col: 1, formula: '=ROUND(AVERAGE(A1:A3),1)*2'},
      {row: 2, col: 1, formula: '=IF(SUM(A1:A3)>8,SQRT(16)+1,0)'},
      {row: 3, col: 1, formula: '=SUM(A1:A3)+MAX(A1:A3)*COUNT(A1:A3)'},
      {row: 4, col: 1, formula: '=YEAR(DATE(2026,1,1))+MONTH(DATE(2026,2,1))'},
      {row: 5, col: 1, formula: '=MOD(SUM(A1:A3),4)'},
      {row: 6, col: 1, formula: '=SUM(A1:A3)>8'},
      {row: 7, col: 1, formula: '=2^3+10%'},
      {row: 8, col: 1, formula: '="Total: "&SUM(A1:A3)'},
      {row: 9, col: 1, formula: '=LEFT("RowZero",3)&"-"&RIGHT("Excel",2)'},
      {row: 10, col: 1, formula: '=SUM(A1:A3)&" units"'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '21');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '2028');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '8.1');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), 'Total: 9');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), 'Row-el');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '9 units');
});

test('formula evaluator returns spreadsheet errors for invalid arithmetic', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '0'},
      {row: 0, col: 1, formula: '=1/A1'},
      {row: 1, col: 1, formula: '=0/0'},
      {row: 2, col: 1, formula: '=MOD(10,A1)'},
      {row: 3, col: 1, formula: '=SQRT(-1)'},
      {row: 4, col: 1, formula: '=POWER(-1,0.5)'},
      {row: 5, col: 1, formula: '=SUM(B1,1)'},
      {row: 6, col: 1, formula: '=ROUND(B4,1)'},
      {row: 7, col: 1, formula: '=UNKNOWN(1)+1'},
      {row: 8, col: 1, formula: '=1+"x"'},
      {row: 9, col: 1, formula: '=B4+1'},
      {row: 10, col: 1, formula: '=POWER(0,-1)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '#NAME?');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '#DIV/0!');
  assert.equal(sheet.cells.get('0:1').error, '#DIV/0!');
  assert.equal(sheet.cells.get('3:1').error, '#NUM!');
});

test('formula evaluator supports volatile and error information functions', () => {
  const now = new Date(Date.UTC(2026, 0, 2, 12, 0, 0));
  const dateSerial = (date) => date.getTime() / 86400000 + 25569;
  const randomValues = [0.5, 0.25];
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: ''},
      {row: 0, col: 1, formula: '=IFERROR(1/0,"fallback")'},
      {row: 0, col: 2, formula: '=IFNA(MATCH("z",A1:A1,0),"missing")'},
      {row: 0, col: 3, formula: '=ISERROR(1/0)'},
      {row: 0, col: 4, formula: '=ISNA(MATCH("z",A1:A1,0))'},
      {row: 0, col: 5, formula: '=ISBLANK(A1)'},
      {row: 0, col: 6, formula: '=ISNUMBER(42)'},
      {row: 0, col: 7, formula: '=ISTEXT("hello")'},
      {row: 0, col: 8, formula: '=RANDBETWEEN(10,20)'},
      {row: 0, col: 9, formula: '=RAND()'},
      {row: 0, col: 10, formula: '=TODAY()'},
      {row: 0, col: 11, formula: '=NOW()'},
      {row: 0, col: 12, formula: '=ISLOGICAL(TRUE)'},
      {row: 0, col: 13, formula: '=ISNONTEXT(42)'},
      {row: 0, col: 14, formula: '=N(TRUE)'},
      {row: 0, col: 15, formula: '=N("hello")'},
      {row: 0, col: 16, formula: '=T("hello")'},
      {row: 0, col: 17, formula: '=T(42)&"x"'},
      {row: 0, col: 18, formula: '=TYPE(TRUE)'},
      {row: 0, col: 19, formula: '=TYPE(1/0)'},
      {row: 0, col: 20, formula: '=ERROR.TYPE(1/0)'},
      {row: 0, col: 21, formula: '=ERROR.TYPE(NA())'},
      {row: 0, col: 22, formula: '=NA()'},
      {row: 0, col: 23, formula: '=TRUE()'},
      {row: 0, col: 24, formula: '=FALSE()'},
      {row: 0, col: 25, formula: '=XOR(TRUE(),FALSE(),FALSE())'},
      {row: 0, col: 26, formula: '=XOR(TRUE(),TRUE())'},
      {row: 0, col: 27, formula: '=ISEVEN(2.9)'},
      {row: 0, col: 28, formula: '=ISODD(-3.2)'},
      {row: 0, col: 29, formula: '=ISFORMULA(B1)'},
      {row: 0, col: 30, formula: '=ISFORMULA(A1)'},
      {row: 0, col: 31, formula: '=FORMULATEXT(B1)'},
      {row: 0, col: 32, formula: '=FORMULATEXT(A1)'},
      {row: 0, col: 33, formula: '=IF(TRUE(),"yes","no")'},
    ],
  }, {formulaOptions: {now, random: () => randomValues.shift()}});
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), 'fallback');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), 'missing');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 3), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 4), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 5), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 6), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 7), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 12), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 13), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 14), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 15), '0');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 16), 'hello');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 17), 'x');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 18), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 19), '16');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 20), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 21), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 22), '#N/A');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 23), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 24), 'FALSE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 25), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 26), 'FALSE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 27), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 28), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 29), 'TRUE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 30), 'FALSE');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 31), '=IFERROR(1/0,"fallback")');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 32), '#N/A');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 33), 'yes');
  assert.equal(sheet.cells.get('0:8').computedValue, 15);
  assert.equal(sheet.cells.get('0:9').computedValue, 0.25);
  assert.equal(sheet.cells.get('0:10').computedValue, dateSerial(new Date(Date.UTC(2026, 0, 2))));
  assert.equal(sheet.cells.get('0:11').computedValue, dateSerial(now));
});

test('formula evaluator supports conditional aggregates and lookup functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: 'Name'},
      {row: 0, col: 1, value: 'Region'},
      {row: 0, col: 2, value: 'Score'},
      {row: 0, col: 3, value: 'Tier'},
      {row: 1, col: 0, value: 'Ada'},
      {row: 1, col: 1, value: 'West'},
      {row: 1, col: 2, value: '42'},
      {row: 1, col: 3, value: 'A'},
      {row: 2, col: 0, value: 'Grace'},
      {row: 2, col: 1, value: 'East'},
      {row: 2, col: 2, value: '99'},
      {row: 2, col: 3, value: 'B'},
      {row: 3, col: 0, value: 'Linus'},
      {row: 3, col: 1, value: 'West'},
      {row: 3, col: 2, value: '7'},
      {row: 3, col: 3, value: 'A'},
      {row: 4, col: 0, value: 'Barbara'},
      {row: 4, col: 1, value: 'East'},
      {row: 4, col: 2, value: '42'},
      {row: 4, col: 3, value: 'C'},
      {row: 1, col: 7, value: '10'},
      {row: 1, col: 8, value: 'Low'},
      {row: 2, col: 7, value: '40'},
      {row: 2, col: 8, value: 'Mid'},
      {row: 3, col: 7, value: '90'},
      {row: 3, col: 8, value: 'High'},
      {row: 0, col: 5, formula: '=COUNTIF(B2:B5,"West")'},
      {row: 1, col: 5, formula: '=SUMIF(B2:B5,"East",C2:C5)'},
      {row: 2, col: 5, formula: '=AVERAGEIF(B2:B5,"West",C2:C5)'},
      {row: 3, col: 5, formula: '=COUNTIFS(B2:B5,"East",C2:C5,">40")'},
      {row: 4, col: 5, formula: '=SUMIFS(C2:C5,B2:B5,"East",C2:C5,">50")'},
      {row: 5, col: 5, formula: '=AVERAGEIFS(C2:C5,B2:B5,"East",C2:C5,">40")'},
      {row: 6, col: 5, formula: '=MAXIFS(C2:C5,B2:B5,"East")'},
      {row: 7, col: 5, formula: '=MINIFS(C2:C5,B2:B5,"West")'},
      {row: 8, col: 5, formula: '=MINIFS(C2:C5,B2:B5,"North")'},
      {row: 0, col: 6, formula: '=VLOOKUP("Grace",A2:C5,3,FALSE)'},
      {row: 1, col: 6, formula: '=XLOOKUP("Linus",A2:A5,C2:C5,"missing")'},
      {row: 2, col: 6, formula: '=INDEX(A2:C5,2,1)'},
      {row: 3, col: 6, formula: '=MATCH("Linus",A2:A5,0)'},
      {row: 4, col: 6, formula: '=VLOOKUP(45,H2:I4,2,TRUE)'},
      {row: 5, col: 6, formula: '=XLOOKUP("B*",D2:D5,A2:A5,"missing",2)'},
      {row: 6, col: 6, formula: '=XLOOKUP("East",B2:B5,A2:A5,"missing",0,-1)'},
      {row: 7, col: 6, formula: '=SUM($C$2:$C$5)'},
      {row: 8, col: 6, formula: '=XMATCH("Linus",A2:A5,0)'},
      {row: 9, col: 6, formula: '=XMATCH("B*",D2:D5,2)'},
      {row: 10, col: 6, formula: '=XMATCH("East",B2:B5,0,-1)'},
      {row: 11, col: 6, formula: '=LOOKUP(45,H2:H4,I2:I4)'},
      {row: 12, col: 6, formula: '=LOOKUP(5,H2:H4,I2:I4)'},
      {row: 13, col: 6, formula: '=COUNTIFS(B2:B5,"East",C2:C4,">40")'},
      {row: 14, col: 6, formula: '=SUMIFS(C2:C5,B2:B4,"East")'},
      {row: 15, col: 6, formula: '=XLOOKUP("Ada",A2:A5,C2:C4,"missing")'},
      {row: 16, col: 6, formula: '=SUMPRODUCT(C2:C5,C2:C4)'},
      {row: 17, col: 6, formula: '=XLOOKUP("Ada",A2:A5,C2:C5,"missing",3)'},
      {row: 18, col: 6, formula: '=XMATCH("Ada",A2:A5,3)'},
      {row: 19, col: 6, formula: '=MATCH("Ada",A2:A5,2)'},
      {row: 20, col: 6, formula: '=VLOOKUP("Ada",A2:B5,3,FALSE)'},
      {row: 21, col: 6, formula: '=HLOOKUP("Score",A1:C2,3,FALSE)'},
      {row: 22, col: 6, formula: '=INDEX(A2:C5,5,1)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 5), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 5), '141');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 5), '24.5');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 5), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 5), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 5), '70.5');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 5), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 5), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 5), '0');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 6), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 6), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 6), 'Grace');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 6), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 6), 'Mid');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 6), 'Grace');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 6), 'Barbara');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 6), '190');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 6), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 6), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 6), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 6), 'Mid');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 6), '#N/A');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 6), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 20, 6), '#REF!');
  assert.equal(getCachedCellDisplayValue(sheet, 21, 6), '#REF!');
  assert.equal(getCachedCellDisplayValue(sheet, 22, 6), '#REF!');
});

test('formula evaluator supports date, text, math, and statistical helper functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: 'Ada Lovelace'},
      {row: 0, col: 1, formula: '=LEFT(A1,3)'},
      {row: 0, col: 2, formula: '=RIGHT(A1,8)'},
      {row: 0, col: 3, formula: '=MID(A1,5,3)'},
      {row: 0, col: 4, formula: '=SEARCH("love",A1)'},
      {row: 0, col: 5, formula: '=FIND("Love",A1)'},
      {row: 0, col: 6, formula: '=SUBSTITUTE(A1,"Ada","Countess")'},
      {row: 0, col: 7, formula: '=TEXTJOIN("-",TRUE,B1,D1)'},
      {row: 0, col: 8, formula: '=LEFT(A1,-1)'},
      {row: 0, col: 9, formula: '=MID(A1,0,2)'},
      {row: 0, col: 10, formula: '=FIND("A",A1,0)'},
      {row: 0, col: 11, formula: '=SEARCH("A",A1,99)'},
      {row: 1, col: 0, value: '2'},
      {row: 2, col: 0, value: '4'},
      {row: 3, col: 0, value: '8'},
      {row: 4, col: 0, value: '16'},
      {row: 1, col: 1, formula: '=MEDIAN(A2:A5)'},
      {row: 2, col: 1, formula: '=LARGE(A2:A5,2)'},
      {row: 3, col: 1, formula: '=SMALL(A2:A5,2)'},
      {row: 4, col: 1, formula: '=RANK(8,A2:A5)'},
      {row: 5, col: 1, formula: '=SUMPRODUCT(A2:A5,A2:A5)'},
      {row: 6, col: 1, formula: '=PERCENTILE.INC(A2:A5,0.75)'},
      {row: 7, col: 1, formula: '=PERCENTILE.EXC(A2:A5,0.75)'},
      {row: 8, col: 1, formula: '=QUARTILE.INC(A2:A5,3)'},
      {row: 9, col: 1, formula: '=QUARTILE.EXC(A2:A5,3)'},
      {row: 10, col: 1, formula: '=PERCENTILE.EXC(A2:A5,0.1)'},
      {row: 11, col: 1, formula: '=QUARTILE.EXC(A2:A5,0)'},
      {row: 1, col: 2, formula: '=YEAR(DATE(2026,6,27))'},
      {row: 2, col: 2, formula: '=MONTH(DATE(2026,6,27))'},
      {row: 3, col: 2, formula: '=DAY(EDATE(DATE(2026,1,31),1))'},
      {row: 4, col: 2, formula: '=DAY(EOMONTH(DATE(2026,2,1),0))'},
      {row: 5, col: 2, formula: '=HOUR(TIME(14,30,45))'},
      {row: 6, col: 2, formula: '=MINUTE(TIME(14,30,45))'},
      {row: 7, col: 2, formula: '=SECOND(TIME(14,30,45))'},
      {row: 8, col: 2, formula: '=ROUND(TIME(6,0,0)*24,2)'},
      {row: 9, col: 2, formula: '=HOUR(DATE(2026,6,27)+TIME(23,59,58))'},
      {row: 10, col: 2, formula: '=TIME(-1,0,0)'},
      {row: 1, col: 3, formula: '=ROUNDUP(1.21,1)'},
      {row: 2, col: 3, formula: '=ROUNDDOWN(1.29,1)'},
      {row: 3, col: 3, formula: '=MOD(10,3)'},
      {row: 4, col: 3, formula: '=INT(1.9)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), 'Ada');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), 'Lovelace');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 3), 'Lov');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 4), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 5), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 6), 'Countess Lovelace');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 7), 'Ada-Lov');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 8), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 9), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 10), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 11), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '8');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '340');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '14');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '14');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 2), '2026');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 2), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 2), '28');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 2), '28');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 2), '14');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 2), '30');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 2), '45');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 2), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 2), '23');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 2), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 3), '1.3');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 3), '1.2');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 3), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 3), '1');
});

test('formula evaluator supports additional aggregate helpers', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: ''},
      {row: 2, col: 0, value: 'x'},
      {row: 3, col: 0, value: '4'},
      {row: 0, col: 1, formula: '=PRODUCT(A1:A4,3)'},
      {row: 1, col: 1, formula: '=SUMSQ(A1:A4,3)'},
      {row: 2, col: 1, formula: '=COUNTBLANK(A1:A4)'},
      {row: 3, col: 1, formula: '=AVERAGEA(A1:A4,TRUE)'},
      {row: 4, col: 1, formula: '=AVERAGEA(A2:A2)'},
      {row: 5, col: 1, formula: '=PRODUCT(A2:A3)'},
    ],
  }, {getDefaultCellValue: () => ''});
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '24');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '29');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '1.75');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '0');
});

test('formula evaluator supports workday and date-difference functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, formula: '=DATE(2026,7,3)'},
      {row: 0, col: 1, formula: '=DAYS(DATE(2026,7,4),DATE(2026,6,27))'},
      {row: 1, col: 1, formula: '=WEEKDAY(DATE(2026,6,27))'},
      {row: 2, col: 1, formula: '=WEEKDAY(DATE(2026,6,27),2)'},
      {row: 3, col: 1, formula: '=NETWORKDAYS(DATE(2026,6,29),DATE(2026,7,6),A1:A1)'},
      {row: 4, col: 1, formula: '=DAY(WORKDAY(DATE(2026,6,29),5,A1:A1))'},
      {row: 5, col: 1, formula: '=MONTH(WORKDAY(DATE(2026,6,29),5,A1:A1))'},
      {row: 6, col: 1, formula: '=DATEDIF(DATE(2024,1,15),DATE(2026,6,27),"Y")'},
      {row: 7, col: 1, formula: '=DATEDIF(DATE(2024,1,15),DATE(2026,6,27),"M")'},
      {row: 8, col: 1, formula: '=DATEDIF(DATE(2024,1,15),DATE(2026,6,27),"MD")'},
      {row: 9, col: 1, formula: '=DATEDIF(DATE(2026,6,27),DATE(2024,1,15),"D")'},
      {row: 10, col: 1, formula: '=YEAR(DATEVALUE("2026-06-27"))'},
      {row: 11, col: 1, formula: '=MONTH(DATEVALUE("6/27/2026"))'},
      {row: 12, col: 1, formula: '=HOUR(TIMEVALUE("2:30:45 PM"))'},
      {row: 13, col: 1, formula: '=MINUTE(TIMEVALUE("2:30:45 PM"))'},
      {row: 14, col: 1, formula: '=SECOND(TIMEVALUE("2:30:45 PM"))'},
      {row: 15, col: 1, formula: '=WEEKNUM(DATE(2026,1,4),1)'},
      {row: 16, col: 1, formula: '=WEEKNUM(DATE(2026,1,4),2)'},
      {row: 17, col: 1, formula: '=ISOWEEKNUM(DATE(2026,1,5))'},
      {row: 18, col: 1, formula: '=DATEVALUE("not a date")'},
      {row: 19, col: 1, formula: '=TIMEVALUE("25:00")'},
      {row: 20, col: 1, formula: '=DAYS360(DATE(2026,1,1),DATE(2026,2,1))'},
      {row: 21, col: 1, formula: '=DAYS360(DATE(2026,2,1),DATE(2026,1,1))'},
      {row: 22, col: 1, formula: '=ROUND(YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),3),4)'},
      {row: 23, col: 1, formula: '=YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),0)'},
      {row: 24, col: 1, formula: '=ROUND(YEARFRAC(DATE(2024,1,1),DATE(2025,1,1),1),4)'},
      {row: 25, col: 1, formula: '=YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),9)'},
      {row: 26, col: 1, formula: '=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),1,A1:A1)'},
      {row: 27, col: 1, formula: '=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),11,A1:A1)'},
      {row: 28, col: 1, formula: '=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),"0000001",A1:A1)'},
      {row: 29, col: 1, formula: '=DAY(WORKDAY.INTL(DATE(2026,6,29),5,1,A1:A1))'},
      {row: 30, col: 1, formula: '=DAY(WORKDAY.INTL(DATE(2026,6,29),5,11,A1:A1))'},
      {row: 31, col: 1, formula: '=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),99)'},
      {row: 32, col: 1, formula: '=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),"1111111")'},
      {row: 33, col: 1, formula: '=WEEKDAY(DATE(2026,6,27),99)'},
      {row: 34, col: 1, formula: '=WEEKNUM(DATE(2026,1,4),99)'},
      {row: 35, col: 1, formula: '=WORKDAY.INTL(DATE(2026,6,29),5,99)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '29');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '12');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '2026');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 1), '14');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 1), '30');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 1), '45');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 1), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 1), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 20, 1), '30');
  assert.equal(getCachedCellDisplayValue(sheet, 21, 1), '-30');
  assert.equal(getCachedCellDisplayValue(sheet, 22, 1), '0.5');
  assert.equal(Math.abs(sheet.cells.get('22:1').computedValue - 0.4959) < 0.0001, true);
  assert.equal(getCachedCellDisplayValue(sheet, 23, 1), '0.5');
  assert.equal(getCachedCellDisplayValue(sheet, 24, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 25, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 26, 1), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 27, 1), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 28, 1), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 29, 1), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 30, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 31, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 32, 1), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 33, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 34, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 35, 1), '#NUM!');
});

test('formula evaluator supports additional logical, text, math, and statistical helpers', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '4'},
      {row: 2, col: 0, value: '8'},
      {row: 3, col: 0, value: '16'},
      {row: 0, col: 1, value: '8'},
      {row: 0, col: 2, formula: '=IFS(B1>10,"high",B1>5,"mid",TRUE,"low")'},
      {row: 1, col: 2, formula: '=SWITCH("b","a",1,"b",2,0)'},
      {row: 2, col: 2, formula: '=CHOOSE(2,"red","blue","green")'},
      {row: 3, col: 2, formula: '=VALUE("$1,234")'},
      {row: 4, col: 2, formula: '=EXACT("Ada","ada")'},
      {row: 5, col: 2, formula: '=REPT("ha",3)'},
      {row: 6, col: 2, formula: '=REPLACE("abcdef",2,3,"Z")'},
      {row: 7, col: 2, formula: '=PROPER("ada LOVELACE")'},
      {row: 8, col: 2, formula: '=CHAR(65)&CODE("Z")'},
      {row: 9, col: 2, formula: '=TEXTBEFORE("north|south|east","|",2)'},
      {row: 10, col: 2, formula: '=TEXTAFTER("north|south|east","|",-1)'},
      {row: 11, col: 2, formula: '=TEXTAFTER("Ada Lovelace","love",1,1)'},
      {row: 12, col: 2, formula: '=TEXTBEFORE("abc","-",1,0,TRUE)'},
      {row: 13, col: 2, formula: '=TEXTAFTER("abc","-",1,0,FALSE,"missing")'},
      {row: 14, col: 2, formula: '=TEXTBEFORE("abc","",1)'},
      {row: 0, col: 3, formula: '=TRUNC(-1.29,1)'},
      {row: 1, col: 3, formula: '=SIGN(-42)'},
      {row: 2, col: 3, formula: '=CEILING(4.2,2)'},
      {row: 3, col: 3, formula: '=FLOOR(4.8,2)'},
      {row: 4, col: 3, formula: '=ROUND(STDEV.S(A1:A4),2)'},
      {row: 5, col: 3, formula: '=ROUND(STDEV.P(A1:A4),2)'},
      {row: 6, col: 3, formula: '=ROUND(VAR.S(A1:A4),2)'},
      {row: 7, col: 3, formula: '=ROUND(VAR.P(A1:A4),2)'},
      {row: 8, col: 3, formula: '=STDEV.S(A1:A4)+1'},
      {row: 9, col: 3, formula: '=ROUND(PI(),2)'},
      {row: 10, col: 3, formula: '=ROUND(SIN(PI()/2),4)'},
      {row: 11, col: 3, formula: '=ROUND(COS(RADIANS(60)),4)'},
      {row: 12, col: 3, formula: '=ROUND(TAN(RADIANS(45)),4)'},
      {row: 13, col: 3, formula: '=ROUND(DEGREES(PI()),0)'},
      {row: 14, col: 3, formula: '=ROUND(EXP(1),2)'},
      {row: 15, col: 3, formula: '=ROUND(LN(EXP(2)),2)'},
      {row: 16, col: 3, formula: '=LOG(1000)'},
      {row: 17, col: 3, formula: '=LOG(8,2)'},
      {row: 18, col: 3, formula: '=LOG10(1000)'},
      {row: 19, col: 3, formula: '=LN(0)'},
      {row: 20, col: 3, formula: '=LOG(10,1)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 2), 'mid');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 2), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 2), 'blue');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 2), '1234');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 2), 'FALSE');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 2), 'hahaha');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 2), 'aZef');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 2), 'Ada Lovelace');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 2), 'A90');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 2), 'north|south');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 2), 'east');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 2), 'lace');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 2), 'abc');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 2), 'missing');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 3), '-1.2');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 3), '-1');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 3), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 3), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 3), '6.19');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 3), '5.36');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 3), '38.33');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 3), '28.75');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 3), '7.19');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 3), '3.14');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 3), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 3), '0.5');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 3), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 3), '180');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 3), '2.72');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 3), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 3), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 3), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 3), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 3), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 20, 3), '#NUM!');
});

test('formula evaluator supports text formatting and number parsing helpers', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, formula: '=CLEAN("A"&CHAR(10)&"B")'},
      {row: 1, col: 0, formula: '=NUMBERVALUE("1,234.56")'},
      {row: 2, col: 0, formula: '=NUMBERVALUE("1.234,56%",",",".")'},
      {row: 3, col: 0, formula: '=NUMBERVALUE("1..2")'},
      {row: 4, col: 0, formula: '=FIXED(1234.567,2)'},
      {row: 5, col: 0, formula: '=FIXED(1234.567,1,TRUE)'},
      {row: 6, col: 0, formula: '=FIXED(1234.567,-2)'},
      {row: 7, col: 0, formula: '=DOLLAR(1234.567,2)'},
      {row: 8, col: 0, formula: '=DOLLAR(-1234.567,2)'},
      {row: 9, col: 0, formula: '=TEXT(1234.567,"#,##0.00")'},
      {row: 10, col: 0, formula: '=TEXT(0.256,"0.0%")'},
      {row: 11, col: 0, formula: '=TEXT(DATE(2026,6,27),"yyyy-mm-dd")'},
      {row: 12, col: 0, formula: '=TEXT(DATE(2026,6,27),"mmm d, yyyy")'},
      {row: 13, col: 0, formula: '=TEXT("Ada","Hello @")'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 0), 'AB');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 0), '1234.56');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 0), '12.35');
  assert.equal(Math.abs(sheet.cells.get('2:0').computedValue - 12.3456) < 0.0000001, true);
  assert.equal(getCachedCellDisplayValue(sheet, 3, 0), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 0), '1,234.57');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 0), '1234.6');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 0), '1,200');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 0), '$1,234.57');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 0), '($1,234.57)');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 0), '1,234.57');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 0), '25.6%');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 0), '2026-06-27');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 0), 'Jun 27, 2026');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 0), 'Hello Ada');
});

test('formula evaluator supports additional statistical helpers', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '4'},
      {row: 2, col: 0, value: '4'},
      {row: 3, col: 0, value: '8'},
      {row: 4, col: 0, value: '16'},
      {row: 5, col: 0, value: '-1'},
      {row: 0, col: 1, value: '1'},
      {row: 1, col: 1, value: '2'},
      {row: 2, col: 1, value: '3'},
      {row: 3, col: 1, value: '4'},
      {row: 0, col: 2, value: '2'},
      {row: 1, col: 2, value: '4'},
      {row: 2, col: 2, value: '6'},
      {row: 3, col: 2, value: '8'},
      {row: 0, col: 3, value: '5'},
      {row: 1, col: 3, value: '5'},
      {row: 2, col: 3, value: '5'},
      {row: 3, col: 3, value: '5'},
      {row: 0, col: 4, formula: '=MODE.SNGL(A1:A5)'},
      {row: 1, col: 4, formula: '=MODE.SNGL(B1:B4)'},
      {row: 2, col: 4, formula: '=ROUND(GEOMEAN(A1:A3),2)'},
      {row: 3, col: 4, formula: '=HARMEAN(A1:A3)'},
      {row: 4, col: 4, formula: '=GEOMEAN(A1:A6)'},
      {row: 5, col: 4, formula: '=RANK.EQ(4,A1:A5)'},
      {row: 6, col: 4, formula: '=RANK.AVG(4,A1:A5)'},
      {row: 7, col: 4, formula: '=RANK.EQ(4,A1:A5,1)'},
      {row: 8, col: 4, formula: '=RANK.AVG(4,A1:A5,1)'},
      {row: 9, col: 4, formula: '=CORREL(B1:B4,C1:C4)'},
      {row: 10, col: 4, formula: '=ROUND(COVARIANCE.P(B1:B4,C1:C4),2)'},
      {row: 11, col: 4, formula: '=ROUND(COVARIANCE.S(B1:B4,C1:C4),2)'},
      {row: 12, col: 4, formula: '=CORREL(B1:B4,D1:D4)'},
      {row: 13, col: 4, formula: '=COVARIANCE.P(B1:B3,C1:C4)'},
      {row: 14, col: 4, formula: '=SLOPE(C1:C4,B1:B4)'},
      {row: 15, col: 4, formula: '=INTERCEPT(C1:C4,B1:B4)'},
      {row: 16, col: 4, formula: '=RSQ(C1:C4,B1:B4)'},
      {row: 17, col: 4, formula: '=FORECAST.LINEAR(5,C1:C4,B1:B4)'},
      {row: 18, col: 4, formula: '=FORECAST(5,C1:C4,B1:B4)'},
      {row: 19, col: 4, formula: '=SLOPE(B1:B4,D1:D4)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 4), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 4), '#N/A');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 4), '3.17');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 4), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 4), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 4), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 4), '3.5');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 4), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 4), '2.5');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 4), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 4), '2.5');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 4), '3.33');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 4), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 4), '#N/A');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 4), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 4), '0');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 4), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 4), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 4), '10');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 4), '#DIV/0!');
});

test('formula evaluator supports additional Excel math helpers', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '12'},
      {row: 1, col: 0, value: '18'},
      {row: 2, col: 0, value: '30'},
      {row: 3, col: 0, value: '0'},
      {row: 0, col: 1, formula: '=MOD(-3,2)'},
      {row: 1, col: 1, formula: '=MOD(3,-2)'},
      {row: 2, col: 1, formula: '=MROUND(10,3)'},
      {row: 3, col: 1, formula: '=MROUND(-10,-3)'},
      {row: 4, col: 1, formula: '=MROUND(-10,3)'},
      {row: 5, col: 1, formula: '=QUOTIENT(7,3)'},
      {row: 6, col: 1, formula: '=QUOTIENT(-7,3)'},
      {row: 7, col: 1, formula: '=QUOTIENT(7,0)'},
      {row: 8, col: 1, formula: '=EVEN(3)'},
      {row: 9, col: 1, formula: '=ODD(2)'},
      {row: 10, col: 1, formula: '=EVEN(-3)'},
      {row: 11, col: 1, formula: '=ODD(-2)'},
      {row: 12, col: 1, formula: '=FACT(5.9)'},
      {row: 13, col: 1, formula: '=FACT(-1)'},
      {row: 14, col: 1, formula: '=FACTDOUBLE(7)'},
      {row: 15, col: 1, formula: '=FACTDOUBLE(8)'},
      {row: 16, col: 1, formula: '=GCD(A1:A3)'},
      {row: 17, col: 1, formula: '=LCM(A1:A2)'},
      {row: 18, col: 1, formula: '=LCM(A1:A4)'},
      {row: 19, col: 1, formula: '=GCD(-1,2)'},
      {row: 20, col: 1, formula: '=COMBIN(6,2)'},
      {row: 21, col: 1, formula: '=PERMUT(6,2)'},
      {row: 22, col: 1, formula: '=COMBIN(3,5)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '-1');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '9');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '-9');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), '-2');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '#DIV/0!');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '-4');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 1), '-3');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 1), '120');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 1), '105');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 1), '384');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 1), '36');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 1), '0');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 20, 1), '15');
  assert.equal(getCachedCellDisplayValue(sheet, 21, 1), '30');
  assert.equal(getCachedCellDisplayValue(sheet, 22, 1), '#NUM!');
});

test('formula evaluator supports financial functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [{id: 'sheet-1'}]}), {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '-10000'},
      {row: 1, col: 0, value: '3000'},
      {row: 2, col: 0, value: '4200'},
      {row: 3, col: 0, value: '6800'},
      {row: 0, col: 2, formula: '=DATE(2026,1,1)'},
      {row: 1, col: 2, formula: '=DATE(2026,3,1)'},
      {row: 2, col: 2, formula: '=DATE(2026,10,30)'},
      {row: 3, col: 2, formula: '=DATE(2027,2,15)'},
      {row: 0, col: 1, formula: '=ROUND(PMT(5%/12,60,30000),2)'},
      {row: 1, col: 1, formula: '=ROUND(PV(5%/12,60,PMT(5%/12,60,30000)),2)'},
      {row: 2, col: 1, formula: '=ROUND(FV(5%/12,60,-500,0),2)'},
      {row: 3, col: 1, formula: '=ROUND(NPV(10%,A2:A4)+A1,2)'},
      {row: 4, col: 1, formula: '=ROUND(IRR(A1:A4),4)'},
      {row: 5, col: 1, formula: '=PMT(0,0,1000)'},
      {row: 6, col: 1, formula: '=IRR(A2:A4)'},
      {row: 7, col: 1, formula: '=ROUND(NPER(5%/12,PMT(5%/12,60,30000),30000),2)'},
      {row: 8, col: 1, formula: '=ROUND(RATE(60,PMT(5%/12,60,30000),30000)*12,4)'},
      {row: 9, col: 1, formula: '=ROUND(IPMT(5%/12,1,60,30000),2)'},
      {row: 10, col: 1, formula: '=ROUND(PPMT(5%/12,1,60,30000),2)'},
      {row: 11, col: 1, formula: '=ROUND(IPMT(5%/12,2,60,30000),2)'},
      {row: 12, col: 1, formula: '=ROUND(PPMT(5%/12,2,60,30000),2)'},
      {row: 13, col: 1, formula: '=ROUND(IPMT(5%/12,1,60,30000,0,1),2)'},
      {row: 14, col: 1, formula: '=ROUND(PPMT(5%/12,1,60,30000,0,1),2)'},
      {row: 15, col: 1, formula: '=NPER(0,-500,30000)'},
      {row: 16, col: 1, formula: '=RATE(0,-500,30000)'},
      {row: 17, col: 1, formula: '=IPMT(5%/12,0,60,30000)'},
      {row: 18, col: 1, formula: '=ROUND(XNPV(10%,A1:A4,C1:C4),2)'},
      {row: 19, col: 1, formula: '=ROUND(XIRR(A1:A4,C1:C4),4)'},
      {row: 20, col: 1, formula: '=XIRR(A2:A4,C2:C4)'},
      {row: 21, col: 1, formula: '=XNPV(-100%,A1:A4,C1:C4)'},
      {row: 22, col: 1, formula: '=XNPV(10%,A1:A3,C1:C4)'},
      {row: 23, col: 1, formula: '=PMT(5%/12,60,30000,0,2)'},
    ],
  });
  const sheet = result.workbook.sheets.get('sheet-1');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '-566.14');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '30000');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '34003.04');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '1307.29');
  assert.equal(Math.abs(sheet.cells.get('4:1').computedValue - 0.1634) < 0.0000001, true);
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '60');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '0.05');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '-125');
  assert.equal(getCachedCellDisplayValue(sheet, 10, 1), '-441.14');
  assert.equal(getCachedCellDisplayValue(sheet, 11, 1), '-123.16');
  assert.equal(getCachedCellDisplayValue(sheet, 12, 1), '-442.98');
  assert.equal(getCachedCellDisplayValue(sheet, 13, 1), '0');
  assert.equal(getCachedCellDisplayValue(sheet, 14, 1), '-563.79');
  assert.equal(getCachedCellDisplayValue(sheet, 15, 1), '60');
  assert.equal(getCachedCellDisplayValue(sheet, 16, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 17, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 18, 1), '2945.25');
  assert.equal(getCachedCellDisplayValue(sheet, 19, 1), '0.52');
  assert.equal(Math.abs(sheet.cells.get('19:1').computedValue - 0.5245) < 0.0001, true);
  assert.equal(getCachedCellDisplayValue(sheet, 20, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 21, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 22, 1), '#NUM!');
  assert.equal(getCachedCellDisplayValue(sheet, 23, 1), '#NUM!');
});

test('formula evaluator supports reference metadata functions', () => {
  const result = dispatchCommandWithRecalculation(createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 20, colCount: 8, cells: {'6:1': {value: '123'}}},
    {id: 'model', name: 'Model', rowCount: 10, colCount: 6},
  ], activeSheetId: 'model'}), {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=ROW(Inputs!B7)'},
      {row: 0, col: 1, formula: '=COLUMN(Inputs!B7)'},
      {row: 1, col: 0, formula: '=ROWS(Inputs!A1:B3)'},
      {row: 1, col: 1, formula: '=COLUMNS(Inputs!A1:B3)'},
      {row: 2, col: 0, formula: '=ROWS(Inputs!A:A)'},
      {row: 2, col: 1, formula: '=COLUMNS(Inputs!1:1)'},
      {row: 3, col: 0, formula: '=ROW()+COLUMN()'},
      {row: 3, col: 1, formula: '=SUM(ROW(),COLUMN())'},
      {row: 3, col: 2, formula: '=ROWS()'},
      {row: 4, col: 2, formula: '=ROW()'},
      {row: 4, col: 3, formula: '=COLUMN()'},
      {row: 5, col: 0, value: '99'},
      {row: 5, col: 1, formula: '=ADDRESS(6,1)'},
      {row: 5, col: 2, formula: '=INDIRECT(B6)'},
      {row: 6, col: 0, formula: '=ADDRESS(7,3,4,TRUE)'},
      {row: 6, col: 1, formula: '=ADDRESS(7,3,1,FALSE)'},
      {row: 6, col: 2, formula: '=INDIRECT("R6C1",FALSE)'},
      {row: 7, col: 0, formula: '=INDIRECT("Inputs!B7")'},
      {row: 7, col: 1, formula: '=SUM(INDIRECT("A6:A6"))'},
      {row: 7, col: 2, formula: '=INDIRECT("bad")'},
      {row: 7, col: 3, formula: '=ADDRESS(1,1,1,TRUE,"FY 2026")'},
      {row: 8, col: 0, formula: '=OFFSET(A6,0,0)'},
      {row: 8, col: 1, formula: '=SUM(OFFSET(A6,0,0,1,1))'},
      {row: 8, col: 2, formula: '=OFFSET(Inputs!B7,0,0)'},
      {row: 8, col: 3, formula: '=ROWS(OFFSET(A6,0,0,2,1))'},
      {row: 8, col: 4, formula: '=COLUMNS(OFFSET(A6,0,0,1,2))'},
      {row: 9, col: 0, formula: '=MATCH(99,OFFSET(A6,0,0,1,1),0)'},
      {row: 9, col: 1, formula: '=OFFSET(A1,-1,0)'},
    ],
  });
  const sheet = result.workbook.sheets.get('model');

  assert.equal(getCachedCellDisplayValue(sheet, 0, 0), '7');
  assert.equal(getCachedCellDisplayValue(sheet, 0, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 0), '3');
  assert.equal(getCachedCellDisplayValue(sheet, 1, 1), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 0), '20');
  assert.equal(getCachedCellDisplayValue(sheet, 2, 1), '8');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 0), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 1), '6');
  assert.equal(getCachedCellDisplayValue(sheet, 3, 2), '#VALUE!');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 2), '5');
  assert.equal(getCachedCellDisplayValue(sheet, 4, 3), '4');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 1), '$A$6');
  assert.equal(getCachedCellDisplayValue(sheet, 5, 2), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 0), 'C7');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 1), 'R7C3');
  assert.equal(getCachedCellDisplayValue(sheet, 6, 2), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 0), '123');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 1), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 2), '#REF!');
  assert.equal(getCachedCellDisplayValue(sheet, 7, 3), "'FY 2026'!$A$1");
  assert.equal(getCachedCellDisplayValue(sheet, 8, 0), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 1), '99');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 2), '123');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 3), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 8, 4), '2');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 0), '1');
  assert.equal(getCachedCellDisplayValue(sheet, 9, 1), '#REF!');
});

test('formula draft preview evaluates through the headless workbook engine', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 10, colCount: 5},
    {id: 'model', name: 'Model', rowCount: 10, colCount: 5},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Revenue',
    sheetId: 'inputs',
    range: {r1: 0, c1: 0, r2: 1, c2: 0},
  });
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 0, col: 1, formula: '=A1+1'},
    ],
  }).workbook;

  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=SUM(Revenue)'), {
    kind: 'formula',
    value: 5,
    displayValue: '5',
    error: undefined,
    diagnostics: [],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=SUM(Revnue)'), {
    kind: 'formula',
    value: '#NAME?',
    displayValue: '#NAME?',
    error: '#NAME?',
    diagnostics: [{
      severity: 'error',
      code: 'UNKNOWN_NAME',
      message: 'Unknown name Revnue. Did you mean Revenue?',
      name: 'Revnue',
      suggestion: 'Revenue',
      start: 5,
      end: 11,
    }],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=Inpts!A1'), {
    kind: 'formula',
    value: '#REF!',
    displayValue: '#REF!',
    error: '#REF!',
    diagnostics: [{
      severity: 'error',
      code: 'UNKNOWN_SHEET',
      message: 'Unknown sheet Inpts. Did you mean Inputs?',
      sheetName: 'Inpts',
      suggestion: 'Inputs',
      start: 1,
      end: 6,
    }],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=A0'), {
    kind: 'formula',
    value: '#REF!',
    displayValue: '#REF!',
    error: '#REF!',
    diagnostics: [{
      severity: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Reference A0 is outside the sheet bounds.',
      reference: 'A0',
      start: 1,
      end: 3,
    }],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=SUM(XFE1)'), {
    kind: 'formula',
    value: '#REF!',
    displayValue: '#REF!',
    error: '#REF!',
    diagnostics: [{
      severity: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Reference XFE1 is outside the sheet bounds.',
      reference: 'XFE1',
      start: 5,
      end: 9,
    }],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=Inputs!B1+1'), {
    kind: 'formula',
    value: 4,
    displayValue: '4',
    error: undefined,
    diagnostics: [],
  });
  const shapePreview = previewFormulaDraft(workbook, 'model', 0, 0, '=XLOOKUP("Ada",Inputs!A1:A2,Inputs!B1:B1,"")');
  assert.equal(shapePreview.error, '#VALUE!');
  assert.equal(shapePreview.diagnostics.some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SIZE'), true);
  const optionPreview = previewFormulaDraft(workbook, 'model', 0, 0, '=XLOOKUP("Ada",Inputs!A1:A2,Inputs!B1:B2,"",3)');
  assert.equal(optionPreview.error, '#VALUE!');
  assert.equal(optionPreview.diagnostics.some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'), true);
  const referenceIndexPreview = previewFormulaDraft(workbook, 'model', 0, 0, '=VLOOKUP("Ada",Inputs!A1:B2,3,FALSE)');
  assert.equal(referenceIndexPreview.error, '#REF!');
  assert.equal(referenceIndexPreview.diagnostics.some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'), true);
  const dateOptionPreview = previewFormulaDraft(workbook, 'model', 0, 0, '=YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),9)');
  assert.equal(dateOptionPreview.error, '#NUM!');
  assert.equal(dateOptionPreview.diagnostics.some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'), true);
  const domainPreview = previewFormulaDraft(workbook, 'model', 0, 0, '=LEFT("Ada",-1)');
  assert.equal(domainPreview.error, '#VALUE!');
  assert.equal(domainPreview.diagnostics.some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'), true);
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, '=1/0'), {
    kind: 'formula',
    value: '#DIV/0!',
    displayValue: '#DIV/0!',
    error: '#DIV/0!',
    diagnostics: [{severity: 'error', code: '#DIV/0!', message: 'Formula evaluates to #DIV/0!.'}],
  });
  assert.deepEqual(previewFormulaDraft(workbook, 'model', 0, 0, 'typed value'), {
    kind: 'value',
    value: 'typed value',
    displayValue: 'typed value',
    error: undefined,
    diagnostics: [],
  });
  assert.deepEqual(diagnoseFormulaDraft('=SUM(A1,'), [
    {severity: 'warning', code: 'MISSING_CLOSING_PAREN', message: 'Missing 1 closing parenthesis.'},
    {severity: 'warning', code: 'TRAILING_OPERATOR', message: 'Formula ends with an operator or separator.'},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=NOPE(A1)'), [
    {severity: 'error', code: 'UNKNOWN_FUNCTION', message: 'Unknown function NOPE.', functionName: 'NOPE'},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=SUMM(A1)'), [
    {severity: 'error', code: 'UNKNOWN_FUNCTION', message: 'Unknown function SUMM. Did you mean SUM?', functionName: 'SUMM', suggestion: 'SUM'},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=XLOKUP(A1,A1:A3,B1:B3)'), [
    {severity: 'error', code: 'UNKNOWN_FUNCTION', message: 'Unknown function XLOKUP. Did you mean XLOOKUP?', functionName: 'XLOKUP', suggestion: 'XLOOKUP'},
  ]);
  assert.deepEqual(
    diagnoseFormulaDraft('=SUM(Revnue)', null, {
      sheetId: 'model',
      namedRanges: [{name: 'Revenue', sheetId: 'inputs', range: {r1: 0, c1: 0, r2: 1, c2: 0}, scope: 'workbook'}],
    }),
    [{
      severity: 'error',
      code: 'UNKNOWN_NAME',
      message: 'Unknown name Revnue. Did you mean Revenue?',
      name: 'Revnue',
      suggestion: 'Revenue',
      start: 5,
      end: 11,
    }],
  );
  assert.deepEqual(
    diagnoseFormulaDraft("='Inpts'!A1", null, {
      sheetId: 'model',
      sheets: [
        {id: 'inputs', name: 'Inputs'},
        {id: 'model', name: 'Model'},
      ],
      checkUnknownSheets: true,
    }),
    [{
      severity: 'error',
      code: 'UNKNOWN_SHEET',
      message: 'Unknown sheet Inpts. Did you mean Inputs?',
      sheetName: 'Inpts',
      suggestion: 'Inputs',
      start: 1,
      end: 8,
    }],
  );
  assert.deepEqual(
    diagnoseFormulaDraft('=SUM(A0)', null, {sheetRowCount: 10, sheetColCount: 5, checkInvalidReferences: true}),
    [{
      severity: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Reference A0 is outside the sheet bounds.',
      reference: 'A0',
      start: 5,
      end: 7,
    }],
  );
  assert.deepEqual(diagnoseFormulaDraft('=SUM()'), [
    {severity: 'warning', code: 'FUNCTION_ARGUMENT_COUNT', message: 'SUM expects at least 1 argument; found 0 arguments.', functionName: 'SUM', argumentCount: 0, expectedMin: 1, expectedMax: Infinity},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=XLOOKUP(A1,A1:A3)'), [
    {severity: 'warning', code: 'FUNCTION_ARGUMENT_COUNT', message: 'XLOOKUP expects 3 to 6 arguments; found 2 arguments.', functionName: 'XLOOKUP', argumentCount: 2, expectedMin: 3, expectedMax: 6},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=ROUND(A1,0,1)'), [
    {severity: 'warning', code: 'FUNCTION_ARGUMENT_COUNT', message: 'ROUND expects 2 arguments; found 3 arguments.', functionName: 'ROUND', argumentCount: 3, expectedMin: 2, expectedMax: 2},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=PI(1)'), [
    {severity: 'warning', code: 'FUNCTION_ARGUMENT_COUNT', message: 'PI expects no arguments; found 1 argument.', functionName: 'PI', argumentCount: 1, expectedMin: 0, expectedMax: 0},
  ]);
  assert.deepEqual(diagnoseFormulaDraft('=SUM(A1,B1,C1)+TRUE()+RAND()'), []);
  assert.deepEqual(
    replaceFormulaFunctionNameDraft('=SUMM(A1)+"SUMM("&SUMM(A2)', 'SUMM', 'SUM', '=SUMM(A1)+"SUMM("&SUMM'.length),
    {value: '=SUM(A1)+"SUMM("&SUMM(A2)', cursor: '=SUM(A1)+"SUMM("&SUMM'.length},
  );
  assert.equal(
    replaceFormulaFunctionNameDraft("='SUMM Sheet'!A1+SUMM(A2)", 'SUMM', 'SUM')?.value,
    "='SUMM Sheet'!A1+SUM(A2)",
  );
  assert.deepEqual(
    replaceFormulaIdentifierNameDraft('=SUM(Revnue)+"Revnue"', 'Revnue', 'Revenue', '=SUM(Revnue'.length),
    {value: '=SUM(Revenue)+"Revnue"', cursor: '=SUM(Revenue'.length},
  );
  assert.deepEqual(
    replaceFormulaSheetReferenceDraft("='Inpts'!A1+Inpts!B1", 'Inpts', 'Inputs', "='Inpts'!A1".length),
    {value: '=Inputs!A1+Inpts!B1', cursor: '=Inputs!A1'.length},
  );
  assert.deepEqual(diagnoseFormulaDraft('="unterminated'), [
    {severity: 'error', code: 'UNTERMINATED_STRING', message: 'Missing closing quote.'},
  ]);
  assert.equal(getCellRecord(workbook, 'model', 0, 0), null);
});

test('formula catalog exposes picker functions and reusable formula templates', () => {
  const pickerNames = listFormulaFunctions({pickerOnly: true}).map((item) => item.name);

  assert.equal(pickerNames.includes('XLOOKUP'), true);
  assert.equal(pickerNames.includes('LOOKUP'), true);
  assert.equal(pickerNames.includes('XMATCH'), true);
  assert.equal(pickerNames.includes('SORTBY'), true);
  assert.equal(pickerNames.includes('RANDARRAY'), true);
  assert.equal(pickerNames.includes('DATE'), true);
  assert.equal(pickerNames.includes('TIME'), true);
  assert.equal(pickerNames.includes('DATEVALUE'), true);
  assert.equal(pickerNames.includes('WEEKNUM'), true);
  assert.equal(pickerNames.includes('YEARFRAC'), true);
  assert.equal(pickerNames.includes('NETWORKDAYS.INTL'), true);
  assert.equal(pickerNames.includes('IFERROR'), true);
  assert.equal(pickerNames.includes('IFS'), true);
  assert.equal(pickerNames.includes('STDEV.S'), true);
  assert.equal(pickerNames.includes('MODE.SNGL'), true);
  assert.equal(pickerNames.includes('GEOMEAN'), true);
  assert.equal(pickerNames.includes('CORREL'), true);
  assert.equal(pickerNames.includes('SLOPE'), true);
  assert.equal(pickerNames.includes('FORECAST.LINEAR'), true);
  assert.equal(pickerNames.includes('PERCENTILE.INC'), true);
  assert.equal(pickerNames.includes('QUARTILE.INC'), true);
  assert.equal(pickerNames.includes('TEXTJOIN'), true);
  assert.equal(pickerNames.includes('TEXT'), true);
  assert.equal(pickerNames.includes('NUMBERVALUE'), true);
  assert.equal(pickerNames.includes('PROPER'), true);
  assert.equal(pickerNames.includes('TEXTBEFORE'), true);
  assert.equal(pickerNames.includes('TEXTAFTER'), true);
  assert.equal(pickerNames.includes('TEXTSPLIT'), true);
  assert.equal(pickerNames.includes('PRODUCT'), true);
  assert.equal(pickerNames.includes('COUNTBLANK'), true);
  assert.equal(pickerNames.includes('MINIFS'), true);
  assert.equal(pickerNames.includes('MAXIFS'), true);
  assert.equal(pickerNames.includes('PI'), true);
  assert.equal(pickerNames.includes('MROUND'), true);
  assert.equal(pickerNames.includes('PMT'), true);
  assert.equal(pickerNames.includes('NPER'), true);
  assert.equal(pickerNames.includes('RATE'), true);
  assert.equal(pickerNames.includes('IPMT'), true);
  assert.equal(pickerNames.includes('NPV'), true);
  assert.equal(pickerNames.includes('IRR'), true);
  assert.equal(pickerNames.includes('XNPV'), true);
  assert.equal(pickerNames.includes('XIRR'), true);
  assert.equal(pickerNames.includes('ROW'), true);
  assert.equal(pickerNames.includes('ADDRESS'), true);
  assert.equal(pickerNames.includes('INDIRECT'), true);
  assert.equal(pickerNames.includes('OFFSET'), true);
  assert.equal(pickerNames.includes('COLUMNS'), true);
  assert.equal(pickerNames.includes('HSTACK'), true);
  assert.equal(pickerNames.includes('VSTACK'), true);
  assert.equal(pickerNames.includes('TAKE'), true);
  assert.equal(pickerNames.includes('DROP'), true);
  assert.equal(pickerNames.includes('CHOOSECOLS'), true);
  assert.equal(pickerNames.includes('CHOOSEROWS'), true);
  assert.equal(pickerNames.includes('TOCOL'), true);
  assert.equal(pickerNames.includes('TOROW'), true);
  assert.equal(pickerNames.includes('WRAPROWS'), true);
  assert.equal(pickerNames.includes('WRAPCOLS'), true);
  assert.equal(pickerNames.includes('EXPAND'), true);
  assert.equal(pickerNames.includes('NETWORKDAYS'), true);
  assert.equal(pickerNames.includes('WORKDAY'), true);
  assert.equal(createFormulaTemplate('XLOOKUP', {
    firstCell: 'A2',
    firstColumnRange: 'A2:A10',
    lastColumnRange: 'D2:D10',
  }), '=XLOOKUP(A2,A2:A10,D2:D10,"")');
  assert.equal(createFormulaTemplate('LOOKUP', {
    firstCell: 'A2',
    firstColumnRange: 'A2:A10',
    lastColumnRange: 'D2:D10',
  }), '=LOOKUP(A2,A2:A10,D2:D10)');
  assert.equal(createFormulaTemplate('XMATCH', {firstCell: 'A2', range: 'A2:A10'}), '=XMATCH(A2,A2:A10,0)');
  assert.equal(createFormulaTemplate('SORTBY', {
    range: 'A1:D4',
    firstColumnRange: 'A1:A4',
  }), '=SORTBY(A1:D4,A1:A4,1)');
  assert.equal(createFormulaTemplate('RANDARRAY', {rowCount: 4, lastColumnIndex: 4}), '=RANDARRAY(4,4)');
  assert.equal(createFormulaTemplate('IFERROR', {firstCell: 'B2'}), '=IFERROR(B2,"")');
  assert.equal(createFormulaTemplate('XOR', {firstCell: 'B2', lastCell: 'C2'}), '=XOR(B2>0,C2>0)');
  assert.equal(createFormulaTemplate('TYPE', {firstCell: 'B2'}), '=TYPE(B2)');
  assert.equal(createFormulaTemplate('ERROR.TYPE', {firstCell: 'B2'}), '=ERROR.TYPE(1/0)');
  assert.equal(createFormulaTemplate('FORMULATEXT', {firstCell: 'B2'}), '=FORMULATEXT(B2)');
  assert.equal(createFormulaTemplate('MROUND', {firstCell: 'B2'}), '=MROUND(B2,5)');
  assert.equal(createFormulaTemplate('GCD', {range: 'A1:A3'}), '=GCD(12,8)');
  assert.equal(createFormulaTemplate('COMBIN', {firstCell: 'B2'}), '=COMBIN(B2,2)');
  assert.equal(createFormulaTemplate('TIME'), '=TIME(9,30,0)');
  assert.equal(createFormulaTemplate('DATEVALUE'), '=DATEVALUE("2026-01-01")');
  assert.equal(createFormulaTemplate('TIMEVALUE'), '=TIMEVALUE("9:30 AM")');
  assert.equal(createFormulaTemplate('WEEKNUM', {firstCell: 'B2'}), '=WEEKNUM(B2,2)');
  assert.equal(createFormulaTemplate('ISOWEEKNUM', {firstCell: 'B2'}), '=ISOWEEKNUM(B2)');
  assert.equal(createFormulaTemplate('DAYS360', {firstCell: 'B2', lastCell: 'C2'}), '=DAYS360(B2,C2)');
  assert.equal(createFormulaTemplate('YEARFRAC', {firstCell: 'B2', lastCell: 'C2'}), '=YEARFRAC(B2,C2,1)');
  assert.equal(createFormulaTemplate('HOUR', {firstCell: 'B2'}), '=HOUR(B2)');
  assert.equal(createFormulaTemplate('STDEV.S', {range: 'A1:A4'}), '=STDEV.S(A1:A4)');
  assert.equal(createFormulaTemplate('MODE.SNGL', {range: 'A1:A4'}), '=MODE.SNGL(1,1,2)');
  assert.equal(createFormulaTemplate('GEOMEAN', {range: 'A1:A4'}), '=GEOMEAN(1,2,4)');
  assert.equal(createFormulaTemplate('RANK.AVG', {firstCell: 'B2', range: 'A1:A4'}), '=RANK.AVG(B2,A1:A4)');
  assert.equal(createFormulaTemplate('CORREL', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'B1:B4',
  }), '=CORREL(A1:A4,B1:B4)');
  assert.equal(createFormulaTemplate('SLOPE', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'B1:B4',
  }), '=SLOPE(B1:B4,A1:A4)');
  assert.equal(createFormulaTemplate('FORECAST.LINEAR', {
    firstCell: 'C1',
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'B1:B4',
  }), '=FORECAST.LINEAR(C1,B1:B4,A1:A4)');
  assert.equal(createFormulaTemplate('PERCENTILE.INC', {range: 'A1:A4'}), '=PERCENTILE.INC(A1:A4,0.9)');
  assert.equal(createFormulaTemplate('QUARTILE.INC', {range: 'A1:A4'}), '=QUARTILE.INC(A1:A4,3)');
  assert.equal(createFormulaTemplate('PROPER', {firstCell: 'B2'}), '=PROPER(B2)');
  assert.equal(createFormulaTemplate('TEXT', {firstCell: 'B2'}), '=TEXT(B2,"#,##0.00")');
  assert.equal(createFormulaTemplate('NUMBERVALUE', {firstCell: 'B2'}), '=NUMBERVALUE(B2)');
  assert.equal(createFormulaTemplate('FIXED', {firstCell: 'B2'}), '=FIXED(B2,2)');
  assert.equal(createFormulaTemplate('TEXTBEFORE', {firstCell: 'B2'}), '=TEXTBEFORE("ada lovelace"," ")');
  assert.equal(createFormulaTemplate('TEXTAFTER', {firstCell: 'B2'}), '=TEXTAFTER("ada lovelace"," ")');
  assert.equal(createFormulaTemplate('TEXTSPLIT'), '=TEXTSPLIT("north,south|east,west",",","|")');
  assert.equal(createFormulaTemplate('TEXTJOIN', {range: 'A1:A3'}), '=TEXTJOIN(", ",TRUE,A1:A3)');
  assert.equal(createFormulaTemplate('PRODUCT', {range: 'A1:A4'}), '=PRODUCT(A1:A4)');
  assert.equal(createFormulaTemplate('COUNTBLANK', {range: 'A1:A4'}), '=COUNTBLANK(A1:A4)');
  assert.equal(createFormulaTemplate('MINIFS', {range: 'A1:A4'}), '=MINIFS(A1:A4,A1:A4,">0")');
  assert.equal(createFormulaTemplate('MAXIFS', {range: 'A1:A4'}), '=MAXIFS(A1:A4,A1:A4,">0")');
  assert.equal(createFormulaTemplate('PI'), '=PI()');
  assert.equal(createFormulaTemplate('LOG', {firstCell: 'B2'}), '=LOG(B2,10)');
  assert.equal(createFormulaTemplate('RADIANS', {firstCell: 'B2'}), '=RADIANS(B2)');
  assert.equal(createFormulaTemplate('PMT', {firstCell: 'B2'}), '=PMT(5%/12,60,B2)');
  assert.equal(createFormulaTemplate('NPER', {firstCell: 'B2'}), '=NPER(5%/12,-500,B2)');
  assert.equal(createFormulaTemplate('RATE', {firstCell: 'B2'}), '=RATE(12,-100,1000)');
  assert.equal(createFormulaTemplate('IPMT', {firstCell: 'B2'}), '=IPMT(5%/12,1,60,B2)');
  assert.equal(createFormulaTemplate('PPMT', {firstCell: 'B2'}), '=PPMT(5%/12,1,60,B2)');
  assert.equal(createFormulaTemplate('NPV', {range: 'A1:A4'}), '=NPV(10%,A1:A4)');
  assert.equal(createFormulaTemplate('IRR', {range: 'A1:A4'}), '=IRR(A1:A4)');
  assert.equal(createFormulaTemplate('XNPV', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'B1:B4',
  }), '=XNPV(10%,A1:A4,B1:B4)');
  assert.equal(createFormulaTemplate('XIRR', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'B1:B4',
  }), '=XIRR(A1:A4,B1:B4)');
  assert.equal(createFormulaTemplate('ROW', {firstCell: 'B2'}), '=ROW(B2)');
  assert.equal(createFormulaTemplate('ADDRESS', {firstCell: 'B2'}), '=ADDRESS(ROW(B2),COLUMN(B2))');
  assert.equal(createFormulaTemplate('INDIRECT', {firstCell: 'B2'}), '=INDIRECT("B2")');
  assert.equal(createFormulaTemplate('OFFSET', {firstCell: 'B2'}), '=OFFSET(B2,1,0)');
  assert.equal(createFormulaTemplate('COLUMNS', {range: 'A1:D4'}), '=COLUMNS(A1:D4)');
  assert.equal(createFormulaTemplate('HSTACK', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'D1:D4',
  }), '=HSTACK(A1:A4,D1:D4)');
  assert.equal(createFormulaTemplate('VSTACK', {
    firstColumnRange: 'A1:A4',
    lastColumnRange: 'D1:D4',
  }), '=VSTACK(A1:A4,D1:D4)');
  assert.equal(createFormulaTemplate('TAKE', {range: 'A1:D4', rowCount: 4}), '=TAKE(A1:D4,2)');
  assert.equal(createFormulaTemplate('DROP', {range: 'A1:D4'}), '=DROP(A1:D4,1)');
  assert.equal(createFormulaTemplate('CHOOSECOLS', {range: 'A1:D4', lastColumnIndex: 4}), '=CHOOSECOLS(A1:D4,1,4)');
  assert.equal(createFormulaTemplate('CHOOSEROWS', {range: 'A1:D4', rowCount: 4}), '=CHOOSEROWS(A1:D4,1,4)');
  assert.equal(createFormulaTemplate('TOCOL', {range: 'A1:D4'}), '=TOCOL(A1:D4)');
  assert.equal(createFormulaTemplate('TOROW', {range: 'A1:D4'}), '=TOROW(A1:D4)');
  assert.equal(createFormulaTemplate('WRAPROWS', {firstColumnRange: 'A1:A4'}), '=WRAPROWS(A1:A4,2)');
  assert.equal(createFormulaTemplate('WRAPCOLS', {firstColumnRange: 'A1:A4'}), '=WRAPCOLS(A1:A4,2)');
  assert.equal(createFormulaTemplate('EXPAND', {range: 'A1:D4', rowCount: 4, lastColumnIndex: 4}), '=EXPAND(A1:D4,5,5,"")');
  assert.equal(createFormulaTemplate('NETWORKDAYS', {firstCell: 'A2', lastCell: 'D10'}), '=NETWORKDAYS(A2,D10)');
  assert.equal(createFormulaTemplate('NETWORKDAYS.INTL', {firstCell: 'A2', lastCell: 'D10'}), '=NETWORKDAYS.INTL(A2,D10,1)');
  assert.equal(createFormulaTemplate('WORKDAY', {firstCell: 'B2'}), '=WORKDAY(B2,5)');
  assert.equal(createFormulaTemplate('WORKDAY.INTL', {firstCell: 'B2'}), '=WORKDAY.INTL(B2,5,1)');
  assert.deepEqual(
    getFormulaFunctionHelp('XLOOKUP', {
      firstCell: 'A2',
      firstColumnRange: 'A2:A10',
      lastColumnRange: 'D2:D10',
    }),
    {
      name: 'XLOOKUP',
      category: 'Lookup',
      picker: true,
      signature: 'XLOOKUP(search_key, lookup_range, result_range, [missing], [match_mode], [search_mode])',
      description: 'Finds a value in one range and returns the paired result.',
      example: '=XLOOKUP(A2,A2:A10,D2:D10,"")',
    },
  );
  assert.equal(getFormulaFunctionHelp('OFFSET', {firstCell: 'B2'}).signature, 'OFFSET(reference, rows, columns, [height], [width])');
  assert.deepEqual(
    getFormulaFunctionHelp('LET', {firstCell: 'B2'}),
    {
      name: 'LET',
      category: 'Logical',
      picker: true,
      signature: 'LET(name1, value1, calculation_or_name2, [value2], ...)',
      description: 'Assigns names to intermediate formula results and returns a final calculation.',
      example: '=LET(value,B2,value*2)',
    },
  );
  assert.deepEqual(
    getFormulaSignatureParts('XLOOKUP(search_key, lookup_range, result_range, [missing], [match_mode], [search_mode])', 1),
    {
      name: 'XLOOKUP',
      arguments: [
        {raw: 'search_key', label: 'search_key', optional: false, variadic: false, active: false},
        {raw: 'lookup_range', label: 'lookup_range', optional: false, variadic: false, active: true},
        {raw: 'result_range', label: 'result_range', optional: false, variadic: false, active: false},
        {raw: '[missing]', label: 'missing', optional: true, variadic: false, active: false},
        {raw: '[match_mode]', label: 'match_mode', optional: true, variadic: false, active: false},
        {raw: '[search_mode]', label: 'search_mode', optional: true, variadic: false, active: false},
      ],
      activeArgumentIndex: 1,
      hasCall: true,
    },
  );
  assert.deepEqual(
    getFormulaSignatureParts('SUM(number1, [number2], ...)', 8),
    {
      name: 'SUM',
      arguments: [
        {raw: 'number1', label: 'number1', optional: false, variadic: false, active: false},
        {raw: '[number2]', label: 'number2', optional: true, variadic: false, active: false},
        {raw: '...', label: '...', optional: false, variadic: true, active: true},
      ],
      activeArgumentIndex: 2,
      hasCall: true,
    },
  );
  assert.deepEqual(
    getFormulaSignatureParts('IFS(condition1, value1, [condition2, value2], ...)', 2).arguments[2],
    {raw: '[condition2, value2]', label: 'condition2, value2', optional: true, variadic: false, active: true},
  );
  assert.deepEqual(getFormulaEditorHint('=XLOOKUP(A2,', '=XLOOKUP(A2,'.length, {
    firstCell: 'A2',
    firstColumnRange: 'A2:A10',
    lastColumnRange: 'D2:D10',
  }), {
    isFormula: true,
    functionName: 'XLOOKUP',
    argumentIndex: 1,
    arguments: ['search_key', 'lookup_range', 'result_range', '[missing]', '[match_mode]', '[search_mode]'],
    activeArgument: 'lookup_range',
    activeArgumentHelp: {
      argument: 'lookup_range',
      description: 'The one-dimensional row or column to search. It must contain the same number of cells as result_range.',
    },
    help: {
      name: 'XLOOKUP',
      category: 'Lookup',
      picker: true,
      signature: 'XLOOKUP(search_key, lookup_range, result_range, [missing], [match_mode], [search_mode])',
      description: 'Finds a value in one range and returns the paired result.',
      example: '=XLOOKUP(A2,A2:A10,D2:D10,"")',
    },
  });
  assert.equal(
    getFormulaFunctionHelp('COUNTIFS').signature,
    'COUNTIFS(criteria_range1, criterion1, [criteria_range2, criterion2], ...)',
  );
  assert.equal(
    getFormulaEditorHint('=COUNTIFS(A1:A3,">0",B1:B3', '=COUNTIFS(A1:A3,">0",B1:B3'.length).activeArgument,
    'criteria_range2',
  );
  assert.deepEqual(
    getFormulaEditorHint('=COUNTIFS(A1:A3,">0",B1:B3', '=COUNTIFS(A1:A3,">0",B1:B3'.length).activeArgumentHelp,
    {
      argument: 'criteria_range2',
      description: 'A range evaluated against its paired criterion. Criteria ranges should use the same shape.',
    },
  );
  assert.equal(
    getFormulaEditorHint('=COUNTIFS(A1:A3,">0",B1:B3,', '=COUNTIFS(A1:A3,">0",B1:B3,'.length).activeArgument,
    'criterion2',
  );
  assert.deepEqual(
    getFormulaEditorHint('=XLOOKUP(A2,A2:A10,D2:D10,,', '=XLOOKUP(A2,A2:A10,D2:D10,,'.length).activeArgumentHelp,
    {
      argument: 'match_mode',
      description: 'Use 0 for exact match, -1 for exact or next smaller, 1 for exact or next larger, or 2 for wildcard match.',
      options: ['0 exact match', '-1 exact or next smaller', '1 exact or next larger', '2 wildcard match'],
    },
  );
  assert.deepEqual(getFormulaEditorHint('=MID("Ada",', '=MID("Ada",'.length), {
    isFormula: true,
    functionName: 'MID',
    argumentIndex: 1,
    arguments: ['text', 'start_num', 'num_chars'],
    activeArgument: 'start_num',
    activeArgumentHelp: {
      argument: 'start_num',
      description: 'The one-based character position where the text search or extraction starts.',
    },
    help: {
      name: 'MID',
      category: 'Text',
      picker: true,
      signature: 'MID(text, start_num, num_chars)',
      description: 'Returns characters from the middle of text.',
      example: '=MID(A1,1,3)',
    },
  });
  assert.deepEqual(
    getFormulaEditorHint('=WEEKNUM(A1,', '=WEEKNUM(A1,'.length).activeArgumentHelp,
    {
      argument: 'type',
      description: 'Choose the week numbering system and week start day.',
      options: ['1 Sunday start', '2 Monday start', '21 ISO week number'],
    },
  );
  assert.equal(
    getFormulaEditorHint('=SUMIFS(A1:A3,B1:B3,">0",', '=SUMIFS(A1:A3,B1:B3,">0",'.length).activeArgument,
    'criteria_range2',
  );
  assert.equal(
    getFormulaEditorHint('=IFS(A1>0,"yes",', '=IFS(A1>0,"yes",'.length).activeArgument,
    'condition2',
  );
  assert.equal(getFormulaEditorHint('=SUM(AVERAGE(A1,', '=SUM(AVERAGE(A1,'.length).functionName, 'AVERAGE');
  assert.deepEqual(completeFormulaFunctionDraft('=SU', 'SUM'), {value: '=SUM(', cursor: 5});
  assert.deepEqual(completeFormulaFunctionDraft('=1+XL', 'XLOOKUP'), {value: '=1+XLOOKUP(', cursor: 11});
  assert.deepEqual(completeFormulaFunctionDraft('=su', 'sum', '=su'.length, {pairedParentheses: true}), {value: '=SUM()', cursor: 5});
  assert.deepEqual(completeFormulaFunctionDraft('=1+XL', 'XLOOKUP', '=1+XL'.length, {pairedParentheses: true}), {value: '=1+XLOOKUP()', cursor: 11});
  assert.deepEqual(completeFormulaFunctionDraft('=su(A1)', 'SUM', '=su'.length, {pairedParentheses: true}), {value: '=SUM(A1)', cursor: 4});
  assert.deepEqual(completeFormulaIdentifierDraft('=Rev', 'Revenue'), {value: '=Revenue', cursor: 8});
  assert.deepEqual(completeFormulaSheetNameDraft('=Inp', 'Inputs', '=Inp'.length), {value: '=Inputs!', cursor: 8});
  assert.deepEqual(completeFormulaSheetNameDraft('=Q1', 'Q1 Sales', '=Q1'.length), {value: "='Q1 Sales'!", cursor: 12});
  assert.deepEqual(completeFormulaSheetNameDraft('=Bob', "Bob's Plan", '=Bob'.length), {value: "='Bob''s Plan'!", cursor: "='Bob''s Plan'!".length});
  assert.deepEqual(completeFormulaSheetNameDraft("='Q1", 'Q1 Sales', "='Q1".length), {value: "='Q1 Sales'!", cursor: 12});
  assert.deepEqual(completeFormulaSheetNameDraft("='Bob", "Bob's Plan", "='Bob".length), {value: "='Bob''s Plan'!", cursor: "='Bob''s Plan'!".length});
  assert.deepEqual(completeFormulaSheetNameDraft("=SUM('Bob", "Bob's Plan", "=SUM('Bob".length), {value: "=SUM('Bob''s Plan'!", cursor: "=SUM('Bob''s Plan'!".length});
  assert.deepEqual(completeFormulaSheetNameDraft('=SUM(In', 'Inputs', '=SUM(In'.length), {value: '=SUM(Inputs!', cursor: 12});
  assert.equal(
    getFormulaEditorSuggestions('=ROUNDU', '=ROUNDU'.length).some((item) => item.name === 'ROUNDUP'),
    true,
  );
  assert.equal(getFormulaEditorSuggestions('=su', '=su'.length)[0].name, 'SUM');
  assert.equal(getFormulaEditorSuggestions('=', '='.length)[0].name, 'SUM');
  assert.equal(
    getFormulaEditorSuggestions('=A', '=A'.length).some((item) => item.name === 'AVERAGE'),
    true,
  );
  assert.deepEqual(getFormulaEditorSuggestions('=A1', '=A1'.length), []);
  assert.deepEqual(getFormulaEditorSuggestions('=SUM(A1', '=SUM(A1'.length), []);
  assert.deepEqual(getFormulaEditorSuggestions('=SUM(A1:B', '=SUM(A1:B'.length), []);
  assert.deepEqual(getFormulaEditorSuggestions('=Inputs!A', '=Inputs!A'.length), []);
  assert.deepEqual(getFormulaEditorSuggestions('="SUM', '="SUM'.length), []);
  assert.equal(formulaReferenceForSelection({r1: 0, c1: 0, r2: 0, c2: 0}), 'A1');
  assert.equal(formulaReferenceForSelection({r1: 1, c1: 1, r2: 3, c2: 2}), 'B2:C4');
  assert.deepEqual(getFormulaEditorHint('=sum(a1,', '=sum(a1,'.length), {
    isFormula: true,
    functionName: 'SUM',
    argumentIndex: 1,
    arguments: ['number1', '[number2]', '...'],
    activeArgument: 'number2',
    activeArgumentHelp: {
      argument: 'number2',
      description: 'A number, cell, range, or expression to include in the calculation.',
    },
    help: {
      name: 'SUM',
      category: 'Math',
      picker: true,
      signature: 'SUM(number1, [number2], ...)',
      description: 'Adds numbers from values, cells, or ranges.',
      example: '=SUM(A1:B2)',
    },
  });
  assert.deepEqual(completeFormulaFunctionDraft('=su', 'sum'), {value: '=SUM(', cursor: 5});
  assert.deepEqual(insertFormulaReferenceDraft('=SUM(', 'A1:B3'), {value: '=SUM(A1:B3', cursor: 10});
  assert.deepEqual(insertFormulaReferenceDraft('', 'C5'), {value: '=C5', cursor: 3});
  assert.deepEqual(insertFormulaReferenceDraft('=SUM(A1)', 'B2:C4', '=SUM(A'.length), {value: '=SUM(B2:C4)', cursor: 10});
  assert.deepEqual(insertFormulaReferenceDraft('=SUM("A1",A1)', 'C3', '=SUM("A1",A'.length), {value: '=SUM("A1",C3)', cursor: 12});
  const absoluteCycleValues = [];
  let absoluteDraft = {value: '=A1', cursor: '=A1'.length};
  for (let index = 0; index < 4; index++) {
    absoluteDraft = cycleFormulaReferenceDraft(absoluteDraft.value, absoluteDraft.cursor);
    absoluteCycleValues.push(absoluteDraft.value);
  }
  assert.deepEqual(absoluteCycleValues, ['=$A$1', '=A$1', '=$A1', '=A1']);
  assert.equal(cycleFormulaReferenceDraft('=SUM(A1:B2)', '=SUM(A1'.length).value, '=SUM($A$1:$B$2)');
  assert.equal(cycleFormulaReferenceDraft("=SUM('Q1 Sales'!A1#)", "=SUM('Q1 Sales'!A".length).value, "=SUM('Q1 Sales'!$A$1#)");
  assert.equal(cycleFormulaReferenceDraft('=SUM(A:B,1:2)', '=SUM(A'.length).value, '=SUM($A:$B,1:2)');
  const formulaTokens = tokenizeFormulaEditorDraft('=SUM(A1:B2,Revenue,"A1",Inputs!C3,\'Q1 Sales\'!$D$4,F9#,TRUE,#DIV/0!)', {
    sheetId: 'model',
    namedRanges: [
      {name: 'Revenue', sheetId: 'inputs', range: {r1: 0, c1: 0, r2: 1, c2: 0}, scope: 'workbook'},
    ],
  })
    .filter((token) => !['operator', 'paren', 'delimiter', 'space'].includes(token.type))
    .map((token) => ({type: token.type, value: token.value, ...(token.color ? {color: token.color} : {})}));
  assert.deepEqual(formulaTokens, [
    {type: 'function', value: 'SUM'},
    {type: 'reference', value: 'A1:B2', color: 'blue'},
    {type: 'namedRange', value: 'Revenue', color: 'green'},
    {type: 'string', value: '"A1"'},
    {type: 'reference', value: 'Inputs!C3', color: 'purple'},
    {type: 'reference', value: "'Q1 Sales'!$D$4", color: 'orange'},
    {type: 'reference', value: 'F9#', color: 'teal'},
    {type: 'boolean', value: 'TRUE'},
    {type: 'error', value: '#DIV/0!'},
  ]);
  assert.deepEqual(
    tokenizeFormulaEditorDraft('=sum(a1,TRUE)')
      .filter((token) => !['operator', 'paren', 'delimiter'].includes(token.type))
      .map((token) => ({type: token.type, value: token.value})),
    [
      {type: 'function', value: 'sum'},
      {type: 'reference', value: 'a1'},
      {type: 'boolean', value: 'TRUE'},
    ],
  );
  assert.deepEqual(
    tokenizeFormulaEditorDraft("=SUM('Bob''s Plan'!$A$1)")
      .filter((token) => !['operator', 'paren', 'delimiter'].includes(token.type))
      .map((token) => ({type: token.type, value: token.value})),
    [
      {type: 'function', value: 'SUM'},
      {type: 'reference', value: "'Bob''s Plan'!$A$1"},
    ],
  );
  assert.equal(diagnoseFormulaDraft('=sum(A1)').some((diagnostic) => diagnostic.code === 'UNKNOWN_FUNCTION'), false);
  assert.equal(
    diagnoseFormulaDraft('=COUNTIFS(A1:A3,">0",B1:B3)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_PAIRS'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SUMIFS(A1:A3,B1:B3,">0",C1:C3)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_PAIRS'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=IFS(A1>0,"yes",A1<0)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_PAIRS'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=LET(x,1,y,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_FINAL_CALCULATION'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=LET(x,1,x+1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_FINAL_CALCULATION'),
    false,
  );
  assert.equal(
    diagnoseFormulaDraft('=COUNTIFS(A1:A3,">0",B1:B2,">0")').some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SHAPE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SUMIFS(A1:A3,B1:B2,">0")').some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SHAPE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=XLOOKUP("Ada",A1:A3,B1:B2,"")').some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SIZE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SUMPRODUCT(A1:A3,B1:B2)').some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SHAPE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SORTBY(A1:B3,A1:A2,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_RANGE_SHAPE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=XLOOKUP("Ada",A1:A3,B1:B3,"",3)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=XMATCH("Ada",A1:A3,0,0)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=MATCH("Ada",A1:A3,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SORT(A1:B3,1,0)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SORTBY(A1:B3,A1:A3,0)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=TOCOL(A1:B3,4)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=TEXTSPLIT("a,b",",",,,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=INDEX(A1:B2,3,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=VLOOKUP("Ada",A1:B3,3,FALSE)').some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=HLOOKUP("Score",A1:C2,3,FALSE)').some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SORT(A1:B3,3,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=CHOOSECOLS(A1:B3,3)').some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=CHOOSEROWS(A1:B3,-4)').some((diagnostic) => diagnostic.code === 'FUNCTION_REFERENCE_INDEX'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=WEEKDAY(DATE(2026,6,27),99)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=WEEKNUM(DATE(2026,1,4),99)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=YEARFRAC(DATE(2026,1,1),DATE(2026,7,1),9)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=NETWORKDAYS.INTL(DATE(2026,6,29),DATE(2026,7,5),"1111111")').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=WORKDAY.INTL(DATE(2026,6,29),5,99)').some((diagnostic) => diagnostic.code === 'FUNCTION_OPTION_VALUE'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=SEQUENCE(0,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=RANDARRAY(0,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=RANDARRAY(1,1,10,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=TAKE(A1:B3,0)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=WRAPROWS(A1:A3,0)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=EXPAND(A1:B3,2,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=PERCENTILE.INC(A1:A3,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=QUARTILE.EXC(A1:A3,4)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=LEFT("Ada",-1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=MID("Ada",0,1)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=FIND("A","Ada",0)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.equal(
    diagnoseFormulaDraft('=PMT(5%/12,60,30000,0,2)').some((diagnostic) => diagnostic.code === 'FUNCTION_ARGUMENT_DOMAIN'),
    true,
  );
  assert.deepEqual(
    getFormulaEditorReferenceHighlights('=SUM(A1:B2,Inputs!C:C,Other!A1,Revenue,F9#,"A1")', {
      sheetId: 'inputs',
      sheetName: 'Inputs',
      sheetRowCount: 20,
      sheetColCount: 8,
      namedRanges: [
        {name: 'Revenue', sheetId: 'inputs', range: {r1: 4, c1: 1, r2: 5, c2: 2}, scope: 'workbook'},
      ],
      getSpillRangeForCell: (_sheetName, row, col) => (row === 8 && col === 5 ? {r1: 8, c1: 5, r2: 9, c2: 6} : null),
    }).map((item) => ({reference: item.reference, range: item.range, color: item.color})),
    [
      {reference: 'A1:B2', range: {r1: 0, c1: 0, r2: 1, c2: 1}, color: 'blue'},
      {reference: 'Inputs!C:C', range: {r1: 0, c1: 2, r2: 19, c2: 2}, color: 'green'},
      {reference: 'Revenue', range: {r1: 4, c1: 1, r2: 5, c2: 2}, color: 'orange'},
      {reference: 'F9#', range: {r1: 8, c1: 5, r2: 9, c2: 6}, color: 'teal'},
    ],
  );
  assert.deepEqual(
    getFormulaEditorReferenceHighlights("=SUM('Q1 Sales'!$D$4,2:3,A:B)", {
      sheetName: 'Q1 Sales',
      sheetRowCount: 12,
      sheetColCount: 6,
    }).map((item) => item.range),
    [
      {r1: 3, c1: 3, r2: 3, c2: 3},
      {r1: 1, c1: 0, r2: 2, c2: 5},
      {r1: 0, c1: 0, r2: 11, c2: 1},
    ],
  );
  assert.deepEqual(tokenizeFormulaEditorDraft('plain value'), [{type: 'text', value: 'plain value', start: 0, end: 11}]);
  assert.deepEqual(
    getFormulaEditorSuggestions('=Rev', '=Rev'.length, {
      sheetId: 'model',
      namedRanges: [
        {name: 'Revenue', sheetId: 'inputs', range: {r1: 0, c1: 0, r2: 1, c2: 0}, scope: 'workbook'},
        {name: 'LocalOnly', sheetId: 'inputs', range: {r1: 0, c1: 1, r2: 0, c2: 1}, scope: 'sheet'},
      ],
    }).filter((item) => item.type === 'namedRange'),
    [{
      type: 'namedRange',
      name: 'Revenue',
      label: 'Revenue',
      detail: 'Named range',
      signature: 'inputs!A1:A2',
      description: 'Named range',
    }],
  );
  assert.deepEqual(
    getFormulaEditorSuggestions('=Re', '=Re'.length, {
      sheetId: 'model',
      namedRanges: [
        {name: 'Revenue', sheetId: 'inputs', range: {r1: 0, c1: 0, r2: 1, c2: 0}, scope: 'workbook'},
      ],
    }).slice(0, 3).map((item) => `${item.type}:${item.name}`),
    ['namedRange:Revenue', 'function:REPT', 'function:REPLACE'],
  );
  assert.equal(
    getFormulaEditorSuggestions('=Su', '=Su'.length, {
      sheetId: 'model',
      namedRanges: [
        {name: 'Summary', sheetId: 'model', range: {r1: 0, c1: 0, r2: 0, c2: 0}, scope: 'sheet'},
      ],
    })[0].name,
    'SUM',
  );
  assert.deepEqual(
    getFormulaEditorSuggestions('=Inp', '=Inp'.length, {
      sheetId: 'model',
      sheets: [
        {id: 'model', name: 'Model'},
        {id: 'inputs', name: 'Inputs'},
        {id: 'q1', name: 'Q1 Sales'},
      ],
    }).slice(0, 1).map((item) => ({type: item.type, name: item.name, detail: item.detail, signature: item.signature})),
    [{type: 'sheet', name: 'Inputs', detail: 'Sheet', signature: 'Inputs!A1'}],
  );
  assert.deepEqual(
    getFormulaEditorSuggestions('=Q1', '=Q1'.length, {
      sheetId: 'model',
      sheets: [
        {id: 'model', name: 'Model'},
        {id: 'q1', name: 'Q1 Sales'},
      ],
    }).slice(0, 1).map((item) => ({type: item.type, name: item.name, signature: item.signature})),
    [{type: 'sheet', name: 'Q1 Sales', signature: "'Q1 Sales'!A1"}],
  );
  assert.deepEqual(
    getFormulaEditorSuggestions("='Q1", "='Q1".length, {
      sheetId: 'model',
      sheets: [
        {id: 'model', name: 'Model'},
        {id: 'q1', name: 'Q1 Sales'},
      ],
    }).slice(0, 1).map((item) => ({type: item.type, name: item.name, signature: item.signature})),
    [{type: 'sheet', name: 'Q1 Sales', signature: "'Q1 Sales'!A1"}],
  );
  assert.deepEqual(
    getFormulaEditorSuggestions('=Bob', '=Bob'.length, {
      sheetId: 'model',
      sheets: [
        {id: 'model', name: 'Model'},
        {id: 'bob', name: "Bob's Plan"},
      ],
    }).slice(0, 1).map((item) => ({type: item.type, name: item.name, signature: item.signature})),
    [{type: 'sheet', name: "Bob's Plan", signature: "'Bob''s Plan'!A1"}],
  );
  assert.deepEqual(
    getFormulaEditorSuggestions("='Bob", "='Bob".length, {
      sheetId: 'model',
      sheets: [
        {id: 'model', name: 'Model'},
        {id: 'bob', name: "Bob's Plan"},
      ],
    }).slice(0, 1).map((item) => ({type: item.type, name: item.name, signature: item.signature})),
    [{type: 'sheet', name: "Bob's Plan", signature: "'Bob''s Plan'!A1"}],
  );

  let workbook = createWorkbook({sheets: [{id: 'sheet-1', rowCount: 20, colCount: 10}]});
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '12'},
      {row: 1, col: 0, value: '-4'},
      {row: 2, col: 0, value: '8'},
      {row: 3, col: 0, value: '16'},
      {row: 0, col: 1, value: 'ada lovelace'},
      {row: 1, col: 1, value: '2026-01-01'},
      {row: 2, col: 1, value: '2026-01-10'},
      {row: 3, col: 1, value: '2026-01-20'},
      {row: 0, col: 2, value: '5'},
      {row: 1, col: 2, value: '7'},
      {row: 2, col: 2, value: '9'},
      {row: 3, col: 2, value: '11'},
      {row: 0, col: 3, value: '20'},
      {row: 1, col: 3, value: '30'},
      {row: 2, col: 3, value: '40'},
      {row: 3, col: 3, value: '50'},
      {row: 0, col: 4, value: '-1000'},
      {row: 1, col: 4, value: '500'},
      {row: 2, col: 4, value: '700'},
      {row: 0, col: 5, value: '44927'},
      {row: 1, col: 5, value: '44957'},
      {row: 2, col: 5, value: '45017'},
      {row: 0, col: 6, formula: '=A1+1'},
    ],
  }, {getDefaultCellValue: () => ''}).workbook;
  const lowerCaseWorkbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    row: 4,
    col: 0,
    formula: '=sum(a1:a4)+round(2.4,0)',
  }, {getDefaultCellValue: () => ''}).workbook;
  assert.equal(getCellDisplayValue(lowerCaseWorkbook, 'sheet-1', 4, 0), '34');
  const lowerCasePreview = previewFormulaDraft(workbook, 'sheet-1', 4, 1, '=xlookup(5,c1:c4,d1:d4,"")', {getDefaultCellValue: () => ''});
  assert.equal(lowerCasePreview.displayValue, '20');
  assert.equal(lowerCasePreview.error, undefined);
  assert.deepEqual(lowerCasePreview.diagnostics, []);
  for (const item of listFormulaFunctions({pickerOnly: true})) {
    const formula = createFormulaTemplate(item.name, {
      firstCell: 'A1',
      lastCell: 'A4',
      range: 'A1:D4',
      firstColumnRange: 'A1:A4',
      lastColumnRange: 'D1:D4',
      lastColumnIndex: 4,
      rowCount: 4,
      cashFlowRange: 'E1:E3',
      cashFlowDateRange: 'F1:F3',
      formulaCell: 'G1',
    });
    const preview = previewFormulaDraft(workbook, 'sheet-1', 9, 9, formula, {getDefaultCellValue: () => ''});
    assert.equal(preview.error, undefined, `${item.name} picker template failed evaluation: ${formula}`);
  }
  for (const item of listFormulaFunctions()) {
    const formula = createFormulaTemplate(item.name, {
      firstCell: 'A1',
      lastCell: 'A4',
      range: 'A1:D4',
      firstColumnRange: 'A1:A4',
      lastColumnRange: 'D1:D4',
      lastColumnIndex: 4,
      rowCount: 4,
      cashFlowRange: 'E1:E3',
      cashFlowDateRange: 'F1:F3',
      formulaCell: 'G1',
    });
    const preview = previewFormulaDraft(workbook, 'sheet-1', 9, 9, formula, {getDefaultCellValue: () => ''});
    if (item.name === 'NA') {
      assert.equal(preview.error, '#N/A', `${item.name} catalog template should intentionally return #N/A: ${formula}`);
    } else {
      assert.equal(preview.error, undefined, `${item.name} catalog template failed evaluation: ${formula}`);
    }
  }
});

test('range format commands format display values and undo cleanly', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '12.5'},
      {row: 0, col: 1, formula: '=A1*2'},
    ],
  }).workbook;

  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE_FORMAT,
    range: {r1: 0, c1: 0, r2: 0, c2: 1},
    format: {type: NumberFormatType.CURRENCY, currency: 'USD', decimals: 2},
  });

  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 0), '$12.50');
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 1), '$25.00');
  assert.deepEqual(workbook.sheets.get('sheet-1').cells.get('0:0').format, {type: 'currency', currency: 'USD', decimals: 2});

  workbook = undo(workbook);
  assert.equal(getCellDisplayValue(workbook, 'sheet-1', 0, 0), '12.5');
  assert.equal(workbook.sheets.get('sheet-1').cells.get('0:0').format, undefined);
});

test('range style commands style cells and undo cleanly', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: 'Styled'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE_STYLE,
    range: {r1: 0, c1: 0, r2: 0, c2: 1},
    style: {fontWeight: 700, backgroundColor: '#e0f2fe', color: '#075985', textAlign: 'center', border: '1px solid #64748b'},
  });

  assert.deepEqual(getCellRecord(workbook, 'sheet-1', 0, 0).style, {
    fontWeight: 700,
    backgroundColor: '#e0f2fe',
    color: '#075985',
    textAlign: 'center',
    border: '1px solid #64748b',
  });
  assert.deepEqual(getCellRecord(workbook, 'sheet-1', 0, 1).style, {
    fontWeight: 700,
    backgroundColor: '#e0f2fe',
    color: '#075985',
    textAlign: 'center',
    border: '1px solid #64748b',
  });

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.equal(getCellRawValue(restored, 'sheet-1', 0, 0), 'Styled');
  assert.equal(getCellRawValue(restored, 'sheet-1', 0, 1), '');
  assert.deepEqual(getCellRecord(restored, 'sheet-1', 0, 0).style, getCellRecord(workbook, 'sheet-1', 0, 0).style);

  workbook = undo(workbook);
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 0).style, undefined);
  assert.equal(getCellRecord(workbook, 'sheet-1', 0, 1), null);
});

test('sort range command orders rows and restores with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: 'Name'},
      {row: 0, col: 1, value: 'Score'},
      {row: 1, col: 0, value: 'Ada'},
      {row: 1, col: 1, value: '42'},
      {row: 2, col: 0, value: 'Grace'},
      {row: 2, col: 1, value: '99'},
      {row: 3, col: 0, value: 'Linus'},
      {row: 3, col: 1, value: '7'},
    ],
  });

  workbook = dispatchCommand(workbook, {
    type: CommandType.SORT_RANGE,
    range: {r1: 0, c1: 0, r2: 3, c2: 1},
    hasHeader: true,
    sortBy: [{col: 1, direction: 'desc', type: 'number'}],
  });

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), 'Grace');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 2, 0), 'Ada');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 3, 0), 'Linus');

  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 0), 'Ada');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 2, 0), 'Grace');
  assert.equal(getCellRawValue(workbook, 'sheet-1', 3, 0), 'Linus');
});

test('filter commands track visible rows and restore with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: 'Name'},
      {row: 0, col: 1, value: 'Score'},
      {row: 1, col: 0, value: 'Ada'},
      {row: 1, col: 1, value: '42'},
      {row: 2, col: 0, value: 'Grace'},
      {row: 2, col: 1, value: '99'},
      {row: 3, col: 0, value: 'Linus'},
      {row: 3, col: 1, value: '7'},
    ],
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_FILTER,
    id: 'scores',
    range: {r1: 0, c1: 0, r2: 3, c2: 1},
    criteria: [{col: 1, operator: 'gte', value: 40}],
  });

  assert.deepEqual(getVisibleRowsForSheet(workbook, 'sheet-1').visibleRows, [1, 2]);
  assert.deepEqual(getVisibleRowsForSheet(workbook, 'sheet-1').hiddenRows, [3]);

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.deepEqual(getVisibleRowsForSheet(restored, 'sheet-1').visibleRows, [1, 2]);

  workbook = undo(workbook);
  assert.equal(getVisibleRowsForSheet(workbook, 'sheet-1'), null);
});

test('merged ranges are validated, undoable, and serialized', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.MERGE_RANGE,
    range: {r1: 1, c1: 1, r2: 2, c2: 3},
  });

  assert.deepEqual(getMergeAtCell(workbook.sheets.get('sheet-1'), 2, 2).range, {r1: 1, c1: 1, r2: 2, c2: 3});
  assert.equal(listMergedRanges(workbook.sheets.get('sheet-1')).length, 1);
  assert.throws(() => dispatchCommand(workbook, {type: CommandType.MERGE_RANGE, range: {r1: 2, c1: 2, r2: 3, c2: 4}}), /overlaps/);

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.deepEqual(getMergeAtCell(restored.sheets.get('sheet-1'), 1, 1).range, {r1: 1, c1: 1, r2: 2, c2: 3});

  workbook = undo(workbook);
  assert.equal(getMergeAtCell(workbook.sheets.get('sheet-1'), 1, 1), null);
});

test('validation rules evaluate cells and restore with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_VALIDATION,
    rule: {
      range: {r1: 1, c1: 1, r2: 3, c2: 1},
      type: 'number',
      operator: 'between',
      min: 10,
      max: 20,
      message: 'Enter a score from 10 to 20',
    },
  });

  assert.equal(validateCellValue(workbook.sheets.get('sheet-1'), 1, 1, '15').valid, true);
  const invalid = validateCellValue(workbook.sheets.get('sheet-1'), 1, 1, '25');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.failures[0].message, 'Enter a score from 10 to 20');

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.equal(validateCellValue(restored.sheets.get('sheet-1'), 1, 1, '25').valid, false);

  workbook = undo(workbook);
  assert.equal(validateCellValue(workbook.sheets.get('sheet-1'), 1, 1, '25').valid, true);
});

test('conditional formatting rules style cells, shift structurally, and restore with undo', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1', rowCount: 8, colCount: 4}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '12'},
      {row: 2, col: 0, value: 'Review'},
    ],
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CONDITIONAL_FORMAT,
    rule: {
      range: {r1: 0, c1: 0, r2: 2, c2: 0},
      type: ConditionalFormatType.NUMBER,
      operator: 'gt',
      value: 10,
      style: {backgroundColor: '#d1fae5', color: '#064e3b'},
    },
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CONDITIONAL_FORMAT,
    rule: {
      range: {r1: 2, c1: 0, r2: 2, c2: 0},
      type: ConditionalFormatType.TEXT,
      operator: 'contains',
      value: 'view',
      style: {fontWeight: 700},
    },
  });

  const sheet = workbook.sheets.get('sheet-1');
  assert.equal(getConditionalFormatStyle(sheet, 0, 0, '2'), null);
  assert.deepEqual(getConditionalFormatStyle(sheet, 1, 0, '12'), {backgroundColor: '#d1fae5', color: '#064e3b', fontWeight: 600});
  assert.deepEqual(getConditionalFormatStyle(sheet, 2, 0, 'Review'), {backgroundColor: '#fff3bf', color: '#5f3d00', fontWeight: 700});
  assert.equal(getConditionalFormatRulesForCell(sheet, 2, 0).length, 2);

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.deepEqual(getConditionalFormatStyle(restored.sheets.get('sheet-1'), 1, 0, '12'), {backgroundColor: '#d1fae5', color: '#064e3b', fontWeight: 600});

  workbook = dispatchCommand(workbook, {type: CommandType.INSERT_ROWS, index: 1, count: 1});
  assert.deepEqual(
    Array.from(workbook.sheets.get('sheet-1').conditionalFormats.values()).map((rule) => rule.range),
    [{r1: 0, c1: 0, r2: 3, c2: 0}, {r1: 3, c1: 0, r2: 3, c2: 0}],
  );

  workbook = undo(workbook);
  assert.deepEqual(
    Array.from(workbook.sheets.get('sheet-1').conditionalFormats.values()).map((rule) => rule.range),
    [{r1: 0, c1: 0, r2: 2, c2: 0}, {r1: 2, c1: 0, r2: 2, c2: 0}],
  );
  const textRule = getConditionalFormatRulesForCell(workbook.sheets.get('sheet-1'), 2, 0).find((rule) => rule.type === ConditionalFormatType.TEXT);
  workbook = dispatchCommand(workbook, {type: CommandType.CLEAR_CONDITIONAL_FORMAT, id: textRule.id});
  assert.equal(getConditionalFormatRulesForCell(workbook.sheets.get('sheet-1'), 2, 0).length, 1);
  workbook = undo(workbook);
  assert.equal(getConditionalFormatRulesForCell(workbook.sheets.get('sheet-1'), 2, 0).length, 2);
});

test('named ranges are undoable and survive snapshots', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Revenue',
    sheetId: 'sheet-1',
    range: {r1: 1, c1: 1, r2: 10, c2: 4},
    comment: 'Quarterly revenue',
  });

  assert.equal(getNamedRange(workbook, 'Revenue').comment, 'Quarterly revenue');
  assert.equal(listNamedRanges(workbook).length, 1);

  workbook = undo(workbook);
  assert.equal(getNamedRange(workbook, 'Revenue'), null);
  workbook = redo(workbook);

  const restored = deserializeWorkbook(serializeWorkbook(workbook));
  assert.deepEqual(getNamedRange(restored, 'Revenue').range, {r1: 1, c1: 1, r2: 10, c2: 4});
});

test('named ranges participate in formula recalculation dependencies', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Inputs',
    sheetId: 'sheet-1',
    range: {r1: 0, c1: 0, r2: 1, c2: 0},
  });
  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 0, col: 1, formula: '=SUM(Inputs)'},
    ],
  });
  workbook = result.workbook;

  assert.equal(expandNamedRangesInFormula('=SUM(Inputs)', workbook.namedRanges, 'sheet-1'), '=SUM(A1:A2)');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '5');

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: '10'});
  workbook = result.workbook;

  assert.deepEqual(result.recalculated, ['0:1']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('sheet-1'), 0, 1), '13');
});

test('workbook-scoped named ranges resolve across sheets', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 5, colCount: 5},
    {id: 'model', name: 'Model', rowCount: 5, colCount: 5},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Revenue',
    sheetId: 'inputs',
    range: {r1: 0, c1: 0, r2: 1, c2: 0},
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
    ],
  });

  assert.equal(expandNamedRangesInFormula('=SUM(Revenue)', workbook.namedRanges, 'model'), "=SUM('inputs'!A1:A2)");
  assert.equal(getCellDisplayValue(dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'model',
    row: 0,
    col: 0,
    formula: '=SUM(Revenue)',
  }), 'model', 0, 0), '5');

  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=SUM(Revenue)'},
      {row: 1, col: 0, formula: '=A1+1'},
    ],
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '5');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '6');
  assert.deepEqual([...buildWorkbookDependencyGraph(workbook).dependentsByCell.get(workbookCellKey('inputs', 0, 0))], [workbookCellKey('model', 0, 0)]);

  result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'inputs',
    row: 0,
    col: 0,
    value: '10',
  }, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.deepEqual(result.recalculatedBySheet.model, ['0:0', '1:0']);
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '13');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '14');
});

test('named range expansion ignores text literals and sheet qualifiers', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 5, colCount: 5},
    {id: 'model', name: 'Model', rowCount: 5, colCount: 5},
    {id: 'revenue', name: 'Revenue', rowCount: 5, colCount: 5},
  ], activeSheetId: 'model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Inputs',
    sheetId: 'model',
    range: {r1: 0, c1: 1, r2: 1, c2: 1},
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'Revenue',
    sheetId: 'model',
    range: {r1: 0, c1: 2, r2: 0, c2: 2},
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [{row: 0, col: 0, value: '10'}],
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 1, value: '2'},
      {row: 1, col: 1, value: '3'},
      {row: 0, col: 2, value: '7'},
    ],
  });

  assert.equal(
    expandNamedRangesInFormula('="Inputs"&Inputs!A1+SUM(Inputs)+Revenue!A1+SUM(Revenue)', workbook.namedRanges, 'model'),
    '="Inputs"&Inputs!A1+SUM(B1:B2)+Revenue!A1+SUM(C1:C1)',
  );

  const graph = buildWorkbookDependencyGraph(dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'model',
    row: 2,
    col: 0,
    formula: '="Inputs"&Inputs!A1+SUM(Inputs)+Revenue!A1+SUM(Revenue)',
  }));

  assert.deepEqual([...graph.precedentsByCell.get(workbookCellKey('model', 2, 0))], [
    workbookCellKey('inputs', 0, 0),
    workbookCellKey('model', 0, 1),
    workbookCellKey('model', 1, 1),
    workbookCellKey('revenue', 0, 0),
    workbookCellKey('model', 0, 2),
  ]);
});

test('multi-sheet formulas resolve sheet references and recalculate from source sheet edits', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs'},
    {id: 'model', name: 'Model'},
    {id: 'fy-2026', name: 'FY 2026'},
    {id: 'bobs-plan', name: "Bob's Plan"},
  ], activeSheetId: 'model'});

  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 2, col: 0, value: '4'},
      {row: 0, col: 1, value: 'West'},
      {row: 1, col: 1, value: 'East'},
      {row: 2, col: 1, value: 'West'},
    ],
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'fy-2026',
    row: 0,
    col: 0,
    value: '21',
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CELL,
    sheetId: 'bobs-plan',
    row: 0,
    col: 0,
    value: '6',
  });

  assert.equal(
    getCellDisplayValue(dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'model', row: 4, col: 0, formula: '=Inputs!A1+1'}), 'model', 4, 0),
    '3',
  );
  assert.equal(
    getCellDisplayValue(dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'model', row: 5, col: 0, formula: "='Bob''s Plan'!A1+1"}), 'model', 5, 0),
    '7',
  );

  let result = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=Inputs!A1+Inputs!A2'},
      {row: 1, col: 0, formula: '=SUM(Inputs!A1:A3)'},
      {row: 2, col: 0, formula: "='FY 2026'!A1*2"},
      {row: 3, col: 0, formula: '=XLOOKUP("West",Inputs!B1:B3,Inputs!A1:A3,"missing",0,-1)'},
    ],
  });
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '5');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '9');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 2, 0), '42');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 3, 0), '4');
  assert.deepEqual(result.recalculatedBySheet.model, ['0:0', '1:0', '2:0', '3:0']);

  result = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, sheetId: 'inputs', row: 0, col: 0, value: '10'});
  workbook = result.workbook;

  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '13');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '17');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 2, 0), '42');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 3, 0), '4');
  assert.deepEqual(result.recalculatedBySheet.model, ['0:0', '1:0', '3:0']);
  assert.deepEqual(result.recalculatedBySheet['fy-2026'], []);
});

test('structural row commands shift sparse cells, metadata, formulas, and undo exactly', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 10, colCount: 8},
    {id: 'model', name: 'Model', rowCount: 10, colCount: 8},
  ], activeSheetId: 'inputs'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 1, col: 0, value: '3'},
      {row: 1, col: 1, value: 'Moved'},
      {row: 0, col: 2, formula: '=SUM(A1:A2)'},
    ],
  });
  workbook = dispatchCommand(workbook, {type: CommandType.RESIZE_ROW, sheetId: 'inputs', row: 1, size: 44});
  workbook = dispatchCommand(workbook, {type: CommandType.MERGE_RANGE, sheetId: 'inputs', range: {r1: 1, c1: 3, r2: 2, c2: 4}});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_VALIDATION,
    sheetId: 'inputs',
    rule: {range: {r1: 1, c1: 0, r2: 2, c2: 0}, type: 'number', operator: 'gte', value: 0},
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_NAMED_RANGE,
    name: 'InputRows',
    sheetId: 'inputs',
    range: {r1: 0, c1: 0, r2: 1, c2: 0},
  });
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=SUM(Inputs!A1:A2)'},
      {row: 1, col: 0, formula: '=SUM(Inputs!2:2)'},
    ],
  }, {getDefaultCellValue: () => ''}).workbook;

  const before = workbook;
  let result = dispatchCommandWithRecalculation(workbook, {type: CommandType.INSERT_ROWS, sheetId: 'inputs', index: 1, count: 1}, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCellRawValue(workbook, 'inputs', 2, 0), '3');
  assert.equal(getCellRawValue(workbook, 'inputs', 2, 1), 'Moved');
  assert.equal(workbook.sheets.get('inputs').rowHeights.get(2), 44);
  assert.equal(getCellRawValue(workbook, 'inputs', 0, 2), '=SUM(A1:A3)');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('inputs'), 0, 2), '5');
  assert.equal(getCellRawValue(workbook, 'model', 0, 0), '=SUM(Inputs!A1:A3)');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '5');
  assert.equal(getCellRawValue(workbook, 'model', 1, 0), '=SUM(Inputs!3:3)');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '3');
  assert.deepEqual(getMergeAtCell(workbook.sheets.get('inputs'), 2, 3).range, {r1: 2, c1: 3, r2: 3, c2: 4});
  assert.equal(validateCellValue(workbook.sheets.get('inputs'), 2, 0, '5').valid, true);
  assert.deepEqual(getNamedRange(workbook, 'InputRows').range, {r1: 0, c1: 0, r2: 2, c2: 0});

  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'inputs', 1, 0), '3');
  assert.equal(getCellRawValue(workbook, 'inputs', 0, 2), '=SUM(A1:A2)');
  assert.equal(getCellRawValue(workbook, 'model', 0, 0), '=SUM(Inputs!A1:A2)');
  assert.equal(getCellRawValue(workbook, 'model', 1, 0), '=SUM(Inputs!2:2)');
  assert.deepEqual(getNamedRange(workbook, 'InputRows').range, getNamedRange(before, 'InputRows').range);

  workbook = redo(workbook);
  assert.equal(getCellRawValue(workbook, 'inputs', 2, 0), '3');
  assert.equal(getCellRawValue(workbook, 'model', 0, 0), '=SUM(Inputs!A1:A3)');
  assert.equal(getCellRawValue(workbook, 'model', 1, 0), '=SUM(Inputs!3:3)');
});

test('structural column commands delete columns and shift formulas across sheets', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'inputs', name: 'Inputs', rowCount: 10, colCount: 8},
    {id: 'model', name: 'Model', rowCount: 10, colCount: 8},
  ], activeSheetId: 'inputs'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'inputs',
    cells: [
      {row: 0, col: 0, value: '2'},
      {row: 0, col: 1, value: 'deleted'},
      {row: 0, col: 2, value: '3'},
      {row: 0, col: 3, formula: '=A1+C1'},
    ],
  });
  workbook = dispatchCommandWithRecalculation(workbook, {
    type: CommandType.SET_RANGE,
    sheetId: 'model',
    cells: [
      {row: 0, col: 0, formula: '=Inputs!C1*2'},
      {row: 1, col: 0, formula: '=SUM(Inputs!C:C)'},
    ],
  }, {getDefaultCellValue: () => ''}).workbook;

  let result = dispatchCommandWithRecalculation(workbook, {type: CommandType.DELETE_COLUMNS, sheetId: 'inputs', index: 1, count: 1}, {getDefaultCellValue: () => ''});
  workbook = result.workbook;

  assert.equal(getCellRawValue(workbook, 'inputs', 0, 1), '3');
  assert.equal(getCellRawValue(workbook, 'inputs', 0, 2), '=A1+B1');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('inputs'), 0, 2), '5');
  assert.equal(getCellRawValue(workbook, 'model', 0, 0), '=Inputs!B1*2');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 0, 0), '6');
  assert.equal(getCellRawValue(workbook, 'model', 1, 0), '=SUM(Inputs!B:B)');
  assert.equal(getCachedCellDisplayValue(workbook.sheets.get('model'), 1, 0), '3');

  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'inputs', 0, 1), 'deleted');
  assert.equal(getCellRawValue(workbook, 'inputs', 0, 3), '=A1+C1');
  assert.equal(getCellRawValue(workbook, 'model', 0, 0), '=Inputs!C1*2');
  assert.equal(getCellRawValue(workbook, 'model', 1, 0), '=SUM(Inputs!C:C)');
});

test('explicit blank cells can override generated defaults', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 0, col: 0, value: ''});

  assert.equal(getCellRawValue(workbook, 'sheet-1', 0, 0, {getDefaultCellValue: () => 'Generated'}), '');
});

test('workbook snapshots round-trip sheet and cell data', () => {
  let workbook = createWorkbook({sheets: [{id: 'sheet-1', name: 'Inputs'}]});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, row: 2, col: 3, value: 'Persisted'});
  workbook = dispatchCommand(workbook, {type: CommandType.RESIZE_COLUMN, col: 3, size: 180});

  const restored = deserializeWorkbook(serializeWorkbook(workbook));

  assert.equal(restored.activeSheetId, 'sheet-1');
  assert.equal(restored.sheets.get('sheet-1').name, 'Inputs');
  assert.equal(restored.sheets.get('sheet-1').colWidths.get(3), 180);
  assert.equal(getCellRawValue(restored, 'sheet-1', 2, 3), 'Persisted');
});

test('spreadsheetml export and import preserve workbook sheet data', () => {
  let workbook = createWorkbook({sheets: [
    {id: 'sheet-1', name: 'Inputs', rowCount: 20, colCount: 10},
    {id: 'sheet-2', name: 'Model', rowCount: 30, colCount: 12},
  ], activeSheetId: 'sheet-1'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-1', row: 0, col: 0, value: 'Revenue & Costs'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-1', row: 0, col: 1, value: '42'});
  workbook = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-1', row: 0, col: 2, formula: '=B1*2'}).workbook;
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE_FORMAT,
    sheetId: 'sheet-1',
    range: {r1: 0, c1: 1, r2: 0, c2: 2},
    format: {type: NumberFormatType.CURRENCY, currency: 'USD', decimals: 2},
  });
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE_STYLE,
    sheetId: 'sheet-1',
    range: {r1: 0, c1: 1, r2: 0, c2: 2},
    style: {fontWeight: 700, color: '#075985', backgroundColor: '#e0f2fe', textAlign: 'right', border: '1px solid #64748b'},
  });
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_LINK, sheetId: 'sheet-1', row: 0, col: 0, href: 'https://example.com/planning'});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL_NOTE, sheetId: 'sheet-1', row: 0, col: 1, note: 'Imported from planning model'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_CONDITIONAL_FORMAT,
    sheetId: 'sheet-1',
    rule: {
      range: {r1: 0, c1: 1, r2: 0, c2: 2},
      type: ConditionalFormatType.NUMBER,
      operator: 'gt',
      value: 50,
      style: {backgroundColor: '#fef3c7', color: '#78350f', fontWeight: 700},
    },
  });
  workbook = dispatchCommand(workbook, {type: CommandType.SET_NAMED_RANGE, name: 'Revenue', sheetId: 'sheet-1', range: {r1: 0, c1: 1, r2: 0, c2: 1}});
  workbook = dispatchCommand(workbook, {type: CommandType.RESIZE_COLUMN, sheetId: 'sheet-1', col: 1, size: 144});
  workbook = dispatchCommand(workbook, {type: CommandType.RESIZE_ROW, sheetId: 'sheet-1', row: 0, size: 32});
  workbook = dispatchCommand(workbook, {type: CommandType.MERGE_RANGE, sheetId: 'sheet-1', range: {r1: 2, c1: 1, r2: 3, c2: 3}});
  workbook = dispatchCommand(workbook, {type: CommandType.MERGE_RANGE, sheetId: 'sheet-2', range: {r1: 4, c1: 2, r2: 4, c2: 4}});
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-2', row: 0, col: 1, value: '0.42'});
  workbook = dispatchCommand(workbook, {
    type: CommandType.SET_RANGE_FORMAT,
    sheetId: 'sheet-2',
    range: {r1: 0, c1: 1, r2: 0, c2: 1},
    format: {type: NumberFormatType.PERCENT, decimals: 1},
  });
  workbook = dispatchCommand(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-2', row: 1, col: 0, value: 'Second sheet'});
  workbook = dispatchCommandWithRecalculation(workbook, {type: CommandType.SET_CELL, sheetId: 'sheet-2', row: 2, col: 0, formula: '=SUM(Revenue)'}).workbook;

  const xml = workbookToSpreadsheetML(workbook);
  assert.match(xml, /<Workbook/);
  assert.match(xml, /ss:Name="Inputs"/);
  assert.match(xml, /Revenue &amp; Costs/);
  assert.match(xml, /ss:HRef="https:\/\/example.com\/planning"/);
  assert.match(xml, /<Comment><Data>Imported from planning model<\/Data><\/Comment>/);
  assert.match(xml, /<Styles>[\s\S]*<NumberFormat ss:Format="\$#,##0.00"\/>[\s\S]*<NumberFormat ss:Format="0.0%"\/>[\s\S]*<\/Styles>/);
  assert.match(xml, /<Font [^>]*ss:Bold="1"[^>]*ss:Color="#075985"[^>]*\/>/);
  assert.match(xml, /<Interior ss:Color="#e0f2fe" ss:Pattern="Solid"\/>/);
  assert.match(xml, /<Alignment ss:Horizontal="Right"\/>/);
  assert.match(xml, /<Borders>[\s\S]*<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748b"\/>[\s\S]*<\/Borders>/);
  assert.match(xml, /<ConditionalFormatting><ConditionalFormat [^>]*ss:Range="B1:C1"[^>]*ss:Type="number"[^>]*ss:Operator="gt"/);
  assert.match(xml, /<Names><NamedRange ss:Name="Revenue" ss:RefersTo="=&apos;Inputs&apos;!B1:B1"\/><\/Names>/);
  assert.match(xml, /ss:MergeAcross="2" ss:MergeDown="1"/);

  const restored = spreadsheetMLToWorkbook(xml);

  assert.equal(restored.sheetOrder.length, 2);
  assert.equal(restored.sheets.get('sheet-1').name, 'Inputs');
  assert.equal(restored.sheets.get('sheet-2').name, 'Model');
  assert.equal(getCellRawValue(restored, 'sheet-1', 0, 0), 'Revenue & Costs');
  assert.deepEqual(getCellRecord(restored, 'sheet-1', 0, 0).link, {href: 'https://example.com/planning'});
  assert.equal(getCellRawValue(restored, 'sheet-1', 0, 2), '=B1*2');
  assert.equal(restored.sheets.get('sheet-1').cells.get('0:2').computedValue, 84);
  assert.deepEqual(restored.sheets.get('sheet-1').cells.get('0:1').format, {type: NumberFormatType.CURRENCY, currency: 'USD', decimals: 2});
  assert.deepEqual(getCellRecord(restored, 'sheet-1', 0, 1).style, {fontWeight: 700, color: '#075985', backgroundColor: '#e0f2fe', textAlign: 'right', border: '1px solid #64748b'});
  assert.equal(getCellRecord(restored, 'sheet-1', 0, 1).note, 'Imported from planning model');
  assert.equal(getCellDisplayValue(restored, 'sheet-1', 0, 1), '$42.00');
  assert.equal(getCellDisplayValue(restored, 'sheet-1', 0, 2), '$84.00');
  assert.equal(getConditionalFormatStyle(restored.sheets.get('sheet-1'), 0, 1, 42), null);
  assert.deepEqual(getConditionalFormatStyle(restored.sheets.get('sheet-1'), 0, 2, 84), {backgroundColor: '#fef3c7', color: '#78350f', fontWeight: 700});
  assert.deepEqual(getNamedRange(restored, 'Revenue').range, {r1: 0, c1: 1, r2: 0, c2: 1});
  assert.equal(getNamedRange(restored, 'Revenue').sheetId, 'sheet-1');
  assert.equal(restored.sheets.get('sheet-1').colWidths.get(1), 144);
  assert.equal(restored.sheets.get('sheet-1').rowHeights.get(0), 32);
  assert.deepEqual(getMergeAtCell(restored.sheets.get('sheet-1'), 3, 3).range, {r1: 2, c1: 1, r2: 3, c2: 3});
  assert.deepEqual(getMergeAtCell(restored.sheets.get('sheet-2'), 4, 4).range, {r1: 4, c1: 2, r2: 4, c2: 4});
  assert.deepEqual(restored.sheets.get('sheet-2').cells.get('0:1').format, {type: NumberFormatType.PERCENT, decimals: 1});
  assert.equal(getCellDisplayValue(restored, 'sheet-2', 0, 1), '42.0%');
  assert.equal(getCellRawValue(restored, 'sheet-2', 1, 0), 'Second sheet');
  assert.equal(getCellRawValue(restored, 'sheet-2', 2, 0), '=SUM(Revenue)');
  assert.equal(getCellDisplayValue(restored, 'sheet-2', 2, 0), '42');
});
