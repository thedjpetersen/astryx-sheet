import {cellKey} from '../model/address.js';
import {DEFAULT_GRID_CONFIG} from '../model/constants.js';
import {defaultCellValue} from '../model/defaultData.js';
import {displayCellValue} from '../model/formulas.js';
import {cellRecordToRaw, cellRecordToSerializable, cloneCellRecord, normalizeCellRecord} from './cells.js';
import {cloneFilter, createFilterStore} from './filters.js';
import {formatValue} from './formatting.js';
import {cloneMergedRange, createMergeStore} from './merges.js';
import {cloneNamedRange, createNamedRangeStore} from './names.js';
import {cloneValidationRule, createValidationStore} from './validation.js';

let nextWorkbookId = 1;
let nextSheetId = 1;

export function createWorkbookId() {
  return `workbook-${nextWorkbookId++}`;
}

export function createSheetId() {
  return `sheet-${nextSheetId++}`;
}

function entriesFromMapLike(input) {
  if (!input) return [];
  if (input instanceof Map) return Array.from(input.entries());
  if (Array.isArray(input)) return input;
  if (typeof input === 'object') return Object.entries(input);
  return [];
}

export function createCellStore(initialCells) {
  return new Map(entriesFromMapLike(initialCells).flatMap(([key, cell]) => {
    const record = normalizeCellRecord(cell);
    return record ? [[key, record]] : [];
  }));
}

export function createDimensionStore(initialDimensions) {
  return new Map(entriesFromMapLike(initialDimensions).map(([key, value]) => [Number(key), Number(value)]).filter(([, value]) => Number.isFinite(value)));
}

export function createSheet(input = {}) {
  const id = input.id || createSheetId();
  return {
    id,
    name: input.name || 'Sheet1',
    rowCount: input.rowCount || input.rows || DEFAULT_GRID_CONFIG.rows,
    colCount: input.colCount || input.cols || DEFAULT_GRID_CONFIG.cols,
    frozenRows: input.frozenRows || 0,
    frozenCols: input.frozenCols || 0,
    cells: createCellStore(input.cells),
    rowHeights: createDimensionStore(input.rowHeights),
    colWidths: createDimensionStore(input.colWidths),
    filters: createFilterStore(input.filters),
    merges: createMergeStore(input.merges),
    validations: createValidationStore(input.validations),
    metadata: input.metadata ? {...input.metadata} : {},
  };
}

export function cloneSheet(sheet) {
  return {
    ...sheet,
    cells: new Map(Array.from(sheet.cells.entries(), ([key, cell]) => [key, cloneCellRecord(cell)])),
    rowHeights: new Map(sheet.rowHeights),
    colWidths: new Map(sheet.colWidths),
    filters: new Map(Array.from(sheet.filters.entries(), ([id, filter]) => [id, cloneFilter(filter)])),
    merges: new Map(Array.from(sheet.merges.entries(), ([id, merge]) => [id, cloneMergedRange(merge)])),
    validations: new Map(Array.from(sheet.validations.entries(), ([id, rule]) => [id, cloneValidationRule(rule)])),
    metadata: {...sheet.metadata},
  };
}

export function createWorkbook(input = {}) {
  const sourceSheets = input.sheets instanceof Map ? Array.from(input.sheets.values()) : input.sheets;
  const sheets = (Array.isArray(sourceSheets) && sourceSheets.length ? sourceSheets : [input.sheet || {}]).map(createSheet);
  const sheetOrder = input.sheetOrder?.length ? input.sheetOrder.filter((id) => sheets.some((sheet) => sheet.id === id)) : sheets.map((sheet) => sheet.id);
  const activeSheetId = input.activeSheetId && sheetOrder.includes(input.activeSheetId) ? input.activeSheetId : sheetOrder[0];

  return {
    id: input.id || createWorkbookId(),
    activeSheetId,
    sheetOrder,
    sheets: new Map(sheets.map((sheet) => [sheet.id, sheet])),
    namedRanges: createNamedRangeStore(input.namedRanges),
    history: input.history ? [...input.history] : [],
    future: input.future ? [...input.future] : [],
    version: input.version || 0,
    metadata: input.metadata ? {...input.metadata} : {},
  };
}

export function cloneWorkbook(workbook) {
  return {
    ...workbook,
    sheetOrder: [...workbook.sheetOrder],
    sheets: new Map(workbook.sheets),
    namedRanges: new Map(Array.from(workbook.namedRanges.entries(), ([name, range]) => [name, cloneNamedRange(range)])),
    history: [...workbook.history],
    future: [...workbook.future],
    metadata: {...workbook.metadata},
  };
}

export function getSheet(workbook, sheetId = workbook.activeSheetId) {
  const sheet = workbook.sheets.get(sheetId);
  if (!sheet) throw new Error(`Unknown sheet: ${sheetId}`);
  return sheet;
}

export function getActiveSheet(workbook) {
  return getSheet(workbook, workbook.activeSheetId);
}

export function withClonedSheet(workbook, sheetId, updateSheet) {
  const resolvedSheetId = sheetId || workbook.activeSheetId;
  const nextWorkbook = cloneWorkbook(workbook);
  const nextSheet = cloneSheet(getSheet(workbook, resolvedSheetId));
  nextWorkbook.sheets.set(resolvedSheetId, nextSheet);
  updateSheet(nextSheet, nextWorkbook);
  nextWorkbook.version = workbook.version + 1;
  return nextWorkbook;
}

export function getCellRecord(workbook, sheetId, row, col) {
  return getSheet(workbook, sheetId).cells.get(cellKey(row, col)) || null;
}

export function setCellRecord(sheet, row, col, cell) {
  const key = cellKey(row, col);
  const record = normalizeCellRecord(cell);
  if (record) sheet.cells.set(key, record);
  else sheet.cells.delete(key);
}

export function getCellRawValue(workbook, sheetId, row, col, options = {}) {
  const record = getCellRecord(workbook, sheetId, row, col);
  const raw = cellRecordToRaw(record);
  if (raw !== undefined) return raw;
  const getDefaultCellValue = options.getDefaultCellValue || (() => '');
  return getDefaultCellValue(row, col);
}

export function createSheetDataRef(sheet) {
  return {
    current: {
      has: (key) => sheet.cells.has(key),
      get: (key) => cellRecordToRaw(sheet.cells.get(key)),
      get size() { return sheet.cells.size; },
    },
  };
}

export function getCellDisplayValue(workbook, sheetId, row, col, options = {}) {
  const sheet = getSheet(workbook, sheetId);
  const record = getCellRecord(workbook, sheetId, row, col);
  const getDefaultCellValue = options.getDefaultCellValue || defaultCellValue;
  const raw = getCellRawValue(workbook, sheetId, row, col, {getDefaultCellValue});
  const format = record?.format;
  if (record?.formula && 'computedValue' in record) {
    return format ? formatValue(record.computedValue, format, options) : record.displayValue ?? String(record.computedValue ?? '');
  }
  if (typeof raw === 'string' && raw.trim().startsWith('=')) {
    const evaluated = displayCellValue(createSheetDataRef(sheet), row, col, getDefaultCellValue);
    return format ? formatValue(evaluated, format, options) : evaluated;
  }
  return format ? formatValue(raw, format, options) : raw;
}

export function serializeSheetForSnapshot(sheet) {
  return {
    id: sheet.id,
    name: sheet.name,
    rowCount: sheet.rowCount,
    colCount: sheet.colCount,
    frozenRows: sheet.frozenRows,
    frozenCols: sheet.frozenCols,
    cells: Array.from(sheet.cells.entries(), ([key, cell]) => [key, cellRecordToSerializable(cell)]),
    rowHeights: Array.from(sheet.rowHeights.entries()),
    colWidths: Array.from(sheet.colWidths.entries()),
    filters: Array.from(sheet.filters.values()).map(cloneFilter),
    merges: Array.from(sheet.merges.values()).map(cloneMergedRange),
    validations: Array.from(sheet.validations.values()).map(cloneValidationRule),
    metadata: {...sheet.metadata},
  };
}
