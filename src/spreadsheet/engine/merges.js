export function mergeIdForRange(range) {
  return `${range.r1}:${range.c1}:${range.r2}:${range.c2}`;
}

export function createMergedRange(input = {}) {
  if (!input.range) throw new Error('Merged range requires a range');
  const range = {...input.range};
  if (range.r2 < range.r1 || range.c2 < range.c1) throw new Error('Merged range is invalid');
  if (range.r1 === range.r2 && range.c1 === range.c2) throw new Error('Merged range must include more than one cell');
  return {
    id: input.id || mergeIdForRange(range),
    range,
  };
}

export function cloneMergedRange(merge) {
  return merge ? {id: merge.id, range: {...merge.range}} : null;
}

export function rangesIntersect(a, b) {
  return a.r1 <= b.r2 && a.r2 >= b.r1 && a.c1 <= b.c2 && a.c2 >= b.c1;
}

export function createMergeStore(input) {
  if (!input) return new Map();
  const entries = input instanceof Map
    ? Array.from(input.entries())
    : Array.isArray(input)
      ? input.map((merge) => [merge.id || mergeIdForRange(merge.range), merge])
      : Object.entries(input);
  return new Map(entries.map(([id, merge]) => {
    const normalized = createMergedRange({...merge, id: merge.id || id});
    return [normalized.id, normalized];
  }));
}

export function assertNoMergeOverlap(merges, nextMerge, ignoreId) {
  for (const merge of merges.values()) {
    if (ignoreId && merge.id === ignoreId) continue;
    if (rangesIntersect(merge.range, nextMerge.range)) {
      throw new Error(`Merged range overlaps ${merge.id}`);
    }
  }
}

export function getMergeAtCell(sheet, row, col) {
  for (const merge of sheet.merges.values()) {
    const {range} = merge;
    if (row >= range.r1 && row <= range.r2 && col >= range.c1 && col <= range.c2) return cloneMergedRange(merge);
  }
  return null;
}

export function listMergedRanges(sheet) {
  return Array.from(sheet.merges.values()).map(cloneMergedRange);
}
