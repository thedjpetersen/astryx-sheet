import {createWorkbook, serializeSheetForSnapshot} from './workbook.js';

export function serializeWorkbook(workbook, options = {}) {
  return {
    schemaVersion: 1,
    id: workbook.id,
    activeSheetId: workbook.activeSheetId,
    sheetOrder: [...workbook.sheetOrder],
    sheets: workbook.sheetOrder.map((sheetId) => serializeSheetForSnapshot(workbook.sheets.get(sheetId))),
    namedRanges: Array.from(workbook.namedRanges.values()).map((range) => ({...range, range: {...range.range}})),
    version: workbook.version,
    metadata: {...workbook.metadata},
    history: options.includeHistory ? [...workbook.history] : [],
    future: options.includeHistory ? [...workbook.future] : [],
  };
}

export function deserializeWorkbook(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1) throw new Error('Unsupported workbook snapshot');
  return createWorkbook({
    id: snapshot.id,
    activeSheetId: snapshot.activeSheetId,
    sheetOrder: snapshot.sheetOrder,
    sheets: snapshot.sheets,
    namedRanges: snapshot.namedRanges,
    version: snapshot.version,
    metadata: snapshot.metadata,
    history: snapshot.history,
    future: snapshot.future,
  });
}
