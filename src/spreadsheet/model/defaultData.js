import {cellKey, columnName} from './address.js';

export function defaultCellValue(row, col) {
  if (col === 0) return row < 8 ? ['Metric', 'North', 'South', 'East', 'West', 'Online', 'Retail', 'Partner'][row] : `Item ${row + 1}`;
  if (row === 0) return ['', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Owner', 'Status', 'Updated'][col] || columnName(col);
  if (col === 5) return `=SUM(B${row + 1}:E${row + 1})`;
  if (col === 6) return ['Ami', 'Blake', 'Casey', 'Drew', 'Emery'][row % 5];
  if (col === 7) return ['Live', 'Review', 'Blocked', 'Done'][row % 4];
  if (col === 8) return new Date(2026, row % 12, ((row * 3) % 27) + 1).toLocaleDateString();
  if (col >= 1 && col <= 4) return String(((row + 3) * (col + 7)) % 900 + 100);
  if (col % 13 === 0) return `=SUM(${columnName(col - 2)}${row + 1}:${columnName(col - 1)}${row + 1})`;
  if ((row + col) % 17 === 0) return `${(row * 7 + col * 13) % 1000}.00`;
  return `${columnName(col)}${row + 1}`;
}

export function createDefaultCellData() {
  return new Map([
    [cellKey(1, 1), '1280'],
    [cellKey(1, 5), '=SUM(B2:E2)'],
    [cellKey(3, 7), 'Needs review'],
  ]);
}

export function createDefaultRowHeights() {
  return new Map([[0, 34], [2, 38], [7, 44], [23, 42]]);
}

export function createDefaultColWidths() {
  return new Map([[0, 148], [5, 136], [6, 126], [7, 122], [8, 126]]);
}
