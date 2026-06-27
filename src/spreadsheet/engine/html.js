import {CommandType} from './commands.js';
import {getCellDisplayValue, getCellRawValue} from './workbook.js';

const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtml(text) {
  return String(text ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) return String.fromCodePoint(parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(parseInt(normalized.slice(1), 10));
    return NAMED_ENTITIES[normalized] ?? match;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAttributeNumber(attributes, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = pattern.exec(attributes || '');
  const value = Number(match?.[1] ?? match?.[2] ?? match?.[3] ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function cellTextFromHtml(html) {
  return decodeHtml(String(html ?? '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim());
}

export function parseHtmlTable(html) {
  const tableMatch = /<table\b[^>]*>([\s\S]*?)<\/table>/i.exec(String(html ?? ''));
  const tableHtml = tableMatch ? tableMatch[1] : String(html ?? '');
  const rows = [];
  const rowSpans = new Map();
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(tableHtml))) {
    const row = [];
    const advance = (col) => {
      let nextCol = col;
      while ((rowSpans.get(nextCol) || 0) > 0) {
        row[nextCol] = '';
        rowSpans.set(nextCol, rowSpans.get(nextCol) - 1);
        if (rowSpans.get(nextCol) <= 0) rowSpans.delete(nextCol);
        nextCol++;
      }
      return nextCol;
    };

    let col = advance(0);
    const cellPattern = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      col = advance(col);
      const colspan = getAttributeNumber(cellMatch[2], 'colspan');
      const rowspan = getAttributeNumber(cellMatch[2], 'rowspan');
      const value = cellTextFromHtml(cellMatch[3]);
      for (let offset = 0; offset < colspan; offset++) {
        row[col + offset] = offset === 0 ? value : '';
        if (rowspan > 1) rowSpans.set(col + offset, Math.max(rowSpans.get(col + offset) || 0, rowspan - 1));
      }
      col += colspan;
    }
    advance(col);
    if (row.length) rows.push(row.map((value) => value ?? ''));
  }

  return rows;
}

export function createImportHtmlTableCommand(html, anchor, options = {}) {
  const rows = parseHtmlTable(html);
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
    label: options.label || 'Import HTML table',
  };
}

export function rangeToHtmlTable(workbook, range, options = {}) {
  const sheetId = options.sheetId || workbook.activeSheetId;
  const readValue = options.valueMode === 'raw' ? getCellRawValue : getCellDisplayValue;
  const rows = [];
  for (let row = range.r1; row <= range.r2; row++) {
    const cells = [];
    for (let col = range.c1; col <= range.c2; col++) {
      cells.push(`<td>${escapeHtml(readValue(workbook, sheetId, row, col, options))}</td>`);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return `<table><tbody>${rows.join('')}</tbody></table>`;
}
