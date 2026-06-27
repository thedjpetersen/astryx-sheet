import {cellKey} from '../model/address.js';
import {normalizeSelection} from '../model/selection.js';
import {cloneCellRecord, normalizeCellRecord} from './cells.js';
import {cloneFilter, createFilter} from './filters.js';
import {mergeCellFormat} from './formatting.js';
import {assertNoMergeOverlap, cloneMergedRange, createMergedRange} from './merges.js';
import {cloneNamedRange, createNamedRange, normalizeName} from './names.js';
import {cloneValidationRule, createValidationRule} from './validation.js';
import {cloneSheet, cloneWorkbook, createSheet, getSheet, setCellRecord, withClonedSheet} from './workbook.js';

export const CommandType = {
  BATCH: 'BATCH',
  SET_CELL: 'SET_CELL',
  SET_RANGE: 'SET_RANGE',
  CLEAR_RANGE: 'CLEAR_RANGE',
  SET_RANGE_FORMAT: 'SET_RANGE_FORMAT',
  SORT_RANGE: 'SORT_RANGE',
  SET_FILTER: 'SET_FILTER',
  CLEAR_FILTER: 'CLEAR_FILTER',
  MERGE_RANGE: 'MERGE_RANGE',
  UNMERGE_RANGE: 'UNMERGE_RANGE',
  SET_VALIDATION: 'SET_VALIDATION',
  CLEAR_VALIDATION: 'CLEAR_VALIDATION',
  RESIZE_ROW: 'RESIZE_ROW',
  RESIZE_COLUMN: 'RESIZE_COLUMN',
  ADD_SHEET: 'ADD_SHEET',
  REMOVE_SHEET: 'REMOVE_SHEET',
  RENAME_SHEET: 'RENAME_SHEET',
  SET_NAMED_RANGE: 'SET_NAMED_RANGE',
  REMOVE_NAMED_RANGE: 'REMOVE_NAMED_RANGE',
};

function normalizeCommandCell(command) {
  if ('cell' in command) return normalizeCellRecord(command.cell);
  if ('formula' in command) return normalizeCellRecord({formula: command.formula, value: command.value});
  return normalizeCellRecord(command.value);
}

function* iterateRange(range) {
  const normalized = 'row' in range
    ? normalizeSelection({row: range.row, col: range.col}, {row: range.row, col: range.col})
    : range;
  for (let row = normalized.r1; row <= normalized.r2; row++) {
    for (let col = normalized.c1; col <= normalized.c2; col++) {
      yield {row, col};
    }
  }
}

export function getChangedCellKeysForCommand(command) {
  const keys = new Set();
  if (!command?.type) return keys;
  if (command.type === CommandType.BATCH) {
    for (const childCommand of command.commands || []) {
      for (const key of getChangedCellKeysForCommand(childCommand)) keys.add(key);
    }
    return keys;
  }
  if (command.type === CommandType.SET_CELL) {
    keys.add(cellKey(command.row, command.col));
    return keys;
  }
  if (command.type === CommandType.SET_RANGE) {
    for (const item of command.cells || []) keys.add(cellKey(item.row, item.col));
    return keys;
  }
  if (command.type === CommandType.CLEAR_RANGE) {
    for (const point of iterateRange(command.range)) keys.add(cellKey(point.row, point.col));
  }
  if (command.type === CommandType.SORT_RANGE) {
    const startRow = command.hasHeader ? command.range.r1 + 1 : command.range.r1;
    for (let row = startRow; row <= command.range.r2; row++) {
      for (let col = command.range.c1; col <= command.range.c2; col++) keys.add(cellKey(row, col));
    }
  }
  return keys;
}

export function getCommandSheetId(workbook, command) {
  if (command?.sheetId) return command.sheetId;
  if (command?.type === CommandType.BATCH) {
    return (command.commands || []).find((childCommand) => childCommand.sheetId)?.sheetId || workbook.activeSheetId;
  }
  return workbook.activeSheetId;
}

function applySetCell(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCell = cloneCellRecord(getSheet(workbook, sheetId).cells.get(cellKey(command.row, command.col)));
  const nextCell = normalizeCommandCell(command);
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => setCellRecord(sheet, command.row, command.col, nextCell));
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_CELL, sheetId, row: command.row, col: command.col, cell: oldCell},
  };
}

function applySetRange(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCells = [];
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    for (const item of command.cells || []) {
      oldCells.push({row: item.row, col: item.col, cell: cloneCellRecord(sheet.cells.get(cellKey(item.row, item.col)))});
      const nextCell = 'cell' in item ? item.cell : 'formula' in item ? {formula: item.formula, value: item.value} : item.value;
      setCellRecord(sheet, item.row, item.col, nextCell);
    }
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_RANGE, sheetId, cells: oldCells},
  };
}

function applyClearRange(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCells = [];
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    for (const point of iterateRange(command.range)) {
      oldCells.push({row: point.row, col: point.col, cell: cloneCellRecord(sheet.cells.get(cellKey(point.row, point.col)))});
      sheet.cells.delete(cellKey(point.row, point.col));
    }
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_RANGE, sheetId, cells: oldCells},
  };
}

function applySetRangeFormat(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCells = [];
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    for (const point of iterateRange(command.range)) {
      const key = cellKey(point.row, point.col);
      const oldCell = cloneCellRecord(sheet.cells.get(key));
      oldCells.push({row: point.row, col: point.col, cell: oldCell});
      const nextCell = normalizeCellRecord(oldCell || {value: ''}) || {value: ''};
      nextCell.format = command.replace
        ? command.format
        : mergeCellFormat(nextCell.format, command.format);
      if (!nextCell.format) delete nextCell.format;
      sheet.cells.set(key, nextCell);
    }
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_RANGE, sheetId, cells: oldCells},
  };
}

function getSortValue(cell) {
  if (!cell) return '';
  if ('computedValue' in cell) return cell.computedValue;
  if ('value' in cell) return cell.value;
  if (cell.formula) return cell.formula;
  return '';
}

function compareSortValues(a, b, type) {
  const emptyA = a == null || a === '';
  const emptyB = b == null || b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const numberA = Number(String(a).replace(/[$,%\s,]/g, ''));
  const numberB = Number(String(b).replace(/[$,%\s,]/g, ''));
  if ((type === 'number' || type == null || type === 'auto') && Number.isFinite(numberA) && Number.isFinite(numberB)) return numberA - numberB;
  const dateA = type === 'date' ? new Date(a).getTime() : NaN;
  const dateB = type === 'date' ? new Date(b).getTime() : NaN;
  if (Number.isFinite(dateA) && Number.isFinite(dateB)) return dateA - dateB;
  return String(a).localeCompare(String(b), undefined, {numeric: true, sensitivity: 'base'});
}

function applySortRange(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const range = command.range;
  const startRow = command.hasHeader ? range.r1 + 1 : range.r1;
  const sortBy = command.sortBy?.length ? command.sortBy : [{col: range.c1, direction: 'asc'}];
  const oldCells = [];

  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    const rows = [];
    for (let row = startRow; row <= range.r2; row++) {
      const cells = [];
      for (let col = range.c1; col <= range.c2; col++) {
        const key = cellKey(row, col);
        const cell = cloneCellRecord(sheet.cells.get(key));
        oldCells.push({row, col, cell});
        cells.push({col, cell});
      }
      rows.push({sourceRow: row, cells});
    }
    rows.sort((rowA, rowB) => {
      for (const sort of sortBy) {
        const col = sort.col ?? range.c1;
        const valueA = getSortValue(rowA.cells.find((item) => item.col === col)?.cell);
        const valueB = getSortValue(rowB.cells.find((item) => item.col === col)?.cell);
        const result = compareSortValues(valueA, valueB, sort.type);
        if (result !== 0) return sort.direction === 'desc' ? -result : result;
      }
      return rowA.sourceRow - rowB.sourceRow;
    });
    rows.forEach((rowData, rowOffset) => {
      const targetRow = startRow + rowOffset;
      rowData.cells.forEach(({col, cell}) => setCellRecord(sheet, targetRow, col, cell));
    });
  });

  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_RANGE, sheetId, cells: oldCells},
  };
}

function applySetFilter(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const filter = createFilter(command.filter || command);
  const oldFilter = cloneFilter(getSheet(workbook, sheetId).filters.get(filter.id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.filters.set(filter.id, filter);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldFilter
      ? {type: CommandType.SET_FILTER, sheetId, filter: oldFilter}
      : {type: CommandType.CLEAR_FILTER, sheetId, id: filter.id},
  };
}

function applyClearFilter(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldFilter = cloneFilter(getSheet(workbook, sheetId).filters.get(command.id || 'filter-1'));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.filters.delete(command.id || 'filter-1');
  });
  return {
    workbook: nextWorkbook,
    inverse: oldFilter ? {type: CommandType.SET_FILTER, sheetId, filter: oldFilter} : {type: CommandType.CLEAR_FILTER, sheetId, id: command.id || 'filter-1'},
  };
}

function applyMergeRange(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const merge = createMergedRange(command.merge || command);
  const oldMerge = cloneMergedRange(getSheet(workbook, sheetId).merges.get(merge.id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    assertNoMergeOverlap(sheet.merges, merge, merge.id);
    sheet.merges.set(merge.id, merge);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldMerge
      ? {type: CommandType.MERGE_RANGE, sheetId, merge: oldMerge}
      : {type: CommandType.UNMERGE_RANGE, sheetId, id: merge.id},
  };
}

function applyUnmergeRange(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const id = command.id || (command.range ? createMergedRange(command).id : undefined);
  const oldMerge = cloneMergedRange(getSheet(workbook, sheetId).merges.get(id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.merges.delete(id);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldMerge ? {type: CommandType.MERGE_RANGE, sheetId, merge: oldMerge} : {type: CommandType.UNMERGE_RANGE, sheetId, id},
  };
}

function applySetValidation(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const rule = createValidationRule(command.rule || {...command, type: command.validationType || command.ruleType || 'any'});
  const oldRule = cloneValidationRule(getSheet(workbook, sheetId).validations.get(rule.id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.validations.set(rule.id, rule);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldRule
      ? {type: CommandType.SET_VALIDATION, sheetId, rule: oldRule}
      : {type: CommandType.CLEAR_VALIDATION, sheetId, id: rule.id},
  };
}

function applyClearValidation(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const id = command.id || (command.range ? createValidationRule(command).id : undefined);
  const oldRule = cloneValidationRule(getSheet(workbook, sheetId).validations.get(id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.validations.delete(id);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldRule ? {type: CommandType.SET_VALIDATION, sheetId, rule: oldRule} : {type: CommandType.CLEAR_VALIDATION, sheetId, id},
  };
}

function applyResizeDimension(workbook, command, kind) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const mapName = kind === 'row' ? 'rowHeights' : 'colWidths';
  const indexName = kind === 'row' ? 'row' : 'col';
  const oldValue = getSheet(workbook, sheetId)[mapName].has(command[indexName]) ? getSheet(workbook, sheetId)[mapName].get(command[indexName]) : null;
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    if (command.size == null) sheet[mapName].delete(command[indexName]);
    else sheet[mapName].set(command[indexName], command.size);
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: command.type, sheetId, [indexName]: command[indexName], size: oldValue},
  };
}

function applyAddSheet(workbook, command) {
  const sheet = createSheet(command.sheet || {});
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.set(sheet.id, sheet);
  nextWorkbook.sheetOrder.push(sheet.id);
  nextWorkbook.activeSheetId = command.activate === false ? workbook.activeSheetId : sheet.id;
  nextWorkbook.future = [...workbook.future];
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.REMOVE_SHEET, sheetId: sheet.id},
  };
}

function applyRemoveSheet(workbook, command) {
  if (workbook.sheetOrder.length <= 1) throw new Error('Cannot remove the final sheet');
  const sheetId = command.sheetId || workbook.activeSheetId;
  const removedSheet = cloneSheet(getSheet(workbook, sheetId));
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.delete(sheetId);
  nextWorkbook.sheetOrder = workbook.sheetOrder.filter((id) => id !== sheetId);
  if (nextWorkbook.activeSheetId === sheetId) nextWorkbook.activeSheetId = nextWorkbook.sheetOrder[0];
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.ADD_SHEET, sheet: removedSheet, activate: workbook.activeSheetId === sheetId},
  };
}

function applyRenameSheet(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldName = getSheet(workbook, sheetId).name;
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.name = command.name || oldName;
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.RENAME_SHEET, sheetId, name: oldName},
  };
}

function applySetNamedRange(workbook, command) {
  const namedRange = createNamedRange(command.namedRange || command);
  const oldRange = cloneNamedRange(workbook.namedRanges.get(namedRange.name));
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.namedRanges.set(namedRange.name, namedRange);
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: oldRange
      ? {type: CommandType.SET_NAMED_RANGE, namedRange: oldRange}
      : {type: CommandType.REMOVE_NAMED_RANGE, name: namedRange.name},
  };
}

function applyRemoveNamedRange(workbook, command) {
  const name = normalizeName(command.name);
  const oldRange = cloneNamedRange(workbook.namedRanges.get(name));
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.namedRanges.delete(name);
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: oldRange ? {type: CommandType.SET_NAMED_RANGE, namedRange: oldRange} : {type: CommandType.REMOVE_NAMED_RANGE, name},
  };
}

function applyBatch(workbook, command) {
  const inverses = [];
  let nextWorkbook = workbook;
  for (const childCommand of command.commands || []) {
    const result = applyWorkbookCommand(nextWorkbook, childCommand);
    nextWorkbook = result.workbook;
    inverses.unshift(result.inverse);
  }
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.BATCH, commands: inverses, label: command.label},
  };
}

export function applyWorkbookCommand(workbook, command) {
  if (!command?.type) throw new Error('Workbook command requires a type');
  if (command.type === CommandType.BATCH) return applyBatch(workbook, command);
  if (command.type === CommandType.SET_CELL) return applySetCell(workbook, command);
  if (command.type === CommandType.SET_RANGE) return applySetRange(workbook, command);
  if (command.type === CommandType.CLEAR_RANGE) return applyClearRange(workbook, command);
  if (command.type === CommandType.SET_RANGE_FORMAT) return applySetRangeFormat(workbook, command);
  if (command.type === CommandType.SORT_RANGE) return applySortRange(workbook, command);
  if (command.type === CommandType.SET_FILTER) return applySetFilter(workbook, command);
  if (command.type === CommandType.CLEAR_FILTER) return applyClearFilter(workbook, command);
  if (command.type === CommandType.MERGE_RANGE) return applyMergeRange(workbook, command);
  if (command.type === CommandType.UNMERGE_RANGE) return applyUnmergeRange(workbook, command);
  if (command.type === CommandType.SET_VALIDATION) return applySetValidation(workbook, command);
  if (command.type === CommandType.CLEAR_VALIDATION) return applyClearValidation(workbook, command);
  if (command.type === CommandType.RESIZE_ROW) return applyResizeDimension(workbook, command, 'row');
  if (command.type === CommandType.RESIZE_COLUMN) return applyResizeDimension(workbook, command, 'col');
  if (command.type === CommandType.ADD_SHEET) return applyAddSheet(workbook, command);
  if (command.type === CommandType.REMOVE_SHEET) return applyRemoveSheet(workbook, command);
  if (command.type === CommandType.RENAME_SHEET) return applyRenameSheet(workbook, command);
  if (command.type === CommandType.SET_NAMED_RANGE) return applySetNamedRange(workbook, command);
  if (command.type === CommandType.REMOVE_NAMED_RANGE) return applyRemoveNamedRange(workbook, command);
  throw new Error(`Unknown workbook command: ${command.type}`);
}

export function dispatchCommand(workbook, command) {
  const result = applyWorkbookCommand(workbook, command);
  return {
    ...result.workbook,
    history: [...workbook.history, {command, inverse: result.inverse, label: command.label || command.type}],
    future: [],
  };
}

export function undo(workbook) {
  const entry = workbook.history[workbook.history.length - 1];
  if (!entry) return workbook;
  const result = applyWorkbookCommand(workbook, entry.inverse);
  return {
    ...result.workbook,
    history: workbook.history.slice(0, -1),
    future: [entry, ...workbook.future],
  };
}

export function redo(workbook) {
  const entry = workbook.future[0];
  if (!entry) return workbook;
  const result = applyWorkbookCommand(workbook, entry.command);
  return {
    ...result.workbook,
    history: [...workbook.history, entry],
    future: workbook.future.slice(1),
  };
}
