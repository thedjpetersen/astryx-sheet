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
  const match = /^\s*([A-Z]+)(\d+)\s*$/i.exec(address);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return {row: Number(match[2]) - 1, col: col - 1};
}

export function parseRange(ref) {
  const parts = ref.split(':');
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1] || parts[0]);
  if (!start || !end) return null;
  return {
    r1: Math.min(start.row, end.row),
    r2: Math.max(start.row, end.row),
    c1: Math.min(start.col, end.col),
    c2: Math.max(start.col, end.col),
  };
}
