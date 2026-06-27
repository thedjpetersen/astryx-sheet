import {cellAddress} from '../model/address.js';

export function normalizeName(name) {
  return String(name || '').trim();
}

export function createNamedRange(input = {}) {
  const name = normalizeName(input.name);
  if (!name) throw new Error('Named range requires a name');
  if (!input.range) throw new Error(`Named range ${name} requires a range`);
  return {
    name,
    sheetId: input.sheetId,
    range: {...input.range},
    scope: input.scope || 'workbook',
    comment: input.comment || '',
  };
}

export function createNamedRangeStore(input) {
  if (!input) return new Map();
  const entries = input instanceof Map
    ? Array.from(input.entries())
    : Array.isArray(input)
      ? input.map((item) => [item.name, item])
      : Object.entries(input);
  return new Map(entries.map(([name, value]) => {
    const range = createNamedRange({...value, name: value.name || name});
    return [range.name, range];
  }));
}

export function cloneNamedRange(range) {
  return range ? {...range, range: {...range.range}} : null;
}

export function getNamedRange(workbook, name) {
  return workbook.namedRanges.get(normalizeName(name)) || null;
}

export function listNamedRanges(workbook) {
  return Array.from(workbook.namedRanges.values()).map(cloneNamedRange);
}

function quoteSheetReference(sheetRef) {
  if (!sheetRef) return '';
  return `'${String(sheetRef).replace(/'/g, "''")}'!`;
}

export function rangeToFormulaReference(range, sheetRef = null) {
  return `${quoteSheetReference(sheetRef)}${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectFormulaSegments(text) {
  const placeholders = [];
  const reserve = (value) => {
    const placeholder = `__ASTRYX_NAME_SEGMENT_${placeholders.length}__`;
    placeholders.push(value);
    return placeholder;
  };
  const protectedText = String(text ?? '').replace(
    /"(?:""|[^"])*"|(?:'[^']*(?:''[^']*)*'|[A-Za-z_][A-Za-z0-9_]*)!/g,
    reserve,
  );
  return {
    text: protectedText,
    restore(source) {
      return String(source ?? '').replace(/__ASTRYX_NAME_SEGMENT_(\d+)__/g, (_match, indexText) => (
        placeholders[Number(indexText)] || _match
      ));
    },
  };
}

export function expandNamedRangesInFormula(formula, namedRanges, sheetId) {
  const protectedFormula = protectFormulaSegments(formula);
  let text = protectedFormula.text;
  const ranges = namedRanges instanceof Map ? Array.from(namedRanges.values()) : namedRanges || [];
  for (const namedRange of ranges.sort((a, b) => b.name.length - a.name.length)) {
    if (namedRange.scope === 'sheet' && namedRange.sheetId && sheetId && namedRange.sheetId !== sheetId) continue;
    const pattern = new RegExp(`(^|[^A-Z0-9_])(${escapeRegExp(namedRange.name)})(?=[^A-Z0-9_]|$)`, 'gi');
    const sheetRef = namedRange.sheetId && namedRange.sheetId !== sheetId ? namedRange.sheetId : null;
    text = text.replace(pattern, (_match, prefix) => `${prefix}${rangeToFormulaReference(namedRange.range, sheetRef)}`);
  }
  return protectedFormula.restore(text);
}
