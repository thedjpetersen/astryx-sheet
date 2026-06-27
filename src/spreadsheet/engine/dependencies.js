import {cellAddress, cellKey, parseCellAddress, parseRange} from '../model/address.js';
import {expandNamedRangesInFormula} from './names.js';

const REF_PATTERN = /(\$?[A-Z]+\$?\d+)(?:\s*:\s*(\$?[A-Z]+\$?\d+))?/gi;

function stripAbsoluteMarkers(ref) {
  return String(ref).replace(/\$/g, '');
}

function addReference(refs, row, col) {
  const key = cellKey(row, col);
  if (!refs.has(key)) refs.set(key, {row, col, key, address: cellAddress(row, col)});
}

export function extractFormulaReferences(formula, options = {}) {
  const refs = new Map();
  const maxRangeCells = options.maxRangeCells || 10000;
  const text = expandNamedRangesInFormula(formula, options.namedRanges, options.sheetId).replace(/^=/, '');
  for (const match of text.matchAll(REF_PATTERN)) {
    const startRef = stripAbsoluteMarkers(match[1]);
    const endRef = match[2] ? stripAbsoluteMarkers(match[2]) : null;
    if (endRef) {
      const range = parseRange(`${startRef}:${endRef}`);
      if (!range) continue;
      let count = 0;
      for (let row = range.r1; row <= range.r2; row++) {
        for (let col = range.c1; col <= range.c2; col++) {
          if (++count > maxRangeCells) break;
          addReference(refs, row, col);
        }
        if (count > maxRangeCells) break;
      }
      continue;
    }
    const point = parseCellAddress(startRef);
    if (point) addReference(refs, point.row, point.col);
  }
  return Array.from(refs.values());
}

export function buildDependencyGraph(sheet, options = {}) {
  const precedentsByCell = new Map();
  const dependentsByCell = new Map();

  for (const [dependentKey, cell] of sheet.cells.entries()) {
    if (!cell?.formula) continue;
    const refs = extractFormulaReferences(cell.formula, options);
    const precedentKeys = new Set(refs.map((ref) => ref.key));
    precedentsByCell.set(dependentKey, precedentKeys);
    for (const precedentKey of precedentKeys) {
      if (!dependentsByCell.has(precedentKey)) dependentsByCell.set(precedentKey, new Set());
      dependentsByCell.get(precedentKey).add(dependentKey);
    }
  }

  return {precedentsByCell, dependentsByCell};
}

export function collectDependentCells(dependentsByCell, changedKeys) {
  const dirty = new Set();
  const queue = [...changedKeys];
  while (queue.length) {
    const key = queue.shift();
    const dependents = dependentsByCell.get(key);
    if (!dependents) continue;
    for (const dependentKey of dependents) {
      if (dirty.has(dependentKey)) continue;
      dirty.add(dependentKey);
      queue.push(dependentKey);
    }
  }
  return dirty;
}

export function getFormulaRecalculationOrder(sheet, changedKeys, options = {}) {
  const graph = buildDependencyGraph(sheet, options);
  const dirty = collectDependentCells(graph.dependentsByCell, changedKeys);
  const visited = new Set();
  const visiting = new Set();
  const order = [];
  const cycles = new Set();

  const visit = (key) => {
    if (!dirty.has(key) || visited.has(key)) return;
    if (visiting.has(key)) {
      cycles.add(key);
      return;
    }
    visiting.add(key);
    const precedents = graph.precedentsByCell.get(key);
    if (precedents) {
      for (const precedentKey of precedents) visit(precedentKey);
    }
    visiting.delete(key);
    visited.add(key);
    order.push(key);
  };

  for (const key of dirty) visit(key);
  return {order, dirty, cycles, graph};
}
