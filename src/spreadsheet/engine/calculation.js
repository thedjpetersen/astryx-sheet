import {cellKey} from '../model/address.js';
import {defaultCellValue} from '../model/defaultData.js';
import {evaluateFormula, formatFormulaResult} from '../model/formulas.js';
import {getFormulaRecalculationOrder} from './dependencies.js';
import {cloneSheet, cloneWorkbook, createSheetDataRef, getSheet} from './workbook.js';

function formulaKeysForSheet(sheet) {
  return Array.from(sheet.cells.entries()).flatMap(([key, cell]) => cell?.formula ? [key] : []);
}

function parseCellKey(key) {
  const [row, col] = key.split(':').map(Number);
  return {row, col};
}

export function evaluateCellForCache(sheet, key, options = {}) {
  const cell = sheet.cells.get(key);
  if (!cell?.formula) return undefined;
  const {row, col} = parseCellKey(key);
  const getDefaultCellValue = options.getDefaultCellValue || defaultCellValue;
  return evaluateFormula(cell.formula, createSheetDataRef(sheet), {row, col}, getDefaultCellValue);
}

export function recalculateSheet(sheet, options = {}) {
  const nextSheet = cloneSheet(sheet);
  const changedKeys = options.changedKeys ? new Set(options.changedKeys) : null;
  const keys = changedKeys
    ? getFormulaRecalculationOrder(nextSheet, changedKeys, options).order
    : formulaKeysForSheet(nextSheet);

  const recalculated = [];
  for (const key of keys) {
    const cell = nextSheet.cells.get(key);
    if (!cell?.formula) continue;
    const value = evaluateCellForCache(nextSheet, key, options);
    cell.computedValue = value;
    cell.displayValue = formatFormulaResult(value);
    cell.error = typeof value === 'string' && value.startsWith('#') ? value : undefined;
    recalculated.push(key);
  }

  return {sheet: nextSheet, recalculated};
}

export function recalculateWorkbook(workbook, options = {}) {
  const sheetId = options.sheetId || workbook.activeSheetId;
  const currentSheet = getSheet(workbook, sheetId);
  const result = recalculateSheet(currentSheet, options);
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.set(sheetId, result.sheet);
  nextWorkbook.version = workbook.version + 1;
  return {...result, workbook: nextWorkbook};
}

export function getCachedCellDisplayValue(sheet, row, col) {
  const cell = sheet.cells.get(cellKey(row, col));
  if (!cell) return undefined;
  if (cell.formula && 'displayValue' in cell) return cell.displayValue;
  if (cell.formula && 'computedValue' in cell) return formatFormulaResult(cell.computedValue);
  return cell.value;
}
