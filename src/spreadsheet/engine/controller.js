import {getChangedCellKeysForCommand, getCommandSheetId, redo as redoCommand, undo as undoCommand} from './commands.js';
import {commandRequiresFullRecalculation, dispatchCommandWithRecalculation, recalculateWorkbook} from './calculation.js';
import {deserializeWorkbook, serializeWorkbook} from './serialization.js';
import {createWorkbook, getActiveSheet} from './workbook.js';

export const CalculationMode = Object.freeze({
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
});

function normalizeCalculationMode(mode) {
  const value = String(mode || CalculationMode.AUTOMATIC).toLowerCase();
  if (value === 'auto' || value === CalculationMode.AUTOMATIC) return CalculationMode.AUTOMATIC;
  if (value === CalculationMode.MANUAL) return CalculationMode.MANUAL;
  throw new Error(`Unknown calculation mode: ${mode}`);
}

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

function splitRuntimeOptions(options = {}) {
  const {event, eventDetail, ...runtimeOptions} = options;
  return {
    eventDetail: event || eventDetail || {},
    runtimeOptions,
  };
}

function workbookWithCalculationMode(workbook, mode, options = {}) {
  if (workbook.metadata?.calculationMode === mode) return workbook;
  return {
    ...workbook,
    metadata: {...workbook.metadata, calculationMode: mode},
    version: options.bumpVersion ? workbook.version + 1 : workbook.version,
  };
}

export function createWorkbookController(input, options = {}) {
  let workbook = resolveWorkbook(input);
  const listeners = new Set();
  const calculationOptions = options.calculation || {};
  let calculationMode = normalizeCalculationMode(calculationOptions.mode || workbook.metadata?.calculationMode);
  let dirtyWorkbook = false;
  const dirtyCellKeysBySheet = new Map();

  workbook = workbookWithCalculationMode(workbook, calculationMode);

  function getDirtyCalculationState() {
    const sheets = {};
    let count = 0;
    for (const [sheetId, keys] of dirtyCellKeysBySheet.entries()) {
      sheets[sheetId] = [...keys];
      count += keys.size;
    }
    return {
      workbook: dirtyWorkbook,
      sheets,
      count: dirtyWorkbook ? null : count,
    };
  }

  function hasDirtyCalculation() {
    return dirtyWorkbook || dirtyCellKeysBySheet.size > 0;
  }

  function cloneDirtyCellKeysBySheet() {
    return new Map(Array.from(dirtyCellKeysBySheet.entries(), ([sheetId, keys]) => [sheetId, new Set(keys)]));
  }

  function markDirtyCalculation(sheetId, changedKeys) {
    if (!changedKeys?.size) {
      dirtyWorkbook = true;
      return;
    }
    const key = sheetId || workbook.activeSheetId;
    const keys = dirtyCellKeysBySheet.get(key) || new Set();
    for (const changedKey of changedKeys) keys.add(changedKey);
    dirtyCellKeysBySheet.set(key, keys);
  }

  function markDirtyForCommand(command, sheetId, changedKeys) {
    if (commandRequiresFullRecalculation(command)) {
      dirtyWorkbook = true;
      return;
    }
    if (changedKeys?.size) markDirtyCalculation(sheetId, changedKeys);
  }

  function clearDirtyCalculation(sheetId = null) {
    if (!sheetId) {
      dirtyWorkbook = false;
      dirtyCellKeysBySheet.clear();
      return;
    }
    dirtyCellKeysBySheet.delete(sheetId);
  }

  function emit(detail = {}) {
    const event = createEvent(workbook, {
      calculationMode,
      needsRecalculation: hasDirtyCalculation(),
      dirtyCalculationState: getDirtyCalculationState(),
      ...detail,
    });
    for (const listener of listeners) listener(event);
    return event;
  }

  function shouldRecalculate(runtimeOptions = {}) {
    return 'recalculate' in runtimeOptions
      ? runtimeOptions.recalculate !== false
      : calculationMode === CalculationMode.AUTOMATIC;
  }

  function setWorkbook(nextWorkbook, detail = {}) {
    workbook = resolveWorkbook(nextWorkbook);
    calculationMode = normalizeCalculationMode(workbook.metadata?.calculationMode || calculationMode);
    workbook = workbookWithCalculationMode(workbook, calculationMode);
    clearDirtyCalculation();
    emit({source: 'setWorkbook', ...detail});
    return workbook;
  }

  function clearDirtyAfterCalculation(result, runtimeOptions = {}, sheetId = null) {
    if (!result?.recalculated?.length && !result?.recalculatedBySheet) return;
    if (runtimeOptions.allSheets ?? true) clearDirtyCalculation();
    else clearDirtyCalculation(sheetId);
  }

  function createCalculationRuntimeOptions(runtimeOptions = {}) {
    const nextOptions = {...calculationOptions, allSheets: true, ...runtimeOptions};
    if (!dirtyWorkbook && dirtyCellKeysBySheet.size && !nextOptions.changedKeysBySheet) {
      nextOptions.changedKeysBySheet = cloneDirtyCellKeysBySheet();
    }
    return nextOptions;
  }

  function runHistoryNavigation(navigate, action, navigationOptions = {}) {
    const {eventDetail, runtimeOptions} = splitRuntimeOptions(navigationOptions);
    const previousWorkbook = workbook;
    const historyEntry = action === 'undo' ? workbook.history[workbook.history.length - 1] : workbook.future[0];
    const dirtyCommand = action === 'undo' ? historyEntry?.inverse : historyEntry?.command;
    const changedKeys = dirtyCommand ? getChangedCellKeysForCommand(dirtyCommand) : new Set();
    const dirtySheetId = dirtyCommand ? getCommandSheetId(workbook, dirtyCommand) : workbook.activeSheetId;
    const recalculate = shouldRecalculate(runtimeOptions);
    const navigatedWorkbook = navigate(workbook);
    if (navigatedWorkbook === workbook) {
      return {workbook, changed: false, recalculated: []};
    }
    const result = recalculate
      ? recalculateWorkbook(navigatedWorkbook, {...calculationOptions, allSheets: true, ...runtimeOptions})
      : {workbook: navigatedWorkbook, changedKeys, recalculated: []};
    workbook = workbookWithCalculationMode(result.workbook, calculationMode);
    if (recalculate) clearDirtyAfterCalculation(result, runtimeOptions, dirtySheetId);
    else markDirtyForCommand(dirtyCommand, dirtySheetId, changedKeys);
    emit({...eventDetail, source: eventDetail.source || 'history', action, previousWorkbook, recalculated: result.recalculated});
    return {...result, workbook, changed: true};
  }

  return {
    getWorkbook() {
      return workbook;
    },
    getActiveSheet() {
      return getActiveSheet(workbook);
    },
    getCalculationMode() {
      return calculationMode;
    },
    getCalculationState() {
      return {
        mode: calculationMode,
        needsRecalculation: hasDirtyCalculation(),
        dirty: getDirtyCalculationState(),
      };
    },
    subscribe(listener, subscribeOptions = {}) {
      listeners.add(listener);
      if (subscribeOptions.emitCurrent) {
        listener(createEvent(workbook, {
          source: 'subscribe',
          calculationMode,
          needsRecalculation: hasDirtyCalculation(),
          dirtyCalculationState: getDirtyCalculationState(),
        }));
      }
      return () => listeners.delete(listener);
    },
    setWorkbook,
    setCalculationMode(mode, modeOptions = {}) {
      const nextMode = normalizeCalculationMode(mode);
      const {eventDetail, runtimeOptions} = splitRuntimeOptions(modeOptions);
      const {calculate = true, ...calculationRuntimeOptions} = runtimeOptions;
      const previousWorkbook = workbook;
      const previousCalculationMode = calculationMode;
      calculationMode = nextMode;
      workbook = workbookWithCalculationMode(workbook, calculationMode, {bumpVersion: previousCalculationMode !== calculationMode});
      let result = {workbook, recalculated: []};
      if (calculationMode === CalculationMode.AUTOMATIC && calculate !== false && hasDirtyCalculation()) {
        result = recalculateWorkbook(workbook, createCalculationRuntimeOptions(calculationRuntimeOptions));
        workbook = workbookWithCalculationMode(result.workbook, calculationMode);
        result = {...result, workbook};
        clearDirtyCalculation();
      }
      emit({
        ...eventDetail,
        source: eventDetail.source || 'calculation',
        action: 'set-mode',
        previousWorkbook,
        previousCalculationMode,
        recalculated: result.recalculated,
      });
      return {...result, calculationMode};
    },
    calculate(calculateOptions = {}) {
      const {eventDetail, runtimeOptions} = splitRuntimeOptions(calculateOptions);
      const previousWorkbook = workbook;
      const result = recalculateWorkbook(workbook, createCalculationRuntimeOptions(runtimeOptions));
      workbook = workbookWithCalculationMode(result.workbook, calculationMode);
      clearDirtyCalculation();
      emit({
        ...eventDetail,
        source: eventDetail.source || 'calculation',
        action: 'calculate',
        previousWorkbook,
        recalculated: result.recalculated,
      });
      return {...result, workbook};
    },
    dispatch(command, dispatchOptions = {}) {
      const {eventDetail, runtimeOptions} = splitRuntimeOptions(dispatchOptions);
      const previousWorkbook = workbook;
      const recalculate = shouldRecalculate(runtimeOptions);
      const result = dispatchCommandWithRecalculation(workbook, command, {...calculationOptions, ...runtimeOptions, recalculate});
      const dirtySheetId = getCommandSheetId(previousWorkbook, command);
      workbook = workbookWithCalculationMode(result.workbook, calculationMode);
      if (recalculate) clearDirtyAfterCalculation(result, runtimeOptions, dirtySheetId);
      else markDirtyForCommand(command, dirtySheetId, result.changedKeys);
      const committedEntry = workbook.history[workbook.history.length - 1];
      emit({
        ...eventDetail,
        source: eventDetail.source || 'command',
        command: committedEntry?.command || command,
        previousWorkbook,
        changedKeys: result.changedKeys,
        recalculated: result.recalculated,
      });
      return {...result, workbook};
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
