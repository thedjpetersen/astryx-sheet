import {cellKey} from '../model/address.js';
import {DEFAULT_GRID_CONFIG} from '../model/constants.js';
import {defaultCellValue} from '../model/defaultData.js';
import {evaluateFormula, formatFormulaResult, formulaArrayCellValue, formulaArrayDimensions, isFormulaArrayValue} from '../model/formulas.js';
import {cellRecordToRaw, cellRecordToSerializable, cloneCellRecord, normalizeCellRecord} from './cells.js';
import {cloneConditionalFormat, createConditionalFormatStore} from './conditionalFormatting.js';
import {cloneFilter, createFilterStore} from './filters.js';
import {cloneRangeFormatRule, cloneRangeStyleRule, formatValue, getEffectiveCellFormat} from './formatting.js';
import {cloneMergedRange, createMergeStore} from './merges.js';
import {cloneNamedRange, createNamedRangeStore, expandNamedRangesInFormula} from './names.js';
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

function createRangeRuleStore(initialRules, cloneRule, prefix) {
  const entries = Array.isArray(initialRules)
    ? initialRules.map((item, index) => (Array.isArray(item) ? item : [index, item]))
    : entriesFromMapLike(initialRules);
  return new Map(entries.flatMap(([key, rule]) => {
    const cloned = cloneRule(rule);
    if (!cloned?.range) return [];
    const id = cloned.id || `${prefix}-${key}`;
    return [[id, {...cloned, id}]];
  }));
}

export function createRangeStyleStore(initialRules) {
  return createRangeRuleStore(initialRules, cloneRangeStyleRule, 'range-style');
}

export function createRangeFormatStore(initialRules) {
  return createRangeRuleStore(initialRules, cloneRangeFormatRule, 'range-format');
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
    conditionalFormats: createConditionalFormatStore(input.conditionalFormats),
    rangeStyles: createRangeStyleStore(input.rangeStyles),
    rangeFormats: createRangeFormatStore(input.rangeFormats),
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
    conditionalFormats: new Map(Array.from(sheet.conditionalFormats.entries(), ([id, rule]) => [id, cloneConditionalFormat(rule)])),
    rangeStyles: new Map(Array.from((sheet.rangeStyles || new Map()).entries(), ([id, rule]) => [id, cloneRangeStyleRule(rule)])),
    rangeFormats: new Map(Array.from((sheet.rangeFormats || new Map()).entries(), ([id, rule]) => [id, cloneRangeFormatRule(rule)])),
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

function parseCellKey(key) {
  const [row, col] = String(key).split(':').map(Number);
  return {row, col};
}

function isSpillBlocked(sheet, originRow, originCol, arrayValue) {
  const size = formulaArrayDimensions(arrayValue);
  if (size.rows <= 0 || size.cols <= 0) return false;
  for (let rowOffset = 0; rowOffset < size.rows; rowOffset++) {
    for (let colOffset = 0; colOffset < size.cols; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue;
      if (sheet.cells.has(cellKey(originRow + rowOffset, originCol + colOffset))) return true;
    }
  }
  return false;
}

export function getCellSpillInfo(sheet, row, col) {
  if (!sheet || sheet.cells.has(cellKey(row, col))) return null;
  for (const [originKey, cell] of sheet.cells.entries()) {
    if (!cell?.formula || !isFormulaArrayValue(cell.computedValue)) continue;
    const origin = parseCellKey(originKey);
    const size = formulaArrayDimensions(cell.computedValue);
    if (row < origin.row || col < origin.col || row >= origin.row + size.rows || col >= origin.col + size.cols) continue;
    if (isSpillBlocked(sheet, origin.row, origin.col, cell.computedValue)) continue;
    return {
      origin,
      rowOffset: row - origin.row,
      colOffset: col - origin.col,
      value: formulaArrayCellValue(cell.computedValue, row - origin.row, col - origin.col),
      range: {r1: origin.row, c1: origin.col, r2: origin.row + size.rows - 1, c2: origin.col + size.cols - 1},
    };
  }
  return null;
}

export function getCellSpillRange(sheet, row, col) {
  const cell = sheet?.cells.get(cellKey(row, col));
  if (!cell?.formula || !isFormulaArrayValue(cell.computedValue)) return null;
  if (isSpillBlocked(sheet, row, col, cell.computedValue)) return '#SPILL!';
  const size = formulaArrayDimensions(cell.computedValue);
  return {sheetName: sheet.name, range: {r1: row, c1: col, r2: row + size.rows - 1, c2: col + size.cols - 1}};
}

export function createSheetDataRef(sheet, options = {}) {
  const includeSpillValues = options.useComputedValues || options.includeSpillValues;
  return {
    current: {
      has: (key) => {
        if (sheet.cells.has(key)) return true;
        if (!includeSpillValues) return false;
        const {row, col} = parseCellKey(key);
        return Boolean(getCellSpillInfo(sheet, row, col));
      },
      get: (key) => {
        const cell = sheet.cells.get(key);
        if (options.useComputedValues && cell?.formula && 'computedValue' in cell) {
          const {row, col} = parseCellKey(key);
          return isFormulaArrayValue(cell.computedValue) && isSpillBlocked(sheet, row, col, cell.computedValue)
            ? '#SPILL!'
            : cell.computedValue;
        }
        if (cell) return cellRecordToRaw(cell);
        if (!includeSpillValues) return undefined;
        const {row, col} = parseCellKey(key);
        return getCellSpillInfo(sheet, row, col)?.value;
      },
      get size() { return sheet.cells.size; },
    },
  };
}

function getSheetByReference(workbook, sheetRef) {
  if (!sheetRef) return null;
  if (workbook.sheets.has(sheetRef)) return workbook.sheets.get(sheetRef);
  const normalized = String(sheetRef).toLowerCase();
  return Array.from(workbook.sheets.values()).find((sheet) => sheet.name.toLowerCase() === normalized) || null;
}

function createFormulaEvaluationOptions(workbook, sheet) {
  return {
    currentSheetName: sheet.name,
    rowCount: sheet.rowCount,
    colCount: sheet.colCount,
    resolveSheetName(sheetRef) {
      if (!sheetRef) return sheet.name;
      return getSheetByReference(workbook, sheetRef)?.name || sheetRef;
    },
    hasSheetReference(sheetRef) {
      return !sheetRef || Boolean(getSheetByReference(workbook, sheetRef));
    },
    getDataRefForSheet(sheetRef) {
      const referencedSheet = getSheetByReference(workbook, sheetRef);
      return referencedSheet ? createSheetDataRef(referencedSheet, {useComputedValues: true}) : null;
    },
    getSheetDimensionsForSheet(sheetRef) {
      const referencedSheet = getSheetByReference(workbook, sheetRef) || sheet;
      return {rowCount: referencedSheet.rowCount, colCount: referencedSheet.colCount};
    },
    getCellFormula(sheetRef, row, col) {
      const referencedSheet = getSheetByReference(workbook, sheetRef) || sheet;
      return referencedSheet.cells.get(cellKey(row, col))?.formula || '';
    },
    getSpillRangeForCell(sheetRef, row, col) {
      const referencedSheet = getSheetByReference(workbook, sheetRef) || sheet;
      return getCellSpillRange(referencedSheet, row, col);
    },
  };
}

export function getCellDisplayValue(workbook, sheetId, row, col, options = {}) {
  const sheet = getSheet(workbook, sheetId);
  const record = getCellRecord(workbook, sheetId, row, col);
  const getDefaultCellValue = options.getDefaultCellValue || defaultCellValue;
  const raw = getCellRawValue(workbook, sheetId, row, col, {getDefaultCellValue});
  const format = getEffectiveCellFormat(sheet, row, col, record?.format);
  if (record?.formula && 'computedValue' in record) {
    if (isFormulaArrayValue(record.computedValue) && isSpillBlocked(sheet, row, col, record.computedValue)) return '#SPILL!';
    return format ? formatValue(record.computedValue, format, options) : record.displayValue ?? formatFormulaResult(record.computedValue);
  }
  const spill = getCellSpillInfo(sheet, row, col);
  if (spill) return formatFormulaResult(spill.value);
  if (typeof raw === 'string' && raw.trim().startsWith('=')) {
    const formula = expandNamedRangesInFormula(raw, workbook.namedRanges, sheetId);
    const evaluated = evaluateFormula(
      formula,
      createSheetDataRef(sheet, {useComputedValues: true}),
      {row, col, sheetName: sheet.name},
      getDefaultCellValue,
      new Set(),
      createFormulaEvaluationOptions(workbook, sheet),
    );
    return format ? formatValue(evaluated, format, options) : formatFormulaResult(evaluated);
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
    conditionalFormats: Array.from(sheet.conditionalFormats.values()).map(cloneConditionalFormat),
    rangeStyles: Array.from((sheet.rangeStyles || new Map()).values()).map(cloneRangeStyleRule),
    rangeFormats: Array.from((sheet.rangeFormats || new Map()).values()).map(cloneRangeFormatRule),
    metadata: {...sheet.metadata},
  };
}
