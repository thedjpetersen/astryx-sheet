import {cellAddress} from '../model/address.js';

export const ConditionalFormatType = {
  NUMBER: 'number',
  TEXT: 'text',
  BLANK: 'blank',
  ERROR: 'error',
};

const DEFAULT_STYLE = Object.freeze({
  backgroundColor: '#fff3bf',
  color: '#5f3d00',
  fontWeight: 600,
});

function rangeKey(range) {
  return `${range.r1}:${range.c1}:${range.r2}:${range.c2}`;
}

function stableValuePart(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 48);
}

export function conditionalFormatIdForRange(range, suffix = '') {
  return suffix ? `${rangeKey(range)}:${suffix}` : rangeKey(range);
}

export function conditionalFormatIdForRule(input = {}) {
  if (!input.range) return input.id || 'conditional-format';
  const type = input.type || ConditionalFormatType.NUMBER;
  const operator = input.operator || 'gt';
  const suffix = [
    type,
    operator,
    stableValuePart(input.value),
    stableValuePart(input.min),
    stableValuePart(input.max),
  ].filter(Boolean).join(':');
  return conditionalFormatIdForRange(input.range, suffix);
}

export function createConditionalFormat(input = {}) {
  if (!input.range) throw new Error('Conditional format requires a range');
  const type = input.type || ConditionalFormatType.NUMBER;
  return {
    id: input.id || conditionalFormatIdForRule(input),
    range: {...input.range},
    type,
    operator: input.operator || (type === ConditionalFormatType.TEXT ? 'contains' : type === ConditionalFormatType.BLANK ? 'blank' : 'gt'),
    value: input.value,
    min: input.min,
    max: input.max,
    style: {...DEFAULT_STYLE, ...(input.style || {})},
    stopIfTrue: Boolean(input.stopIfTrue),
  };
}

export function cloneConditionalFormat(rule) {
  return rule ? {
    ...rule,
    range: {...rule.range},
    style: rule.style ? {...rule.style} : undefined,
  } : null;
}

export function createConditionalFormatStore(input) {
  if (!input) return new Map();
  const entries = input instanceof Map
    ? Array.from(input.entries())
    : Array.isArray(input)
      ? input.map((rule) => [rule.id || conditionalFormatIdForRule(rule), rule])
      : Object.entries(input);
  return new Map(entries.map(([id, rule]) => {
    const normalized = createConditionalFormat({...rule, id: rule.id || id});
    return [normalized.id, normalized];
  }));
}

export function conditionalFormatAppliesToCell(rule, row, col) {
  const {range} = rule;
  return row >= range.r1 && row <= range.r2 && col >= range.c1 && col <= range.c2;
}

function comparableNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').replace(/[$,%\s,]/g, '').trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function isBlank(value) {
  return value == null || value === '';
}

function isError(value) {
  return typeof value === 'string' && value.startsWith('#');
}

function matchesNumberRule(value, rule) {
  const number = comparableNumber(value);
  if (number == null) return false;
  const operand = comparableNumber(rule.value);
  const min = comparableNumber(rule.min);
  const max = comparableNumber(rule.max);
  if (rule.operator === 'between') return min != null && max != null && number >= min && number <= max;
  if (rule.operator === 'notBetween') return min != null && max != null && (number < min || number > max);
  if (operand == null) return false;
  if (rule.operator === 'gte') return number >= operand;
  if (rule.operator === 'lt') return number < operand;
  if (rule.operator === 'lte') return number <= operand;
  if (rule.operator === 'equals') return number === operand;
  if (rule.operator === 'notEquals') return number !== operand;
  return number > operand;
}

function matchesTextRule(value, rule) {
  const text = String(value ?? '').toLowerCase();
  const operand = String(rule.value ?? '').toLowerCase();
  if (rule.operator === 'notContains') return !text.includes(operand);
  if (rule.operator === 'startsWith') return text.startsWith(operand);
  if (rule.operator === 'endsWith') return text.endsWith(operand);
  if (rule.operator === 'equals') return text === operand;
  if (rule.operator === 'notEquals') return text !== operand;
  return text.includes(operand);
}

export function matchesConditionalFormat(value, rule) {
  if (!rule) return false;
  if (rule.type === ConditionalFormatType.BLANK) {
    return rule.operator === 'notBlank' ? !isBlank(value) : isBlank(value);
  }
  if (rule.type === ConditionalFormatType.ERROR) {
    return rule.operator === 'noError' ? !isError(value) : isError(value);
  }
  if (rule.type === ConditionalFormatType.TEXT) return matchesTextRule(value, rule);
  return matchesNumberRule(value, rule);
}

export function getConditionalFormatRulesForCell(sheet, row, col) {
  return Array.from(sheet.conditionalFormats?.values?.() || [])
    .filter((rule) => conditionalFormatAppliesToCell(rule, row, col))
    .map(cloneConditionalFormat);
}

export function getConditionalFormatsForCell(sheet, row, col, value) {
  const matches = [];
  for (const rule of sheet.conditionalFormats?.values?.() || []) {
    if (!conditionalFormatAppliesToCell(rule, row, col)) continue;
    if (!matchesConditionalFormat(value, rule)) continue;
    matches.push(cloneConditionalFormat(rule));
    if (rule.stopIfTrue) break;
  }
  return matches;
}

export function getConditionalFormatStyle(sheet, row, col, value) {
  const rules = getConditionalFormatsForCell(sheet, row, col, value);
  if (!rules.length) return null;
  return rules.reduce((style, rule) => ({...style, ...(rule.style || {})}), {});
}

export function conditionalFormatTitle(rule) {
  const range = `${cellAddress(rule.range.r1, rule.range.c1)}:${cellAddress(rule.range.r2, rule.range.c2)}`;
  return `${range} ${rule.type} ${rule.operator}`;
}
