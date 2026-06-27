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
  return String(value ?? '');
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

  const fnMatch = /^([A-Z]+)\((.*)\)$/i.exec(expr);
  if (fnMatch) {
    const name = fnMatch[1].toUpperCase();
    const argText = fnMatch[2].trim();
    const args = argText ? argText.split(/\s*,\s*/) : [];
    const values = args.flatMap((arg) => {
      if (/^[A-Z]+\d+\s*:\s*[A-Z]+\d+$/i.test(arg)) return valuesForRange(arg);
      const addr = parseCellAddress(arg);
      if (addr) return [toNumber(readEvaluated(addr.row, addr.col))];
      return [toNumber(arg)];
    });
    if (name === 'SUM') return values.reduce((a, b) => a + b, 0);
    if (name === 'AVERAGE' || name === 'AVG') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    if (name === 'MIN') return values.length ? Math.min(...values) : 0;
    if (name === 'MAX') return values.length ? Math.max(...values) : 0;
    if (name === 'COUNT') return values.filter((v) => Number.isFinite(v)).length;
    if (name === 'CONCAT') return args.map((arg) => {
      const addr = parseCellAddress(arg);
      return addr ? readEvaluated(addr.row, addr.col) : arg.replace(/^"|"$/g, '');
    }).join('');
    return '#NAME?';
  }

  try {
    const safe = expr.replace(/([A-Z]+\d+)/gi, (token) => {
      const addr = parseCellAddress(token);
      return addr ? String(toNumber(readEvaluated(addr.row, addr.col))) : token;
    });
    if (!/^[0-9+\-*/(). %]+$/.test(safe)) return '#VALUE!';
    return Function(`"use strict"; return (${safe})`)();
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
