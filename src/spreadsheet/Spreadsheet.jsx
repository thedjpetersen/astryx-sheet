import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {Card} from '@astryxdesign/core/Card';
import {useToast} from '@astryxdesign/core/Toast';
import {getTheme, registerThemeIcons} from '../app/themes.js';
import {useControllableState} from '../hooks/useControllableState.js';
import {useElementSize} from '../hooks/useElementSize.js';
import {useRafCallback} from '../hooks/useRafCallback.js';
import {FunctionPicker} from './components/FunctionPicker.jsx';
import {InspectorPanel} from './components/InspectorPanel.jsx';
import {NativeContextMenu} from './components/NativeContextMenu.jsx';
import {RowFragment} from './components/RowFragment.jsx';
import {SpreadsheetToolbar} from './components/SpreadsheetToolbar.jsx';
import {CommandType, createPasteTsvCommand, createSheetDataRef, createWorkbook, dispatchCommand, dispatchCommandWithRecalculation, getActiveSheet, rangeToTsv, recalculateWorkbook, redo as redoWorkbook, undo as undoWorkbook} from './engine/index.js';
import {cellAddress, cellKey, columnName} from './model/address.js';
import {DEFAULT_GRID_CONFIG} from './model/constants.js';
import {createDefaultCellData, createDefaultColWidths, createDefaultRowHeights, defaultCellValue} from './model/defaultData.js';
import {readCell} from './model/formulas.js';
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

export function Spreadsheet({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  gridConfig: gridConfigOverride,
  initialCells,
  initialRowHeights,
  initialColWidths,
  getDefaultCellValue = defaultCellValue,
  defaultThemeName = 'neutral',
  themeName: controlledThemeName,
  onThemeNameChange,
  defaultDarkMode = false,
  darkMode: controlledDarkMode,
  onDarkModeChange,
  defaultShowInspector = true,
  showInspector: controlledShowInspector,
  onShowInspectorChange,
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
  onSelectionChange,
  onActiveCellChange,
}) {
  const viewportRef = useRef(null);
  const headerLayerRef = useRef(null);
  const rowLayerRef = useRef(null);
  const selectionOverlayRef = useRef(null);
  const resizeGuideRef = useRef(null);
  const editorRef = useRef(null);
  const toast = useToast();

  const gridConfig = useMemo(() => ({...DEFAULT_GRID_CONFIG, ...gridConfigOverride}), [gridConfigOverride]);
  const {
    rows: rowCount,
    cols: colCount,
    defaultRowHeight,
    defaultColWidth,
    compactRowHeight = Math.max(18, defaultRowHeight - 6),
    headerHeight,
    sidebarWidth,
    overscanRows,
    overscanCols,
  } = gridConfig;
  const initialPoint = clampPoint({row: 1, col: 1}, gridConfig);

  const cellMetaRef = useRef(new Map());
  const rowMetaRef = useRef(new Map());
  const [workbook, setWorkbook] = useState(() => createWorkbook({
    sheets: [{
      id: 'sheet-1',
      name: 'Sheet1',
      rowCount,
      colCount,
      cells: initialCells ?? createDefaultCellData(),
      rowHeights: initialRowHeights ?? createDefaultRowHeights(),
      colWidths: initialColWidths ?? createDefaultColWidths(),
    }],
  }));
  const workbookRef = useRef(workbook);
  workbookRef.current = workbook;
  const activeSheet = getActiveSheet(workbook);
  const cellDataRef = useMemo(() => createSheetDataRef(activeSheet), [activeSheet]);
  const rowHeightsRef = useRef(activeSheet.rowHeights);
  const colWidthsRef = useRef(activeSheet.colWidths);
  rowHeightsRef.current = activeSheet.rowHeights;
  colWidthsRef.current = activeSheet.colWidths;

  const scrollRef = useRef({left: 0, top: 0});
  const selectionRef = useRef({dragging: false, anchor: initialPoint, extent: initialPoint});
  const resizeRef = useRef(null);
  const frameCounterRef = useRef({frames: 0, last: performance.now()});

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
  const [editor, setEditor] = useState(null);
  const [menu, setMenu] = useState({open: false, x: 0, y: 0, row: 0, col: 0});
  const [formulaPickerOpen, setFormulaPickerOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [themeName, setThemeName] = useControllableState({value: controlledThemeName, defaultValue: defaultThemeName, onChange: onThemeNameChange});
  const [darkMode, setDarkMode] = useControllableState({value: controlledDarkMode, defaultValue: defaultDarkMode, onChange: onDarkModeChange});
  const [showInspector, setShowInspector] = useControllableState({value: controlledShowInspector, defaultValue: defaultShowInspector, onChange: onShowInspectorChange});
  const [compactRows, setCompactRows] = useControllableState({value: controlledCompactRows, defaultValue: defaultCompactRows, onChange: onCompactRowsChange});
  const [highContrastSelection, setHighContrastSelection] = useControllableState({
    value: controlledHighContrastSelection,
    defaultValue: defaultHighContrastSelection,
    onChange: onHighContrastSelectionChange,
  });
  const size = useElementSize(viewportRef);

  const activeTheme = getTheme(themeName);
  const resolvedMode = activeTheme.forceDark ? 'dark' : darkMode ? 'dark' : 'light';
  useEffect(() => { registerThemeIcons(themeName); }, [themeName]);

  const rowOverrides = rowHeightsRef.current;
  const colOverrides = colWidthsRef.current;
  const effectiveRowHeight = compactRows ? compactRowHeight : defaultRowHeight;
  const rowMetrics = useMemo(() => makeDimensionHelpers(effectiveRowHeight, rowCount, rowOverrides), [dimensionVersion, effectiveRowHeight, rowCount, rowOverrides]);
  const colMetrics = useMemo(() => makeDimensionHelpers(defaultColWidth, colCount, colOverrides), [dimensionVersion, defaultColWidth, colCount, colOverrides]);

  const showToast = useCallback((message, type = 'info') => toast({body: message, type, isAutoHide: true}), [toast]);
  const syncFormulaDraftFromWorkbook = useCallback((nextWorkbook, point = activeCell) => {
    setFormulaDraft(readCell(createSheetDataRef(getActiveSheet(nextWorkbook)), point.row, point.col, getDefaultCellValue));
  }, [activeCell, getDefaultCellValue]);
  const navigateHistory = useCallback((navigate, label) => {
    const currentWorkbook = workbookRef.current;
    const navigatedWorkbook = navigate(currentWorkbook);
    if (navigatedWorkbook === currentWorkbook) return;
    const nextWorkbook = recalculateWorkbook(navigatedWorkbook, {getDefaultCellValue}).workbook;
    workbookRef.current = nextWorkbook;
    setWorkbook(nextWorkbook);
    setDataVersion((v) => v + 1);
    setDimensionVersion((v) => v + 1);
    syncFormulaDraftFromWorkbook(nextWorkbook);
    showToast(label);
  }, [getDefaultCellValue, showToast, syncFormulaDraftFromWorkbook]);
  const undoLastCommand = useCallback(() => navigateHistory(undoWorkbook, 'Undo'), [navigateHistory]);
  const redoLastCommand = useCallback(() => navigateHistory(redoWorkbook, 'Redo'), [navigateHistory]);
  const copySelectionToClipboard = useCallback(() => {
    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard blocked', 'error');
      return;
    }
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const text = rangeToTsv(workbookRef.current, selection, {getDefaultCellValue});
    navigator.clipboard.writeText(text).then(
      () => showToast(`Copied ${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`),
      () => showToast('Clipboard blocked', 'error'),
    );
  }, [activeCell, committedSelection, getDefaultCellValue, showToast]);
  const pasteClipboardAtActiveCell = useCallback(() => {
    if (!navigator.clipboard?.readText) {
      showToast('Clipboard blocked', 'error');
      return;
    }
    navigator.clipboard.readText().then((text) => {
      if (!text) return;
      const result = dispatchCommandWithRecalculation(workbookRef.current, createPasteTsvCommand(text, activeCell), {getDefaultCellValue});
      const nextWorkbook = result.workbook;
      workbookRef.current = nextWorkbook;
      setWorkbook(nextWorkbook);
      setDataVersion((v) => v + 1);
      syncFormulaDraftFromWorkbook(nextWorkbook);
      showToast('Pasted cells');
    }, () => showToast('Clipboard blocked', 'error'));
  }, [activeCell, getDefaultCellValue, showToast, syncFormulaDraftFromWorkbook]);
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
    setWorkbook((currentWorkbook) => {
      const result = dispatchCommandWithRecalculation(currentWorkbook, {type: CommandType.SET_CELL, row, col, cell: nextCell}, {getDefaultCellValue});
      const nextWorkbook = result.workbook;
      workbookRef.current = nextWorkbook;
      onCellChange?.({row, col, address: cellAddress(row, col), value, cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook, recalculated: result.recalculated});
      return nextWorkbook;
    });
    setDataVersion((v) => v + 1);
  }, [getDefaultCellValue, onCellChange]);
  const registerCell = useCallback((row, col, rect) => {
    const key = cellKey(row, col);
    if (rect) cellMetaRef.current.set(key, rect);
    else cellMetaRef.current.delete(key);
  }, []);
  const registerRow = useCallback((row, rect) => {
    if (rect) rowMetaRef.current.set(row, rect);
    else rowMetaRef.current.delete(row);
  }, []);
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
    const selection = normalizeSelection(live.anchor, live.extent);
    const left = colMetrics.offset(selection.c1);
    const top = rowMetrics.offset(selection.r1);
    overlay.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    overlay.style.width = `${colMetrics.span(selection.c1, selection.c2)}px`;
    overlay.style.height = `${rowMetrics.span(selection.r1, selection.r2)}px`;
  }, [rowMetrics, colMetrics]);
  const scheduleDrawSelection = useRafCallback(drawSelectionOverlay);

  const selectCell = useCallback((row, col) => {
    const point = clampPoint({row, col}, gridConfig);
    selectionRef.current = {dragging: false, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    scheduleDrawSelection();
  }, [cellDataRef, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection]);
  const openEditor = useCallback((row, col, seed) => {
    setEditor({row, col, value: seed ?? readCell(cellDataRef, row, col, getDefaultCellValue)});
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
  }, [cellDataRef, getDefaultCellValue]);
  const commitEditor = useCallback((value = editor?.value) => {
    if (!editor) return;
    setCell(editor.row, editor.col, value ?? '');
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
    setWorkbook((currentWorkbook) => {
      const result = dispatchCommandWithRecalculation(currentWorkbook, {type: CommandType.SET_RANGE, cells}, {getDefaultCellValue});
      const nextWorkbook = result.workbook;
      workbookRef.current = nextWorkbook;
      onCellChange?.({selection, value: '', cells: getActiveSheet(nextWorkbook).cells, workbook: nextWorkbook, recalculated: result.recalculated});
      return nextWorkbook;
    });
    setDataVersion((v) => v + 1);
    if (activeCell.row >= selection.r1 && activeCell.row <= selection.r2 && activeCell.col >= selection.c1 && activeCell.col <= selection.c2) setFormulaDraft('');
    showToast(`Cleared ${count.toLocaleString()} cell${count === 1 ? '' : 's'}`);
  }, [committedSelection, activeCell, getDefaultCellValue, showToast, onCellChange]);
  const resizeColumn = useCallback((col, size) => {
    setWorkbook((currentWorkbook) => {
      const nextWorkbook = dispatchCommand(currentWorkbook, {type: CommandType.RESIZE_COLUMN, col, size});
      workbookRef.current = nextWorkbook;
      return nextWorkbook;
    });
    setDimensionVersion((v) => v + 1);
  }, []);
  const resizeRow = useCallback((row, size) => {
    setWorkbook((currentWorkbook) => {
      const nextWorkbook = dispatchCommand(currentWorkbook, {type: CommandType.RESIZE_ROW, row, size});
      workbookRef.current = nextWorkbook;
      return nextWorkbook;
    });
    setDimensionVersion((v) => v + 1);
  }, []);
  const resetCellDimensions = useCallback((row, col) => {
    const sheet = getActiveSheet(workbookRef.current);
    if (!sheet.rowHeights.has(row) && !sheet.colWidths.has(col)) return;
    setWorkbook((currentWorkbook) => {
      const currentSheet = getActiveSheet(currentWorkbook);
      const commands = [];
      if (currentSheet.colWidths.has(col)) commands.push({type: CommandType.RESIZE_COLUMN, col, size: null});
      if (currentSheet.rowHeights.has(row)) commands.push({type: CommandType.RESIZE_ROW, row, size: null});
      const nextWorkbook = commands.length === 1
        ? dispatchCommand(currentWorkbook, commands[0])
        : dispatchCommand(currentWorkbook, {type: CommandType.BATCH, commands, label: 'Reset dimensions'});
      workbookRef.current = nextWorkbook;
      return nextWorkbook;
    });
    setDimensionVersion((v) => v + 1);
  }, []);

  useLayoutEffect(() => { calculateView(); drawSelectionOverlay(); }, [calculateView, drawSelectionOverlay, dimensionVersion, size.width, size.height]);
  useEffect(() => { if (editor && editorRef.current) { editorRef.current.focus(); editorRef.current.select(); } }, [editor]);
  useEffect(() => {
    let raf = 0;
    const tick = (now) => {
      const counter = frameCounterRef.current;
      counter.frames++;
      if (now - counter.last > 600) {
        setFps(Math.round((counter.frames * 1000) / (now - counter.last)));
        counter.frames = 0; counter.last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const onPointerMove = (event) => {
      if (selectionRef.current.dragging) {
        const rect = viewportRef.current.getBoundingClientRect();
        selectionRef.current.extent = {
          row: rowMetrics.indexAt(Math.max(0, event.clientY - rect.top + scrollRef.current.top)),
          col: colMetrics.indexAt(Math.max(0, event.clientX - rect.left + scrollRef.current.left)),
        };
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
        setCommittedSelection(normalizeSelection(selectionRef.current.anchor, selectionRef.current.extent));
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
  }, [rowMetrics, colMetrics, scheduleDrawSelection, scheduleDimensionRender, headerHeight, sidebarWidth, setCommittedSelection, resizeColumn, resizeRow]);
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
    selectionRef.current = {dragging: true, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    setEditor(null);
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    scheduleDrawSelection();
  }, [cellDataRef, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection]);
  const openContextMenu = useCallback((event, row, col) => {
    event.preventDefault(); event.stopPropagation();
    const point = clampPoint({row, col}, gridConfig);
    selectionRef.current = {dragging: false, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, point.row, point.col, getDefaultCellValue));
    scheduleDrawSelection();
    const x = Math.min(event.clientX, window.innerWidth - 228);
    const y = Math.min(event.clientY, window.innerHeight - 310);
    setMenu({open: true, x: Math.max(4, x), y: Math.max(4, y), row: point.row, col: point.col});
  }, [cellDataRef, gridConfig, getDefaultCellValue, setActiveCell, setCommittedSelection, scheduleDrawSelection]);
  const onViewportContextMenu = useCallback((event) => {
    if (event.target?.classList?.contains('cell')) return;
    const rect = viewportRef.current.getBoundingClientRect();
    openContextMenu(event, rowMetrics.indexAt(event.clientY - rect.top + scrollRef.current.top), colMetrics.indexAt(event.clientX - rect.left + scrollRef.current.left));
  }, [rowMetrics, colMetrics, openContextMenu]);
  const beginColResize = useCallback((event, col) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'col', index: col, startX: event.clientX, startSize: colMetrics.size(col), hadOverride: colWidthsRef.current.has(col)}; }, [colMetrics]);
  const beginRowResize = useCallback((event, row) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'row', index: row, startY: event.clientY, startSize: rowMetrics.size(row), hadOverride: rowHeightsRef.current.has(row)}; }, [rowMetrics]);
  const commitFormula = useCallback(() => { setCell(activeCell.row, activeCell.col, formulaDraft); showToast(`Updated ${cellAddress(activeCell.row, activeCell.col)}`); }, [activeCell, formulaDraft, setCell, showToast]);
  const insertFunction = useCallback((name) => {
    const selection = committedSelection || normalizeSelection(activeCell, activeCell);
    const range = `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}`;
    const value = name === 'ARITH' ? `=${cellAddress(activeCell.row, Math.max(0, activeCell.col - 1))}+${cellAddress(activeCell.row, Math.max(0, activeCell.col - 2))}` : `=${name}(${range})`;
    setFormulaDraft(value); setCell(activeCell.row, activeCell.col, value); setFormulaPickerOpen(false); showToast(`Inserted ${name === 'ARITH' ? 'formula' : name} in ${cellAddress(activeCell.row, activeCell.col)}`);
  }, [committedSelection, activeCell, setCell, showToast]);
  const handleMenuAction = useCallback((action) => {
    const {row, col} = menu;
    if (action === 'edit') openEditor(row, col);
    if (action === 'clear') { setCell(row, col, ''); if (activeCell.row === row && activeCell.col === col) setFormulaDraft(''); showToast(`Cleared ${cellAddress(row, col)}`); }
    if (action === 'copy') navigator.clipboard?.writeText(readCell(cellDataRef, row, col, getDefaultCellValue)).then(() => showToast('Copied value'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'address') navigator.clipboard?.writeText(cellAddress(row, col)).then(() => showToast('Copied address'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'widen') resizeColumn(col, colMetrics.size(col) + 20);
    if (action === 'taller') resizeRow(row, rowMetrics.size(row) + 6);
    if (action === 'resetSize') resetCellDimensions(row, col);
    if (action === 'sample') { const value = `=SUM(B${row + 1}:E${row + 1})`; setCell(row, col, value); if (activeCell.row === row && activeCell.col === col) setFormulaDraft(value); showToast(`Formula set in ${cellAddress(row, col)}`); }
    setMenu((m) => ({...m, open: false}));
  }, [menu, openEditor, activeCell, showToast, colMetrics, rowMetrics, setCell, cellDataRef, getDefaultCellValue, resetCellDimensions, resizeColumn, resizeRow]);

  const rows = useMemo(() => Array.from({length: Math.max(0, view.rowEnd - view.rowStart + 1)}, (_, i) => view.rowStart + i), [view.rowStart, view.rowEnd]);
  const columns = useMemo(() => Array.from({length: Math.max(0, view.colEnd - view.colStart + 1)}, (_, i) => view.colStart + i), [view.colStart, view.colEnd]);
  const totalWidth = colMetrics.total();
  const totalHeight = rowMetrics.total();
  const activeAddress = cellAddress(activeCell.row, activeCell.col);
  const editorStyle = editor ? {left: colMetrics.offset(editor.col), top: rowMetrics.offset(editor.row), width: colMetrics.size(editor.col), height: rowMetrics.size(editor.row)} : {};
  const appClassName = [
    'app',
    `theme-${themeName}`,
    showInspector ? '' : 'hide-inspector',
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
          formulaDraft={formulaDraft}
          onFormulaChange={setFormulaDraft}
          onFormulaCommit={commitFormula}
          onFormulaReset={() => setFormulaDraft(readCell(cellDataRef, activeCell.row, activeCell.col, getDefaultCellValue))}
          onToggleFunctionPicker={() => setFormulaPickerOpen((v) => !v)}
          rowCount={rowCount}
          colCount={colCount}
          mountedCount={rows.length * columns.length}
          canUndo={workbook.history.length > 0}
          canRedo={workbook.future.length > 0}
          onUndo={undoLastCommand}
          onRedo={redoLastCommand}
          onCopySelection={copySelectionToClipboard}
          onPasteClipboard={pasteClipboardAtActiveCell}
          onEditActiveCell={() => openEditor(activeCell.row, activeCell.col)}
          onClearSelection={clearSelection}
          onWidenActiveColumn={() => resizeColumn(activeCell.col, colMetrics.size(activeCell.col) + 20)}
          onTallerActiveRow={() => resizeRow(activeCell.row, rowMetrics.size(activeCell.row) + 6)}
          themeName={themeName}
          onThemeNameChange={setThemeName}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          activeTheme={activeTheme}
          showInspector={showInspector}
          onShowInspectorChange={setShowInspector}
          compactRows={compactRows}
          onCompactRowsChange={setCompactRows}
          highContrastSelection={highContrastSelection}
          onHighContrastSelectionChange={setHighContrastSelection}
          showStats={showStats}
          showThemeControls={showThemeControls}
          showKeyboardHints={showKeyboardHints}
        />
      ) : null}
      {showToolbar ? <FunctionPicker open={formulaPickerOpen} activeAddress={activeAddress} formulaDraft={formulaDraft} selection={committedSelection} onPick={insertFunction} /> : null}
      <main className="stage">
        <Card className="sheet-shell" padding={0}>
          <div className="corner">✣</div>
          <div className="column-header"><div className="header-layer" ref={headerLayerRef} style={{width: totalWidth, height: headerHeight}}>
            {columns.map((col) => {
              const inSelection = committedSelection && col >= committedSelection.c1 && col <= committedSelection.c2;
              return <div key={col} className={`col-head-cell ${inSelection ? 'selected' : ''}`} style={{left: colMetrics.offset(col), width: colMetrics.size(col)}}>{columnName(col)}<span className="resize-col" onPointerDown={(e) => beginColResize(e, col)} /></div>;
            })}
          </div></div>
          <div className="row-header"><div className="row-layer" ref={rowLayerRef} style={{height: totalHeight, width: sidebarWidth}}>
            {rows.map((row) => {
              const inSelection = committedSelection && row >= committedSelection.r1 && row <= committedSelection.r2;
              return <div key={row} className={`row-head-cell ${inSelection ? 'selected' : ''}`} style={{top: rowMetrics.offset(row), height: rowMetrics.size(row)}}>{row + 1}<span className="resize-row" onPointerDown={(e) => beginRowResize(e, row)} /></div>;
            })}
          </div></div>
          <div className="viewport" ref={viewportRef} onScroll={onScroll} onContextMenu={onViewportContextMenu} tabIndex={0}>
            <div className="spacer" style={{width: totalWidth, height: totalHeight}}>
              <div className="cell-layer" style={{width: totalWidth, height: totalHeight}}>
                {rows.map((row) => (
                  <RowFragment
                    key={row}
                    row={row}
                    y={rowMetrics.offset(row)}
                    height={rowMetrics.size(row)}
                    columns={columns}
                    colMetrics={colMetrics}
                    registerRow={registerRow}
                    registerCell={registerCell}
                    activeCell={activeCell}
                    dataRef={cellDataRef}
                    dataVersion={dataVersion}
                    getDefaultCellValue={getDefaultCellValue}
                    onPointerDown={onCellPointerDown}
                    onContextMenu={openContextMenu}
                    onDoubleClick={(e, r, c) => { e.preventDefault(); selectCell(r, c); openEditor(r, c); }}
                  />
                ))}
              </div>
              <div ref={selectionOverlayRef} className="selection-overlay"><div className="fill-handle" /></div>
              {editor && <input ref={editorRef} className="cell-input" style={editorStyle} value={editor.value} onChange={(e) => setEditor((ed) => ({...ed, value: e.target.value}))} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') commitEditor(e.currentTarget.value); if (e.key === 'Escape') setEditor(null); }} onBlur={(e) => commitEditor(e.currentTarget.value)} />}
            </div>
          </div>
          <div ref={resizeGuideRef} className="resize-guide col" />
        </Card>
        {showInspector && (
          <InspectorPanel
            gridConfig={gridConfig}
            getDefaultCellValue={getDefaultCellValue}
            view={view}
            activeCell={activeCell}
            selection={committedSelection}
            rowOverrides={rowOverrides}
            colOverrides={colOverrides}
            cellMetaRef={cellMetaRef}
            rowMetaRef={rowMetaRef}
            edits={cellDataRef.current.size}
            fps={fps}
            dataRef={cellDataRef}
          />
        )}
      </main>
      <NativeContextMenu menu={menu} onAction={handleMenuAction} />
    </div>
  );

  return withTheme ? <Theme theme={activeTheme.theme} mode={resolvedMode}>{content}</Theme> : content;
}

export default Spreadsheet;
