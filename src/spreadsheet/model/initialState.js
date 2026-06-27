export function createCellMap(initial, fallbackFactory) {
  if (initial instanceof Map) return new Map(initial);
  if (Array.isArray(initial)) return new Map(initial);
  if (initial && typeof initial === 'object') return new Map(Object.entries(initial));
  return fallbackFactory();
}

export function createNumericMap(initial, fallbackFactory) {
  const source = initial instanceof Map
    ? Array.from(initial.entries())
    : Array.isArray(initial)
      ? initial
      : initial && typeof initial === 'object'
        ? Object.entries(initial)
        : Array.from(fallbackFactory().entries());

  return new Map(source.map(([key, value]) => [Number(key), value]));
}
