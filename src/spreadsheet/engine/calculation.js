import {cellKey} from '../model/address.js';
import {defaultCellValue} from '../model/defaultData.js';
import {diagnoseFormulaDraft, evaluateFormula, formatFormulaResult, isFormulaVolatile} from '../model/formulas.js';
import {CommandType, dispatchCommand, getChangedCellKeysForCommand, getCommandSheetId} from './commands.js';
import {getFormulaRecalculationOrder, getWorkbookFormulaRecalculationOrder, parseWorkbookCellKey} from './dependencies.js';
import {expandNamedRangesInFormula} from './names.js';
import {cloneSheet, cloneWorkbook, createSheetDataRef, getCellSpillInfo, getCellSpillRange, getSheet} from './workbook.js';

function formulaKeysForSheet(sheet) {
  return Array.from(sheet.cells.entries()).flatMap(([key, cell]) => cell?.formula ? [key] : []);
}

function volatileFormulaKeysForSheet(sheet) {
  return Array.from(sheet.cells.entries()).flatMap(([key, cell]) => (
    cell?.formula && isFormulaVolatile(cell.formula) ? [key] : []
  ));
}

function parseCellKey(key) {
  const [row, col] = key.split(':').map(Number);
  return {row, col};
}

export function commandRequiresFullRecalculation(command) {
  if (!command?.type) return false;
  if (command.type === CommandType.BATCH) return (command.commands || []).some(commandRequiresFullRecalculation);
  return (
    command.type === CommandType.RESTORE_SHEET ||
    command.type === CommandType.RESTORE_WORKBOOK ||
    command.type === CommandType.INSERT_ROWS ||
    command.type === CommandType.DELETE_ROWS ||
    command.type === CommandType.INSERT_COLUMNS ||
    command.type === CommandType.DELETE_COLUMNS ||
    command.type === CommandType.SET_NAMED_RANGE ||
    command.type === CommandType.REMOVE_NAMED_RANGE ||
    command.type === CommandType.ADD_SHEET ||
    command.type === CommandType.REMOVE_SHEET ||
    command.type === CommandType.RENAME_SHEET
  );
}

function getSheetByReference(workbook, sheetRef) {
  if (!workbook || !sheetRef) return null;
  if (workbook.sheets.has(sheetRef)) return workbook.sheets.get(sheetRef);
  const normalized = String(sheetRef).toLowerCase();
  return Array.from(workbook.sheets.values()).find((sheet) => sheet.name.toLowerCase() === normalized) || null;
}

function createFormulaEvaluationOptions(workbook, sheet, options = {}) {
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
    ...options.formulaOptions,
  };
}

export function evaluateCellForCache(sheet, key, options = {}) {
  const cell = sheet.cells.get(key);
  if (!cell?.formula) return undefined;
  const {row, col} = parseCellKey(key);
  const getDefaultCellValue = options.getDefaultCellValue || defaultCellValue;
  const formula = expandNamedRangesInFormula(cell.formula, options.namedRanges, options.sheetId || sheet.id);
  return evaluateFormula(
    formula,
    createSheetDataRef(sheet, {useComputedValues: true}),
    {row, col, sheetName: sheet.name},
    getDefaultCellValue,
    new Set(),
    createFormulaEvaluationOptions(options.workbook, sheet, options),
  );
}

export function previewFormulaDraft(workbook, sheetId, row, col, draft, options = {}) {
  const sheet = getSheet(workbook, sheetId || workbook.activeSheetId);
  const raw = String(draft ?? '');
  const getDefaultCellValue = options.getDefaultCellValue || defaultCellValue;
  if (!raw.trim().startsWith('=')) {
    return {
      kind: raw === '' ? 'blank' : 'value',
      value: raw,
      displayValue: raw,
      error: undefined,
      diagnostics: [],
    };
  }
  const formula = expandNamedRangesInFormula(raw, workbook.namedRanges, sheet.id);
  const value = evaluateFormula(
    formula,
    createSheetDataRef(sheet, {useComputedValues: true}),
    {row, col, sheetName: sheet.name},
    getDefaultCellValue,
    new Set(),
    createFormulaEvaluationOptions(workbook, sheet, options),
  );
  const displayValue = formatFormulaResult(value);
  const preview = {
    kind: 'formula',
    value,
    displayValue,
    error: typeof value === 'string' && value.startsWith('#') ? value : undefined,
  };
  return {...preview, diagnostics: diagnoseFormulaDraft(raw, preview, {
    namedRanges: workbook.namedRanges,
    sheetId: sheet.id,
    sheetName: sheet.name,
    sheetRowCount: sheet.rowCount,
    sheetColCount: sheet.colCount,
    sheets: workbook.sheetOrder.map((id) => workbook.sheets.get(id)).filter(Boolean).map((item) => ({id: item.id, name: item.name})),
  })};
}

export function recalculateSheet(sheet, options = {}) {
  const nextSheet = cloneSheet(sheet);
  const changedKeys = options.changedKeys ? new Set([...options.changedKeys, ...volatileFormulaKeysForSheet(nextSheet)]) : null;
  const keys = changedKeys
    ? [
      ...Array.from(changedKeys).filter((key) => nextSheet.cells.get(key)?.formula),
      ...getFormulaRecalculationOrder(nextSheet, changedKeys, options).order,
    ]
    : formulaKeysForSheet(nextSheet);

  const recalculated = [];
  for (const key of new Set(keys)) {
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

function changedKeysBySheetForOptions(workbook, options = {}) {
  if (options.changedKeysBySheet) return options.changedKeysBySheet;
  if (!options.changedKeys) return null;
  return new Map([[options.sheetId || workbook.activeSheetId, options.changedKeys]]);
}

function normalizeChangedKeysBySheet(changedCellsBySheet) {
  if (changedCellsBySheet instanceof Map) {
    return new Map(Array.from(changedCellsBySheet.entries(), ([sheetId, keys]) => [sheetId, new Set(keys)]));
  }
  return new Map(Object.entries(changedCellsBySheet || {}).map(([sheetId, keys]) => [sheetId, new Set(keys)]));
}

function ensureRecalculationSheet(nextWorkbook, sheetId, clonedSheetIds) {
  if (!clonedSheetIds.has(sheetId)) {
    nextWorkbook.sheets.set(sheetId, cloneSheet(getSheet(nextWorkbook, sheetId)));
    clonedSheetIds.add(sheetId);
  }
  return getSheet(nextWorkbook, sheetId);
}

function recalculateWorkbookDirty(workbook, changedCellsBySheet, options = {}) {
  const nextWorkbook = cloneWorkbook(workbook);
  const changedWithVolatile = normalizeChangedKeysBySheet(changedCellsBySheet);
  for (const currentSheetId of nextWorkbook.sheetOrder) {
    const volatileKeys = volatileFormulaKeysForSheet(getSheet(nextWorkbook, currentSheetId));
    if (!volatileKeys.length) continue;
    const keys = changedWithVolatile.get(currentSheetId) || new Set();
    for (const key of volatileKeys) keys.add(key);
    changedWithVolatile.set(currentSheetId, keys);
  }
  const orderResult = getWorkbookFormulaRecalculationOrder(nextWorkbook, changedWithVolatile, {
    ...options,
    namedRanges: options.namedRanges || nextWorkbook.namedRanges,
  });
  const recalculatedBySheet = Object.fromEntries(nextWorkbook.sheetOrder.map((currentSheetId) => [currentSheetId, []]));
  const clonedSheetIds = new Set();

  for (const qualifiedKey of orderResult.order) {
    const {sheetId, key} = parseWorkbookCellKey(qualifiedKey);
    const sheet = ensureRecalculationSheet(nextWorkbook, sheetId, clonedSheetIds);
    const cell = sheet.cells.get(key);
    if (!cell?.formula) continue;
    const value = evaluateCellForCache(sheet, key, {
      ...options,
      workbook: nextWorkbook,
      sheetId,
      namedRanges: options.namedRanges || nextWorkbook.namedRanges,
    });
    cell.computedValue = value;
    cell.displayValue = formatFormulaResult(value);
    cell.error = typeof value === 'string' && value.startsWith('#') ? value : undefined;
    recalculatedBySheet[sheetId].push(key);
  }

  nextWorkbook.version = workbook.version + 1;
  return {
    sheet: getSheet(nextWorkbook, options.sheetId || workbook.activeSheetId),
    recalculated: recalculatedBySheet[options.sheetId || workbook.activeSheetId] || [],
    recalculatedBySheet,
    recalculationOrder: orderResult.order,
    workbook: nextWorkbook,
  };
}

export function recalculateWorkbook(workbook, options = {}) {
  const sheetId = options.sheetId || workbook.activeSheetId;
  if (options.allSheets) {
    const changedCellsBySheet = changedKeysBySheetForOptions(workbook, options);
    if (changedCellsBySheet && (options.changedKeys || options.changedKeysBySheet)) {
      return recalculateWorkbookDirty(workbook, changedCellsBySheet, {...options, sheetId});
    }
    const nextWorkbook = cloneWorkbook(workbook);
    const recalculatedBySheet = {};
    for (const currentSheetId of nextWorkbook.sheetOrder) {
      const currentSheet = getSheet(nextWorkbook, currentSheetId);
      const result = recalculateSheet(currentSheet, {
        ...options,
        workbook: nextWorkbook,
        sheetId: currentSheetId,
        namedRanges: options.namedRanges || nextWorkbook.namedRanges,
        changedKeys: null,
      });
      nextWorkbook.sheets.set(currentSheetId, result.sheet);
      recalculatedBySheet[currentSheetId] = result.recalculated;
    }
    nextWorkbook.version = workbook.version + 1;
    return {
      sheet: getSheet(nextWorkbook, sheetId),
      recalculated: recalculatedBySheet[sheetId] || [],
      recalculatedBySheet,
      workbook: nextWorkbook,
    };
  }
  const currentSheet = getSheet(workbook, sheetId);
  const result = recalculateSheet(currentSheet, {...options, workbook, sheetId, namedRanges: options.namedRanges || workbook.namedRanges});
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.set(sheetId, result.sheet);
  nextWorkbook.version = workbook.version + 1;
  return {...result, workbook: nextWorkbook};
}

export function getCachedCellDisplayValue(sheet, row, col) {
  const cell = sheet.cells.get(cellKey(row, col));
  if (!cell) {
    const spill = getCellSpillInfo(sheet, row, col);
    return spill ? formatFormulaResult(spill.value) : undefined;
  }
  if (cell.formula && 'displayValue' in cell) return cell.displayValue;
  if (cell.formula && 'computedValue' in cell) return formatFormulaResult(cell.computedValue);
  return cell.value;
}

export function dispatchCommandWithRecalculation(workbook, command, options = {}) {
  const changedKeys = getChangedCellKeysForCommand(command);
  const fullRecalculation = commandRequiresFullRecalculation(command);
  const nextWorkbook = dispatchCommand(workbook, command);
  if (options.recalculate === false || (!changedKeys.size && !fullRecalculation)) {
    return {workbook: nextWorkbook, changedKeys, recalculated: []};
  }
  return {
    ...recalculateWorkbook(nextWorkbook, {
      ...options,
      sheetId: options.sheetId || getCommandSheetId(nextWorkbook, command),
      namedRanges: nextWorkbook.namedRanges,
      changedKeys: fullRecalculation ? null : changedKeys,
      allSheets: options.allSheets ?? true,
    }),
    changedKeys,
    fullRecalculation,
  };
}
