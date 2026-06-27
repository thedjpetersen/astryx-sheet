import {CommandType} from './commands.js';
import {getCellDisplayValue, getCellRawValue} from './workbook.js';

export const DelimitedFormat = {
  CSV: 'csv',
  TSV: 'tsv',
};

export function delimiterForFormat(format = DelimitedFormat.CSV) {
  return format === DelimitedFormat.TSV ? '\t' : ',';
}

function escapeDelimitedValue(value, delimiter) {
  const text = String(value ?? '');
  if (!text.includes(delimiter) && !/[\r\n"]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function parseDelimited(text, options = {}) {
  const delimiter = options.delimiter || delimiterForFormat(options.format);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
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

export function rangeToDelimited(workbook, range, options = {}) {
  const delimiter = options.delimiter || delimiterForFormat(options.format);
  const sheetId = options.sheetId || workbook.activeSheetId;
  const readValue = options.valueMode === 'display' ? getCellDisplayValue : getCellRawValue;
  const rows = [];
  for (let row = range.r1; row <= range.r2; row++) {
    const cells = [];
    for (let col = range.c1; col <= range.c2; col++) {
      cells.push(escapeDelimitedValue(readValue(workbook, sheetId, row, col, options), delimiter));
    }
    rows.push(cells.join(delimiter));
  }
  return rows.join(options.lineEnding || '\n');
}

export function createImportDelimitedCommand(text, anchor, options = {}) {
  const rows = parseDelimited(text, options);
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
    label: options.label || `Import ${options.format === DelimitedFormat.TSV ? 'TSV' : 'CSV'}`,
  };
}
