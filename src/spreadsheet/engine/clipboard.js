import {CommandType} from './commands.js';
import {getCellDisplayValue, getCellRawValue} from './workbook.js';

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
