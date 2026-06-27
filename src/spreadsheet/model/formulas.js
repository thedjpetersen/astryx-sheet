import {cellKey, parseCellAddress, parseRange} from './address.js';
import {defaultCellValue} from './defaultData.js';

export function toNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').replace(/[$,]/g, '').trim();
  if (text === '') return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export function formatFormulaResult(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '#NUM!';
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value ?? '');
}

function isQuoted(value) {
  return /^"[\s\S]*"$/.test(String(value ?? '').trim());
}

function unquote(value) {
  return String(value ?? '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

function splitFormulaArgs(text) {
  const args = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  const source = String(text ?? '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      current += ch;
      if (quoted && source[i + 1] === '"') {
        current += source[++i];
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && ch === '(') {
      depth++;
      current += ch;
    } else if (!quoted && ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (!quoted && depth === 0 && ch === ',') {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() || source.endsWith(',')) args.push(current.trim());
  return args;
}

function findComparison(text) {
  const operators = ['>=', '<=', '<>', '>', '<', '='];
  let quoted = false;
  let depth = 0;
  const source = String(text ?? '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && ch === '(') {
      depth++;
    } else if (!quoted && ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (!quoted && depth === 0) {
      for (const operator of operators) {
        if (source.slice(i, i + operator.length) === operator) {
          return {operator, left: source.slice(0, i).trim(), right: source.slice(i + operator.length).trim()};
        }
      }
    }
  }
  return null;
}

function isNumericLike(value) {
  if (value == null || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  const number = Number(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(number);
}

export function readCell(dataRef, row, col, getDefaultCellValue = defaultCellValue) {
  const key = cellKey(row, col);
  return dataRef.current.has(key) ? dataRef.current.get(key) : getDefaultCellValue(row, col);
}

export function evaluateFormula(raw, dataRef, origin, getDefaultCellValue = defaultCellValue, stack = new Set()) {
  const formula = String(raw ?? '').trim();
  if (!formula.startsWith('=')) return raw;
  const expr = formula.slice(1).trim();
  const originKey = origin ? cellKey(origin.row, origin.col) : 'root';
  if (stack.has(originKey)) return '#CYCLE!';
  stack.add(originKey);

  const readEvaluated = (row, col) => {
    const key = cellKey(row, col);
    if (stack.has(key)) return '#CYCLE!';
    const value = readCell(dataRef, row, col, getDefaultCellValue);
    return typeof value === 'string' && value.trim().startsWith('=')
      ? evaluateFormula(value, dataRef, {row, col}, getDefaultCellValue, new Set(stack))
      : value;
  };
  const valuesForRange = (rangeText) => {
    const range = parseRange(rangeText);
    if (!range) return [];
    const values = [];
    let count = 0;
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (++count > 10000) return values;
        values.push(toNumber(readEvaluated(r, c)));
      }
    }
    return values;
  };
  const rawValuesForRange = (rangeText) => {
    const range = parseRange(rangeText);
    if (!range) return [];
    const values = [];
    let count = 0;
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (++count > 10000) return values;
        values.push(readEvaluated(r, c));
      }
    }
    return values;
  };
  const evaluateArithmetic = (text) => {
    const safe = String(text ?? '').replace(/([A-Z]+\d+)/gi, (token) => {
      const addr = parseCellAddress(token);
      return addr ? String(toNumber(readEvaluated(addr.row, addr.col))) : token;
    });
    if (!/^[0-9+\-*/(). %]+$/.test(safe)) return '#VALUE!';
    return Function(`"use strict"; return (${safe})`)();
  };
  const resolveScalar = (arg) => {
    const text = String(arg ?? '').trim();
    if (text === '') return '';
    if (isQuoted(text)) return unquote(text);
    if (/^TRUE$/i.test(text)) return true;
    if (/^FALSE$/i.test(text)) return false;
    const addr = parseCellAddress(text);
    if (addr) return readEvaluated(addr.row, addr.col);
    if (/^[A-Z]+\s*\(/i.test(text)) return evaluateFormula(`=${text}`, dataRef, null, getDefaultCellValue, new Set(stack));
    const comparison = findComparison(text);
    if (comparison) return evaluateCondition(text);
    if (/[+\-*/()%]/.test(text) || isNumericLike(text)) return evaluateArithmetic(text);
    return text;
  };
  const resolveText = (arg) => String(resolveScalar(arg) ?? '');
  const evaluateCondition = (conditionText) => {
    const comparison = findComparison(conditionText);
    if (!comparison) {
      const value = resolveScalar(conditionText);
      if (typeof value === 'boolean') return value;
      if (isNumericLike(value)) return toNumber(value) !== 0;
      return Boolean(value);
    }
    const left = resolveScalar(comparison.left);
    const right = resolveScalar(comparison.right);
    const numeric = isNumericLike(left) && isNumericLike(right);
    const a = numeric ? toNumber(left) : String(left ?? '');
    const b = numeric ? toNumber(right) : String(right ?? '');
    if (comparison.operator === '>=') return a >= b;
    if (comparison.operator === '<=') return a <= b;
    if (comparison.operator === '<>') return a !== b;
    if (comparison.operator === '>') return a > b;
    if (comparison.operator === '<') return a < b;
    if (comparison.operator === '=') return a === b;
    return false;
  };

  const fnMatch = /^([A-Z]+)\((.*)\)$/i.exec(expr);
  if (fnMatch) {
    const name = fnMatch[1].toUpperCase();
    const argText = fnMatch[2].trim();
    const args = argText ? splitFormulaArgs(argText) : [];
    const values = args.flatMap((arg) => {
      if (/^[A-Z]+\d+\s*:\s*[A-Z]+\d+$/i.test(arg)) return valuesForRange(arg);
      return [toNumber(resolveScalar(arg))];
    });
    if (name === 'SUM') return values.reduce((a, b) => a + b, 0);
    if (name === 'AVERAGE' || name === 'AVG') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    if (name === 'MIN') return values.length ? Math.min(...values) : 0;
    if (name === 'MAX') return values.length ? Math.max(...values) : 0;
    if (name === 'COUNT') return args.flatMap((arg) => (
      /^[A-Z]+\d+\s*:\s*[A-Z]+\d+$/i.test(arg) ? rawValuesForRange(arg) : [resolveScalar(arg)]
    )).filter(isNumericLike).length;
    if (name === 'ROUND') return Math.round(toNumber(resolveScalar(args[0])) * (10 ** toNumber(args[1] ?? 0))) / (10 ** toNumber(args[1] ?? 0));
    if (name === 'ABS') return Math.abs(toNumber(resolveScalar(args[0])));
    if (name === 'SQRT') return Math.sqrt(toNumber(resolveScalar(args[0])));
    if (name === 'POWER') return toNumber(resolveScalar(args[0])) ** toNumber(resolveScalar(args[1]));
    if (name === 'LEN') return resolveText(args[0]).length;
    if (name === 'TRIM') return resolveText(args[0]).trim().replace(/\s+/g, ' ');
    if (name === 'UPPER') return resolveText(args[0]).toUpperCase();
    if (name === 'LOWER') return resolveText(args[0]).toLowerCase();
    if (name === 'IF') return evaluateCondition(args[0]) ? resolveScalar(args[1]) : resolveScalar(args[2]);
    if (name === 'AND') return args.every(evaluateCondition);
    if (name === 'OR') return args.some(evaluateCondition);
    if (name === 'NOT') return !evaluateCondition(args[0]);
    if (name === 'CONCAT') return args.flatMap((arg) => (
      /^[A-Z]+\d+\s*:\s*[A-Z]+\d+$/i.test(arg) ? rawValuesForRange(arg).map(String) : [resolveText(arg)]
    )).join('');
    return '#NAME?';
  }

  try {
    const comparison = findComparison(expr);
    if (comparison) return evaluateCondition(expr);
    return evaluateArithmetic(expr);
  } catch {
    return '#ERROR!';
  } finally {
    stack.delete(originKey);
  }
}

export function displayCellValue(dataRef, row, col, getDefaultCellValue = defaultCellValue) {
  const value = readCell(dataRef, row, col, getDefaultCellValue);
  return typeof value === 'string' && value.trim().startsWith('=')
    ? formatFormulaResult(evaluateFormula(value, dataRef, {row, col}, getDefaultCellValue))
    : value;
}
