import {cellKey} from '../model/address.js';
import {createWorkbook} from './workbook.js';

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|apos|quot|gt|lt|amp);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) return String.fromCodePoint(parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(parseInt(normalized.slice(1), 10));
    if (normalized === 'apos') return "'";
    if (normalized === 'quot') return '"';
    if (normalized === 'gt') return '>';
    if (normalized === 'lt') return '<';
    if (normalized === 'amp') return '&';
    return match;
  });
}

function getAttributes(text) {
  const attributes = {};
  String(text ?? '').replace(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (match, key, doubleValue, singleValue) => {
    const normalizedKey = key.split(':').pop().toLowerCase();
    attributes[normalizedKey] = decodeXml(doubleValue ?? singleValue ?? '');
    return match;
  });
  return attributes;
}

function cellDataValue(cell) {
  if (!cell) return '';
  if (cell.formula) {
    if ('computedValue' in cell) return cell.computedValue;
    if ('value' in cell) return cell.value;
    return '';
  }
  return cell.value ?? '';
}

function spreadsheetMLType(value) {
  if (typeof value === 'boolean') return 'Boolean';
  if (value !== '' && value != null && Number.isFinite(Number(value))) return 'Number';
  return 'String';
}

function rowColFromCellKey(key) {
  const [row, col] = key.split(':').map(Number);
  return {row, col};
}

function sheetToSpreadsheetML(sheet) {
  const cellsByRow = new Map();
  let maxRow = 0;
  let maxCol = 0;
  for (const [key, cell] of sheet.cells.entries()) {
    const {row, col} = rowColFromCellKey(key);
    maxRow = Math.max(maxRow, row + 1);
    maxCol = Math.max(maxCol, col + 1);
    if (!cellsByRow.has(row)) cellsByRow.set(row, []);
    cellsByRow.get(row).push({row, col, cell});
  }

  const columnXml = Array.from(sheet.colWidths.entries())
    .sort(([a], [b]) => a - b)
    .map(([col, width]) => `<Column ss:Index="${col + 1}" ss:Width="${width}"/>`)
    .join('');

  const rowIndices = new Set([...cellsByRow.keys(), ...sheet.rowHeights.keys()]);
  const rowXml = Array.from(rowIndices)
    .sort((a, b) => a - b)
    .map((row) => {
      const rowAttrs = [`ss:Index="${row + 1}"`];
      if (sheet.rowHeights.has(row)) rowAttrs.push(`ss:Height="${sheet.rowHeights.get(row)}"`);
      const cellXml = (cellsByRow.get(row) || [])
        .sort((a, b) => a.col - b.col)
        .map(({col, cell}) => {
          const attrs = [`ss:Index="${col + 1}"`];
          if (cell.formula) attrs.push(`ss:Formula="${escapeXml(cell.formula)}"`);
          const value = cellDataValue(cell);
          const type = spreadsheetMLType(value);
          const data = type === 'Boolean' ? (value ? '1' : '0') : value;
          return `<Cell ${attrs.join(' ')}><Data ss:Type="${type}">${escapeXml(data)}</Data></Cell>`;
        })
        .join('');
      return `<Row ${rowAttrs.join(' ')}>${cellXml}</Row>`;
    })
    .join('');

  const rowCount = Math.max(sheet.rowCount || 0, maxRow);
  const colCount = Math.max(sheet.colCount || 0, maxCol);
  return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table ss:ExpandedColumnCount="${colCount}" ss:ExpandedRowCount="${rowCount}">${columnXml}${rowXml}</Table></Worksheet>`;
}

export function workbookToSpreadsheetML(workbook) {
  const worksheets = workbook.sheetOrder
    .map((sheetId) => workbook.sheets.get(sheetId))
    .filter(Boolean)
    .map(sheetToSpreadsheetML)
    .join('');
  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    worksheets,
    '</Workbook>',
  ].join('');
}

function parseDataValue(dataAttrs, text) {
  const type = String(dataAttrs.type || 'String').toLowerCase();
  const value = decodeXml(text);
  if (type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (type === 'boolean') return value === '1' || /^true$/i.test(value);
  return value;
}

export function spreadsheetMLToWorkbook(xml, options = {}) {
  const source = String(xml ?? '');
  const sheets = [];
  const worksheetPattern = /<(?:\w+:)?Worksheet\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Worksheet>/gi;
  let worksheetMatch;
  let sheetIndex = 0;

  while ((worksheetMatch = worksheetPattern.exec(source))) {
    const sheetAttrs = getAttributes(worksheetMatch[1]);
    const tableMatch = /<(?:\w+:)?Table\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Table>/i.exec(worksheetMatch[2]);
    const tableAttrs = getAttributes(tableMatch?.[1] || '');
    const tableXml = tableMatch?.[2] || worksheetMatch[2];
    const cells = [];
    const rowHeights = [];
    const colWidths = [];
    let maxRow = Number(tableAttrs.expandedrowcount || 0);
    let maxCol = Number(tableAttrs.expandedcolumncount || 0);

    const columnPattern = /<(?:\w+:)?Column\b([^>]*?)(?:\/>|><\/(?:\w+:)?Column>)/gi;
    let columnMatch;
    let nextCol = 0;
    while ((columnMatch = columnPattern.exec(tableXml))) {
      const attrs = getAttributes(columnMatch[1]);
      const col = attrs.index ? Number(attrs.index) - 1 : nextCol;
      if (Number.isFinite(col) && attrs.width != null) colWidths.push([col, Number(attrs.width)]);
      nextCol = Number.isFinite(col) ? col + 1 : nextCol + 1;
    }

    const rowPattern = /<(?:\w+:)?Row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Row>/gi;
    let rowMatch;
    let nextRow = 0;
    while ((rowMatch = rowPattern.exec(tableXml))) {
      const rowAttrs = getAttributes(rowMatch[1]);
      const row = rowAttrs.index ? Number(rowAttrs.index) - 1 : nextRow;
      if (!Number.isFinite(row) || row < 0) continue;
      if (rowAttrs.height != null) rowHeights.push([row, Number(rowAttrs.height)]);
      maxRow = Math.max(maxRow, row + 1);

      const cellPattern = /<(?:\w+:)?Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?Cell>)/gi;
      let cellMatch;
      let nextColInRow = 0;
      while ((cellMatch = cellPattern.exec(rowMatch[2]))) {
        const cellAttrs = getAttributes(cellMatch[1]);
        const col = cellAttrs.index ? Number(cellAttrs.index) - 1 : nextColInRow;
        if (!Number.isFinite(col) || col < 0) continue;
        const dataMatch = /<(?:\w+:)?Data\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Data>/i.exec(cellMatch[2] || '');
        const value = dataMatch ? parseDataValue(getAttributes(dataMatch[1]), dataMatch[2]) : '';
        const cell = cellAttrs.formula
          ? {formula: cellAttrs.formula, computedValue: value}
          : {value};
        cells.push([cellKey(row, col), cell]);
        maxCol = Math.max(maxCol, col + 1);
        nextColInRow = col + 1;
      }
      nextRow = row + 1;
    }

    sheets.push({
      id: `sheet-${++sheetIndex}`,
      name: sheetAttrs.name || `Sheet${sheetIndex}`,
      rowCount: maxRow || undefined,
      colCount: maxCol || undefined,
      cells,
      rowHeights,
      colWidths,
    });
  }

  return createWorkbook({
    ...options,
    sheets: sheets.length ? sheets : undefined,
    activeSheetId: sheets[0]?.id,
  });
}
