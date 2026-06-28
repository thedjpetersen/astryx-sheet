import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {
  CommandType,
  NumberFormatType,
  createWorkbook,
  dispatchCommand,
  getCellDisplayValue,
  getChangedCellKeysForCommand,
  getEffectiveCellStyle,
} from '../src/spreadsheet/engine/index.js';

const ROWS = 100000;
const COLS = 2000;
const PROFILE_LIMIT_MS = 120;
const SORT_GUARD_LIMIT_MS = 40;

function measure(name, maxMs, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  assert.ok(duration <= maxMs, `${name} took ${duration.toFixed(2)}ms, expected <= ${maxMs}ms`);
  return result;
}

let workbook = createWorkbook({sheets: [{id: 'sheet-1', rowCount: ROWS, colCount: COLS}]});

workbook = measure('sparse whole-column style dispatch', PROFILE_LIMIT_MS, () => dispatchCommand(workbook, {
  type: CommandType.SET_RANGE_STYLE,
  range: {r1: 0, c1: 2, r2: ROWS - 1, c2: 4},
  style: {backgroundColor: '#ff00aa', color: '#111827'},
  sparse: true,
}));

let sheet = workbook.sheets.get('sheet-1');
assert.equal(sheet.cells.size, 0);
assert.equal(sheet.rangeStyles.size, 1);
assert.deepEqual(getEffectiveCellStyle(sheet, 50000, 3), {backgroundColor: '#ff00aa', color: '#111827'});

workbook = measure('sparse whole-column format dispatch', PROFILE_LIMIT_MS, () => dispatchCommand(workbook, {
  type: CommandType.SET_RANGE_FORMAT,
  range: {r1: 0, c1: 2, r2: ROWS - 1, c2: 2},
  format: {type: NumberFormatType.CURRENCY, currency: 'USD', decimals: 2},
  sparse: true,
}));

sheet = workbook.sheets.get('sheet-1');
assert.equal(sheet.cells.size, 0);
assert.equal(sheet.rangeFormats.size, 1);
assert.equal(
  getCellDisplayValue(workbook, 'sheet-1', 75000, 2, {getDefaultCellValue: (_row, col) => (col === 2 ? '1280' : '')}),
  '$1,280.00',
);

measure('bulk style changed-key tracking', SORT_GUARD_LIMIT_MS, () => {
  const keys = getChangedCellKeysForCommand({
    type: CommandType.SET_RANGE_STYLE,
    range: {r1: 0, c1: 2, r2: ROWS - 1, c2: 4},
    style: {backgroundColor: '#ff00aa'},
  });
  assert.equal(keys.size, 0);
});

measure('large sort guard', SORT_GUARD_LIMIT_MS, () => {
  assert.throws(() => dispatchCommand(workbook, {
    type: CommandType.SORT_RANGE,
    range: {r1: 0, c1: 0, r2: ROWS - 1, c2: 4},
    hasHeader: true,
    sortBy: [{col: 0, direction: 'asc'}],
  }), /Sort range too large/);
});
