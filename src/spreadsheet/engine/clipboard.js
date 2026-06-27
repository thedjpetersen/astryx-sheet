import {CommandType} from './commands.js';
import {cellAddress, columnName, parseCellAddress} from '../model/address.js';
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

export function translateFormulaReferences(formula, rowOffset, colOffset) {
  const text = String(formula ?? '');
  return text.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (match, colAbs, colText, rowAbs, rowText) => {
    const parsed = parseCellAddress(`${colText}${rowText}`);
    if (!parsed) return match;
    const nextRow = rowAbs ? parsed.row : parsed.row + rowOffset;
    const nextCol = colAbs ? parsed.col : parsed.col + colOffset;
    if (nextRow < 0 || nextCol < 0) return '#REF!';
    return `${colAbs ? '$' : ''}${columnName(nextCol)}${rowAbs ? '$' : ''}${nextRow + 1}`;
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

export function createClipboardBatchCommand(commands, label = 'Clipboard') {
  return {type: CommandType.BATCH, commands, label};
}
