import {cellAddress, cellKey, parseRange} from '../model/address.js';
import {NumberFormatType} from './formatting.js';
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

function cellCommentToSpreadsheetML(cell) {
  return cell?.note ? `<Comment><Data>${escapeXml(cell.note)}</Data></Comment>` : '';
}

function spreadsheetMLType(value) {
  if (typeof value === 'boolean') return 'Boolean';
  if (value !== '' && value != null && Number.isFinite(Number(value))) return 'Number';
  return 'String';
}

function decimalPattern(decimals = 0) {
  const count = Math.max(0, Math.trunc(Number(decimals) || 0));
  return count ? `.${'0'.repeat(count)}` : '';
}

function formatToSpreadsheetML(format = {}) {
  const type = format.type || NumberFormatType.GENERAL;
  const decimals = format.decimals ?? format.maximumFractionDigits ?? 0;
  if (type === NumberFormatType.NUMBER) return `#,##0${decimalPattern(decimals)}`;
  if (type === NumberFormatType.CURRENCY) {
    const symbol = format.currency === 'USD' || !format.currency ? '$' : `${format.currency} `;
    return `${symbol}#,##0${decimalPattern(format.decimals ?? format.maximumFractionDigits ?? 2)}`;
  }
  if (type === NumberFormatType.PERCENT) return `0${decimalPattern(decimals)}%`;
  if (type === NumberFormatType.DATE) return 'm/d/yyyy';
  if (type === NumberFormatType.TEXT) return '@';
  return 'General';
}

function spreadsheetMLToFormat(pattern) {
  const text = String(pattern || '').trim();
  if (!text || /^general$/i.test(text)) return undefined;
  const decimals = (/\.(0+)/.exec(text)?.[1] || '').length;
  if (text === '@') return {type: NumberFormatType.TEXT};
  if (/%/.test(text)) return {type: NumberFormatType.PERCENT, decimals};
  if (/[ymd]/i.test(text)) return {type: NumberFormatType.DATE};
  if (/\$/.test(text)) return {type: NumberFormatType.CURRENCY, currency: 'USD', decimals};
  if (/EUR|GBP|JPY|CAD|AUD/i.test(text)) {
    const currency = /EUR|GBP|JPY|CAD|AUD/i.exec(text)?.[0]?.toUpperCase() || 'USD';
    return {type: NumberFormatType.CURRENCY, currency, decimals};
  }
  if (/[#0]/.test(text)) return {type: NumberFormatType.NUMBER, decimals};
  return undefined;
}

function descriptorKey(descriptor) {
  return JSON.stringify(descriptor || {});
}

function cellStyleDescriptor(cell) {
  const descriptor = {};
  if (cell?.format) descriptor.format = cell.format;
  if (cell?.style) descriptor.style = cell.style;
  return Object.keys(descriptor).length ? descriptor : null;
}

function collectWorkbookStyles(workbook) {
  const styles = new Map();
  for (const sheet of workbook.sheets.values()) {
    for (const cell of sheet.cells.values()) {
      const descriptor = cellStyleDescriptor(cell);
      if (!descriptor) continue;
      const key = descriptorKey(descriptor);
      if (!styles.has(key)) styles.set(key, {id: `fmt-${styles.size + 1}`, ...descriptor});
    }
  }
  return styles;
}

function isBold(style = {}) {
  if (style.fontWeight === 'bold') return true;
  const weight = Number(style.fontWeight);
  return Number.isFinite(weight) && weight >= 600;
}

const BORDER_POSITIONS = [
  ['borderTop', 'Top'],
  ['borderRight', 'Right'],
  ['borderBottom', 'Bottom'],
  ['borderLeft', 'Left'],
];

function borderParts(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const weight = Math.max(1, Math.round(Number(/(\d+(?:\.\d+)?)px/i.exec(text)?.[1] || 1)));
  const color = /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)$/i.exec(text)?.[1] || '#64748b';
  return {weight, color};
}

function bordersToSpreadsheetML(style = {}) {
  const borders = [];
  for (const [styleKey, position] of BORDER_POSITIONS) {
    const border = borderParts(style[styleKey] || style.border);
    if (!border) continue;
    borders.push(`<Border ss:Position="${position}" ss:LineStyle="Continuous" ss:Weight="${border.weight}" ss:Color="${escapeXml(border.color)}"/>`);
  }
  return borders.length ? `<Borders>${borders.join('')}</Borders>` : '';
}

function styleToSpreadsheetML(style = {}) {
  const parts = [];
  const fontAttrs = [];
  if (isBold(style)) fontAttrs.push('ss:Bold="1"');
  if (style.fontStyle === 'italic') fontAttrs.push('ss:Italic="1"');
  if (String(style.textDecoration || '').includes('underline')) fontAttrs.push('ss:Underline="Single"');
  if (style.color) fontAttrs.push(`ss:Color="${escapeXml(style.color)}"`);
  if (fontAttrs.length) parts.push(`<Font ${fontAttrs.join(' ')}/>`);
  if (style.backgroundColor) parts.push(`<Interior ss:Color="${escapeXml(style.backgroundColor)}" ss:Pattern="Solid"/>`);
  if (style.textAlign) {
    const horizontal = String(style.textAlign).replace(/^\w/, (ch) => ch.toUpperCase());
    parts.push(`<Alignment ss:Horizontal="${escapeXml(horizontal)}"/>`);
  }
  const bordersXml = bordersToSpreadsheetML(style);
  if (bordersXml) parts.push(bordersXml);
  return parts.join('');
}

function stylesToSpreadsheetML(styles) {
  if (!styles.size) return '';
  const styleXml = Array.from(styles.values()).map(({id, format, style}) => {
    const numberFormatXml = format ? `<NumberFormat ss:Format="${escapeXml(formatToSpreadsheetML(format))}"/>` : '';
    return `<Style ss:ID="${escapeXml(id)}">${numberFormatXml}${styleToSpreadsheetML(style)}</Style>`;
  }).join('');
  return `<Styles>${styleXml}</Styles>`;
}

function rowColFromCellKey(key) {
  const [row, col] = key.split(':').map(Number);
  return {row, col};
}

function quoteFormulaSheetName(sheetName) {
  return `'${String(sheetName ?? '').replace(/'/g, "''")}'`;
}

function namedRangeToSpreadsheetML(workbook, namedRange) {
  const sheet = workbook.sheets.get(namedRange.sheetId);
  const sheetName = sheet?.name || namedRange.sheetId;
  const range = namedRange.range;
  const ref = `=${quoteFormulaSheetName(sheetName)}!${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`;
  const attrs = [
    `ss:Name="${escapeXml(namedRange.name)}"`,
    `ss:RefersTo="${escapeXml(ref)}"`,
  ];
  if (namedRange.scope === 'sheet') attrs.push('ss:Scope="sheet"');
  if (namedRange.comment) attrs.push(`ss:Comment="${escapeXml(namedRange.comment)}"`);
  return `<NamedRange ${attrs.join(' ')}/>`;
}

function workbookNamesToSpreadsheetML(workbook) {
  const namesXml = Array.from(workbook.namedRanges.values())
    .map((namedRange) => namedRangeToSpreadsheetML(workbook, namedRange))
    .join('');
  return namesXml ? `<Names>${namesXml}</Names>` : '';
}

function rangeToSpreadsheetML(range) {
  return `${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`;
}

function conditionalFormatToSpreadsheetML(rule) {
  const attrs = [
    `ss:ID="${escapeXml(rule.id)}"`,
    `ss:Range="${escapeXml(rangeToSpreadsheetML(rule.range))}"`,
    `ss:Type="${escapeXml(rule.type)}"`,
    `ss:Operator="${escapeXml(rule.operator)}"`,
  ];
  if (rule.value != null) attrs.push(`ss:Value="${escapeXml(rule.value)}"`);
  if (rule.min != null) attrs.push(`ss:Min="${escapeXml(rule.min)}"`);
  if (rule.max != null) attrs.push(`ss:Max="${escapeXml(rule.max)}"`);
  if (rule.stopIfTrue) attrs.push('ss:StopIfTrue="1"');
  if (rule.style) attrs.push(`ss:Style="${escapeXml(JSON.stringify(rule.style))}"`);
  return `<ConditionalFormat ${attrs.join(' ')}/>`;
}

function conditionalFormatsToSpreadsheetML(sheet) {
  const formatsXml = Array.from(sheet.conditionalFormats.values())
    .map((rule) => conditionalFormatToSpreadsheetML(rule))
    .join('');
  return formatsXml ? `<ConditionalFormatting>${formatsXml}</ConditionalFormatting>` : '';
}

function mergeAnchorKey(merge) {
  return cellKey(merge.range.r1, merge.range.c1);
}

function isCoveredMergeCell(sheet, row, col) {
  for (const merge of sheet.merges.values()) {
    const {range} = merge;
    if (row < range.r1 || row > range.r2 || col < range.c1 || col > range.c2) continue;
    return row !== range.r1 || col !== range.c1;
  }
  return false;
}

function sheetToSpreadsheetML(sheet, styleIdByDescriptor = new Map()) {
  const cellsByRow = new Map();
  let maxRow = 0;
  let maxCol = 0;
  for (const [key, cell] of sheet.cells.entries()) {
    const {row, col} = rowColFromCellKey(key);
    if (isCoveredMergeCell(sheet, row, col)) continue;
    maxRow = Math.max(maxRow, row + 1);
    maxCol = Math.max(maxCol, col + 1);
    if (!cellsByRow.has(row)) cellsByRow.set(row, []);
    cellsByRow.get(row).push({row, col, cell});
  }
  const mergesByAnchor = new Map(Array.from(sheet.merges.values()).map((merge) => [mergeAnchorKey(merge), merge]));
  for (const merge of sheet.merges.values()) {
    const {range} = merge;
    maxRow = Math.max(maxRow, range.r2 + 1);
    maxCol = Math.max(maxCol, range.c2 + 1);
    if (!cellsByRow.has(range.r1)) cellsByRow.set(range.r1, []);
    const rowCells = cellsByRow.get(range.r1);
    if (!rowCells.some((item) => item.col === range.c1)) {
      rowCells.push({row: range.r1, col: range.c1, cell: null});
    }
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
          if (cell?.link?.href) attrs.push(`ss:HRef="${escapeXml(cell.link.href)}"`);
          const descriptor = cellStyleDescriptor(cell);
          if (descriptor) {
            const styleId = styleIdByDescriptor.get(descriptorKey(descriptor));
            if (styleId) attrs.push(`ss:StyleID="${escapeXml(styleId)}"`);
          }
          const merge = mergesByAnchor.get(cellKey(row, col));
          if (merge) {
            const mergeAcross = merge.range.c2 - merge.range.c1;
            const mergeDown = merge.range.r2 - merge.range.r1;
            if (mergeAcross > 0) attrs.push(`ss:MergeAcross="${mergeAcross}"`);
            if (mergeDown > 0) attrs.push(`ss:MergeDown="${mergeDown}"`);
          }
          if (cell?.formula) attrs.push(`ss:Formula="${escapeXml(cell.formula)}"`);
          const value = cellDataValue(cell);
          const type = spreadsheetMLType(value);
          const data = type === 'Boolean' ? (value ? '1' : '0') : value;
          const commentXml = cellCommentToSpreadsheetML(cell);
          return `<Cell ${attrs.join(' ')}><Data ss:Type="${type}">${escapeXml(data)}</Data>${commentXml}</Cell>`;
        })
        .join('');
      return `<Row ${rowAttrs.join(' ')}>${cellXml}</Row>`;
    })
    .join('');

  const rowCount = Math.max(sheet.rowCount || 0, maxRow);
  const colCount = Math.max(sheet.colCount || 0, maxCol);
  const conditionalFormatsXml = conditionalFormatsToSpreadsheetML(sheet);
  return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table ss:ExpandedColumnCount="${colCount}" ss:ExpandedRowCount="${rowCount}">${columnXml}${rowXml}</Table>${conditionalFormatsXml}</Worksheet>`;
}

export function workbookToSpreadsheetML(workbook) {
  const namesXml = workbookNamesToSpreadsheetML(workbook);
  const styles = collectWorkbookStyles(workbook);
  const stylesXml = stylesToSpreadsheetML(styles);
  const styleIdByDescriptor = new Map(Array.from(styles.entries()).map(([key, value]) => [key, value.id]));
  const worksheets = workbook.sheetOrder
    .map((sheetId) => workbook.sheets.get(sheetId))
    .filter(Boolean)
    .map((sheet) => sheetToSpreadsheetML(sheet, styleIdByDescriptor))
    .join('');
  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    stylesXml,
    namesXml,
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

function unquoteFormulaSheetName(sheetName) {
  const text = String(sheetName ?? '').trim();
  if (/^'[\s\S]*'$/.test(text)) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

function parseNamedRangeReference(refersTo) {
  const source = String(refersTo ?? '').trim().replace(/^=/, '');
  const match = /^(?:(('[^']*(?:''[^']*)*')|([A-Za-z_][A-Za-z0-9_ ]*))!)?(\$?[A-Z]+\$?\d+(?:\s*:\s*\$?[A-Z]+\$?\d+)?)$/i.exec(source);
  if (!match) return null;
  const sheetName = match[2] || match[3] ? unquoteFormulaSheetName(match[2] || match[3]) : null;
  const range = parseRange(match[4].replace(/\$/g, ''));
  return range ? {sheetName, range} : null;
}

function parseNamedRanges(source, sheetIdByName, fallbackSheetId) {
  const namesMatch = /<(?:\w+:)?Names\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Names>/i.exec(source);
  if (!namesMatch) return [];
  const names = [];
  const namePattern = /<(?:\w+:)?NamedRange\b([^>]*?)(?:\/>|><\/(?:\w+:)?NamedRange>)/gi;
  let nameMatch;
  while ((nameMatch = namePattern.exec(namesMatch[1]))) {
    const attrs = getAttributes(nameMatch[1]);
    const parsed = parseNamedRangeReference(attrs.refersto);
    if (!attrs.name || !parsed) continue;
    names.push({
      name: attrs.name,
      sheetId: parsed.sheetName ? sheetIdByName.get(parsed.sheetName.toLowerCase()) || parsed.sheetName : fallbackSheetId,
      range: parsed.range,
      scope: attrs.scope || 'workbook',
      comment: attrs.comment || '',
    });
  }
  return names;
}

function parseStyles(source) {
  const styles = new Map();
  const stylesMatch = /<(?:\w+:)?Styles\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Styles>/i.exec(source);
  if (!stylesMatch) return styles;
  const stylePattern = /<(?:\w+:)?Style\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Style>/gi;
  let styleMatch;
  while ((styleMatch = stylePattern.exec(stylesMatch[1]))) {
    const attrs = getAttributes(styleMatch[1]);
    const id = attrs.id;
    if (!id) continue;
    const numberFormatMatch = /<(?:\w+:)?NumberFormat\b([^>]*?)(?:\/>|><\/(?:\w+:)?NumberFormat>)/i.exec(styleMatch[2]);
    const format = spreadsheetMLToFormat(getAttributes(numberFormatMatch?.[1] || '').format);
    const fontMatch = /<(?:\w+:)?Font\b([^>]*?)(?:\/>|><\/(?:\w+:)?Font>)/i.exec(styleMatch[2]);
    const interiorMatch = /<(?:\w+:)?Interior\b([^>]*?)(?:\/>|><\/(?:\w+:)?Interior>)/i.exec(styleMatch[2]);
    const alignmentMatch = /<(?:\w+:)?Alignment\b([^>]*?)(?:\/>|><\/(?:\w+:)?Alignment>)/i.exec(styleMatch[2]);
    const bordersMatch = /<(?:\w+:)?Borders\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Borders>/i.exec(styleMatch[2]);
    const fontAttrs = getAttributes(fontMatch?.[1] || '');
    const interiorAttrs = getAttributes(interiorMatch?.[1] || '');
    const alignmentAttrs = getAttributes(alignmentMatch?.[1] || '');
    const style = {};
    if (fontAttrs.bold === '1' || /^true$/i.test(fontAttrs.bold || '')) style.fontWeight = 700;
    if (fontAttrs.italic === '1' || /^true$/i.test(fontAttrs.italic || '')) style.fontStyle = 'italic';
    if (fontAttrs.underline) style.textDecoration = 'underline';
    if (fontAttrs.color) style.color = fontAttrs.color;
    if (interiorAttrs.color) style.backgroundColor = interiorAttrs.color;
    if (alignmentAttrs.horizontal) style.textAlign = String(alignmentAttrs.horizontal).toLowerCase();
    if (bordersMatch) {
      const borderStyles = {};
      const borderPattern = /<(?:\w+:)?Border\b([^>]*?)(?:\/>|><\/(?:\w+:)?Border>)/gi;
      let borderMatch;
      while ((borderMatch = borderPattern.exec(bordersMatch[1]))) {
        const borderAttrs = getAttributes(borderMatch[1]);
        const styleKey = BORDER_POSITIONS.find(([, position]) => position.toLowerCase() === String(borderAttrs.position || '').toLowerCase())?.[0];
        if (!styleKey || String(borderAttrs.linestyle || '').toLowerCase() === 'none') continue;
        const weight = Math.max(1, Math.round(Number(borderAttrs.weight || 1)));
        const color = borderAttrs.color || '#64748b';
        borderStyles[styleKey] = `${weight}px solid ${color}`;
      }
      const borderValues = Object.values(borderStyles);
      if (BORDER_POSITIONS.every(([styleKey]) => borderStyles[styleKey]) && borderValues.every((value) => value === borderValues[0])) {
        style.border = borderValues[0];
      } else {
        Object.assign(style, borderStyles);
      }
    }
    const descriptor = {};
    if (format) descriptor.format = format;
    if (Object.keys(style).length) descriptor.style = style;
    if (Object.keys(descriptor).length) styles.set(id, descriptor);
  }
  return styles;
}

function parseConditionalFormatStyle(value) {
  if (!value) return undefined;
  try {
    const style = JSON.parse(value);
    return style && typeof style === 'object' && !Array.isArray(style) ? style : undefined;
  } catch {
    return undefined;
  }
}

function parseConditionalFormats(source) {
  const conditionalsMatch = /<(?:\w+:)?ConditionalFormatting\b[^>]*>([\s\S]*?)<\/(?:\w+:)?ConditionalFormatting>/i.exec(source);
  if (!conditionalsMatch) return [];
  const rules = [];
  const rulePattern = /<(?:\w+:)?ConditionalFormat\b([^>]*?)(?:\/>|><\/(?:\w+:)?ConditionalFormat>)/gi;
  let ruleMatch;
  while ((ruleMatch = rulePattern.exec(conditionalsMatch[1]))) {
    const attrs = getAttributes(ruleMatch[1]);
    const range = attrs.range ? parseRange(attrs.range) : null;
    if (!range) continue;
    const rule = {
      id: attrs.id,
      range,
      type: attrs.type,
      operator: attrs.operator,
      value: attrs.value,
      min: attrs.min,
      max: attrs.max,
      stopIfTrue: attrs.stopiftrue === '1' || /^true$/i.test(attrs.stopiftrue || ''),
    };
    const style = parseConditionalFormatStyle(attrs.style);
    if (style) rule.style = style;
    rules.push(rule);
  }
  return rules;
}

export function spreadsheetMLToWorkbook(xml, options = {}) {
  const source = String(xml ?? '');
  const styles = parseStyles(source);
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
    const merges = [];
    const conditionalFormats = parseConditionalFormats(worksheetMatch[2]);
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
        if (cellAttrs.styleid && styles.has(cellAttrs.styleid)) {
          const styleDescriptor = styles.get(cellAttrs.styleid);
          if (styleDescriptor.format) cell.format = {...styleDescriptor.format};
          if (styleDescriptor.style) cell.style = {...styleDescriptor.style};
        }
        if (cellAttrs.href) cell.link = {href: cellAttrs.href};
        const commentMatch = /<(?:\w+:)?Comment\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Comment>/i.exec(cellMatch[2] || '');
        const commentDataMatch = /<(?:\w+:)?Data\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Data>/i.exec(commentMatch?.[1] || '');
        if (commentDataMatch) cell.note = decodeXml(commentDataMatch[1]);
        cells.push([cellKey(row, col), cell]);
        const mergeAcross = Math.max(0, Number(cellAttrs.mergeacross || 0));
        const mergeDown = Math.max(0, Number(cellAttrs.mergedown || 0));
        if (mergeAcross || mergeDown) {
          merges.push({range: {r1: row, c1: col, r2: row + mergeDown, c2: col + mergeAcross}});
        }
        maxRow = Math.max(maxRow, row + mergeDown + 1);
        maxCol = Math.max(maxCol, col + mergeAcross + 1);
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
      merges,
      conditionalFormats,
    });
  }
  const sheetIdByName = new Map(sheets.map((sheet) => [String(sheet.name).toLowerCase(), sheet.id]));
  const namedRanges = parseNamedRanges(source, sheetIdByName, sheets[0]?.id);

  return createWorkbook({
    ...options,
    sheets: sheets.length ? sheets : undefined,
    namedRanges: namedRanges.length ? namedRanges : options.namedRanges,
    activeSheetId: sheets[0]?.id,
  });
}
