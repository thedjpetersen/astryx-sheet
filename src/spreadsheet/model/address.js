import {DEFAULT_GRID_CONFIG} from './constants.js';

export function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function cellAddress(row, col) {
  return `${columnName(col)}${row + 1}`;
}

export function cellKey(row, col) {
  return `${row}:${col}`;
}

export function parseCellAddress(address) {
  const match = /^\s*\$?([A-Z]+)\$?(\d+)\s*$/i.exec(address);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return {row: Number(match[2]) - 1, col: col - 1};
}

export function parseColumnAddress(address) {
  const match = /^\s*\$?([A-Z]+)\s*$/i.exec(address);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return col - 1;
}

export function parseRowAddress(address) {
  const match = /^\s*\$?(\d+)\s*$/.exec(address);
  return match ? Number(match[1]) - 1 : null;
}

function parseRangePart(ref) {
  const cell = parseCellAddress(ref);
  if (cell) return {type: 'cell', ...cell};
  const col = parseColumnAddress(ref);
  if (col != null) return {type: 'column', col};
  const row = parseRowAddress(ref);
  if (row != null) return {type: 'row', row};
  return null;
}

export function parseRange(ref, options = {}) {
  const parts = ref.split(':');
  const start = parseRangePart(parts[0]);
  const end = parseRangePart(parts[1] || parts[0]);
  if (!start || !end) return null;
  const rowCount = options.rowCount || options.rows || DEFAULT_GRID_CONFIG.rows;
  const colCount = options.colCount || options.cols || DEFAULT_GRID_CONFIG.cols;
  if (start.type !== end.type) return null;
  if (start.type === 'column') {
    if (parts.length < 2 && !options.allowWholeReference) return null;
    return {
      r1: 0,
      r2: Math.max(0, rowCount - 1),
      c1: Math.min(start.col, end.col),
      c2: Math.max(start.col, end.col),
    };
  }
  if (start.type === 'row') {
    if (parts.length < 2 && !options.allowWholeReference) return null;
    return {
      r1: Math.min(start.row, end.row),
      r2: Math.max(start.row, end.row),
      c1: 0,
      c2: Math.max(0, colCount - 1),
    };
  }
  return {
    r1: Math.min(start.row, end.row),
    r2: Math.max(start.row, end.row),
    c1: Math.min(start.col, end.col),
    c2: Math.max(start.col, end.col),
  };
}
