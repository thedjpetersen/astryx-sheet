import test from 'node:test';
import assert from 'node:assert/strict';
import {cellAddress} from '../src/spreadsheet/model/address.js';
import {
  CommandType,
  createPasteTsvCommand,
  createWorkbook,
  deserializeWorkbook,
  dispatchCommand,
  getCellDisplayValue,
  getCellRawValue,
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

  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Changed');
  workbook = undo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Original');
  workbook = redo(workbook);
  assert.equal(getCellRawValue(workbook, 'sheet-1', 1, 1), 'Changed');
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
