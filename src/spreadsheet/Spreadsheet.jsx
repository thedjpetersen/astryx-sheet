import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {Card} from '@astryxdesign/core/Card';
import {useToast} from '@astryxdesign/core/Toast';
import {getTheme, registerThemeIcons} from '../app/themes.js';
import {useControllableState} from '../hooks/useControllableState.js';
import {useElementSize} from '../hooks/useElementSize.js';
import {useRafCallback} from '../hooks/useRafCallback.js';
import {FunctionPicker} from './components/FunctionPicker.jsx';
import {NativeContextMenu} from './components/NativeContextMenu.jsx';
import {RowFragment} from './components/RowFragment.jsx';
import {SheetTabs} from './components/SheetTabs.jsx';
import {SpreadsheetToolbar} from './components/SpreadsheetToolbar.jsx';
import {CommandType, ConditionalFormatType, NumberFormatType, createFillDownCommand, createFillRightCommand, createImportHtmlTableCommand, createPasteTsvCommand, createSheetDataRef, createWorkbookController, getActiveSheet, getCellRawValue, getCellRecord, getCellSpillRange, getConditionalFormatRulesForCell, getMergeAtCell, getValidationRulesForCell, getVisibleRowsForSheet, listNamedRanges, normalizeName, previewFormulaDraft, rangeToHtmlTable, rangeToTsv, validateCellValue} from './engine/index.js';
import {cellAddress, cellKey, columnName} from './model/address.js';
import {DEFAULT_GRID_CONFIG} from './model/constants.js';
import {createDefaultCellData, createDefaultColWidths, createDefaultRowHeights, defaultCellValue} from './model/defaultData.js';
import {createFormulaTemplate, formulaReferenceForSelection, getFormulaEditorReferenceHighlights, insertFormulaReferenceDraft, readCell} from './model/formulas.js';
import {makeDimensionHelpers} from './model/dimensions.js';
import {normalizeSelection} from './model/selection.js';

const DEFAULT_TITLE = 'Astryx Sheet';
const DEFAULT_SUBTITLE = 'Agent-ready virtual spreadsheet artifact';

function clampPoint(point, gridConfig) {
  return {
    row: Math.max(0, Math.min(gridConfig.rows - 1, point.row)),
    col: Math.max(0, Math.min(gridConfig.cols - 1, point.col)),
  };
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max, value));
}

function selectionFromLiveSelection(live, rowCount, colCount) {
  if (live?.mode === 'row-header') {
    return normalizeSelection(
      {row: live.anchor.row, col: 0},
      {row: live.extent.row, col: colCount - 1},
    );
  }
  if (live?.mode === 'column-header') {
    return normalizeSelection(
      {row: 0, col: live.anchor.col},
      {row: rowCount - 1, col: live.extent.col},
    );
  }
  return normalizeSelection(live.anchor, live.extent);
}

function createNextSheetName(workbook) {
  const names = new Set(Array.from(workbook.sheets.values(), (sheet) => sheet.name));
  for (let index = workbook.sheetOrder.length + 1; ; index++) {
    const name = `Sheet${index}`;
    if (!names.has(name)) return name;
  }
}

function rawValueForValidation(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if (input.formula) {
      const formula = String(input.formula);
      return formula.trim().startsWith('=') ? formula : `=${formula}`;
    }
    if ('value' in input) return input.value ?? '';
    return '';
  }
  return input ?? '';
}

function isFormulaLike(value) {
  return typeof value === 'string' && value.trim().startsWith('=');
}

function validationFailureMessage(result) {
  return result?.failures?.[0]?.message || `${result?.address || 'Cell'} does not match its validation rule`;
}

function firstValidationFailure(sheet, cells) {
  for (const item of cells) {
    const rawValue = rawValueForValidation(item.cell);
    if (isFormulaLike(rawValue)) continue;
    const result = validateCellValue(sheet, item.row, item.col, rawValue);
    if (!result.valid) return result;
  }
  return null;
}

function normalizePromptNumber(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function normalizeLinkInput(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function isOpenableLink(href) {
  return /^(https?:|mailto:|tel:)/i.test(String(href || '').trim());
}

function defaultRangeName(selection) {
  return `Range_${cellAddress(selection.r1, selection.c1)}_${cellAddress(selection.r2, selection.c2)}`.replace(/[^A-Za-z0-9_]/g, '_');
}

function describeSelection(selection, rowCount, colCount) {
  const rowSpan = selection.r2 - selection.r1 + 1;
  const colSpan = selection.c2 - selection.c1 + 1;
  const cellCount = rowSpan * colSpan;
  const coversAllRows = selection.r1 === 0 && selection.r2 === rowCount - 1;
  const coversAllCols = selection.c1 === 0 && selection.c2 === colCount - 1;
  let label = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
  if (rowSpan === 1 && colSpan === 1) label = cellAddress(selection.r1, selection.c1);
  else if (coversAllCols && !coversAllRows) label = selection.r1 === selection.r2 ? `Row ${selection.r1 + 1}` : `Rows ${selection.r1 + 1}:${selection.r2 + 1}`;
  else if (coversAllRows && !coversAllCols) label = selection.c1 === selection.c2 ? `Column ${columnName(selection.c1)}` : `Columns ${columnName(selection.c1)}:${columnName(selection.c2)}`;
  else if (coversAllRows && coversAllCols) label = 'Entire sheet';

  const shapeLabel = coversAllRows && coversAllCols
    ? `${rowCount.toLocaleString()} x ${colCount.toLocaleString()}`
    : coversAllCols
      ? `${rowSpan.toLocaleString()} row${rowSpan === 1 ? '' : 's'} x all columns`
      : coversAllRows
        ? `all rows x ${colSpan.toLocaleString()} column${colSpan === 1 ? '' : 's'}`
        : `${rowSpan.toLocaleString()} x ${colSpan.toLocaleString()}`;
  return {label, shapeLabel, cellCount};
}

export function Spreadsheet({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  gridConfig: gridConfigOverride,
  initialCells,
  initialRowHeights,
  initialColWidths,
  initialMerges,
  initialValidations,
  initialConditionalFormats,
  workbookController,
  getDefaultCellValue = defaultCellValue,
  defaultThemeName = 'neutral',
  themeName: controlledThemeName,
  onThemeNameChange,
  defaultDarkMode = false,
  darkMode: controlledDarkMode,
  onDarkModeChange,
  defaultCompactRows = false,
  compactRows: controlledCompactRows,
  onCompactRowsChange,
  defaultHighContrastSelection = false,
  highContrastSelection: controlledHighContrastSelection,
  onHighContrastSelectionChange,
  showToolbar = true,
  showStats = true,
  showThemeControls = true,
  showKeyboardHints = true,
  withTheme = true,
  className = '',
  onCellChange,
  onWorkbookChange,
  onSelectionChange,
  onActiveCellChange,
}) {
  const viewportRef = useRef(null);
  const headerLayerRef = useRef(null);
  const rowLayerRef = useRef(null);
  const selectionOverlayRef = useRef(null);
  const resizeGuideRef = useRef(null);
  const editorRef = useRef(null);
  const editorSessionRef = useRef(0);
  const toast = useToast();

  const gridConfig = useMemo(() => ({...DEFAULT_GRID_CONFIG, ...gridConfigOverride}), [gridConfigOverride]);
  const {
    rows: defaultRowCount,
    cols: defaultColCount,
    defaultRowHeight,
    defaultColWidth,
    compactRowHeight = Math.max(18, defaultRowHeight - 6),
    headerHeight,
    sidebarWidth,
    overscanRows,
    overscanCols,
  } = gridConfig;
  const initialPoint = clampPoint({row: 1, col: 1}, gridConfig);

  const ownedWorkbookControllerRef = useRef(null);
  if (!ownedWorkbookControllerRef.current) {
    ownedWorkbookControllerRef.current = createWorkbookController({
      sheets: [{
        id: 'sheet-1',
        name: 'Sheet1',
        rowCount: defaultRowCount,
        colCount: defaultColCount,
        cells: initialCells ?? createDefaultCellData(),
        rowHeights: initialRowHeights ?? createDefaultRowHeights(),
        colWidths: initialColWidths ?? createDefaultColWidths(),
        merges: initialMerges,
        validations: initialValidations,
        conditionalFormats: initialConditionalFormats,
      }],
    });
  }
  const activeWorkbookController = workbookController || ownedWorkbookControllerRef.current;
  const workbookControllerRef = useRef(activeWorkbookController);
  workbookControllerRef.current = activeWorkbookController;
  const [workbook, setWorkbook] = useState(() => activeWorkbookController.getWorkbook());
  const workbookRef = useRef(workbook);
  workbookRef.current = workbook;
  const activeSheet = getActiveSheet(workbook);
  const rowCount = activeSheet.rowCount || defaultRowCount;
  const colCount = activeSheet.colCount || defaultColCount;
  const cellDataRef = useMemo(() => createSheetDataRef(activeSheet), [activeSheet]);
  const rowHeightsRef = useRef(activeSheet.rowHeights);
  const colWidthsRef = useRef(activeSheet.colWidths);
  rowHeightsRef.current = activeSheet.rowHeights;
  colWidthsRef.current = activeSheet.colWidths;

  const scrollRef = useRef({left: 0, top: 0});
  const selectionRef = useRef({dragging: false, anchor: initialPoint, extent: initialPoint});
  const resizeRef = useRef(null);

  const [dimensionVersion, setDimensionVersion] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [view, setView] = useState({
    rowStart: 0,
    rowEnd: Math.min(rowCount - 1, 40),
    colStart: 0,
    colEnd: Math.min(colCount - 1, 15),
  });
  const [activeCell, setActiveCellState] = useState(initialPoint);
  const [committedSelection, setCommittedSelectionState] = useState(normalizeSelection(initialPoint, initialPoint));
  const [formulaDraft, setFormulaDraft] = useState(() => readCell(cellDataRef, initialPoint.row, initialPoint.col, getDefaultCellValue));
  const [formulaEditorActive, setFormulaEditorActive] = useState(false);
  const [formulaCursorPosition, setFormulaCursorPosition] = useState(0);
  const [editor, setEditor] = useState(null);
  const [menu, setMenu] = useState({open: false, x: 0, y: 0, row: 0, col: 0});
  const [formulaPickerOpen, setFormulaPickerOpen] = useState(false);
  const [themeName, setThemeName] = useControllableState({value: controlledThemeName, defaultValue: defaultThemeName, onChange: onThemeNameChange});
  const [darkMode, setDarkMode] = useControllableState({value: controlledDarkMode, defaultValue: defaultDarkMode, onChange: onDarkModeChange});
  const [compactRows, setCompactRows] = useControllableState({value: controlledCompactRows, defaultValue: defaultCompactRows, onChange: onCompactRowsChange});
  const [highContrastSelection, setHighContrastSelection] = useControllableState({
    value: controlledHighContrastSelection,
    defaultValue: defaultHighContrastSelection,
    onChange: onHighContrastSelectionChange,
  });
  const formulaReferenceEditRef = useRef(null);
  const size = useElementSize(viewportRef);

  const activeTheme = getTheme(themeName);
  const resolvedMode = activeTheme.forceDark ? 'dark' : darkMode ? 'dark' : 'light';
  useEffect(() => { registerThemeIcons(themeName); }, [themeName]);

  const rowOverrides = rowHeightsRef.current;
  const colOverrides = colWidthsRef.current;
  const filteredRows = useMemo(() => getVisibleRowsForSheet(workbook, activeSheet.id, {getDefaultCellValue}), [activeSheet.id, getDefaultCellValue, workbook]);
  const effectiveRowOverrides = useMemo(() => {
    if (!filteredRows?.hiddenRows?.length) return rowOverrides;
    const next = new Map(rowOverrides);
    for (const row of filteredRows.hiddenRows) next.set(row, 0);
    return next;
  }, [filteredRows, rowOverrides]);
  const effectiveRowHeight = compactRows ? compactRowHeight : defaultRowHeight;
  const rowMetrics = useMemo(() => makeDimensionHelpers(effectiveRowHeight, rowCount, effectiveRowOverrides), [dimensionVersion, effectiveRowHeight, rowCount, effectiveRowOverrides]);
  const colMetrics = useMemo(() => makeDimensionHelpers(defaultColWidth, colCount, colOverrides), [dimensionVersion, defaultColWidth, colCount, colOverrides]);

  const showToast = useCallback((message, type = 'info') => toast({body: message, type, isAutoHide: true}), [toast]);
  const emitWorkbookChange = useCallback((nextWorkbook, detail = {}) => {
    onWorkbookChange?.({
      workbook: nextWorkbook,
      activeSheet: getActiveSheet(nextWorkbook),
      activeSheetId: nextWorkbook.activeSheetId,
      sheetOrder: [...nextWorkbook.sheetOrder],
      version: nextWorkbook.version,
      ...detail,
    });
  }, [onWorkbookChange]);
  const applyWorkbookUpdate = useCallback((nextWorkbook) => {
    workbookRef.current = nextWorkbook;
    setWorkbook(nextWorkbook);
    return nextWorkbook;
  }, []);
  const dispatchWorkbookCommand = useCallback((command, dispatchOptions = {}, eventDetail = {}) => {
    const result = workbookControllerRef.current.dispatch(command, {...dispatchOptions, event: eventDetail});
    applyWorkbookUpdate(result.workbook);
    const committedEntry = result.workbook.history[result.workbook.history.length - 1];
    return {...result, command: committedEntry?.command || command};
  }, [applyWorkbookUpdate]);
  const validateEditCells = useCallback((cells, workbookToValidate = workbookRef.current) => {
    const failure = firstValidationFailure(getActiveSheet(workbookToValidate), cells);
    if (!failure) return true;
    showToast(validationFailureMessage(failure), 'error');
    return false;
  }, [showToast]);
  const syncFormulaDraftFromWorkbook = useCallback((nextWorkbook, point = activeCell) => {
    setFormulaDraft(readCell(createSheetDataRef(getActiveSheet(nextWorkbook)), point.row, point.col, getDefaultCellValue));
  }, [activeCell, getDefaultCellValue]);
  useEffect(() => {
    const controller = activeWorkbookController;
    applyWorkbookUpdate(controller.getWorkbook());
    const unsubscribe = controller.subscribe((event) => {
      applyWorkbookUpdate(event.workbook);
      emitWorkbookChange(event.workbook, event);
    });
    return unsubscribe;
  }, [activeWorkbookController, applyWorkbookUpdate, emitWorkbookChange]);
  const navigateHistory = useCallback((action, label) => {
    const result = action === 'undo'
      ? workbookControllerRef.current.undo({getDefaultCellValue})
      : workbookControllerRef.current.redo({getDefaultCellValue});
    if (!result.changed) return;
    const nextWorkbook = applyWorkbookUpdate(result.workbook);
    setDataVersion((v) => v + 1);
    setDimensionVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(nextWorkbook);
    showToast(label);
  }, [applyWorkbookUpdate, getDefaultCellValue, showToast, syncFormulaDraftFromWorkbook]);
  const undoLastCommand = useCallback(() => navigateHistory('undo', 'Undo'), [navigateHistory]);
  const redoLastCommand = useCallback(() => navigateHistory('redo', 'Redo'), [navigateHistory]);
  const commitWorkbookStructureCommand = useCallback((command, toastMessage, source = 'structure') => {
    const result = dispatchWorkbookCommand(command, {}, {source});
    const nextWorkbook = result.workbook;
    setDataVersion((v) => v + 1);
    setDimensionVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(nextWorkbook);
    setEditor(null);
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    if (toastMessage) showToast(toastMessage);
    return nextWorkbook;
  }, [dispatchWorkbookCommand, showToast, syncFormulaDraftFromWorkbook]);
  const activateSheet = useCallback((sheetId) => {
    const currentWorkbook = workbookRef.current;
    if (sheetId === currentWorkbook.activeSheetId) return;
    const sheetName = currentWorkbook.sheets.get(sheetId)?.name || sheetId;
    commitWorkbookStructureCommand({type: CommandType.SET_ACTIVE_SHEET, sheetId, label: `Switch to ${sheetName}`}, `Switched to ${sheetName}`);
  }, [commitWorkbookStructureCommand]);
  const addSheet = useCallback(() => {
    const name = createNextSheetName(workbookRef.current);
    commitWorkbookStructureCommand({
      type: CommandType.ADD_SHEET,
      sheet: {name, rowCount, colCount},
      label: `Add ${name}`,
    }, `Added ${name}`);
  }, [colCount, commitWorkbookStructureCommand, rowCount]);
  const renameActiveSheet = useCallback(() => {
    const currentWorkbook = workbookRef.current;
    const sheet = getActiveSheet(currentWorkbook);
    const nextName = typeof window === 'undefined' ? '' : window.prompt('Rename sheet', sheet.name)?.trim();
    if (!nextName || nextName === sheet.name) return;
    const nameExists = Array.from(currentWorkbook.sheets.values()).some((item) => (
      item.id !== sheet.id && item.name.toLowerCase() === nextName.toLowerCase()
    ));
    if (nameExists) {
      showToast('Sheet name already exists', 'error');
      return;
    }
    commitWorkbookStructureCommand({type: CommandType.RENAME_SHEET, sheetId: sheet.id, name: nextName, label: `Rename ${sheet.name}`}, `Renamed sheet to ${nextName}`);
  }, [commitWorkbookStructureCommand, showToast]);
  const removeActiveSheet = useCallback(() => {
    const currentWorkbook = workbookRef.current;
    if (currentWorkbook.sheetOrder.length <= 1) {
      showToast('Workbook needs at least one sheet', 'error');
      return;
    }
    const sheet = getActiveSheet(currentWorkbook);
    const confirmed = typeof window === 'undefined' || window.confirm(`Remove ${sheet.name}?`);
    if (!confirmed) return;
    commitWorkbookStructureCommand({type: CommandType.REMOVE_SHEET, sheetId: sheet.id, label: `Remove ${sheet.name}`}, `Removed ${sheet.name}`);
  }, [commitWorkbookStructureCommand, showToast]);
  const copySelectionToClipboard = useCallback(() => {
    if (!navigator.clipboard?.writeText && !navigator.clipboard?.write) {
      showToast('Clipboard blocked', 'error');
      return;
    }
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const text = rangeToTsv(workbookRef.current, selection, {getDefaultCellValue});
    const html = rangeToHtmlTable(workbookRef.current, selection, {getDefaultCellValue});
    const onCopied = () => showToast(`Copied ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`);
    const writePlainText = () => {
      if (!navigator.clipboard.writeText) {
        showToast('Clipboard blocked', 'error');
        return;
      }
      navigator.clipboard.writeText(text).then(onCopied, () => showToast('Clipboard blocked', 'error'));
    };
    if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/plain': new Blob([text], {type: 'text/plain'}),
        'text/html': new Blob([html], {type: 'text/html'}),
      });
      navigator.clipboard.write([item]).then(
        onCopied,
        writePlainText,
      );
      return;
    }
    writePlainText();
  }, [activeCell, committedSelection, getDefaultCellValue, showToast]);
  const pasteClipboardAtActiveCell = useCallback(() => {
    if (!navigator.clipboard?.readText && !navigator.clipboard?.read) {
      showToast('Clipboard blocked', 'error');
      return;
    }
    const applyPasteCommand = (command, message) => {
      if (!command.cells?.length) return false;
      if (!validateEditCells(command.cells)) return true;
      const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'clipboard'});
      const nextWorkbook = result.workbook;
      setDataVersion((v) => v + 1);
      syncFormulaDraftFromWorkbook(nextWorkbook);
      showToast(message);
      return true;
    };
    const pastePlainText = () => {
      if (!navigator.clipboard.readText) {
        showToast('Clipboard blocked', 'error');
        return;
      }
      navigator.clipboard.readText().then((text) => {
        if (!text) return;
        const command = createPasteTsvCommand(text, activeCell);
        applyPasteCommand(command, 'Pasted cells');
      }, () => showToast('Clipboard blocked', 'error'));
    };
    if (navigator.clipboard.read) {
      navigator.clipboard.read().then(async (items) => {
        try {
          for (const item of items) {
            if (!item.types?.includes('text/html')) continue;
            const html = await item.getType('text/html').then((blob) => blob.text());
            const command = createImportHtmlTableCommand(html, activeCell, {label: 'Paste HTML table'});
            if (applyPasteCommand(command, 'Pasted table')) return;
          }
        } catch {
          pastePlainText();
          return;
        }
        pastePlainText();
      }, pastePlainText);
      return;
    }
    pastePlainText();
  }, [activeCell, dispatchWorkbookCommand, getDefaultCellValue, showToast, syncFormulaDraftFromWorkbook, validateEditCells]);
  const setActiveCell = useCallback((point) => {
    const nextPoint = clampPoint(point, gridConfig);
    setActiveCellState(nextPoint);
    onActiveCellChange?.({...nextPoint, address: cellAddress(nextPoint.row, nextPoint.col)});
  }, [gridConfig, onActiveCellChange]);
  const setCommittedSelection = useCallback((selection) => {
    setCommittedSelectionState(selection);
    onSelectionChange?.(selection);
  }, [onSelectionChange]);
  const setCell = useCallback((row, col, value) => {
    const nextCell = value === getDefaultCellValue(row, col) ? null : value;
    if (!validateEditCells([{row, col, cell: value}])) return false;
    const command = {type: CommandType.SET_CELL, row, col, cell: nextCell};
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'cell'});
    const nextWorkbook = result.workbook;
    onCellChange?.({row, col, address: cellAddress(row, col), value, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook, recalculated: result.recalculated});
    setDataVersion((v) => v + 1);
    return true;
  }, [dispatchWorkbookCommand, getDefaultCellValue, onCellChange, validateEditCells]);
  const calculateView = useCallback(() => {
    const {left, top} = scrollRef.current;
    const width = viewportRef.current?.clientWidth || size.width || 1;
    const height = viewportRef.current?.clientHeight || size.height || 1;
    setView({
      rowStart: Math.max(0, rowMetrics.indexAt(top) - overscanRows),
      rowEnd: Math.min(rowCount - 1, rowMetrics.indexAt(top + height) + overscanRows),
      colStart: Math.max(0, colMetrics.indexAt(left) - overscanCols),
      colEnd: Math.min(colCount - 1, colMetrics.indexAt(left + width) + overscanCols),
    });
  }, [rowMetrics, colMetrics, size.width, size.height, overscanRows, overscanCols, rowCount, colCount]);
  const scheduleView = useRafCallback(calculateView);
  const scheduleDimensionRender = useRafCallback(() => setDimensionVersion((v) => v + 1));
  const drawSelectionOverlay = useCallback(() => {
    const overlay = selectionOverlayRef.current;
    if (!overlay) return;
    const live = selectionRef.current;
    const selection = selectionFromLiveSelection(live, rowCount, colCount);
    const left = colMetrics.offset(selection.c1);
    const top = rowMetrics.offset(selection.r1);
    overlay.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    overlay.style.width = `${colMetrics.span(selection.c1, selection.c2)}px`;
    overlay.style.height = `${rowMetrics.span(selection.r1, selection.r2)}px`;
  }, [rowMetrics, colMetrics, rowCount, colCount]);
  const scheduleDrawSelection = useRafCallback(drawSelectionOverlay);
  const applyFormulaReferenceSelection = useCallback((selection, edit = formulaReferenceEditRef.current) => {
    if (!edit) return;
    const reference = formulaReferenceForSelection(selection);
    const next = insertFormulaReferenceDraft(edit.baseDraft, reference, edit.cursorPosition);
    setFormulaDraft(next.value);
    setFormulaCursorPosition(next.cursor);
  }, []);

  const selectCell = useCallback((row, col) => {
    const point = clampPoint({row, col}, gridConfig);
    selectionRef.current = {dragging: false, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    setFormulaEditorActive(false);
    formulaReferenceEditRef.current = null;
    scheduleDrawSelection();
  }, [cellDataRef, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection]);
  const selectHeaderRange = useCallback((selection, point, liveSelection) => {
    const nextPoint = clampPoint(point, gridConfig);
    selectionRef.current = liveSelection;
    setActiveCell(nextPoint);
    setCommittedSelection(selection);
    setFormulaDraft(readCell(cellDataRef, nextPoint.row, nextPoint.col, getDefaultCellValue));
    setFormulaEditorActive(false);
    formulaReferenceEditRef.current = null;
    setEditor(null);
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    scheduleDrawSelection();
  }, [cellDataRef, getDefaultCellValue, gridConfig, scheduleDrawSelection, setActiveCell, setCommittedSelection]);
  const selectWholeRow = useCallback((row, dragging = false, extendSelection = false) => {
    const nextRow = clampIndex(row, rowCount - 1);
    const previousSelection = selectionRef.current;
    const anchorRow = extendSelection
      ? clampIndex(
        previousSelection?.mode === 'row-header'
          ? previousSelection.anchor.row
          : committedSelection?.c1 === 0 && committedSelection?.c2 === colCount - 1
            ? committedSelection.r1
            : activeCell.row,
        rowCount - 1,
      )
      : nextRow;
    const selection = normalizeSelection({row: anchorRow, col: 0}, {row: nextRow, col: colCount - 1});
    selectHeaderRange(selection, {row: anchorRow, col: 0}, {
      dragging,
      anchor: {row: anchorRow, col: 0},
      extent: {row: nextRow, col: 0},
      mode: 'row-header',
    });
  }, [activeCell.row, colCount, committedSelection, rowCount, selectHeaderRange]);
  const selectWholeColumn = useCallback((col, dragging = false, extendSelection = false) => {
    const nextCol = clampIndex(col, colCount - 1);
    const previousSelection = selectionRef.current;
    const anchorCol = extendSelection
      ? clampIndex(
        previousSelection?.mode === 'column-header'
          ? previousSelection.anchor.col
          : committedSelection?.r1 === 0 && committedSelection?.r2 === rowCount - 1
            ? committedSelection.c1
            : activeCell.col,
        colCount - 1,
      )
      : nextCol;
    const selection = normalizeSelection({row: 0, col: anchorCol}, {row: rowCount - 1, col: nextCol});
    selectHeaderRange(selection, {row: 0, col: anchorCol}, {
      dragging,
      anchor: {row: 0, col: anchorCol},
      extent: {row: 0, col: nextCol},
      mode: 'column-header',
    });
  }, [activeCell.col, colCount, committedSelection, rowCount, selectHeaderRange]);
  const openEditor = useCallback((row, col, seed) => {
    setEditor({
      row,
      col,
      value: seed ?? readCell(cellDataRef, row, col, getDefaultCellValue),
      selectAll: seed == null,
      sessionId: ++editorSessionRef.current,
    });
    setFormulaEditorActive(false);
    formulaReferenceEditRef.current = null;
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
  }, [cellDataRef, getDefaultCellValue]);
  const commitEditor = useCallback((value = editor?.value) => {
    if (!editor) return;
    if (!setCell(editor.row, editor.col, value ?? '')) return;
    if (editor.row === activeCell.row && editor.col === activeCell.col) setFormulaDraft(value ?? '');
    setEditor(null);
    showToast(`Updated ${cellAddress(editor.row, editor.col)}`);
  }, [editor, activeCell, setCell, showToast]);
  const clearSelection = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const count = (selection.r2 - selection.r1 + 1) * (selection.c2 - selection.c1 + 1);
    if (count > 50000) return showToast('Selection too large for demo clear', 'error');
    const cells = [];
    for (let r = selection.r1; r <= selection.r2; r++) for (let c = selection.c1; c <= selection.c2; c++) cells.push({row: r, col: c, cell: {value: ''}});
    if (!validateEditCells(cells)) return;
    const command = {type: CommandType.SET_RANGE, cells};
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'range-clear'});
    const nextWorkbook = result.workbook;
    onCellChange?.({selection, value: '', cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook, recalculated: result.recalculated});
    setDataVersion((v) => v + 1);
    if (activeCell.row >= selection.r1 && activeCell.row <= selection.r2 && activeCell.col >= selection.c1 && activeCell.col <= selection.c2) setFormulaDraft('');
    showToast(`Cleared ${count.toLocaleString()} cell${count === 1 ? '' : 's'}`);
  }, [committedSelection, activeCell, dispatchWorkbookCommand, getDefaultCellValue, showToast, onCellChange, validateEditCells]);
  const getDefaultCellsForSelection = useCallback((selection) => {
    const sheet = getActiveSheet(workbookRef.current);
    const defaultCells = {};
    for (let row = selection.r1; row <= selection.r2; row++) {
      for (let col = selection.c1; col <= selection.c2; col++) {
        const key = cellKey(row, col);
        if (sheet.cells.has(key)) continue;
        const value = getDefaultCellValue(row, col);
        if (value == null || value === '') continue;
        defaultCells[key] = value;
      }
    }
    return Object.keys(defaultCells).length ? defaultCells : undefined;
  }, [getDefaultCellValue]);
  const formatSelection = useCallback((format, label, replace = false) => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const command = {
      type: CommandType.SET_RANGE_FORMAT,
      range: selection,
      format,
      replace,
      defaultCells: getDefaultCellsForSelection(selection),
      label: `Format ${label}`,
    };
    const result = dispatchWorkbookCommand(command, {}, {source: 'format'});
    const nextWorkbook = result.workbook;
    onCellChange?.({selection, format, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook});
    setDataVersion((v) => v + 1);
    showToast(`Formatted ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)} as ${label}`);
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellsForSelection, onCellChange, showToast]);
  const styleSelection = useCallback((style, label, replace = false) => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const command = {
      type: CommandType.SET_RANGE_STYLE,
      range: selection,
      style,
      replace,
      defaultCells: getDefaultCellsForSelection(selection),
      label: `Style ${label}`,
    };
    const result = dispatchWorkbookCommand(command, {}, {source: 'style'});
    const nextWorkbook = result.workbook;
    onCellChange?.({selection, style, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook});
    setDataVersion((v) => v + 1);
    showToast(`Styled ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)} as ${label}`);
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellsForSelection, onCellChange, showToast]);
  const clearSelectionFormatting = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const defaultCells = getDefaultCellsForSelection(selection);
    const command = {
      type: CommandType.BATCH,
      commands: [
        {type: CommandType.SET_RANGE_FORMAT, range: selection, format: undefined, replace: true, defaultCells},
        {type: CommandType.SET_RANGE_STYLE, range: selection, style: undefined, replace: true, defaultCells},
      ],
      label: 'Clear formatting',
    };
    const result = dispatchWorkbookCommand(command, {}, {source: 'format'});
    const nextWorkbook = result.workbook;
    onCellChange?.({selection, format: null, style: null, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook});
    setDataVersion((v) => v + 1);
    showToast(`Cleared formatting in ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`);
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellsForSelection, onCellChange, showToast]);
  const sortSelection = useCallback((direction) => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    if (selection.r2 <= selection.r1) {
      showToast('Select multiple rows to sort', 'error');
      return;
    }
    const sortCol = activeCell.col >= selection.c1 && activeCell.col <= selection.c2 ? activeCell.col : selection.c1;
    const command = {
      type: CommandType.SORT_RANGE,
      range: selection,
      hasHeader: selection.r1 === 0,
      sortBy: [{col: sortCol, direction, type: 'auto'}],
      defaultCells: getDefaultCellsForSelection(selection),
      label: direction === 'asc' ? 'Sort ascending' : 'Sort descending',
    };
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'sort'});
    setDataVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(result.workbook);
    onCellChange?.({selection, sort: {col: sortCol, direction}, cells: getActiveSheet(result.workbook).cells, workbook: result.workbook, recalculated: result.recalculated});
    showToast(direction === 'asc' ? 'Sorted ascending' : 'Sorted descending');
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellValue, getDefaultCellsForSelection, onCellChange, showToast, syncFormulaDraftFromWorkbook]);
  const filterSelectionByActiveValue = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    if (selection.r2 <= selection.r1) {
      showToast('Select multiple rows to filter', 'error');
      return;
    }
    const filterCol = activeCell.col >= selection.c1 && activeCell.col <= selection.c2 ? activeCell.col : selection.c1;
    const value = getCellRawValue(workbookRef.current, activeSheet.id, activeCell.row, filterCol, {getDefaultCellValue});
    const command = {
      type: CommandType.SET_FILTER,
      id: 'selection-filter',
      range: selection,
      hasHeader: selection.r1 === 0,
      criteria: [{col: filterCol, operator: 'equals', value}],
      label: 'Filter selection',
    };
    const result = dispatchWorkbookCommand(command, {}, {source: 'filter'});
    const nextWorkbook = result.workbook;
    setDimensionVersion((v) => v + 1);
    onCellChange?.({selection, filter: command, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook});
    showToast(`Filtered ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`);
  }, [activeCell, activeSheet.id, committedSelection, dispatchWorkbookCommand, getDefaultCellValue, onCellChange, showToast]);
  const clearActiveFilter = useCallback(() => {
    if (!activeSheet.filters.size) {
      showToast('No active filter', 'error');
      return;
    }
    const command = {type: CommandType.CLEAR_FILTER, id: 'selection-filter', label: 'Clear filter'};
    const result = dispatchWorkbookCommand(command, {}, {source: 'filter'});
    const nextWorkbook = result.workbook;
    setDimensionVersion((v) => v + 1);
    onCellChange?.({filter: null, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook});
    showToast('Cleared filter');
  }, [activeSheet.filters.size, dispatchWorkbookCommand, onCellChange, showToast]);
  const mergeSelection = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    if (selection.r1 === selection.r2 && selection.c1 === selection.c2) {
      showToast('Select multiple cells to merge', 'error');
      return;
    }
    const label = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    try {
      commitWorkbookStructureCommand({
        type: CommandType.MERGE_RANGE,
        range: selection,
        label: `Merge ${label}`,
      }, `Merged ${label}`, 'metadata');
    } catch (error) {
      showToast(error?.message || 'Could not merge cells', 'error');
    }
  }, [activeCell, committedSelection, commitWorkbookStructureCommand, showToast]);
  const unmergeActiveRange = useCallback(() => {
    const merge = getMergeAtCell(activeSheet, activeCell.row, activeCell.col);
    if (!merge) {
      showToast('No merged range at active cell', 'error');
      return;
    }
    const label = `${cellAddress(merge.range.r1, merge.range.c1)}:${cellAddress(merge.range.r2, merge.range.c2)}`;
    commitWorkbookStructureCommand({
      type: CommandType.UNMERGE_RANGE,
      id: merge.id,
      label: `Unmerge ${label}`,
    }, `Unmerged ${label}`, 'metadata');
  }, [activeCell, activeSheet, commitWorkbookStructureCommand, showToast]);
  const applyNumberValidation = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const minInput = typeof window === 'undefined' ? '0' : window.prompt('Minimum number (blank for none)', '');
    if (minInput == null) return;
    const maxInput = typeof window === 'undefined' ? '' : window.prompt('Maximum number (blank for none)', '');
    if (maxInput == null) return;
    const min = normalizePromptNumber(minInput);
    const max = normalizePromptNumber(maxInput);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      showToast('Validation limits must be numbers', 'error');
      return;
    }
    if (min == null && max == null) {
      showToast('Enter at least one validation limit', 'error');
      return;
    }
    const rangeLabel = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    const rule = {range: selection, type: 'number', allowBlank: true};
    if (min != null && max != null) {
      Object.assign(rule, {operator: 'between', min, max, message: `Enter a number from ${min} to ${max}`});
    } else if (min != null) {
      Object.assign(rule, {operator: 'gte', value: min, message: `Enter a number greater than or equal to ${min}`});
    } else {
      Object.assign(rule, {operator: 'lte', value: max, message: `Enter a number less than or equal to ${max}`});
    }
    commitWorkbookStructureCommand({
      type: CommandType.SET_VALIDATION,
      rule,
      label: `Validate ${rangeLabel}`,
    }, `Added number validation to ${rangeLabel}`, 'metadata');
  }, [activeCell, committedSelection, commitWorkbookStructureCommand, showToast]);
  const applyListValidation = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const input = typeof window === 'undefined' ? '' : window.prompt('Accepted values, separated by commas', '');
    if (input == null) return;
    const values = input.split(',').map((value) => value.trim()).filter(Boolean);
    if (!values.length) {
      showToast('Enter at least one accepted value', 'error');
      return;
    }
    const rangeLabel = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    commitWorkbookStructureCommand({
      type: CommandType.SET_VALIDATION,
      rule: {
        range: selection,
        type: 'list',
        values,
        allowBlank: true,
        message: `Choose one of: ${values.join(', ')}`,
      },
      label: `List validation ${rangeLabel}`,
    }, `Added list validation to ${rangeLabel}`, 'metadata');
  }, [activeCell, committedSelection, commitWorkbookStructureCommand, showToast]);
  const clearValidation = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const exactId = `${selection.r1}:${selection.c1}:${selection.r2}:${selection.c2}`;
    const exactRule = activeSheet.validations.get(exactId);
    const activeRule = getValidationRulesForCell(activeSheet, activeCell.row, activeCell.col)[0];
    const rule = exactRule || activeRule;
    if (!rule) {
      showToast('No validation rule at active cell', 'error');
      return;
    }
    commitWorkbookStructureCommand({
      type: CommandType.CLEAR_VALIDATION,
      id: rule.id,
      label: 'Clear validation',
    }, 'Cleared validation', 'metadata');
  }, [activeCell, activeSheet, committedSelection, commitWorkbookStructureCommand, showToast]);
  const highlightGreaterThan = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const input = typeof window === 'undefined' ? '0' : window.prompt('Highlight values greater than', '0');
    if (input == null) return;
    const value = normalizePromptNumber(input);
    if (value == null || Number.isNaN(value)) {
      showToast('Highlight threshold must be a number', 'error');
      return;
    }
    const rangeLabel = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    commitWorkbookStructureCommand({
      type: CommandType.SET_CONDITIONAL_FORMAT,
      rule: {
        range: selection,
        type: ConditionalFormatType.NUMBER,
        operator: 'gt',
        value,
        style: {backgroundColor: '#d1fae5', color: '#064e3b', fontWeight: 600},
      },
      label: `Highlight ${rangeLabel}`,
    }, `Highlighted values above ${value}`, 'metadata');
  }, [activeCell, committedSelection, commitWorkbookStructureCommand, showToast]);
  const highlightTextContains = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const input = typeof window === 'undefined' ? '' : window.prompt('Highlight text containing', '');
    if (input == null) return;
    const value = input.trim();
    if (!value) {
      showToast('Enter text to highlight', 'error');
      return;
    }
    const rangeLabel = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    commitWorkbookStructureCommand({
      type: CommandType.SET_CONDITIONAL_FORMAT,
      rule: {
        range: selection,
        type: ConditionalFormatType.TEXT,
        operator: 'contains',
        value,
        style: {backgroundColor: '#fee2e2', color: '#7f1d1d', fontWeight: 600},
      },
      label: `Highlight text ${rangeLabel}`,
    }, `Highlighted text matches in ${rangeLabel}`, 'metadata');
  }, [activeCell, committedSelection, commitWorkbookStructureCommand, showToast]);
  const clearConditionalFormat = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const exactRule = Array.from(activeSheet.conditionalFormats.values()).find((rule) => (
      rule.range.r1 === selection.r1 &&
      rule.range.c1 === selection.c1 &&
      rule.range.r2 === selection.r2 &&
      rule.range.c2 === selection.c2
    ));
    const activeRule = getConditionalFormatRulesForCell(activeSheet, activeCell.row, activeCell.col)[0];
    const rule = exactRule || activeRule;
    if (!rule) {
      showToast('No conditional format at active cell', 'error');
      return;
    }
    commitWorkbookStructureCommand({
      type: CommandType.CLEAR_CONDITIONAL_FORMAT,
      id: rule.id,
      label: 'Clear conditional format',
    }, 'Cleared conditional format', 'metadata');
  }, [activeCell, activeSheet, committedSelection, commitWorkbookStructureCommand, showToast]);
  const nameSelection = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const input = typeof window === 'undefined' ? defaultRangeName(selection) : window.prompt('Named range', defaultRangeName(selection));
    const name = input?.trim();
    if (!name) return;
    try {
      const normalized = normalizeName(name);
      commitWorkbookStructureCommand({
        type: CommandType.SET_NAMED_RANGE,
        name,
        sheetId: activeSheet.id,
        range: selection,
        label: `Name ${normalized}`,
      }, `Named range ${normalized}`, 'metadata');
    } catch (error) {
      showToast(error?.message || 'Could not create named range', 'error');
    }
  }, [activeCell, activeSheet.id, committedSelection, commitWorkbookStructureCommand, showToast]);
  const removeNamedRange = useCallback(() => {
    if (!workbookRef.current.namedRanges.size) {
      showToast('No named ranges', 'error');
      return;
    }
    const fallbackName = Array.from(workbookRef.current.namedRanges.keys())[0];
    const input = typeof window === 'undefined' ? fallbackName : window.prompt('Remove named range', fallbackName);
    if (!input?.trim()) return;
    const name = normalizeName(input);
    if (!workbookRef.current.namedRanges.has(name)) {
      showToast('Named range not found', 'error');
      return;
    }
    commitWorkbookStructureCommand({
      type: CommandType.REMOVE_NAMED_RANGE,
      name,
      label: `Remove ${name}`,
    }, `Removed named range ${name}`, 'metadata');
  }, [commitWorkbookStructureCommand, showToast]);
  const editCellLink = useCallback((row, col) => {
    const currentCell = getCellRecord(workbookRef.current, activeSheet.id, row, col);
    const input = typeof window === 'undefined' ? currentCell?.link?.href || '' : window.prompt('Cell link', currentCell?.link?.href || '');
    if (input == null) return;
    const href = normalizeLinkInput(input);
    const command = href
      ? currentCell || getCellRawValue(workbookRef.current, activeSheet.id, row, col, {getDefaultCellValue})
        ? {type: CommandType.SET_CELL_LINK, row, col, href, label: 'Set cell link'}
        : {
            type: CommandType.BATCH,
            commands: [
              {type: CommandType.SET_CELL, row, col, value: href},
              {type: CommandType.SET_CELL_LINK, row, col, href},
            ],
            label: 'Set cell link',
          }
      : {type: CommandType.CLEAR_CELL_LINK, row, col, label: 'Clear cell link'};
    commitWorkbookStructureCommand(command, href ? `Added link to ${cellAddress(row, col)}` : `Cleared link in ${cellAddress(row, col)}`, 'metadata');
  }, [activeSheet.id, commitWorkbookStructureCommand, getDefaultCellValue]);
  const clearCellLink = useCallback((row, col) => {
    const currentLink = getCellRecord(workbookRef.current, activeSheet.id, row, col)?.link?.href;
    if (!currentLink) {
      showToast('No link at active cell', 'error');
      return;
    }
    commitWorkbookStructureCommand({
      type: CommandType.CLEAR_CELL_LINK,
      row,
      col,
      label: 'Clear cell link',
    }, `Cleared link in ${cellAddress(row, col)}`, 'metadata');
  }, [activeSheet.id, commitWorkbookStructureCommand, showToast]);
  const openCellLink = useCallback((row, col) => {
    const href = getCellRecord(workbookRef.current, activeSheet.id, row, col)?.link?.href;
    if (!href) {
      showToast('No link at active cell', 'error');
      return;
    }
    if (typeof window === 'undefined' || !isOpenableLink(href)) {
      showToast('Link cannot be opened', 'error');
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [activeSheet.id, showToast]);
  const editCellNote = useCallback((row, col) => {
    const currentNote = getCellRecord(workbookRef.current, activeSheet.id, row, col)?.note || '';
    const input = typeof window === 'undefined' ? currentNote : window.prompt('Cell note', currentNote);
    if (input == null) return;
    const note = input.trim();
    commitWorkbookStructureCommand({
      type: note ? CommandType.SET_CELL_NOTE : CommandType.CLEAR_CELL_NOTE,
      row,
      col,
      note,
      label: note ? 'Set cell note' : 'Clear cell note',
    }, note ? `Added note to ${cellAddress(row, col)}` : `Cleared note in ${cellAddress(row, col)}`, 'metadata');
  }, [activeSheet.id, commitWorkbookStructureCommand]);
  const clearCellNote = useCallback((row, col) => {
    const currentNote = getCellRecord(workbookRef.current, activeSheet.id, row, col)?.note;
    if (!currentNote) {
      showToast('No note at active cell', 'error');
      return;
    }
    commitWorkbookStructureCommand({
      type: CommandType.CLEAR_CELL_NOTE,
      row,
      col,
      label: 'Clear cell note',
    }, `Cleared note in ${cellAddress(row, col)}`, 'metadata');
  }, [activeSheet.id, commitWorkbookStructureCommand, showToast]);
  const resizeColumn = useCallback((col, size) => {
    const command = {type: CommandType.RESIZE_COLUMN, col, size};
    dispatchWorkbookCommand(command, {}, {source: 'resize'});
    setDimensionVersion((v) => v + 1);
  }, [dispatchWorkbookCommand]);
  const resizeRow = useCallback((row, size) => {
    const command = {type: CommandType.RESIZE_ROW, row, size};
    dispatchWorkbookCommand(command, {}, {source: 'resize'});
    setDimensionVersion((v) => v + 1);
  }, [dispatchWorkbookCommand]);
  const resetCellDimensions = useCallback((row, col) => {
    const currentWorkbook = workbookRef.current;
    const currentSheet = getActiveSheet(currentWorkbook);
    if (!currentSheet.rowHeights.has(row) && !currentSheet.colWidths.has(col)) return;
    const commands = [];
    if (currentSheet.colWidths.has(col)) commands.push({type: CommandType.RESIZE_COLUMN, col, size: null});
    if (currentSheet.rowHeights.has(row)) commands.push({type: CommandType.RESIZE_ROW, row, size: null});
    const command = commands.length === 1 ? commands[0] : {type: CommandType.BATCH, commands, label: 'Reset dimensions'};
    dispatchWorkbookCommand(command, {}, {source: 'resize'});
    setDimensionVersion((v) => v + 1);
  }, [dispatchWorkbookCommand]);
  const applyStructuralCommand = useCallback((command, message) => {
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'structure'});
    setDataVersion((v) => v + 1);
    setDimensionVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(result.workbook);
    showToast(message);
    return result.workbook;
  }, [dispatchWorkbookCommand, getDefaultCellValue, showToast, syncFormulaDraftFromWorkbook]);
  const insertRowAt = useCallback((row, placement = 'above') => {
    const index = placement === 'below' ? row + 1 : row;
    applyStructuralCommand({type: CommandType.INSERT_ROWS, index, count: 1, label: placement === 'below' ? 'Insert row below' : 'Insert row above'}, placement === 'below' ? 'Inserted row below' : 'Inserted row above');
  }, [applyStructuralCommand]);
  const deleteRowAt = useCallback((row) => {
    applyStructuralCommand({type: CommandType.DELETE_ROWS, index: row, count: 1, label: 'Delete row'}, `Deleted row ${row + 1}`);
  }, [applyStructuralCommand]);
  const insertColumnAt = useCallback((col, placement = 'left') => {
    const index = placement === 'right' ? col + 1 : col;
    applyStructuralCommand({type: CommandType.INSERT_COLUMNS, index, count: 1, label: placement === 'right' ? 'Insert column right' : 'Insert column left'}, placement === 'right' ? 'Inserted column right' : 'Inserted column left');
  }, [applyStructuralCommand]);
  const deleteColumnAt = useCallback((col) => {
    applyStructuralCommand({type: CommandType.DELETE_COLUMNS, index: col, count: 1, label: 'Delete column'}, `Deleted column ${columnName(col)}`);
  }, [applyStructuralCommand]);
  const fillSelectionDown = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    if (selection.r2 <= selection.r1) {
      showToast('Select at least two rows to fill down', 'error');
      return;
    }
    const command = createFillDownCommand(workbookRef.current, selection, {getDefaultCellValue});
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'fill'});
    setDataVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(result.workbook);
    onCellChange?.({selection, fill: 'down', cells: getActiveSheet(result.workbook).cells, workbook: result.workbook, recalculated: result.recalculated});
    showToast(`Filled down ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`);
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellValue, onCellChange, showToast, syncFormulaDraftFromWorkbook]);
  const fillSelectionRight = useCallback(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    if (selection.c2 <= selection.c1) {
      showToast('Select at least two columns to fill right', 'error');
      return;
    }
    const command = createFillRightCommand(workbookRef.current, selection, {getDefaultCellValue});
    const result = dispatchWorkbookCommand(command, {getDefaultCellValue}, {source: 'fill'});
    setDataVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(result.workbook);
    onCellChange?.({selection, fill: 'right', cells: getActiveSheet(result.workbook).cells, workbook: result.workbook, recalculated: result.recalculated});
    showToast(`Filled right ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`);
  }, [activeCell, committedSelection, dispatchWorkbookCommand, getDefaultCellValue, onCellChange, showToast, syncFormulaDraftFromWorkbook]);

  useLayoutEffect(() => { calculateView(); drawSelectionOverlay(); }, [calculateView, drawSelectionOverlay, dimensionVersion, size.width, size.height]);
  useEffect(() => {
    if (!editor || !editorRef.current) return;
    editorRef.current.focus();
    if (editor.selectAll) {
      editorRef.current.select();
      return;
    }
    const position = String(editor.value ?? '').length;
    editorRef.current.setSelectionRange(position, position);
  }, [editor?.sessionId]);
  useEffect(() => {
    const onPointerMove = (event) => {
      if (selectionRef.current.dragging) {
        const rect = viewportRef.current.getBoundingClientRect();
        const liveSelection = selectionRef.current;
        const nextRow = clampIndex(rowMetrics.indexAt(Math.max(0, event.clientY - rect.top + scrollRef.current.top)), rowCount - 1);
        const nextCol = clampIndex(colMetrics.indexAt(Math.max(0, event.clientX - rect.left + scrollRef.current.left)), colCount - 1);
        if (liveSelection.mode === 'row-header') {
          liveSelection.extent = {row: nextRow, col: liveSelection.anchor.col};
        } else if (liveSelection.mode === 'column-header') {
          liveSelection.extent = {row: liveSelection.anchor.row, col: nextCol};
        } else {
          liveSelection.extent = {row: nextRow, col: nextCol};
        }
        if (selectionRef.current.mode === 'formula-reference') {
          applyFormulaReferenceSelection(selectionFromLiveSelection(selectionRef.current, rowCount, colCount));
        }
        scheduleDrawSelection();
        return;
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        if (r.kind === 'col') {
          const next = Math.max(48, r.startSize + (event.clientX - r.startX));
          colWidthsRef.current.set(r.index, next);
          const guide = resizeGuideRef.current;
          if (guide) {
            guide.className = 'resize-guide col';
            guide.style.display = 'block';
            guide.style.left = `${sidebarWidth + colMetrics.offset(r.index) + next - scrollRef.current.left}px`;
          }
        } else {
          const next = Math.max(22, r.startSize + (event.clientY - r.startY));
          rowHeightsRef.current.set(r.index, next);
          const guide = resizeGuideRef.current;
          if (guide) {
            guide.className = 'resize-guide row';
            guide.style.display = 'block';
            guide.style.top = `${headerHeight + rowMetrics.offset(r.index) + next - scrollRef.current.top}px`;
          }
        }
        scheduleDimensionRender();
      }
    };
    const onPointerUp = () => {
      if (selectionRef.current.dragging) {
        selectionRef.current.dragging = false;
        const selection = selectionFromLiveSelection(selectionRef.current, rowCount, colCount);
        setCommittedSelection(selection);
        if (selectionRef.current.mode === 'formula-reference') {
          applyFormulaReferenceSelection(selection);
          formulaReferenceEditRef.current = null;
        }
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        const map = r.kind === 'col' ? colWidthsRef.current : rowHeightsRef.current;
        const finalSize = map.get(r.index) ?? r.startSize;
        if (r.hadOverride) map.set(r.index, r.startSize);
        else map.delete(r.index);
        if (finalSize !== r.startSize) {
          if (r.kind === 'col') resizeColumn(r.index, finalSize);
          else resizeRow(r.index, finalSize);
        } else {
          setDimensionVersion((v) => v + 1);
        }
        resizeRef.current = null;
        if (resizeGuideRef.current) resizeGuideRef.current.style.display = 'none';
      }
    };
    window.addEventListener('pointermove', onPointerMove, {passive: true});
    window.addEventListener('pointerup', onPointerUp);
    return () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); };
  }, [rowMetrics, colMetrics, rowCount, colCount, scheduleDrawSelection, scheduleDimensionRender, headerHeight, sidebarWidth, setCommittedSelection, resizeColumn, resizeRow, applyFormulaReferenceSelection]);
  useEffect(() => {
    const close = () => setMenu((m) => ({...m, open: false}));
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('resize', close); };
  }, []);
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      const typingInInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (event.key === 'Escape') { setEditor(null); setMenu((m) => ({...m, open: false})); setFormulaPickerOpen(false); return; }
      if (typingInInput || editor) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redoLastCommand() : undoLastCommand(); return; }
      if ((event.metaKey || event.ctrlKey) && key === 'y') { event.preventDefault(); redoLastCommand(); return; }
      if ((event.metaKey || event.ctrlKey) && key === 'c') { event.preventDefault(); copySelectionToClipboard(); return; }
      if ((event.metaKey || event.ctrlKey) && key === 'v') { event.preventDefault(); pasteClipboardAtActiveCell(); return; }
      if (event.key === 'Enter') { event.preventDefault(); openEditor(activeCell.row, activeCell.col); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); clearSelection(); }
      else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); openEditor(activeCell.row, activeCell.col, event.key); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCell, editor, openEditor, clearSelection, copySelectionToClipboard, pasteClipboardAtActiveCell, redoLastCommand, undoLastCommand]);

  const onScroll = useCallback((event) => {
    const {scrollLeft, scrollTop} = event.currentTarget;
    scrollRef.current = {left: scrollLeft, top: scrollTop};
    if (headerLayerRef.current) headerLayerRef.current.style.transform = `translate3d(${-scrollLeft}px, 0, 0)`;
    if (rowLayerRef.current) rowLayerRef.current.style.transform = `translate3d(0, ${-scrollTop}px, 0)`;
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    scheduleView();
    scheduleDrawSelection();
  }, [scheduleView, scheduleDrawSelection]);
  const onCellPointerDown = useCallback((event, row, col) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = clampPoint({row, col}, gridConfig);
    if (formulaEditorActive && String(formulaDraft ?? '').trim().startsWith('=')) {
      const selection = normalizeSelection(point, point);
      const cursorPosition = formulaCursorPosition || String(formulaDraft ?? '').length;
      formulaReferenceEditRef.current = {baseDraft: formulaDraft, cursorPosition};
      selectionRef.current = {dragging: true, anchor: point, extent: point, mode: 'formula-reference'};
      setCommittedSelection(selection);
      applyFormulaReferenceSelection(selection, formulaReferenceEditRef.current);
      setEditor(null);
      setMenu((m) => ({...m, open: false}));
      setFormulaPickerOpen(false);
      scheduleDrawSelection();
      return;
    }
    selectionRef.current = {dragging: true, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    setFormulaEditorActive(false);
    formulaReferenceEditRef.current = null;
    setEditor(null);
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    scheduleDrawSelection();
  }, [cellDataRef, formulaCursorPosition, formulaDraft, formulaEditorActive, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection, applyFormulaReferenceSelection]);
  const onRowHeaderPointerDown = useCallback((event, row) => {
    if (event.button !== 0) return;
    event.preventDefault();
    selectWholeRow(row, true, event.shiftKey);
  }, [selectWholeRow]);
  const onColumnHeaderPointerDown = useCallback((event, col) => {
    if (event.button !== 0) return;
    event.preventDefault();
    selectWholeColumn(col, true, event.shiftKey);
  }, [selectWholeColumn]);
  const onRowHeaderKeyDown = useCallback((event, row) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectWholeRow(row, false, event.shiftKey);
  }, [selectWholeRow]);
  const onColumnHeaderKeyDown = useCallback((event, col) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectWholeColumn(col, false, event.shiftKey);
  }, [selectWholeColumn]);
  const openContextMenu = useCallback((event, row, col) => {
    event.preventDefault(); event.stopPropagation();
    const point = clampPoint({row, col}, gridConfig);
    const keepSelection = committedSelection && point.row >= committedSelection.r1 && point.row <= committedSelection.r2 && point.col >= committedSelection.c1 && point.col <= committedSelection.c2;
    if (!keepSelection) {
      selectionRef.current = {dragging: false, anchor: point, extent: point};
      setCommittedSelection(normalizeSelection(point, point));
    } else {
      selectionRef.current = {dragging: false, anchor: {row: committedSelection.r1, col: committedSelection.c1}, extent: {row: committedSelection.r2, col: committedSelection.c2}};
    }
    setActiveCell(point);
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    scheduleDrawSelection();
    const x = Math.min(event.clientX, window.innerWidth - 228);
    const y = Math.min(event.clientY, window.innerHeight - 430);
    setMenu({open: true, x: Math.max(4, x), y: Math.max(4, y), row: point.row, col: point.col});
  }, [cellDataRef, committedSelection, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection]);
  const openRowHeaderContextMenu = useCallback((event, row) => {
    event.preventDefault(); event.stopPropagation();
    const nextRow = clampIndex(row, rowCount - 1);
    selectWholeRow(nextRow);
    const x = Math.min(event.clientX, window.innerWidth - 228);
    const y = Math.min(event.clientY, window.innerHeight - 430);
    setMenu({open: true, x: Math.max(4, x), y: Math.max(4, y), row: nextRow, col: 0});
  }, [rowCount, selectWholeRow]);
  const openColumnHeaderContextMenu = useCallback((event, col) => {
    event.preventDefault(); event.stopPropagation();
    const nextCol = clampIndex(col, colCount - 1);
    selectWholeColumn(nextCol);
    const x = Math.min(event.clientX, window.innerWidth - 228);
    const y = Math.min(event.clientY, window.innerHeight - 430);
    setMenu({open: true, x: Math.max(4, x), y: Math.max(4, y), row: 0, col: nextCol});
  }, [colCount, selectWholeColumn]);
  const onViewportContextMenu = useCallback((event) => {
    if (event.target?.classList?.contains('cell')) return;
    const rect = viewportRef.current.getBoundingClientRect();
    openContextMenu(event, rowMetrics.indexAt(event.clientY - rect.top + scrollRef.current.top), colMetrics.indexAt(event.clientX - rect.left + scrollRef.current.left));
  }, [rowMetrics, colMetrics, openContextMenu]);
  const beginColResize = useCallback((event, col) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'col', index: col, startX: event.clientX, startSize: colMetrics.size(col), hadOverride: colWidthsRef.current.has(col)}; }, [colMetrics]);
  const beginRowResize = useCallback((event, row) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'row', index: row, startY: event.clientY, startSize: rowMetrics.size(row), hadOverride: rowHeightsRef.current.has(row)}; }, [rowMetrics]);
  const commitFormula = useCallback(() => {
    if (setCell(activeCell.row, activeCell.col, formulaDraft)) showToast(`Updated ${cellAddress(activeCell.row, activeCell.col)}`);
  }, [activeCell, formulaDraft, setCell, showToast]);
  const formulaContext = useMemo(() => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const range = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    return {
      sheetId: activeSheet.id,
      sheets: workbook.sheetOrder.map((sheetId) => workbook.sheets.get(sheetId)).filter(Boolean).map((sheet) => ({id: sheet.id, name: sheet.name})),
      namedRanges: listNamedRanges(workbook),
      range,
      firstCell: cellAddress(selection.r1, selection.c1),
      lastCell: cellAddress(selection.r2, selection.c2),
      firstColumnRange: `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c1)}`,
      lastColumnRange: `${cellAddress(selection.r1, selection.c2)}:${cellAddress(selection.r2, selection.c2)}`,
      lastColumnIndex: Math.max(1, selection.c2 - selection.c1 + 1),
      rowCount: selection.r2 - selection.r1 + 1,
    };
  }, [activeCell, activeSheet.id, committedSelection, workbook]);
  const buildFormulaTemplate = useCallback((name) => {
    return name === 'ARITH'
      ? `=${cellAddress(activeCell.row, Math.max(0, activeCell.col - 1))}+${cellAddress(activeCell.row, Math.max(0, activeCell.col - 2))}`
      : createFormulaTemplate(name, formulaContext);
  }, [activeCell, formulaContext]);
  const draftFunctionTemplate = useCallback((name) => {
    if (!name) return;
    setFormulaDraft(buildFormulaTemplate(name));
  }, [buildFormulaTemplate]);
  const insertFunction = useCallback((name) => {
    if (!name) {
      setFormulaPickerOpen(false);
      return;
    }
    const value = buildFormulaTemplate(name);
    setFormulaDraft(value);
    if (setCell(activeCell.row, activeCell.col, value)) {
      setFormulaPickerOpen(false);
      showToast(`Inserted ${name === 'ARITH' ? 'formula' : name} in ${cellAddress(activeCell.row, activeCell.col)}`);
    }
  }, [activeCell, buildFormulaTemplate, setCell, showToast]);
  const handleMenuAction = useCallback((action) => {
    const {row, col} = menu;
    if (action === 'edit') openEditor(row, col);
    if (action === 'clear' && setCell(row, col, '')) {
      if (activeCell.row === row && activeCell.col === col) setFormulaDraft('');
      showToast(`Cleared ${cellAddress(row, col)}`);
    }
    if (action === 'copy') navigator.clipboard?.writeText(readCell(cellDataRef, row, col, getDefaultCellValue)).then(() => showToast('Copied value'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'address') navigator.clipboard?.writeText(cellAddress(row, col)).then(() => showToast('Copied address'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'link') editCellLink(row, col);
    if (action === 'openLink') openCellLink(row, col);
    if (action === 'clearLink') clearCellLink(row, col);
    if (action === 'note') editCellNote(row, col);
    if (action === 'clearNote') clearCellNote(row, col);
    if (action === 'fillDown') fillSelectionDown();
    if (action === 'fillRight') fillSelectionRight();
    if (action === 'widen') resizeColumn(col, colMetrics.size(col) + 20);
    if (action === 'taller') resizeRow(row, rowMetrics.size(row) + 6);
    if (action === 'resetSize') resetCellDimensions(row, col);
    if (action === 'insertRowAbove') insertRowAt(row, 'above');
    if (action === 'insertRowBelow') insertRowAt(row, 'below');
    if (action === 'deleteRow') deleteRowAt(row);
    if (action === 'insertColumnLeft') insertColumnAt(col, 'left');
    if (action === 'insertColumnRight') insertColumnAt(col, 'right');
    if (action === 'deleteColumn') deleteColumnAt(col);
    if (action === 'sample') {
      const value = `=SUM(B${row + 1}:E${row + 1})`;
      if (setCell(row, col, value)) {
        if (activeCell.row === row && activeCell.col === col) setFormulaDraft(value);
        showToast(`Formula set in ${cellAddress(row, col)}`);
      }
    }
    setMenu((m) => ({...m, open: false}));
  }, [menu, openEditor, activeCell, showToast, colMetrics, rowMetrics, setCell, cellDataRef, getDefaultCellValue, editCellLink, openCellLink, clearCellLink, editCellNote, clearCellNote, fillSelectionDown, fillSelectionRight, resetCellDimensions, resizeColumn, resizeRow, insertRowAt, deleteRowAt, insertColumnAt, deleteColumnAt]);

  const rows = useMemo(() => Array.from({length: Math.max(0, view.rowEnd - view.rowStart + 1)}, (_, i) => view.rowStart + i), [view.rowStart, view.rowEnd]);
  const renderedRows = useMemo(() => filteredRows?.hiddenRows?.length ? rows.filter((row) => rowMetrics.size(row) > 0) : rows, [filteredRows, rowMetrics, rows]);
  const columns = useMemo(() => Array.from({length: Math.max(0, view.colEnd - view.colStart + 1)}, (_, i) => view.colStart + i), [view.colStart, view.colEnd]);
  const firstRenderedRow = renderedRows[0] ?? view.rowStart;
  const firstRenderedCol = columns[0] ?? view.colStart;
  const totalWidth = colMetrics.total();
  const totalHeight = rowMetrics.total();
  const activeAddress = cellAddress(activeCell.row, activeCell.col);
  const selectionDescription = useMemo(
    () => describeSelection(committedSelection || normalizeSelection(activeCell, activeCell), rowCount, colCount),
    [activeCell, colCount, committedSelection, rowCount],
  );
  const activeCellRecord = getCellRecord(workbook, activeSheet.id, activeCell.row, activeCell.col);
  const currentFillColor = activeCellRecord?.style?.backgroundColor;
  const currentTextColor = activeCellRecord?.style?.color;
  const formulaPreview = useMemo(() => previewFormulaDraft(
    workbook,
    activeSheet.id,
    activeCell.row,
    activeCell.col,
    formulaDraft,
    {getDefaultCellValue},
  ), [activeCell.col, activeCell.row, activeSheet.id, formulaDraft, getDefaultCellValue, workbook]);
  const formulaReferenceHighlights = useMemo(() => {
    if (!formulaEditorActive || !String(formulaDraft ?? '').trimStart().startsWith('=')) return [];
    return getFormulaEditorReferenceHighlights(formulaDraft, {
      ...formulaContext,
      sheetName: activeSheet.name,
      sheetRowCount: rowCount,
      sheetColCount: colCount,
      getSpillRangeForCell: (_sheetName, row, col) => getCellSpillRange(activeSheet, row, col),
    });
  }, [activeSheet, colCount, formulaContext, formulaDraft, formulaEditorActive, rowCount]);
  const selectionCoversAllRows = committedSelection?.r1 === 0 && committedSelection?.r2 === rowCount - 1;
  const selectionCoversAllCols = committedSelection?.c1 === 0 && committedSelection?.c2 === colCount - 1;
  const selectionIsWholeColumn = selectionCoversAllRows && !selectionCoversAllCols;
  const selectionIsWholeRow = selectionCoversAllCols && !selectionCoversAllRows;
  const editorStyle = editor ? {left: colMetrics.offset(editor.col), top: rowMetrics.offset(editor.row), width: colMetrics.size(editor.col), height: rowMetrics.size(editor.row)} : {};
  const appClassName = [
    'app',
    `theme-${themeName}`,
    highContrastSelection ? 'high-contrast-selection' : '',
    showToolbar ? '' : 'toolbar-hidden',
    className,
  ].filter(Boolean).join(' ');
  const appStyle = {'--sheet-header-h': `${headerHeight}px`, '--sheet-sidebar-w': `${sidebarWidth}px`};

  const content = (
    <div className={appClassName} style={appStyle} data-theme={resolvedMode} data-astryx-theme={themeName}>
      {showToolbar ? (
        <SpreadsheetToolbar
          title={title}
          subtitle={subtitle}
          activeAddress={activeAddress}
          selectionLabel={selectionDescription.label}
          selectionShapeLabel={selectionDescription.shapeLabel}
          selectionCellCount={selectionDescription.cellCount}
          currentFillColor={currentFillColor}
          currentTextColor={currentTextColor}
          formulaDraft={formulaDraft}
          formulaPreview={formulaPreview}
          formulaCursorPosition={formulaCursorPosition}
          onFormulaChange={setFormulaDraft}
          onFormulaCommit={commitFormula}
          onFormulaReset={() => setFormulaDraft(readCell(cellDataRef, activeCell.row, activeCell.col, getDefaultCellValue))}
          onToggleFunctionPicker={() => setFormulaPickerOpen((v) => !v)}
          onFormulaFocusChange={setFormulaEditorActive}
          onFormulaCursorChange={setFormulaCursorPosition}
          formulaContext={formulaContext}
          rowCount={rowCount}
          colCount={colCount}
          mountedCount={renderedRows.length * columns.length}
          canUndo={workbook.history.length > 0}
          canRedo={workbook.future.length > 0}
          onUndo={undoLastCommand}
          onRedo={redoLastCommand}
          onCopySelection={copySelectionToClipboard}
          onPasteClipboard={pasteClipboardAtActiveCell}
          onEditActiveCell={() => openEditor(activeCell.row, activeCell.col)}
          onClearSelection={clearSelection}
          onClearFormatting={clearSelectionFormatting}
          onFormatNumber={() => formatSelection({type: NumberFormatType.NUMBER, decimals: 2}, 'number')}
          onFormatCurrency={() => formatSelection({type: NumberFormatType.CURRENCY, currency: 'USD', decimals: 2}, 'currency')}
          onFormatPercent={() => formatSelection({type: NumberFormatType.PERCENT, decimals: 1}, 'percent')}
          onFormatDate={() => formatSelection({type: NumberFormatType.DATE}, 'date')}
          onApplyFormat={(format, label, replace) => formatSelection(format, label, replace)}
          onStyleBold={() => styleSelection({fontWeight: 700}, 'bold')}
          onStyleBorder={() => styleSelection({border: '1px solid #64748b'}, 'border')}
          onStyleFill={() => styleSelection({backgroundColor: '#e0f2fe'}, 'fill')}
          onStyleText={() => styleSelection({color: '#075985'}, 'text color')}
          onApplyStyle={(style, label, replace) => styleSelection(style, label, replace)}
          onSortAscending={() => sortSelection('asc')}
          onSortDescending={() => sortSelection('desc')}
          onFilterSelection={filterSelectionByActiveValue}
          onClearFilter={clearActiveFilter}
          onMergeSelection={mergeSelection}
          onUnmergeSelection={unmergeActiveRange}
          onInsertRowAbove={() => insertRowAt(activeCell.row, 'above')}
          onInsertRowBelow={() => insertRowAt(activeCell.row, 'below')}
          onInsertColumnLeft={() => insertColumnAt(activeCell.col, 'left')}
          onInsertColumnRight={() => insertColumnAt(activeCell.col, 'right')}
          onDeleteActiveRow={() => deleteRowAt(activeCell.row)}
          onDeleteActiveColumn={() => deleteColumnAt(activeCell.col)}
          onValidateNumber={applyNumberValidation}
          onValidateList={applyListValidation}
          onClearValidation={clearValidation}
          onHighlightGreaterThan={highlightGreaterThan}
          onHighlightTextContains={highlightTextContains}
          onClearConditionalFormat={clearConditionalFormat}
          onNameSelection={nameSelection}
          onRemoveNamedRange={removeNamedRange}
          onWidenActiveColumn={() => resizeColumn(activeCell.col, colMetrics.size(activeCell.col) + 20)}
          onTallerActiveRow={() => resizeRow(activeCell.row, rowMetrics.size(activeCell.row) + 6)}
          onResetActiveSize={() => resetCellDimensions(activeCell.row, activeCell.col)}
          onFillDown={fillSelectionDown}
          onFillRight={fillSelectionRight}
          themeName={themeName}
          onThemeNameChange={setThemeName}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          activeTheme={activeTheme}
          compactRows={compactRows}
          onCompactRowsChange={setCompactRows}
          highContrastSelection={highContrastSelection}
          onHighContrastSelectionChange={setHighContrastSelection}
          showStats={showStats}
          showThemeControls={showThemeControls}
          showKeyboardHints={showKeyboardHints}
        />
      ) : null}
      {showToolbar ? (
        <FunctionPicker
          open={formulaPickerOpen}
          activeAddress={activeAddress}
          formulaDraft={formulaDraft}
          selection={committedSelection}
          onPick={insertFunction}
          onDraft={draftFunctionTemplate}
          onClose={() => setFormulaPickerOpen(false)}
        />
      ) : null}
      <main className="stage">
        <div className="sheet-workbench">
          <Card className="sheet-shell" padding={0}>
            <div className="corner">✣</div>
            <div className="column-header"><div className="header-layer" ref={headerLayerRef} style={{width: totalWidth, height: headerHeight}}>
              {columns.map((col) => {
                const inSelection = committedSelection && !selectionIsWholeRow && col >= committedSelection.c1 && col <= committedSelection.c2;
                const name = columnName(col);
                return (
                  <div
                    key={col}
                    className={`col-head-cell ${inSelection ? 'selected' : ''}`}
                    style={{left: colMetrics.offset(col), width: colMetrics.size(col)}}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select column ${name}`}
                    title={`Select column ${name}`}
                    onPointerDown={(event) => onColumnHeaderPointerDown(event, col)}
                    onContextMenu={(event) => openColumnHeaderContextMenu(event, col)}
                    onKeyDown={(event) => onColumnHeaderKeyDown(event, col)}>
                    {name}
                    <span className="resize-col" onPointerDown={(e) => beginColResize(e, col)} />
                  </div>
                );
              })}
            </div></div>
            <div className="row-header"><div className="row-layer" ref={rowLayerRef} style={{height: totalHeight, width: sidebarWidth}}>
              {renderedRows.map((row) => {
                const inSelection = committedSelection && !selectionIsWholeColumn && row >= committedSelection.r1 && row <= committedSelection.r2;
                return (
                  <div
                    key={row}
                    className={`row-head-cell ${inSelection ? 'selected' : ''}`}
                    style={{top: rowMetrics.offset(row), height: rowMetrics.size(row)}}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select row ${row + 1}`}
                    title={`Select row ${row + 1}`}
                    onPointerDown={(event) => onRowHeaderPointerDown(event, row)}
                    onContextMenu={(event) => openRowHeaderContextMenu(event, row)}
                    onKeyDown={(event) => onRowHeaderKeyDown(event, row)}>
                    {row + 1}
                    <span className="resize-row" onPointerDown={(e) => beginRowResize(e, row)} />
                  </div>
                );
              })}
            </div></div>
            <div className="viewport" ref={viewportRef} onScroll={onScroll} onContextMenu={onViewportContextMenu} tabIndex={0}>
              <div className="spacer" style={{width: totalWidth, height: totalHeight}}>
                <div className="cell-layer" style={{width: totalWidth, height: totalHeight}}>
                  {renderedRows.map((row) => (
                    <RowFragment
                      key={row}
                      row={row}
                      y={rowMetrics.offset(row)}
                      height={rowMetrics.size(row)}
                      columns={columns}
                      colMetrics={colMetrics}
                      rowMetrics={rowMetrics}
                      firstRenderedRow={firstRenderedRow}
                      firstRenderedCol={firstRenderedCol}
                      activeCell={activeCell}
                      workbook={workbook}
                      sheetId={activeSheet.id}
                      dataRef={cellDataRef}
                      dataVersion={dataVersion}
                      getDefaultCellValue={getDefaultCellValue}
                      onPointerDown={onCellPointerDown}
                      onContextMenu={openContextMenu}
                      onDoubleClick={(e, r, c) => { e.preventDefault(); selectCell(r, c); openEditor(r, c); }}
                    />
                  ))}
                </div>
                {formulaReferenceHighlights.length ? (
                  <div className="formula-reference-layer" aria-hidden="true">
                    {formulaReferenceHighlights.map((item, index) => (
                      <div
                        key={`${item.reference}-${index}`}
                        className={`formula-reference-overlay color-${item.color || 'blue'}`}
                        style={{
                          left: colMetrics.offset(item.range.c1),
                          top: rowMetrics.offset(item.range.r1),
                          width: colMetrics.span(item.range.c1, item.range.c2),
                          height: rowMetrics.span(item.range.r1, item.range.r2),
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                <div ref={selectionOverlayRef} className="selection-overlay"><div className="fill-handle" /></div>
                {editor && <input ref={editorRef} className="cell-input" style={editorStyle} value={editor.value} onChange={(e) => setEditor((ed) => ({...ed, value: e.target.value}))} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') commitEditor(e.currentTarget.value); if (e.key === 'Escape') setEditor(null); }} onBlur={(e) => commitEditor(e.currentTarget.value)} />}
              </div>
            </div>
            <div ref={resizeGuideRef} className="resize-guide col" />
          </Card>
          <SheetTabs
            workbook={workbook}
            activeSheetId={activeSheet.id}
            onActivateSheet={activateSheet}
            onAddSheet={addSheet}
            onRenameActiveSheet={renameActiveSheet}
            onRemoveActiveSheet={removeActiveSheet}
          />
        </div>
      </main>
      <NativeContextMenu menu={menu} onAction={handleMenuAction} />
    </div>
  );

  return withTheme ? <Theme theme={activeTheme.theme} mode={resolvedMode}>{content}</Theme> : content;
}

export default Spreadsheet;
