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
