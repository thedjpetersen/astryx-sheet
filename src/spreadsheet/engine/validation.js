import {cellAddress} from '../model/address.js';
import {toNumber} from '../model/formulas.js';

export function validationIdForRange(range) {
  return `${range.r1}:${range.c1}:${range.r2}:${range.c2}`;
}

export function createValidationRule(input = {}) {
  if (!input.range) throw new Error('Validation rule requires a range');
  return {
    id: input.id || validationIdForRange(input.range),
    range: {...input.range},
    type: input.type || 'any',
    operator: input.operator || 'any',
    values: input.values ? [...input.values] : undefined,
    value: input.value,
    min: input.min,
    max: input.max,
    allowBlank: input.allowBlank !== false,
    message: input.message || '',
  };
}

export function cloneValidationRule(rule) {
  return rule ? {...rule, range: {...rule.range}, values: rule.values ? [...rule.values] : undefined} : null;
}

export function createValidationStore(input) {
  if (!input) return new Map();
  const entries = input instanceof Map
    ? Array.from(input.entries())
    : Array.isArray(input)
      ? input.map((rule) => [rule.id || validationIdForRange(rule.range), rule])
      : Object.entries(input);
  return new Map(entries.map(([id, rule]) => {
    const normalized = createValidationRule({...rule, id: rule.id || id});
    return [normalized.id, normalized];
  }));
}

export function validationAppliesToCell(rule, row, col) {
  const {range} = rule;
  return row >= range.r1 && row <= range.r2 && col >= range.c1 && col <= range.c2;
}

export function getValidationRulesForCell(sheet, row, col) {
  return Array.from(sheet.validations.values())
    .filter((rule) => validationAppliesToCell(rule, row, col))
    .map(cloneValidationRule);
}

function validateNumber(value, rule) {
  const number = toNumber(value);
  if (rule.operator === 'between') return number >= Number(rule.min) && number <= Number(rule.max);
  if (rule.operator === 'notBetween') return number < Number(rule.min) || number > Number(rule.max);
  if (rule.operator === 'gt') return number > Number(rule.value);
  if (rule.operator === 'gte') return number >= Number(rule.value);
  if (rule.operator === 'lt') return number < Number(rule.value);
  if (rule.operator === 'lte') return number <= Number(rule.value);
  if (rule.operator === 'equals') return number === Number(rule.value);
  return true;
}

function validateText(value, rule) {
  const text = String(value ?? '');
  if (rule.operator === 'contains') return text.includes(String(rule.value ?? ''));
  if (rule.operator === 'notContains') return !text.includes(String(rule.value ?? ''));
  if (rule.operator === 'startsWith') return text.startsWith(String(rule.value ?? ''));
  if (rule.operator === 'endsWith') return text.endsWith(String(rule.value ?? ''));
  if (rule.operator === 'lengthBetween') return text.length >= Number(rule.min) && text.length <= Number(rule.max);
  return true;
}

export function validateValue(value, rule) {
  if ((value == null || value === '') && rule.allowBlank) return true;
  if (rule.type === 'any') return true;
  if (rule.type === 'list') return (rule.values || []).map(String).includes(String(value ?? ''));
  if (rule.type === 'number') return validateNumber(value, rule);
  if (rule.type === 'text') return validateText(value, rule);
  return true;
}

export function validateCellValue(sheet, row, col, value) {
  const rules = getValidationRulesForCell(sheet, row, col);
  const failures = rules.filter((rule) => !validateValue(value, rule));
  return {
    valid: failures.length === 0,
    failures,
    address: cellAddress(row, col),
  };
}
