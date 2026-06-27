import test from 'node:test';
import assert from 'node:assert/strict';
import {cellAddress} from '../src/spreadsheet/model/address.js';
import {
  CommandType,
  createCopyRangeCommand,
  createImportDelimitedCommand,
  createImportHtmlTableCommand,
  createCommandJournal,
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
  getCachedCellDisplayValue,
  getCellDisplayValue,
  getCellRawValue,
  getMergeAtCell,
  getVisibleRowsForSheet,
  getNamedRange,
  listMergedRanges,
  listNamedRanges,
  NumberFormatType,
  parseDelimited,
  parseHtmlTable,
  recalculateWorkbook,
  rangeToDelimited,
  rangeToHtmlTable,
  rangeToTsv,
  replayCommandJournal,
  redo,
  serializeWorkbook,
  undo,
  validateCellValue,
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
