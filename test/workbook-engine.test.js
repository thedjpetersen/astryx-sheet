import test from 'node:test';
import assert from 'node:assert/strict';
import {cellAddress} from '../src/spreadsheet/model/address.js';
import {
  CommandType,
  createCopyRangeCommand,
  createPasteTsvCommand,
  createWorkbook,
  deserializeWorkbook,
  dispatchCommand,
  dispatchCommandWithRecalculation,
  extractFormulaReferences,
  getChangedCellKeysForCommand,
  getFormulaRecalculationOrder,
  getCachedCellDisplayValue,
  getCellDisplayValue,
  getCellRawValue,
  NumberFormatType,
  recalculateWorkbook,
  rangeToTsv,
  redo,
  serializeWorkbook,
  undo,
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
