import {CommandType} from './commands.js';
import {cellAddress, columnName, parseCellAddress, parseColumnAddress, parseRowAddress} from '../model/address.js';
import {cloneCellRecord} from './cells.js';
import {createImportDelimitedCommand, parseDelimited, rangeToDelimited} from './delimited.js';
import {getCellRawValue, getCellRecord} from './workbook.js';

export function rangeToTsv(workbook, range, options = {}) {
  return rangeToDelimited(workbook, range, {...options, delimiter: '\t'});
}

export function parseTsv(tsv) {
  return parseDelimited(tsv, {delimiter: '\t'});
}

export function createPasteTsvCommand(tsv, anchor, options = {}) {
  return createImportDelimitedCommand(tsv, anchor, {...options, delimiter: '\t', label: options.label || 'Paste TSV'});
}

function replaceOutsideStringLiterals(text, replacer) {
  return String(text ?? '').replace(/"(?:""|[^"])*"|[^"]+/g, (part) => (
    part.startsWith('"') ? part : replacer(part)
  ));
}

function shiftColumnReference(colAbs, colText, colOffset) {
  const parsed = parseColumnAddress(colText);
  if (parsed == null) return `${colAbs || ''}${colText}`;
  if (colAbs) return `${colAbs}${columnName(parsed)}`;
  const nextCol = parsed + colOffset;
  return nextCol < 0 ? '#REF!' : columnName(nextCol);
}

function shiftRowReference(rowAbs, rowText, rowOffset) {
  const parsed = parseRowAddress(rowText);
  if (parsed == null) return `${rowAbs || ''}${rowText}`;
  if (rowAbs) return `${rowAbs}${parsed + 1}`;
  const nextRow = parsed + rowOffset;
  return nextRow < 0 ? '#REF!' : String(nextRow + 1);
}

function shiftCellReference(colAbs, colText, rowAbs, rowText, rowOffset, colOffset) {
  const parsed = parseCellAddress(`${colText}${rowText}`);
  if (!parsed) return `${colAbs || ''}${colText}${rowAbs || ''}${rowText}`;
  const nextRow = rowAbs ? parsed.row : parsed.row + rowOffset;
  const nextCol = colAbs ? parsed.col : parsed.col + colOffset;
  if (nextRow < 0 || nextCol < 0) return '#REF!';
  return `${colAbs ? '$' : ''}${columnName(nextCol)}${rowAbs ? '$' : ''}${nextRow + 1}`;
}

export function translateFormulaReferences(formula, rowOffset, colOffset) {
  return replaceOutsideStringLiterals(formula, (text) => {
    const placeholders = [];
    const reserve = (value) => {
      const placeholder = `__ASTRYX_REF_${placeholders.length}__`;
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
      const start = `${startQualifier}${shiftCellReference(startColAbs, startColText, startRowAbs, startRowText, rowOffset, colOffset)}`;
      const end = `${endQualifier}${shiftCellReference(endColAbs, endColText, endRowAbs, endRowText, rowOffset, colOffset)}`;
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
    ) => {
      const start = `${startQualifier}${shiftColumnReference(startColAbs, startColText, colOffset)}`;
      const end = `${endQualifier}${shiftColumnReference(endColAbs, endColText, colOffset)}`;
      return reserve(start.includes('#REF!') || end.includes('#REF!') ? '#REF!' : `${start}:${end}`);
    });
    const withWholeRows = withWholeColumns.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)(\\d+)\\s*:\\s*(${sheetQualifier})?(\\$?)(\\d+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      startQualifier = '',
      startRowAbs,
      startRowText,
      endQualifier = '',
      endRowAbs,
      endRowText,
    ) => {
      const start = `${startQualifier}${shiftRowReference(startRowAbs, startRowText, rowOffset)}`;
      const end = `${endQualifier}${shiftRowReference(endRowAbs, endRowText, rowOffset)}`;
      return reserve(start.includes('#REF!') || end.includes('#REF!') ? '#REF!' : `${start}:${end}`);
    });
    const withCells = withWholeRows.replace(new RegExp(`(?<![A-Z0-9_.])(${sheetQualifier})?(\\$?)([A-Z]+)(\\$?)(\\d+)(?![A-Z0-9_.])`, 'gi'), (
      match,
      qualifier = '',
      colAbs,
      colText,
      rowAbs,
      rowText,
    ) => `${qualifier}${shiftCellReference(colAbs, colText, rowAbs, rowText, rowOffset, colOffset)}`);
    return withCells.replace(/__ASTRYX_REF_(\d+)__/g, (_match, indexText) => placeholders[Number(indexText)] || _match);
  });
}

export function cloneCellForPaste(cell, rowOffset, colOffset, options = {}) {
  const cloned = cloneCellRecord(cell);
  if (!cloned) return null;
  if (options.translateFormulas !== false && cloned.formula) {
    cloned.formula = translateFormulaReferences(cloned.formula, rowOffset, colOffset);
  }
  if (options.includeFormats === false) {
    delete cloned.format;
    delete cloned.style;
  }
  if (options.includeNotes === false) delete cloned.note;
  return cloned;
}

export function createCopyRangeCommand(workbook, sourceRange, anchor, options = {}) {
  const sheetId = options.sheetId || workbook.activeSheetId;
  const targetSheetId = options.targetSheetId || sheetId;
  const cells = [];
  for (let row = sourceRange.r1; row <= sourceRange.r2; row++) {
    for (let col = sourceRange.c1; col <= sourceRange.c2; col++) {
      const targetRow = anchor.row + (row - sourceRange.r1);
      const targetCol = anchor.col + (col - sourceRange.c1);
      const explicitCell = getCellRecord(workbook, sheetId, row, col);
      const rowOffset = targetRow - row;
      const colOffset = targetCol - col;
      let cell = explicitCell
        ? cloneCellForPaste(explicitCell, rowOffset, colOffset, options)
        : null;
      if (!cell && options.includeGeneratedDefaults !== false) {
        const raw = getCellRawValue(workbook, sheetId, row, col, options);
        cell = typeof raw === 'string' && raw.trim().startsWith('=')
          ? cloneCellForPaste({formula: raw}, rowOffset, colOffset, options)
          : {value: raw};
      }
      cells.push({row: targetRow, col: targetCol, cell});
    }
  }
  return {
    type: CommandType.SET_RANGE,
    sheetId: targetSheetId,
    cells,
    label: options.label || `Copy ${cellAddress(sourceRange.r1, sourceRange.c1)}:${cellAddress(sourceRange.r2, sourceRange.c2)}`,
  };
}

function cellForFill(workbook, sheetId, sourceRow, sourceCol, rowOffset, colOffset, options) {
  const explicitCell = getCellRecord(workbook, sheetId, sourceRow, sourceCol);
  if (explicitCell) return cloneCellForPaste(explicitCell, rowOffset, colOffset, options);
  if (options.includeGeneratedDefaults === false) return null;
  const raw = getCellRawValue(workbook, sheetId, sourceRow, sourceCol, options);
  return typeof raw === 'string' && raw.trim().startsWith('=')
    ? cloneCellForPaste({formula: raw}, rowOffset, colOffset, options)
    : {value: raw};
}

export function createFillDownCommand(workbook, range, options = {}) {
  if (range.r2 <= range.r1) throw new Error('Fill down requires at least two rows');
  const sheetId = options.sheetId || workbook.activeSheetId;
  const cells = [];
  for (let row = range.r1 + 1; row <= range.r2; row++) {
    for (let col = range.c1; col <= range.c2; col++) {
      cells.push({
        row,
        col,
        cell: cellForFill(workbook, sheetId, range.r1, col, row - range.r1, 0, options),
      });
    }
  }
  return {
    type: CommandType.SET_RANGE,
    sheetId,
    cells,
    label: options.label || `Fill down ${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`,
  };
}

export function createFillRightCommand(workbook, range, options = {}) {
  if (range.c2 <= range.c1) throw new Error('Fill right requires at least two columns');
  const sheetId = options.sheetId || workbook.activeSheetId;
  const cells = [];
  for (let row = range.r1; row <= range.r2; row++) {
    for (let col = range.c1 + 1; col <= range.c2; col++) {
      cells.push({
        row,
        col,
        cell: cellForFill(workbook, sheetId, row, range.c1, 0, col - range.c1, options),
      });
    }
  }
  return {
    type: CommandType.SET_RANGE,
    sheetId,
    cells,
    label: options.label || `Fill right ${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`,
  };
}

export function createClipboardBatchCommand(commands, label = 'Clipboard') {
  return {type: CommandType.BATCH, commands, label};
}
