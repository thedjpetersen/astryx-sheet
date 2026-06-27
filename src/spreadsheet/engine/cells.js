export function cloneCellRecord(cell) {
  if (!cell) return null;
  return {
    ...cell,
    format: cell.format ? {...cell.format} : undefined,
    style: cell.style ? {...cell.style} : undefined,
  };
}

export function normalizeCellRecord(input) {
  if (input == null) return null;
  if (typeof input === 'object' && !Array.isArray(input)) {
    const record = {};
    if (input.formula != null && input.formula !== '') {
      const formula = String(input.formula);
      record.formula = formula.trim().startsWith('=') ? formula : `=${formula}`;
    }
    if ('value' in input && input.value !== undefined) record.value = input.value;
    if (input.type) record.type = input.type;
    if (input.format) record.format = {...input.format};
    if (input.style) record.style = {...input.style};
    if (input.note) record.note = String(input.note);
    return Object.keys(record).length ? record : null;
  }
  if (typeof input === 'string' && input.trim().startsWith('=')) return {formula: input};
  return {value: input};
}

export function cellRecordToRaw(cell) {
  if (!cell) return undefined;
  if (cell.formula) return cell.formula;
  return cell.value ?? '';
}

export function cellRecordToSerializable(cell) {
  return cloneCellRecord(cell);
}
