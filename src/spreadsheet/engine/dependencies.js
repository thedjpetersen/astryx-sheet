import {cellAddress, cellKey, parseCellAddress, parseRange} from '../model/address.js';
import {formulaArrayDimensions, isFormulaArrayValue} from '../model/formulas.js';
import {expandNamedRangesInFormula} from './names.js';

const REF_PATTERN = /(?<![A-Z0-9_.])(?:(?:'([^']*(?:''[^']*)*)'|([A-Za-z_][A-Za-z0-9_]*))!)?(\$?[A-Z]+\$?\d+|\$?[A-Z]+(?=\s*:)|\$?\d+(?=\s*:))(?:\s*:\s*(?:(?:'([^']*(?:''[^']*)*)'|([A-Za-z_][A-Za-z0-9_]*))!)?(\$?[A-Z]+\$?\d+|\$?[A-Z]+|\$?\d+))?/gi;

function stripAbsoluteMarkers(ref) {
  return String(ref).replace(/\$/g, '');
}

function unquoteSheetName(sheetName) {
  return String(sheetName ?? '').replace(/''/g, "'");
}

function addReference(refs, row, col, sheetName = null) {
  const localKey = cellKey(row, col);
  const key = sheetName ? `${sheetName}!${localKey}` : localKey;
  if (!refs.has(key)) refs.set(key, {row, col, key, address: cellAddress(row, col), sheetName});
}

function stripStringLiterals(text) {
  return String(text ?? '').replace(/"(?:""|[^"])*"/g, '');
}

function dimensionsForReference(options, sheetName = null) {
  return options.getSheetDimensionsForReference?.(sheetName) || {
    rowCount: options.rowCount,
    colCount: options.colCount,
  };
}

function parseLocalCellKey(key) {
  const [row, col] = String(key).split(':').map(Number);
  return {row, col};
}

function spillBlockedByKeys(sheet, originKey, arrayValue) {
  const keys = [];
  for (const key of spillCoveredKeys(originKey, arrayValue)) {
    if (sheet.cells.has(key)) keys.push(key);
  }
  return keys;
}

function spillCoveredKeys(originKey, arrayValue) {
  if (!isFormulaArrayValue(arrayValue)) return [];
  const origin = parseLocalCellKey(originKey);
  const size = formulaArrayDimensions(arrayValue);
  const keys = [];
  for (let rowOffset = 0; rowOffset < size.rows; rowOffset++) {
    for (let colOffset = 0; colOffset < size.cols; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue;
      keys.push(cellKey(origin.row + rowOffset, origin.col + colOffset));
    }
  }
  return keys;
}

function spillOriginKeyForCell(sheet, row, col) {
  const targetKey = cellKey(row, col);
  if (!sheet || sheet.cells.has(targetKey)) return null;
  for (const [originKey, cell] of sheet.cells.entries()) {
    if (!cell?.formula || !isFormulaArrayValue(cell.computedValue)) continue;
    if (spillBlockedByKeys(sheet, originKey, cell.computedValue).length) continue;
    const origin = parseLocalCellKey(originKey);
    const size = formulaArrayDimensions(cell.computedValue);
    if (row >= origin.row && col >= origin.col && row < origin.row + size.rows && col < origin.col + size.cols) {
      return originKey;
    }
  }
  return null;
}

function addDependent(dependentsByCell, precedentKey, dependentKey) {
  if (!dependentsByCell.has(precedentKey)) dependentsByCell.set(precedentKey, new Set());
  dependentsByCell.get(precedentKey).add(dependentKey);
}

export function extractFormulaReferences(formula, options = {}) {
  const refs = new Map();
  const maxRangeCells = options.maxRangeCells || 10000;
  const text = stripStringLiterals(expandNamedRangesInFormula(formula, options.namedRanges, options.sheetId).replace(/^=/, ''));
  for (const match of text.matchAll(REF_PATTERN)) {
    const sheetName = match[1] || match[2] ? unquoteSheetName(match[1] || match[2]) : null;
    const endSheetName = match[4] || match[5] ? unquoteSheetName(match[4] || match[5]) : sheetName;
    const startRef = stripAbsoluteMarkers(match[3]);
    const endRef = match[6] ? stripAbsoluteMarkers(match[6]) : null;
    if (endRef) {
      const dimensions = dimensionsForReference(options, endSheetName || sheetName);
      const range = parseRange(`${startRef}:${endRef}`, {
        allowWholeReference: true,
        rowCount: dimensions.rowCount,
        colCount: dimensions.colCount,
      });
      if (!range) continue;
      let count = 0;
      for (let row = range.r1; row <= range.r2; row++) {
        for (let col = range.c1; col <= range.c2; col++) {
          if (++count > maxRangeCells) break;
          addReference(refs, row, col, endSheetName || sheetName);
        }
        if (count > maxRangeCells) break;
      }
      continue;
    }
    const point = parseCellAddress(startRef);
    if (point) addReference(refs, point.row, point.col, sheetName);
  }
  return Array.from(refs.values());
}

export function buildDependencyGraph(sheet, options = {}) {
  const precedentsByCell = new Map();
  const dependentsByCell = new Map();

  for (const [dependentKey, cell] of sheet.cells.entries()) {
    if (!cell?.formula) continue;
    const refs = extractFormulaReferences(cell.formula, {...options, rowCount: options.rowCount || sheet.rowCount, colCount: options.colCount || sheet.colCount});
    const precedentKeys = new Set();
    for (const ref of refs) {
      precedentKeys.add(ref.key);
      if (!ref.sheetName) {
        const spillOriginKey = spillOriginKeyForCell(sheet, ref.row, ref.col);
        if (spillOriginKey) precedentKeys.add(spillOriginKey);
      }
    }
    for (const spillKey of spillCoveredKeys(dependentKey, cell.computedValue)) precedentKeys.add(spillKey);
    precedentsByCell.set(dependentKey, precedentKeys);
    for (const precedentKey of precedentKeys) {
      addDependent(dependentsByCell, precedentKey, dependentKey);
    }
  }

  return {precedentsByCell, dependentsByCell};
}

export function collectDependentCells(dependentsByCell, changedKeys) {
  const dirty = new Set();
  const queue = [...changedKeys];
  while (queue.length) {
    const key = queue.shift();
    const dependents = dependentsByCell.get(key);
    if (!dependents) continue;
    for (const dependentKey of dependents) {
      if (dirty.has(dependentKey)) continue;
      dirty.add(dependentKey);
      queue.push(dependentKey);
    }
  }
  return dirty;
}

export function getFormulaRecalculationOrder(sheet, changedKeys, options = {}) {
  const graph = buildDependencyGraph(sheet, options);
  const dirty = collectDependentCells(graph.dependentsByCell, changedKeys);
  const visited = new Set();
  const visiting = new Set();
  const order = [];
  const cycles = new Set();

  const visit = (key) => {
    if (!dirty.has(key) || visited.has(key)) return;
    if (visiting.has(key)) {
      cycles.add(key);
      return;
    }
    visiting.add(key);
    const precedents = graph.precedentsByCell.get(key);
    if (precedents) {
      for (const precedentKey of precedents) visit(precedentKey);
    }
    visiting.delete(key);
    visited.add(key);
    order.push(key);
  };

  for (const key of dirty) visit(key);
  return {order, dirty, cycles, graph};
}

export function workbookCellKey(sheetId, row, col) {
  return `${sheetId}!${cellKey(row, col)}`;
}

export function parseWorkbookCellKey(key) {
  const [sheetId, ...rest] = String(key).split('!');
  return {sheetId, key: rest.join('!')};
}

function getSheetByReference(workbook, sheetRef, fallbackSheetId) {
  if (!sheetRef) return workbook.sheets.get(fallbackSheetId) ? fallbackSheetId : workbook.activeSheetId;
  if (workbook.sheets.has(sheetRef)) return sheetRef;
  const normalized = String(sheetRef).toLowerCase();
  return Array.from(workbook.sheets.values()).find((sheet) => sheet.name.toLowerCase() === normalized)?.id || sheetRef;
}

function normalizeChangedCellsBySheet(changedCellsBySheet) {
  if (!changedCellsBySheet) return new Map();
  if (changedCellsBySheet instanceof Map) {
    return new Map(Array.from(changedCellsBySheet.entries(), ([sheetId, keys]) => [sheetId, new Set(keys)]));
  }
  return new Map(Object.entries(changedCellsBySheet).map(([sheetId, keys]) => [sheetId, new Set(keys)]));
}

export function buildWorkbookDependencyGraph(workbook, options = {}) {
  const precedentsByCell = new Map();
  const dependentsByCell = new Map();

  for (const sheetId of workbook.sheetOrder) {
    const sheet = workbook.sheets.get(sheetId);
    if (!sheet) continue;
    for (const [dependentLocalKey, cell] of sheet.cells.entries()) {
      if (!cell?.formula) continue;
      const dependentKey = `${sheetId}!${dependentLocalKey}`;
      const refs = extractFormulaReferences(cell.formula, {
        ...options,
        namedRanges: options.namedRanges || workbook.namedRanges,
        sheetId,
        rowCount: options.rowCount || sheet.rowCount,
        colCount: options.colCount || sheet.colCount,
        getSheetDimensionsForReference(sheetRef) {
          const referencedSheetId = getSheetByReference(workbook, sheetRef, sheetId);
          const referencedSheet = workbook.sheets.get(referencedSheetId);
          return referencedSheet
            ? {rowCount: referencedSheet.rowCount, colCount: referencedSheet.colCount}
            : {rowCount: sheet.rowCount, colCount: sheet.colCount};
        },
      });
      const precedentKeys = new Set();
      for (const ref of refs) {
        const precedentSheetId = getSheetByReference(workbook, ref.sheetName, sheetId);
        precedentKeys.add(workbookCellKey(precedentSheetId, ref.row, ref.col));
        const precedentSheet = workbook.sheets.get(precedentSheetId);
        const spillOriginKey = spillOriginKeyForCell(precedentSheet, ref.row, ref.col);
        if (spillOriginKey) precedentKeys.add(`${precedentSheetId}!${spillOriginKey}`);
      }
      for (const spillKey of spillCoveredKeys(dependentLocalKey, cell.computedValue)) {
        precedentKeys.add(`${sheetId}!${spillKey}`);
      }
      precedentsByCell.set(dependentKey, precedentKeys);
      for (const precedentKey of precedentKeys) {
        addDependent(dependentsByCell, precedentKey, dependentKey);
      }
    }
  }

  return {precedentsByCell, dependentsByCell};
}

export function getWorkbookFormulaRecalculationOrder(workbook, changedCellsBySheet, options = {}) {
  const graph = buildWorkbookDependencyGraph(workbook, options);
  const changed = new Set();
  for (const [sheetId, keys] of normalizeChangedCellsBySheet(changedCellsBySheet).entries()) {
    for (const key of keys) changed.add(`${sheetId}!${key}`);
  }

  const dirty = collectDependentCells(graph.dependentsByCell, changed);
  for (const qualifiedKey of changed) {
    const {sheetId, key} = parseWorkbookCellKey(qualifiedKey);
    if (workbook.sheets.get(sheetId)?.cells.get(key)?.formula) dirty.add(qualifiedKey);
  }

  const visited = new Set();
  const visiting = new Set();
  const order = [];
  const cycles = new Set();

  const visit = (key) => {
    if (!dirty.has(key) || visited.has(key)) return;
    if (visiting.has(key)) {
      cycles.add(key);
      return;
    }
    visiting.add(key);
    const precedents = graph.precedentsByCell.get(key);
    if (precedents) {
      for (const precedentKey of precedents) visit(precedentKey);
    }
    visiting.delete(key);
    visited.add(key);
    order.push(key);
  };

  for (const key of dirty) visit(key);
  return {order, dirty, cycles, graph, changed};
}
