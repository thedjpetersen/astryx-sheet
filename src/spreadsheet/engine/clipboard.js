import {CommandType} from './commands.js';
import {cellAddress, columnName, parseCellAddress} from '../model/address.js';
import {cloneCellRecord} from './cells.js';
import {getCellDisplayValue, getCellRawValue, getCellRecord} from './workbook.js';

function escapeTsvValue(value) {
  const text = String(value ?? '');
  if (!/[\t\r\n"]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function rangeToTsv(workbook, range, options = {}) {
  const sheetId = options.sheetId || workbook.activeSheetId;
  const readValue = options.valueMode === 'display' ? getCellDisplayValue : getCellRawValue;
  const rows = [];
  for (let row = range.r1; row <= range.r2; row++) {
    const cells = [];
    for (let col = range.c1; col <= range.c2; col++) {
      cells.push(escapeTsvValue(readValue(workbook, sheetId, row, col, options)));
    }
    rows.push(cells.join('\t'));
  }
  return rows.join('\n');
}

export function parseTsv(tsv) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < tsv.length; i++) {
    const ch = tsv[i];
    if (quoted) {
      if (ch === '"' && tsv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === '\t') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

export function createPasteTsvCommand(tsv, anchor, options = {}) {
  const rows = parseTsv(tsv);
  const cells = [];
  rows.forEach((rowValues, rowOffset) => {
    rowValues.forEach((value, colOffset) => {
      cells.push({
        row: anchor.row + rowOffset,
        col: anchor.col + colOffset,
        cell: value,
      });
    });
  });
  return {
    type: CommandType.SET_RANGE,
    sheetId: options.sheetId,
    cells,
    label: options.label || 'Paste TSV',
  };
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
