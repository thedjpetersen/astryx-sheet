import {getCellDisplayValue, getCellRawValue} from './workbook.js';

export function createFilter(input = {}) {
  if (!input.range) throw new Error('Filter requires a range');
  return {
    id: input.id || 'filter-1',
    range: {...input.range},
    hasHeader: input.hasHeader !== false,
    criteria: (input.criteria || []).map((criterion) => ({...criterion})),
  };
}

export function cloneFilter(filter) {
  return filter ? {
    ...filter,
    range: {...filter.range},
    criteria: filter.criteria.map((criterion) => ({...criterion})),
  } : null;
}

export function createFilterStore(input) {
  if (!input) return new Map();
  const entries = input instanceof Map
    ? Array.from(input.entries())
    : Array.isArray(input)
      ? input.map((filter) => [filter.id || 'filter-1', filter])
      : Object.entries(input);
  return new Map(entries.map(([id, filter]) => {
    const normalized = createFilter({...filter, id: filter.id || id});
    return [normalized.id, normalized];
  }));
}

function normalizeComparable(value) {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function toComparableNumber(value) {
  const number = Number(String(value ?? '').replace(/[$,%\s,]/g, ''));
  return Number.isFinite(number) ? number : null;
}

export function matchesFilterCriterion(value, criterion = {}) {
  if (!criterion || criterion.operator === 'all') return true;
  const text = normalizeComparable(value);
  const operand = criterion.value;
  const operandText = normalizeComparable(operand);
  if (criterion.operator === 'blank') return value == null || value === '';
  if (criterion.operator === 'notBlank') return value != null && value !== '';
  if (criterion.operator === 'equals') return text === operandText;
  if (criterion.operator === 'notEquals') return text !== operandText;
  if (criterion.operator === 'contains') return text.includes(operandText);
  if (criterion.operator === 'startsWith') return text.startsWith(operandText);
  if (criterion.operator === 'endsWith') return text.endsWith(operandText);
  if (criterion.operator === 'in') return (criterion.values || []).map(normalizeComparable).includes(text);

  const number = toComparableNumber(value);
  const operandNumber = toComparableNumber(operand);
  if (number == null || operandNumber == null) return false;
  if (criterion.operator === 'gt') return number > operandNumber;
  if (criterion.operator === 'gte') return number >= operandNumber;
  if (criterion.operator === 'lt') return number < operandNumber;
  if (criterion.operator === 'lte') return number <= operandNumber;
  return true;
}

export function getVisibleRowsForFilter(workbook, sheetId, filter, options = {}) {
  const normalizedFilter = createFilter(filter);
  const startRow = normalizedFilter.hasHeader ? normalizedFilter.range.r1 + 1 : normalizedFilter.range.r1;
  const visibleRows = [];
  const hiddenRows = [];
  for (let row = startRow; row <= normalizedFilter.range.r2; row++) {
    const visible = normalizedFilter.criteria.every((criterion) => {
      const value = options.valueMode === 'display'
        ? getCellDisplayValue(workbook, sheetId, row, criterion.col, options)
        : getCellRawValue(workbook, sheetId, row, criterion.col, options);
      return matchesFilterCriterion(value, criterion);
    });
    (visible ? visibleRows : hiddenRows).push(row);
  }
  return {visibleRows, hiddenRows};
}

export function getVisibleRowsForSheet(workbook, sheetId = workbook.activeSheetId, options = {}) {
  const sheet = workbook.sheets.get(sheetId);
  if (!sheet || !sheet.filters.size) return null;
  const hidden = new Set();
  const visibleCandidates = new Set();
  for (const filter of sheet.filters.values()) {
    const result = getVisibleRowsForFilter(workbook, sheetId, filter, options);
    result.visibleRows.forEach((row) => visibleCandidates.add(row));
    result.hiddenRows.forEach((row) => hidden.add(row));
  }
  return {
    visibleRows: Array.from(visibleCandidates).filter((row) => !hidden.has(row)).sort((a, b) => a - b),
    hiddenRows: Array.from(hidden).sort((a, b) => a - b),
  };
}
