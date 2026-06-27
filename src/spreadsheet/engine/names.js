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

export function rangeToFormulaReference(range) {
  return `${cellAddress(range.r1, range.c1)}:${cellAddress(range.r2, range.c2)}`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function expandNamedRangesInFormula(formula, namedRanges, sheetId) {
  let text = String(formula ?? '');
  const ranges = namedRanges instanceof Map ? Array.from(namedRanges.values()) : namedRanges || [];
  for (const namedRange of ranges.sort((a, b) => b.name.length - a.name.length)) {
    if (namedRange.sheetId && sheetId && namedRange.sheetId !== sheetId) continue;
    const pattern = new RegExp(`(^|[^A-Z0-9_])(${escapeRegExp(namedRange.name)})(?=[^A-Z0-9_]|$)`, 'gi');
    text = text.replace(pattern, (_match, prefix) => `${prefix}${rangeToFormulaReference(namedRange.range)}`);
  }
  return text;
}
