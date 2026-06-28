import {cellKey, columnName, parseCellAddress, parseColumnAddress, parseRowAddress} from '../model/address.js';
import {normalizeSelection} from '../model/selection.js';
import {cloneCellRecord, normalizeCellRecord} from './cells.js';
import {cloneConditionalFormat, createConditionalFormat} from './conditionalFormatting.js';
import {cloneFilter, createFilter} from './filters.js';
import {mergeCellFormat, mergeCellStyle} from './formatting.js';
import {assertNoMergeOverlap, cloneMergedRange, createMergedRange, mergeIdForRange} from './merges.js';
import {cloneNamedRange, createNamedRange, normalizeName} from './names.js';
import {cloneValidationRule, createValidationRule, validationIdForRange} from './validation.js';
import {cloneSheet, cloneWorkbook, createSheet, getSheet, setCellRecord, withClonedSheet} from './workbook.js';

export const CommandType = {
  BATCH: 'BATCH',
  SET_CELL: 'SET_CELL',
  SET_CELL_NOTE: 'SET_CELL_NOTE',
  CLEAR_CELL_NOTE: 'CLEAR_CELL_NOTE',
  SET_CELL_LINK: 'SET_CELL_LINK',
  CLEAR_CELL_LINK: 'CLEAR_CELL_LINK',
  SET_RANGE: 'SET_RANGE',
  CLEAR_RANGE: 'CLEAR_RANGE',
  SET_RANGE_FORMAT: 'SET_RANGE_FORMAT',
  SET_RANGE_STYLE: 'SET_RANGE_STYLE',
  SORT_RANGE: 'SORT_RANGE',
  SET_FILTER: 'SET_FILTER',
  CLEAR_FILTER: 'CLEAR_FILTER',
  MERGE_RANGE: 'MERGE_RANGE',
  UNMERGE_RANGE: 'UNMERGE_RANGE',
  SET_VALIDATION: 'SET_VALIDATION',
  CLEAR_VALIDATION: 'CLEAR_VALIDATION',
  SET_CONDITIONAL_FORMAT: 'SET_CONDITIONAL_FORMAT',
  CLEAR_CONDITIONAL_FORMAT: 'CLEAR_CONDITIONAL_FORMAT',
  INSERT_ROWS: 'INSERT_ROWS',
  DELETE_ROWS: 'DELETE_ROWS',
  INSERT_COLUMNS: 'INSERT_COLUMNS',
  DELETE_COLUMNS: 'DELETE_COLUMNS',
  RESIZE_ROW: 'RESIZE_ROW',
  RESIZE_COLUMN: 'RESIZE_COLUMN',
  RESTORE_SHEET: 'RESTORE_SHEET',
  RESTORE_WORKBOOK: 'RESTORE_WORKBOOK',
  SET_ACTIVE_SHEET: 'SET_ACTIVE_SHEET',
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
  if (
    command.type === CommandType.SET_CELL ||
    command.type === CommandType.SET_CELL_NOTE ||
    command.type === CommandType.CLEAR_CELL_NOTE ||
    command.type === CommandType.SET_CELL_LINK ||
    command.type === CommandType.CLEAR_CELL_LINK
  ) {
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
  if (command.type === CommandType.SET_RANGE_FORMAT || command.type === CommandType.SET_RANGE_STYLE) {
    for (const point of iterateRange(command.range)) keys.add(cellKey(point.row, point.col));
    return keys;
  }
  if (command.type === CommandType.SORT_RANGE) {
    const startRow = command.hasHeader ? command.range.r1 + 1 : command.range.r1;
    for (let row = startRow; row <= command.range.r2; row++) {
      for (let col = command.range.c1; col <= command.range.c2; col++) keys.add(cellKey(row, col));
    }
  }
  if (
    command.type === CommandType.INSERT_ROWS ||
    command.type === CommandType.DELETE_ROWS ||
    command.type === CommandType.INSERT_COLUMNS ||
    command.type === CommandType.DELETE_COLUMNS
  ) {
    keys.add(cellKey(command.index || 0, 0));
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

function applySetCellNote(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCell = cloneCellRecord(getSheet(workbook, sheetId).cells.get(cellKey(command.row, command.col)));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    const nextCell = cloneCellRecord(sheet.cells.get(cellKey(command.row, command.col))) || {};
    const note = command.note ?? command.value;
    if (note == null || note === '') delete nextCell.note;
    else nextCell.note = String(note);
    setCellRecord(sheet, command.row, command.col, Object.keys(nextCell).length ? nextCell : null);
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_CELL, sheetId, row: command.row, col: command.col, cell: oldCell},
  };
}

function applyClearCellNote(workbook, command) {
  return applySetCellNote(workbook, {...command, note: null});
}

function applySetCellLink(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCell = cloneCellRecord(getSheet(workbook, sheetId).cells.get(cellKey(command.row, command.col)));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    const nextCell = cloneCellRecord(sheet.cells.get(cellKey(command.row, command.col))) || {};
    const href = command.href ?? command.url ?? command.link?.href ?? command.value;
    if (href == null || href === '') {
      delete nextCell.link;
    } else {
      nextCell.link = {href: String(href), label: command.labelText ? String(command.labelText) : undefined};
      if (!nextCell.link.label) delete nextCell.link.label;
    }
    setCellRecord(sheet, command.row, command.col, Object.keys(nextCell).length ? nextCell : null);
  });
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_CELL, sheetId, row: command.row, col: command.col, cell: oldCell},
  };
}

function applyClearCellLink(workbook, command) {
  return applySetCellLink(workbook, {...command, href: null});
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

function getCommandDefaultCell(command, key) {
  if (!command.defaultCells || !Object.prototype.hasOwnProperty.call(command.defaultCells, key)) return null;
  return normalizeCellRecord(command.defaultCells[key]);
}

function applySetRangeFormat(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCells = [];
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    for (const point of iterateRange(command.range)) {
      const key = cellKey(point.row, point.col);
      const oldCell = cloneCellRecord(sheet.cells.get(key));
      oldCells.push({row: point.row, col: point.col, cell: oldCell});
      const nextCell = normalizeCellRecord(oldCell || getCommandDefaultCell(command, key) || {value: ''}) || {value: ''};
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

function applySetRangeStyle(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const oldCells = [];
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    for (const point of iterateRange(command.range)) {
      const key = cellKey(point.row, point.col);
      const oldCell = cloneCellRecord(sheet.cells.get(key));
      oldCells.push({row: point.row, col: point.col, cell: oldCell});
      const nextCell = normalizeCellRecord(oldCell || getCommandDefaultCell(command, key) || {value: ''}) || {value: ''};
      nextCell.style = command.replace
        ? mergeCellStyle(undefined, command.style)
        : mergeCellStyle(nextCell.style, command.style);
      if (!nextCell.style) delete nextCell.style;
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
        const oldCell = cloneCellRecord(sheet.cells.get(key));
        oldCells.push({row, col, cell: oldCell});
        cells.push({col, cell: oldCell || getCommandDefaultCell(command, key)});
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

function applySetConditionalFormat(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const rule = createConditionalFormat(command.rule || command);
  const oldRule = cloneConditionalFormat(getSheet(workbook, sheetId).conditionalFormats.get(rule.id));
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    sheet.conditionalFormats.set(rule.id, rule);
  });
  return {
    workbook: nextWorkbook,
    inverse: oldRule
      ? {type: CommandType.SET_CONDITIONAL_FORMAT, sheetId, rule: oldRule}
      : {type: CommandType.CLEAR_CONDITIONAL_FORMAT, sheetId, id: rule.id},
  };
}

function applyClearConditionalFormat(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const sheet = getSheet(workbook, sheetId);
  const range = command.range;
  const ids = command.id
    ? [command.id]
    : range
      ? Array.from(sheet.conditionalFormats.values())
        .filter((rule) => rule.range.r1 === range.r1 && rule.range.c1 === range.c1 && rule.range.r2 === range.r2 && rule.range.c2 === range.c2)
        .map((rule) => rule.id)
      : [];
  const oldRules = ids.map((id) => cloneConditionalFormat(sheet.conditionalFormats.get(id))).filter(Boolean);
  const nextWorkbook = withClonedSheet(workbook, sheetId, (sheet) => {
    ids.forEach((id) => sheet.conditionalFormats.delete(id));
  });
  const inverse = oldRules.length === 1
    ? {type: CommandType.SET_CONDITIONAL_FORMAT, sheetId, rule: oldRules[0]}
    : oldRules.length > 1
      ? {type: CommandType.BATCH, commands: oldRules.map((rule) => ({type: CommandType.SET_CONDITIONAL_FORMAT, sheetId, rule})), label: 'Restore conditional formats'}
      : {type: CommandType.CLEAR_CONDITIONAL_FORMAT, sheetId, id: command.id};
  return {
    workbook: nextWorkbook,
    inverse,
  };
}

function normalizeStructureCommand(sheet, command, kind, mode) {
  const countName = kind === 'row' ? 'rowCount' : 'colCount';
  const size = sheet[countName];
  const index = Math.trunc(Number(command.index ?? command[kind] ?? 0));
  const requestedCount = Math.trunc(Number(command.count ?? 1));
  if (!Number.isFinite(index) || !Number.isFinite(requestedCount) || requestedCount < 1) {
    throw new Error(`${mode} ${kind} command requires a positive count`);
  }
  if (mode === 'insert' && (index < 0 || index > size)) throw new Error(`Cannot insert ${kind} at ${index}`);
  if (mode === 'delete' && (index < 0 || index >= size)) throw new Error(`Cannot delete ${kind} at ${index}`);
  return {
    index,
    count: mode === 'delete' ? Math.min(requestedCount, size - index) : requestedCount,
  };
}

function shiftIndexForStructure(value, index, count, mode) {
  if (mode === 'insert') return value >= index ? value + count : value;
  const deleteEnd = index + count - 1;
  if (value >= index && value <= deleteEnd) return null;
  return value > deleteEnd ? value - count : value;
}

function shiftDimensionStore(dimensions, index, count, mode) {
  const next = new Map();
  for (const [dimensionIndex, size] of dimensions.entries()) {
    const shiftedIndex = shiftIndexForStructure(dimensionIndex, index, count, mode);
    if (shiftedIndex != null) next.set(shiftedIndex, size);
  }
  return next;
}

function adjustAxisRange(start, end, index, count, mode) {
  if (mode === 'insert') {
    if (start >= index) return [start + count, end + count];
    if (end >= index) return [start, end + count];
    return [start, end];
  }
  const deleteEnd = index + count - 1;
  if (end < index) return [start, end];
  if (start > deleteEnd) return [start - count, end - count];
  const nextStart = start < index ? start : index;
  const nextEnd = end > deleteEnd ? end - count : index - 1;
  return nextEnd >= nextStart ? [nextStart, nextEnd] : null;
}

function adjustRangeForStructure(range, kind, index, count, mode) {
  const nextRange = {...range};
  if (kind === 'row') {
    const adjusted = adjustAxisRange(range.r1, range.r2, index, count, mode);
    if (!adjusted) return null;
    [nextRange.r1, nextRange.r2] = adjusted;
    return nextRange;
  }
  const adjusted = adjustAxisRange(range.c1, range.c2, index, count, mode);
  if (!adjusted) return null;
  [nextRange.c1, nextRange.c2] = adjusted;
  return nextRange;
}

function shiftCellStoreForStructure(sheet, kind, index, count, mode) {
  const nextCells = new Map();
  for (const [key, cell] of sheet.cells.entries()) {
    const [row, col] = key.split(':').map(Number);
    const shiftedRow = kind === 'row' ? shiftIndexForStructure(row, index, count, mode) : row;
    const shiftedCol = kind === 'col' ? shiftIndexForStructure(col, index, count, mode) : col;
    if (shiftedRow == null || shiftedCol == null) continue;
    nextCells.set(cellKey(shiftedRow, shiftedCol), cloneCellRecord(cell));
  }
  sheet.cells = nextCells;
}

function shiftSheetMetadataForStructure(sheet, kind, index, count, mode) {
  if (kind === 'row') {
    sheet.rowHeights = shiftDimensionStore(sheet.rowHeights, index, count, mode);
    sheet.rowCount = mode === 'insert' ? sheet.rowCount + count : Math.max(1, sheet.rowCount - count);
  } else {
    sheet.colWidths = shiftDimensionStore(sheet.colWidths, index, count, mode);
    sheet.colCount = mode === 'insert' ? sheet.colCount + count : Math.max(1, sheet.colCount - count);
  }

  sheet.merges = new Map(Array.from(sheet.merges.values()).flatMap((merge) => {
    const range = adjustRangeForStructure(merge.range, kind, index, count, mode);
    if (!range || (range.r1 === range.r2 && range.c1 === range.c2)) return [];
    return [[mergeIdForRange(range), {...merge, id: mergeIdForRange(range), range}]];
  }));
  sheet.validations = new Map(Array.from(sheet.validations.values()).flatMap((rule) => {
    const range = adjustRangeForStructure(rule.range, kind, index, count, mode);
    if (!range) return [];
    const id = validationIdForRange(range);
    return [[id, {...cloneValidationRule(rule), id, range}]];
  }));
  sheet.conditionalFormats = new Map(Array.from(sheet.conditionalFormats.values()).flatMap((rule) => {
    const range = adjustRangeForStructure(rule.range, kind, index, count, mode);
    if (!range) return [];
    return [[rule.id, {...cloneConditionalFormat(rule), range}]];
  }));
  sheet.filters = new Map(Array.from(sheet.filters.entries()).flatMap(([id, filter]) => {
    const range = adjustRangeForStructure(filter.range, kind, index, count, mode);
    if (!range) return [];
    return [[id, {...cloneFilter(filter), range}]];
  }));
}

function unquoteSheetQualifier(qualifier) {
  const sheetName = String(qualifier || '').replace(/!$/, '');
  return /^'[\s\S]*'$/.test(sheetName) ? sheetName.slice(1, -1).replace(/''/g, "'") : sheetName;
}

function sheetReferenceMatches(qualifier, formulaSheet, targetSheet) {
  if (!qualifier) return formulaSheet.id === targetSheet.id;
  const sheetName = unquoteSheetQualifier(qualifier).toLowerCase();
  return sheetName === targetSheet.id.toLowerCase() || sheetName === targetSheet.name.toLowerCase();
}

function replaceOutsideStringLiterals(text, replacer) {
  return String(text ?? '').replace(/"(?:""|[^"])*"|[^"]+/g, (part) => (
    part.startsWith('"') ? part : replacer(part)
  ));
}

function wholeReferenceOriginal(startQualifier, startAbs, startText, endQualifier, endAbs, endText) {
  return `${startQualifier || ''}${startAbs || ''}${startText}:${endQualifier || ''}${endAbs || ''}${endText}`;
}

function shiftFormulaRefToken(qualifier, colAbs, colText, rowAbs, rowText, formulaSheet, targetSheet, kind, index, count, mode, inheritedQualifier = qualifier) {
  if (!sheetReferenceMatches(inheritedQualifier, formulaSheet, targetSheet)) return `${qualifier || ''}${colAbs || ''}${colText}${rowAbs || ''}${rowText}`;
  const parsed = parseCellAddress(`${colText}${rowText}`);
  if (!parsed) return `${qualifier || ''}${colAbs || ''}${colText}${rowAbs || ''}${rowText}`;
  const shiftedRow = kind === 'row' ? shiftIndexForStructure(parsed.row, index, count, mode) : parsed.row;
  const shiftedCol = kind === 'col' ? shiftIndexForStructure(parsed.col, index, count, mode) : parsed.col;
  if (shiftedRow == null || shiftedCol == null) return '#REF!';
  return `${qualifier || ''}${colAbs || ''}${columnName(shiftedCol)}${rowAbs || ''}${shiftedRow + 1}`;
}

function shiftFormulaWholeColumnRange(startQualifier, startColAbs, startColText, endQualifier, endColAbs, endColText, formulaSheet, targetSheet, kind, index, count, mode, inheritedQualifier) {
  const original = wholeReferenceOriginal(startQualifier, startColAbs, startColText, endQualifier, endColAbs, endColText);
  if (kind !== 'col' || !sheetReferenceMatches(inheritedQualifier, formulaSheet, targetSheet)) return original;
  const startCol = parseColumnAddress(startColText);
  const endCol = parseColumnAddress(endColText);
  if (startCol == null || endCol == null) return original;
  const reversed = startCol > endCol;
  const adjusted = adjustAxisRange(Math.min(startCol, endCol), Math.max(startCol, endCol), index, count, mode);
  if (!adjusted) return '#REF!';
  const nextStart = reversed ? adjusted[1] : adjusted[0];
  const nextEnd = reversed ? adjusted[0] : adjusted[1];
  return `${startQualifier || ''}${startColAbs || ''}${columnName(nextStart)}:${endQualifier || ''}${endColAbs || ''}${columnName(nextEnd)}`;
}

function shiftFormulaWholeRowRange(startQualifier, startRowAbs, startRowText, endQualifier, endRowAbs, endRowText, formulaSheet, targetSheet, kind, index, count, mode, inheritedQualifier) {
  const original = wholeReferenceOriginal(startQualifier, startRowAbs, startRowText, endQualifier, endRowAbs, endRowText);
  if (kind !== 'row' || !sheetReferenceMatches(inheritedQualifier, formulaSheet, targetSheet)) return original;
  const startRow = parseRowAddress(startRowText);
  const endRow = parseRowAddress(endRowText);
  if (startRow == null || endRow == null) return original;
  const reversed = startRow > endRow;
  const adjusted = adjustAxisRange(Math.min(startRow, endRow), Math.max(startRow, endRow), index, count, mode);
  if (!adjusted) return '#REF!';
  const nextStart = reversed ? adjusted[1] : adjusted[0];
  const nextEnd = reversed ? adjusted[0] : adjusted[1];
  return `${startQualifier || ''}${startRowAbs || ''}${nextStart + 1}:${endQualifier || ''}${endRowAbs || ''}${nextEnd + 1}`;
}

function shiftFormulaReferencesForStructure(formula, formulaSheet, targetSheet, kind, index, count, mode) {
  return replaceOutsideStringLiterals(formula, (text) => {
    const placeholders = [];
    const reserve = (value) => {
      const placeholder = `__ASTRYX_RANGE_${placeholders.length}__`;
      placeholders.push(value);
      return placeholder;
    };
    const sheetQualifier = "(?:'[^']*(?:''[^']*)*'|[A-Za-z_][A-Za-z0-9_]*)!";
    const withCellRanges = text.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)([A-Z]+)(\\$?)(\\d+)\\s*:\\s*(${sheetQualifier})?(\\$?)([A-Z]+)(\\$?)(\\d+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      startQualifier = '',
      startColAbs,
      startColText,
      startRowAbs,
      startRowText,
      endQualifier = '',
      endColAbs,
      endColText,
      endRowAbs,
      endRowText,
    ) => {
      const inheritedQualifier = startQualifier || endQualifier;
      const start = shiftFormulaRefToken(startQualifier, startColAbs, startColText, startRowAbs, startRowText, formulaSheet, targetSheet, kind, index, count, mode, inheritedQualifier);
      const end = shiftFormulaRefToken(endQualifier, endColAbs, endColText, endRowAbs, endRowText, formulaSheet, targetSheet, kind, index, count, mode, inheritedQualifier);
      return reserve(start.includes('#REF!') || end.includes('#REF!') ? '#REF!' : `${start}:${end}`);
    });
    const withWholeColumns = withCellRanges.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)([A-Z]+)\\s*:\\s*(${sheetQualifier})?(\\$?)([A-Z]+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      startQualifier = '',
      startColAbs,
      startColText,
      endQualifier = '',
      endColAbs,
      endColText,
    ) => reserve(shiftFormulaWholeColumnRange(startQualifier, startColAbs, startColText, endQualifier, endColAbs, endColText, formulaSheet, targetSheet, kind, index, count, mode, startQualifier || endQualifier)));
    const withWholeRows = withWholeColumns.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)(\\d+)\\s*:\\s*(${sheetQualifier})?(\\$?)(\\d+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      startQualifier = '',
      startRowAbs,
      startRowText,
      endQualifier = '',
      endRowAbs,
      endRowText,
    ) => reserve(shiftFormulaWholeRowRange(startQualifier, startRowAbs, startRowText, endQualifier, endRowAbs, endRowText, formulaSheet, targetSheet, kind, index, count, mode, startQualifier || endQualifier)));
    const withCells = withWholeRows.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)([A-Z]+)(\\$?)(\\d+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      qualifier = '',
      colAbs,
      colText,
      rowAbs,
      rowText,
    ) => shiftFormulaRefToken(qualifier, colAbs, colText, rowAbs, rowText, formulaSheet, targetSheet, kind, index, count, mode));
    return withCells.replace(/__ASTRYX_RANGE_(\d+)__/g, (_match, indexText) => placeholders[Number(indexText)] || _match);
  });
}

function updateWorkbookFormulasForStructure(workbook, targetSheet, kind, index, count, mode) {
  for (const [sheetId, sheet] of workbook.sheets.entries()) {
    const nextSheet = cloneSheet(sheet);
    let changed = false;
    for (const cell of nextSheet.cells.values()) {
      if (!cell?.formula) continue;
      const nextFormula = shiftFormulaReferencesForStructure(cell.formula, nextSheet, targetSheet, kind, index, count, mode);
      if (nextFormula !== cell.formula) {
        cell.formula = nextFormula;
        delete cell.computedValue;
        delete cell.displayValue;
        delete cell.error;
        changed = true;
      }
    }
    if (changed || sheetId === targetSheet.id) workbook.sheets.set(sheetId, nextSheet);
  }
}

function updateNamedRangesForStructure(workbook, targetSheetId, kind, index, count, mode) {
  const nextNamedRanges = new Map();
  for (const [name, namedRange] of workbook.namedRanges.entries()) {
    if (namedRange.sheetId !== targetSheetId) {
      nextNamedRanges.set(name, cloneNamedRange(namedRange));
      continue;
    }
    const range = adjustRangeForStructure(namedRange.range, kind, index, count, mode);
    if (range) nextNamedRanges.set(name, {...cloneNamedRange(namedRange), range});
  }
  workbook.namedRanges = nextNamedRanges;
}

function cloneNamedRangeMap(namedRanges) {
  return new Map(Array.from(namedRanges.entries(), ([name, namedRange]) => [name, cloneNamedRange(namedRange)]));
}

function cloneWorkbookForRestore(workbook) {
  return {
    ...cloneWorkbook(workbook),
    sheets: new Map(Array.from(workbook.sheets.entries(), ([sheetId, sheet]) => [sheetId, cloneSheet(sheet)])),
    namedRanges: cloneNamedRangeMap(workbook.namedRanges),
  };
}

function applyStructuralChange(workbook, command, kind, mode) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  const originalSheet = cloneSheet(getSheet(workbook, sheetId));
  const originalWorkbook = cloneWorkbookForRestore(workbook);
  const {index, count} = normalizeStructureCommand(originalSheet, command, kind, mode);
  const nextWorkbook = cloneWorkbook(workbook);
  const targetSheet = cloneSheet(originalSheet);

  shiftCellStoreForStructure(targetSheet, kind, index, count, mode);
  shiftSheetMetadataForStructure(targetSheet, kind, index, count, mode);
  nextWorkbook.sheets.set(sheetId, targetSheet);
  updateNamedRangesForStructure(nextWorkbook, sheetId, kind, index, count, mode);
  updateWorkbookFormulasForStructure(nextWorkbook, originalSheet, kind, index, count, mode);
  nextWorkbook.version = workbook.version + 1;

  return {
    workbook: nextWorkbook,
    command: {...command, index, count},
    inverse: {type: CommandType.RESTORE_WORKBOOK, workbook: originalWorkbook},
  };
}

function applyRestoreSheet(workbook, command) {
  const sheetId = command.sheetId || command.sheet?.id || workbook.activeSheetId;
  const oldSheet = cloneSheet(getSheet(workbook, sheetId));
  const oldNamedRanges = cloneNamedRangeMap(workbook.namedRanges);
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.set(sheetId, cloneSheet(command.sheet));
  if (command.namedRanges) nextWorkbook.namedRanges = cloneNamedRangeMap(command.namedRanges);
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.RESTORE_SHEET, sheetId, sheet: oldSheet, namedRanges: oldNamedRanges},
  };
}

function applyRestoreWorkbook(workbook, command) {
  if (!command.workbook) throw new Error('Restore workbook command requires a workbook');
  return {
    workbook: cloneWorkbookForRestore(command.workbook),
    inverse: {type: CommandType.RESTORE_WORKBOOK, workbook: cloneWorkbookForRestore(workbook)},
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
  const requestedSheet = command.sheet || {};
  let sheet = createSheet(requestedSheet);
  if (workbook.sheets.has(sheet.id) && requestedSheet.id) throw new Error(`Sheet already exists: ${sheet.id}`);
  while (workbook.sheets.has(sheet.id)) {
    sheet = createSheet({...requestedSheet, id: undefined});
  }
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.set(sheet.id, sheet);
  nextWorkbook.sheetOrder.push(sheet.id);
  nextWorkbook.activeSheetId = command.activate === false ? workbook.activeSheetId : sheet.id;
  nextWorkbook.future = [...workbook.future];
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    command: {...command, sheet},
    inverse: {type: CommandType.REMOVE_SHEET, sheetId: sheet.id, nextActiveSheetId: workbook.activeSheetId},
  };
}

function applySetActiveSheet(workbook, command) {
  const sheetId = command.sheetId || workbook.activeSheetId;
  getSheet(workbook, sheetId);
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.activeSheetId = sheetId;
  nextWorkbook.version = workbook.version + 1;
  return {
    workbook: nextWorkbook,
    inverse: {type: CommandType.SET_ACTIVE_SHEET, sheetId: workbook.activeSheetId},
  };
}

function applyRemoveSheet(workbook, command) {
  if (workbook.sheetOrder.length <= 1) throw new Error('Cannot remove the final sheet');
  const sheetId = command.sheetId || workbook.activeSheetId;
  const removedSheet = cloneSheet(getSheet(workbook, sheetId));
  const nextWorkbook = cloneWorkbook(workbook);
  nextWorkbook.sheets.delete(sheetId);
  nextWorkbook.sheetOrder = workbook.sheetOrder.filter((id) => id !== sheetId);
  if (nextWorkbook.activeSheetId === sheetId) {
    nextWorkbook.activeSheetId = command.nextActiveSheetId && nextWorkbook.sheets.has(command.nextActiveSheetId)
      ? command.nextActiveSheetId
      : nextWorkbook.sheetOrder[0];
  }
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
  const commands = [];
  let nextWorkbook = workbook;
  for (const childCommand of command.commands || []) {
    const result = applyWorkbookCommand(nextWorkbook, childCommand);
    nextWorkbook = result.workbook;
    inverses.unshift(result.inverse);
    commands.push(result.command || childCommand);
  }
  return {
    workbook: nextWorkbook,
    command: {...command, commands},
    inverse: {type: CommandType.BATCH, commands: inverses, label: command.label},
  };
}

export function applyWorkbookCommand(workbook, command) {
  if (!command?.type) throw new Error('Workbook command requires a type');
  if (command.type === CommandType.BATCH) return applyBatch(workbook, command);
  if (command.type === CommandType.SET_CELL) return applySetCell(workbook, command);
  if (command.type === CommandType.SET_CELL_NOTE) return applySetCellNote(workbook, command);
  if (command.type === CommandType.CLEAR_CELL_NOTE) return applyClearCellNote(workbook, command);
  if (command.type === CommandType.SET_CELL_LINK) return applySetCellLink(workbook, command);
  if (command.type === CommandType.CLEAR_CELL_LINK) return applyClearCellLink(workbook, command);
  if (command.type === CommandType.SET_RANGE) return applySetRange(workbook, command);
  if (command.type === CommandType.CLEAR_RANGE) return applyClearRange(workbook, command);
  if (command.type === CommandType.SET_RANGE_FORMAT) return applySetRangeFormat(workbook, command);
  if (command.type === CommandType.SET_RANGE_STYLE) return applySetRangeStyle(workbook, command);
  if (command.type === CommandType.SORT_RANGE) return applySortRange(workbook, command);
  if (command.type === CommandType.SET_FILTER) return applySetFilter(workbook, command);
  if (command.type === CommandType.CLEAR_FILTER) return applyClearFilter(workbook, command);
  if (command.type === CommandType.MERGE_RANGE) return applyMergeRange(workbook, command);
  if (command.type === CommandType.UNMERGE_RANGE) return applyUnmergeRange(workbook, command);
  if (command.type === CommandType.SET_VALIDATION) return applySetValidation(workbook, command);
  if (command.type === CommandType.CLEAR_VALIDATION) return applyClearValidation(workbook, command);
  if (command.type === CommandType.SET_CONDITIONAL_FORMAT) return applySetConditionalFormat(workbook, command);
  if (command.type === CommandType.CLEAR_CONDITIONAL_FORMAT) return applyClearConditionalFormat(workbook, command);
  if (command.type === CommandType.INSERT_ROWS) return applyStructuralChange(workbook, command, 'row', 'insert');
  if (command.type === CommandType.DELETE_ROWS) return applyStructuralChange(workbook, command, 'row', 'delete');
  if (command.type === CommandType.INSERT_COLUMNS) return applyStructuralChange(workbook, command, 'col', 'insert');
  if (command.type === CommandType.DELETE_COLUMNS) return applyStructuralChange(workbook, command, 'col', 'delete');
  if (command.type === CommandType.RESIZE_ROW) return applyResizeDimension(workbook, command, 'row');
  if (command.type === CommandType.RESIZE_COLUMN) return applyResizeDimension(workbook, command, 'col');
  if (command.type === CommandType.RESTORE_SHEET) return applyRestoreSheet(workbook, command);
  if (command.type === CommandType.RESTORE_WORKBOOK) return applyRestoreWorkbook(workbook, command);
  if (command.type === CommandType.SET_ACTIVE_SHEET) return applySetActiveSheet(workbook, command);
  if (command.type === CommandType.ADD_SHEET) return applyAddSheet(workbook, command);
  if (command.type === CommandType.REMOVE_SHEET) return applyRemoveSheet(workbook, command);
  if (command.type === CommandType.RENAME_SHEET) return applyRenameSheet(workbook, command);
  if (command.type === CommandType.SET_NAMED_RANGE) return applySetNamedRange(workbook, command);
  if (command.type === CommandType.REMOVE_NAMED_RANGE) return applyRemoveNamedRange(workbook, command);
  throw new Error(`Unknown workbook command: ${command.type}`);
}

export function dispatchCommand(workbook, command) {
  const result = applyWorkbookCommand(workbook, command);
  const committedCommand = result.command || command;
  return {
    ...result.workbook,
    history: [...workbook.history, {command: committedCommand, inverse: result.inverse, label: committedCommand.label || committedCommand.type}],
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
