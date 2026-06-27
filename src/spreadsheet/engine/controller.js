import {dispatchCommand, redo as redoCommand, undo as undoCommand} from './commands.js';
import {dispatchCommandWithRecalculation, recalculateWorkbook} from './calculation.js';
import {deserializeWorkbook, serializeWorkbook} from './serialization.js';
import {createWorkbook, getActiveSheet} from './workbook.js';

function resolveWorkbook(input) {
  if (!input) return createWorkbook();
  if (input.schemaVersion) return deserializeWorkbook(input);
  if (input.sheets instanceof Map && Array.isArray(input.sheetOrder)) return input;
  return createWorkbook(input);
}

function createEvent(workbook, detail = {}) {
  return {
    workbook,
    activeSheet: getActiveSheet(workbook),
    activeSheetId: workbook.activeSheetId,
    sheetOrder: [...workbook.sheetOrder],
    version: workbook.version,
    ...detail,
  };
}

export function createWorkbookController(input, options = {}) {
  let workbook = resolveWorkbook(input);
  const listeners = new Set();
  const calculationOptions = options.calculation || {};

  function emit(detail = {}) {
    const event = createEvent(workbook, detail);
    for (const listener of listeners) listener(event);
    return event;
  }

  function setWorkbook(nextWorkbook, detail = {}) {
    workbook = resolveWorkbook(nextWorkbook);
    emit({source: 'setWorkbook', ...detail});
    return workbook;
  }

  function runHistoryNavigation(navigate, action, navigationOptions = {}) {
    const previousWorkbook = workbook;
    const navigatedWorkbook = navigate(workbook);
    if (navigatedWorkbook === workbook) {
      return {workbook, changed: false, recalculated: []};
    }
    const result = navigationOptions.recalculate === false
      ? {workbook: navigatedWorkbook, recalculated: []}
      : recalculateWorkbook(navigatedWorkbook, {...calculationOptions, ...navigationOptions});
    workbook = result.workbook;
    emit({source: 'history', action, previousWorkbook, recalculated: result.recalculated});
    return {...result, changed: true};
  }

  return {
    getWorkbook() {
      return workbook;
    },
    getActiveSheet() {
      return getActiveSheet(workbook);
    },
    subscribe(listener, subscribeOptions = {}) {
      listeners.add(listener);
      if (subscribeOptions.emitCurrent) listener(createEvent(workbook, {source: 'subscribe'}));
      return () => listeners.delete(listener);
    },
    setWorkbook,
    dispatch(command, dispatchOptions = {}) {
      const previousWorkbook = workbook;
      const result = dispatchOptions.recalculate === false
        ? {workbook: dispatchCommand(workbook, command), changedKeys: new Set(), recalculated: []}
        : dispatchCommandWithRecalculation(workbook, command, {...calculationOptions, ...dispatchOptions});
      workbook = result.workbook;
      const committedEntry = workbook.history[workbook.history.length - 1];
      emit({source: 'command', command: committedEntry?.command || command, previousWorkbook, changedKeys: result.changedKeys, recalculated: result.recalculated});
      return result;
    },
    undo(navigationOptions = {}) {
      return runHistoryNavigation(undoCommand, 'undo', navigationOptions);
    },
    redo(navigationOptions = {}) {
      return runHistoryNavigation(redoCommand, 'redo', navigationOptions);
    },
    serialize(serializeOptions = {}) {
      return serializeWorkbook(workbook, serializeOptions);
    },
    load(snapshotOrWorkbook, detail = {}) {
      return setWorkbook(snapshotOrWorkbook, {source: 'load', ...detail});
    },
    destroy() {
      listeners.clear();
    },
  };
}
