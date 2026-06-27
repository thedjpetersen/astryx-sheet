export function makeDimensionHelpers(defaultSize, count, overrides) {
  const entries = Array.from(overrides.entries()).sort((a, b) => a[0] - b[0]);
  const indexes = entries.map(([i]) => i);
  const prefix = [];
  let acc = 0;
  for (let i = 0; i < entries.length; i++) {
    acc += entries[i][1] - defaultSize;
    prefix[i] = acc;
  }
  function upperBound(value) {
    let lo = 0, hi = indexes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (indexes[mid] <= value) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function deltaBefore(index) {
    const pos = upperBound(index - 1);
    return pos > 0 ? prefix[pos - 1] : 0;
  }
  function size(index) { return overrides.has(index) ? overrides.get(index) : defaultSize; }
  function offset(index) { return index * defaultSize + deltaBefore(index); }
  function total() { return count * defaultSize + (prefix.length ? prefix[prefix.length - 1] : 0); }
  function indexAt(px) {
    let idx = Math.max(0, Math.min(count - 1, Math.floor(px / defaultSize)));
    while (idx > 0 && offset(idx) > px) idx--;
    while (idx < count - 1 && offset(idx) + size(idx) <= px) idx++;
    return idx;
  }
  function span(start, endInclusive) { return endInclusive < start ? 0 : offset(endInclusive) + size(endInclusive) - offset(start); }
  return {size, offset, total, indexAt, span};
}
