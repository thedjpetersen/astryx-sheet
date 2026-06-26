import React, {memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {registerIcons} from '@astryxdesign/core/Icon';
import {y2kTheme, y2kIconRegistry} from '@astryxdesign/theme-y2k';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Card} from '@astryxdesign/core/Card';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Switch} from '@astryxdesign/core/Switch';
import {Token} from '@astryxdesign/core/Token';
import {Kbd} from '@astryxdesign/core/Kbd';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import {useToast} from '@astryxdesign/core/Toast';
import './styles.css';

registerIcons(y2kIconRegistry);

const ROWS = 100000;
const COLS = 2000;
const DEFAULT_ROW_HEIGHT = 30;
const DEFAULT_COL_WIDTH = 116;
const HEADER_HEIGHT = 36;
const SIDEBAR_WIDTH = 56;
const OVERSCAN_ROWS = 8;
const OVERSCAN_COLS = 4;

function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}
function cellAddress(row, col) { return `${columnName(col)}${row + 1}`; }
function cellKey(row, col) { return `${row}:${col}`; }

function parseCellAddress(address) {
  const match = /^\s*([A-Z]+)(\d+)\s*$/i.exec(address);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return {row: Number(match[2]) - 1, col: col - 1};
}
function parseRange(ref) {
  const parts = ref.split(':');
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1] || parts[0]);
  if (!start || !end) return null;
  return {r1: Math.min(start.row, end.row), r2: Math.max(start.row, end.row), c1: Math.min(start.col, end.col), c2: Math.max(start.col, end.col)};
}
function toNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').replace(/[$,]/g, '').trim();
  if (text === '') return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}
function formatFormulaResult(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '#NUM!';
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value ?? '');
}

function defaultCellValue(row, col) {
  if (col === 0) return row < 8 ? ['Metric', 'North', 'South', 'East', 'West', 'Online', 'Retail', 'Partner'][row] : `Item ${row + 1}`;
  if (row === 0) return ['', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Owner', 'Status', 'Updated'][col] || columnName(col);
  if (col === 5) return `=SUM(B${row + 1}:E${row + 1})`;
  if (col === 6) return ['Ami', 'Blake', 'Casey', 'Drew', 'Emery'][row % 5];
  if (col === 7) return ['Live', 'Review', 'Blocked', 'Done'][row % 4];
  if (col === 8) return new Date(2026, row % 12, ((row * 3) % 27) + 1).toLocaleDateString();
  if (col >= 1 && col <= 4) return String(((row + 3) * (col + 7)) % 900 + 100);
  if (col % 13 === 0) return `=SUM(${columnName(col - 2)}${row + 1}:${columnName(col - 1)}${row + 1})`;
  if ((row + col) % 17 === 0) return `${(row * 7 + col * 13) % 1000}.00`;
  return `${columnName(col)}${row + 1}`;
}
function readCell(dataRef, row, col) {
  const key = cellKey(row, col);
  return dataRef.current.has(key) ? dataRef.current.get(key) : defaultCellValue(row, col);
}
function evaluateFormula(raw, dataRef, origin, stack = new Set()) {
  const formula = String(raw ?? '').trim();
  if (!formula.startsWith('=')) return raw;
  const expr = formula.slice(1).trim();
  const originKey = origin ? cellKey(origin.row, origin.col) : 'root';
  if (stack.has(originKey)) return '#CYCLE!';
  stack.add(originKey);

  const readEvaluated = (row, col) => {
    const key = cellKey(row, col);
    if (stack.has(key)) return '#CYCLE!';
    const value = readCell(dataRef, row, col);
    return typeof value === 'string' && value.trim().startsWith('=')
      ? evaluateFormula(value, dataRef, {row, col}, new Set(stack))
      : value;
  };
  const valuesForRange = (rangeText) => {
    const range = parseRange(rangeText);
    if (!range) return [];
    const values = [];
    let count = 0;
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (++count > 10000) return values;
        values.push(toNumber(readEvaluated(r, c)));
      }
    }
    return values;
  };

  const fnMatch = /^([A-Z]+)\((.*)\)$/i.exec(expr);
  if (fnMatch) {
    const name = fnMatch[1].toUpperCase();
    const argText = fnMatch[2].trim();
    const args = argText ? argText.split(/\s*,\s*/) : [];
    const values = args.flatMap((arg) => {
      if (/^[A-Z]+\d+\s*:\s*[A-Z]+\d+$/i.test(arg)) return valuesForRange(arg);
      const addr = parseCellAddress(arg);
      if (addr) return [toNumber(readEvaluated(addr.row, addr.col))];
      return [toNumber(arg)];
    });
    if (name === 'SUM') return values.reduce((a, b) => a + b, 0);
    if (name === 'AVERAGE' || name === 'AVG') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    if (name === 'MIN') return values.length ? Math.min(...values) : 0;
    if (name === 'MAX') return values.length ? Math.max(...values) : 0;
    if (name === 'COUNT') return values.filter((v) => Number.isFinite(v)).length;
    if (name === 'CONCAT') return args.map((arg) => {
      const addr = parseCellAddress(arg);
      return addr ? readEvaluated(addr.row, addr.col) : arg.replace(/^"|"$/g, '');
    }).join('');
    return '#NAME?';
  }

  try {
    const safe = expr.replace(/([A-Z]+\d+)/gi, (token) => {
      const addr = parseCellAddress(token);
      return addr ? String(toNumber(readEvaluated(addr.row, addr.col))) : token;
    });
    if (!/^[0-9+\-*/(). %]+$/.test(safe)) return '#VALUE!';
    return Function(`"use strict"; return (${safe})`)();
  } catch {
    return '#ERROR!';
  } finally {
    stack.delete(originKey);
  }
}
function displayCellValue(dataRef, row, col) {
  const value = readCell(dataRef, row, col);
  return typeof value === 'string' && value.trim().startsWith('=')
    ? formatFormulaResult(evaluateFormula(value, dataRef, {row, col}))
    : value;
}
function normalizeSelection(a, b) {
  return {r1: Math.min(a.row, b.row), r2: Math.max(a.row, b.row), c1: Math.min(a.col, b.col), c2: Math.max(a.col, b.col)};
}
function makeDimensionHelpers(defaultSize, count, overrides) {
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
  function size(index) { return overrides.get(index) || defaultSize; }
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
function useRafCallback(fn) {
  const fnRef = useRef(fn);
  const frameRef = useRef(0);
  fnRef.current = fn;
  return useCallback((...args) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      fnRef.current(...args);
    });
  }, []);
}
function useElementSize(ref) {
  const [size, setSize] = useState({width: 0, height: 0});
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setSize({width, height});
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const Cell = memo(function Cell({row, col, x, y, width, height, value, rawValue, active, edited, registerCell, onPointerDown, onContextMenu, onDoubleClick}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    registerCell(row, col, {x, y, width, height, el: ref.current});
    return () => registerCell(row, col, null);
  }, [row, col, x, y, width, height, registerCell]);

  const status = String(value).toLowerCase();
  const className = `cell ${active ? 'active-cell' : ''} ${edited ? 'edited-cell' : ''} ${String(rawValue).trim().startsWith('=') ? 'formula-cell' : ''}`;
  return (
    <div
      ref={ref}
      className={className}
      data-row={row}
      data-col={col}
      style={{left: x, top: 0, width, height}}
      onPointerDown={(e) => onPointerDown(e, row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onDoubleClick={(e) => onDoubleClick(e, row, col)}
      title={`${cellAddress(row, col)}: ${rawValue}`}>
      {col === 7 && row > 0 ? <span className={`status-pill status-${status.replace(/\s+/g, '-')}`}>{value}</span> : value}
    </div>
  );
});

const RowFragment = memo(function RowFragment({row, y, height, columns, colMetrics, registerRow, registerCell, activeCell, dataRef, dataVersion, onPointerDown, onContextMenu, onDoubleClick}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    registerRow(row, {y, height, el: ref.current});
    return () => registerRow(row, null);
  }, [row, y, height, registerRow]);

  return (
    <div ref={ref} className="row-fragment" style={{top: y, left: 0, height, width: colMetrics.total()}}>
      {columns.map((col) => {
        const x = colMetrics.offset(col);
        const width = colMetrics.size(col);
        const key = cellKey(row, col);
        const edited = dataRef.current.has(key);
        const rawValue = edited ? dataRef.current.get(key) : defaultCellValue(row, col);
        const value = displayCellValue(dataRef, row, col);
        return (
          <Cell
            key={col}
            row={row}
            col={col}
            x={x}
            y={y}
            width={width}
            height={height}
            value={value}
            rawValue={rawValue}
            active={activeCell.row === row && activeCell.col === col}
            edited={edited}
            registerCell={registerCell}
            onPointerDown={onPointerDown}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
          />
        );
      })}
    </div>
  );
});

function NativeContextMenu({menu, onAction}) {
  if (!menu.open) return null;
  const items = [
    ['edit', '✎', 'Edit cell', 'Enter'],
    ['clear', '⌫', 'Clear contents', 'Del'],
    ['copy', '⧉', 'Copy value', ''],
    ['address', '⌖', 'Copy address', ''],
    ['sep'],
    ['widen', '↔', 'Widen column', '+20'],
    ['taller', '↕', 'Taller row', '+6'],
    ['resetSize', '□', 'Reset row/column size', ''],
    ['sep'],
    ['sample', 'ƒ', 'Set sample formula', ''],
  ];
  return (
    <div className="context-menu open" style={{left: menu.x, top: menu.y}} onPointerDown={(e) => e.preventDefault()}>
      {items.map((item, i) => item[0] === 'sep' ? <div key={`sep-${i}`} className="menu-separator" /> : (
        <button key={item[0]} className="menu-item" onClick={() => onAction(item[0])}>
          <span className="menu-icon">{item[1]}</span><span>{item[2]}</span><span className="menu-shortcut">{item[3]}</span>
        </button>
      ))}
    </div>
  );
}

function FunctionPicker({open, activeAddress, formulaDraft, selection, onPick}) {
  if (!open) return null;
  const range = selection ? `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}` : activeAddress;
  return (
    <Card className="formula-popover" padding={3} variant="default">
      <Heading level={3}>Insert function</Heading>
      <Text type="supporting" display="block">Writes a formula into {activeAddress} using current selection.</Text>
      <div className="function-grid">
        {['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].map((name) => (
          <Button key={name} label={name} variant="secondary" size="sm" onClick={() => onPick(name)} endContent={<Text type="supporting">{range}</Text>} />
        ))}
        <Button label="A1+B1" variant="secondary" size="sm" onClick={() => onPick('ARITH')} endContent={<Text type="supporting">arithmetic</Text>} />
      </div>
      <div className="formula-preview">Preview: {formulaDraft || '=SUM(A1:B2)'}</div>
    </Card>
  );
}

function InspectorPanel({view, activeCell, selection, rowOverrides, colOverrides, cellMetaRef, rowMetaRef, edits, fps, dataRef}) {
  const selectedText = selection ? `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}` : 'none';
  const visibleCells = Math.max(0, (view.rowEnd - view.rowStart + 1) * (view.colEnd - view.colStart + 1));
  const activeRaw = readCell(dataRef, activeCell.row, activeCell.col);
  const activeDisplay = displayCellValue(dataRef, activeCell.row, activeCell.col);
  const metricsRows = [
    {id: 'mounted', metric: 'Mounted cells', value: visibleCells.toLocaleString(), status: 'Live'},
    {id: 'total', metric: 'Logical cells', value: (ROWS * COLS).toLocaleString(), status: 'Virtual'},
    {id: 'edits', metric: 'Edited cells', value: String(edits), status: 'Sparse'},
    {id: 'rows', metric: 'Custom rows', value: String(rowOverrides.size), status: 'Map'},
    {id: 'cols', metric: 'Custom columns', value: String(colOverrides.size), status: 'Map'},
    {id: 'fps', metric: 'Approx FPS', value: String(fps), status: 'rAF'},
  ];
  const columns = [
    {key: 'metric', header: 'Metric', width: proportional(1)},
    {key: 'value', header: 'Value', align: 'end', width: pixel(92)},
    {key: 'status', header: 'Mode', align: 'center', width: pixel(88), renderCell: (item) => <Badge variant={item.status === 'Live' ? 'success' : item.status === 'Virtual' ? 'purple' : 'blue'} label={item.status} />},
  ];
  return (
    <Card className="side-panel" padding={4}>
      <div className="panel-header">
        <div>
          <Heading level={2}>Workbook internals</Heading>
          <Text type="supporting" display="block">Powered by Astryx primitives + ref-first hot paths.</Text>
        </div>
        <StatusDot variant="success" label="Live" isPulsing />
      </div>
      <div className="active-card">
        <Text type="label" display="block">{cellAddress(activeCell.row, activeCell.col)}</Text>
        <Text type="supporting" display="block" maxLines={1}>Raw: {String(activeRaw)}</Text>
        <Text type="supporting" display="block" maxLines={1}>Display: {String(activeDisplay)}</Text>
      </div>
      <ProgressBar value={Math.min(100, visibleCells / 8)} label="Viewport budget" hasValueLabel variant="accent" />
      <Table data={metricsRows} columns={columns} idKey="id" density="compact" dividers="rows" hasHover textOverflow="truncate" />
      <div className="checklist">
        <div className="check"><StatusDot variant="accent" label="Selection" /><span><b>Selection</b><br />{selectedText}</span></div>
        <div className="check"><StatusDot variant="success" label="Geometry" /><span><b>Effect geometry</b><br />Rows tracked: {rowMetaRef.current.size}; cells tracked: {cellMetaRef.current.size}.</span></div>
        <div className="check"><StatusDot variant="warning" label="Render split" /><span><b>Render loop split</b><br />Scroll transforms headers immediately; React updates visible range on rAF.</span></div>
      </div>
      <pre className="mini-code">{`Mutable refs:
cellDataRef      -> Map<"row:col", value>
rowHeightsRef    -> Map<row, px>
colWidthsRef     -> Map<col, px>
rowMetaRef       -> Map<row, { y, h }>
cellMetaRef      -> Map<"r:c", { x, y, w, h }>
selectionRef     -> anchor + live extent

Hot paths:
- drag selection draws a DOM overlay
- scroll moves headers via transform
- resize writes sparse maps, then rAF renders`}</pre>
    </Card>
  );
}

function Spreadsheet() {
  const viewportRef = useRef(null);
  const headerLayerRef = useRef(null);
  const rowLayerRef = useRef(null);
  const selectionOverlayRef = useRef(null);
  const resizeGuideRef = useRef(null);
  const editorRef = useRef(null);
  const toast = useToast();

  const cellMetaRef = useRef(new Map());
  const rowMetaRef = useRef(new Map());
  const cellDataRef = useRef(new Map([
    [cellKey(1, 1), '1280'],
    [cellKey(1, 5), '=SUM(B2:E2)'],
    [cellKey(3, 7), 'Needs review'],
  ]));
  const scrollRef = useRef({left: 0, top: 0});
  const rowHeightsRef = useRef(new Map([[0, 34], [2, 38], [7, 44], [23, 42]]));
  const colWidthsRef = useRef(new Map([[0, 148], [5, 136], [6, 126], [7, 122], [8, 126]]));
  const selectionRef = useRef({dragging: false, anchor: {row: 0, col: 0}, extent: {row: 0, col: 0}});
  const resizeRef = useRef(null);
  const frameCounterRef = useRef({frames: 0, last: performance.now()});

  const [dimensionVersion, setDimensionVersion] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [view, setView] = useState({rowStart: 0, rowEnd: 40, colStart: 0, colEnd: 15});
  const [activeCell, setActiveCell] = useState({row: 1, col: 1});
  const [committedSelection, setCommittedSelection] = useState(normalizeSelection({row: 1, col: 1}, {row: 1, col: 1}));
  const [formulaDraft, setFormulaDraft] = useState(() => readCell(cellDataRef, 1, 1));
  const [editor, setEditor] = useState(null);
  const [menu, setMenu] = useState({open: false, x: 0, y: 0, row: 0, col: 0});
  const [formulaPickerOpen, setFormulaPickerOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [darkMode, setDarkMode] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [compactRows, setCompactRows] = useState(false);
  const [highContrastSelection, setHighContrastSelection] = useState(false);
  const size = useElementSize(viewportRef);

  const rowOverrides = rowHeightsRef.current;
  const colOverrides = colWidthsRef.current;
  const effectiveRowHeight = compactRows ? 24 : DEFAULT_ROW_HEIGHT;
  const rowMetrics = useMemo(() => makeDimensionHelpers(effectiveRowHeight, ROWS, rowOverrides), [dimensionVersion, effectiveRowHeight]);
  const colMetrics = useMemo(() => makeDimensionHelpers(DEFAULT_COL_WIDTH, COLS, colOverrides), [dimensionVersion]);

  const showToast = useCallback((message, type = 'info') => toast({body: message, type, isAutoHide: true}), [toast]);
  const setCell = useCallback((row, col, value) => {
    const key = cellKey(row, col);
    if (value === defaultCellValue(row, col)) cellDataRef.current.delete(key);
    else cellDataRef.current.set(key, value);
    setDataVersion((v) => v + 1);
  }, []);
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
      rowStart: Math.max(0, rowMetrics.indexAt(top) - OVERSCAN_ROWS),
      rowEnd: Math.min(ROWS - 1, rowMetrics.indexAt(top + height) + OVERSCAN_ROWS),
      colStart: Math.max(0, colMetrics.indexAt(left) - OVERSCAN_COLS),
      colEnd: Math.min(COLS - 1, colMetrics.indexAt(left + width) + OVERSCAN_COLS),
    });
  }, [rowMetrics, colMetrics, size.width, size.height]);
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
    const point = {row, col};
    selectionRef.current = {dragging: false, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, row, col));
    scheduleDrawSelection();
  }, [scheduleDrawSelection]);
  const openEditor = useCallback((row, col, seed) => {
    setEditor({row, col, value: seed ?? readCell(cellDataRef, row, col)});
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
  }, []);
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
    for (let r = selection.r1; r <= selection.r2; r++) for (let c = selection.c1; c <= selection.c2; c++) cellDataRef.current.set(cellKey(r, c), '');
    setDataVersion((v) => v + 1);
    if (activeCell.row >= selection.r1 && activeCell.row <= selection.r2 && activeCell.col >= selection.c1 && activeCell.col <= selection.c2) setFormulaDraft('');
    showToast(`Cleared ${count.toLocaleString()} cell${count === 1 ? '' : 's'}`);
  }, [committedSelection, activeCell, showToast]);

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
            guide.style.left = `${SIDEBAR_WIDTH + colMetrics.offset(r.index) + next - scrollRef.current.left}px`;
          }
        } else {
          const next = Math.max(22, r.startSize + (event.clientY - r.startY));
          rowHeightsRef.current.set(r.index, next);
          const guide = resizeGuideRef.current;
          if (guide) {
            guide.className = 'resize-guide row';
            guide.style.display = 'block';
            guide.style.top = `${HEADER_HEIGHT + rowMetrics.offset(r.index) + next - scrollRef.current.top}px`;
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
        resizeRef.current = null;
        if (resizeGuideRef.current) resizeGuideRef.current.style.display = 'none';
        setDimensionVersion((v) => v + 1);
      }
    };
    window.addEventListener('pointermove', onPointerMove, {passive: true});
    window.addEventListener('pointerup', onPointerUp);
    return () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); };
  }, [rowMetrics, colMetrics, scheduleDrawSelection, scheduleDimensionRender]);
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
      if (event.key === 'Enter') { event.preventDefault(); openEditor(activeCell.row, activeCell.col); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); clearSelection(); }
      else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); openEditor(activeCell.row, activeCell.col, event.key); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCell, editor, openEditor, clearSelection]);

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
    const point = {row, col};
    selectionRef.current = {dragging: true, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, row, col));
    setEditor(null);
    setMenu((m) => ({...m, open: false}));
    setFormulaPickerOpen(false);
    scheduleDrawSelection();
  }, [scheduleDrawSelection]);
  const openContextMenu = useCallback((event, row, col) => {
    event.preventDefault(); event.stopPropagation();
    const point = {row, col};
    selectionRef.current = {dragging: false, anchor: point, extent: point};
    setActiveCell(point);
    setCommittedSelection(normalizeSelection(point, point));
    setFormulaDraft(readCell(cellDataRef, row, col));
    scheduleDrawSelection();
    const x = Math.min(event.clientX, window.innerWidth - 228);
    const y = Math.min(event.clientY, window.innerHeight - 310);
    setMenu({open: true, x: Math.max(4, x), y: Math.max(4, y), row, col});
  }, [scheduleDrawSelection]);
  const onViewportContextMenu = useCallback((event) => {
    if (event.target?.classList?.contains('cell')) return;
    const rect = viewportRef.current.getBoundingClientRect();
    openContextMenu(event, rowMetrics.indexAt(event.clientY - rect.top + scrollRef.current.top), colMetrics.indexAt(event.clientX - rect.left + scrollRef.current.left));
  }, [rowMetrics, colMetrics, openContextMenu]);
  const beginColResize = useCallback((event, col) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'col', index: col, startX: event.clientX, startSize: colMetrics.size(col)}; }, [colMetrics]);
  const beginRowResize = useCallback((event, row) => { event.preventDefault(); event.stopPropagation(); resizeRef.current = {kind: 'row', index: row, startY: event.clientY, startSize: rowMetrics.size(row)}; }, [rowMetrics]);
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
    if (action === 'clear') { cellDataRef.current.set(cellKey(row, col), ''); setDataVersion((v) => v + 1); if (activeCell.row === row && activeCell.col === col) setFormulaDraft(''); showToast(`Cleared ${cellAddress(row, col)}`); }
    if (action === 'copy') navigator.clipboard?.writeText(readCell(cellDataRef, row, col)).then(() => showToast('Copied value'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'address') navigator.clipboard?.writeText(cellAddress(row, col)).then(() => showToast('Copied address'), () => showToast('Clipboard blocked', 'error'));
    if (action === 'widen') { colWidthsRef.current.set(col, colMetrics.size(col) + 20); setDimensionVersion((v) => v + 1); }
    if (action === 'taller') { rowHeightsRef.current.set(row, rowMetrics.size(row) + 6); setDimensionVersion((v) => v + 1); }
    if (action === 'resetSize') { colWidthsRef.current.delete(col); rowHeightsRef.current.delete(row); setDimensionVersion((v) => v + 1); }
    if (action === 'sample') { const value = `=SUM(B${row + 1}:E${row + 1})`; setCell(row, col, value); if (activeCell.row === row && activeCell.col === col) setFormulaDraft(value); showToast(`Formula set in ${cellAddress(row, col)}`); }
    setMenu((m) => ({...m, open: false}));
  }, [menu, openEditor, activeCell, showToast, colMetrics, rowMetrics, setCell]);

  const rows = useMemo(() => Array.from({length: view.rowEnd - view.rowStart + 1}, (_, i) => view.rowStart + i), [view.rowStart, view.rowEnd]);
  const columns = useMemo(() => Array.from({length: view.colEnd - view.colStart + 1}, (_, i) => view.colStart + i), [view.colStart, view.colEnd]);
  const totalWidth = colMetrics.total();
  const totalHeight = rowMetrics.total();
  const activeAddress = cellAddress(activeCell.row, activeCell.col);
  const editorStyle = editor ? {left: colMetrics.offset(editor.col), top: rowMetrics.offset(editor.row), width: colMetrics.size(editor.col), height: rowMetrics.size(editor.row)} : {};

  return (
    <Theme theme={y2kTheme} mode={darkMode ? 'dark' : 'light'}>
      <div className={`app ${showInspector ? '' : 'hide-inspector'} ${highContrastSelection ? 'high-contrast-selection' : ''}`} data-theme={darkMode ? 'dark' : 'light'} data-astryx-theme="y2k">
        <header className="topbar">
          <div className="brand-mark">✣</div>
          <div className="title">
            <Heading level={1}>Astryx Sheet</Heading>
            <Text type="supporting" display="block">Agent-ready virtual spreadsheet artifact</Text>
          </div>
          <div className="formula-wrap">
            <Badge variant="purple" label={activeAddress} />
            <Tooltip content="Insert a formula from the current selection"><Button label="fx" variant="secondary" size="sm" onClick={() => setFormulaPickerOpen((v) => !v)} /></Tooltip>
            <TextInput
              label="Formula bar"
              isLabelHidden
              value={formulaDraft}
              onChange={setFormulaDraft}
              onEnter={commitFormula}
              onKeyDown={(e) => { if (e.key === 'Escape') setFormulaDraft(readCell(cellDataRef, activeCell.row, activeCell.col)); }}
              onBlur={commitFormula}
              width="100%"
            />
          </div>
          <div className="stats">
            <Token color="purple" label={`${ROWS.toLocaleString()} rows`} />
            <Token color="blue" label={`${COLS.toLocaleString()} cols`} />
            <Token color="green" label={`${(rows.length * columns.length).toLocaleString()} mounted`} />
          </div>
          <div className="ribbon-tools">
            <Button label="Edit cell" variant="secondary" size="sm" onClick={() => openEditor(activeCell.row, activeCell.col)} />
            <Button label="Clear" variant="secondary" size="sm" onClick={clearSelection} />
            <Button label="Widen column" variant="secondary" size="sm" onClick={() => { colWidthsRef.current.set(activeCell.col, colMetrics.size(activeCell.col) + 20); setDimensionVersion((v) => v + 1); }} />
            <Button label="Taller row" variant="secondary" size="sm" onClick={() => { rowHeightsRef.current.set(activeCell.row, rowMetrics.size(activeCell.row) + 6); setDimensionVersion((v) => v + 1); }} />
            <span className="toolbar-spacer" />
            <div className="options-group" aria-label="Demo options">
              <Switch label="Dark" value={darkMode} onChange={setDarkMode} labelPosition="start" />
              <Switch label="Inspector" value={showInspector} onChange={setShowInspector} labelPosition="start" />
              <Switch label="Compact rows" value={compactRows} onChange={setCompactRows} labelPosition="start" />
              <Switch label="High contrast" value={highContrastSelection} onChange={setHighContrastSelection} labelPosition="start" />
            </div>
            <div className="kbd-hint"><Kbd keys="enter" /> edit <Kbd keys="backspace" /> clear</div>
          </div>
        </header>
        <FunctionPicker open={formulaPickerOpen} activeAddress={activeAddress} formulaDraft={formulaDraft} selection={committedSelection} onPick={insertFunction} />
        <main className="stage">
          <Card className="sheet-shell" padding={0}>
            <div className="corner">✣</div>
            <div className="column-header"><div className="header-layer" ref={headerLayerRef} style={{width: totalWidth, height: HEADER_HEIGHT}}>
              {columns.map((col) => {
                const inSelection = committedSelection && col >= committedSelection.c1 && col <= committedSelection.c2;
                return <div key={col} className={`col-head-cell ${inSelection ? 'selected' : ''}`} style={{left: colMetrics.offset(col), width: colMetrics.size(col)}}>{columnName(col)}<span className="resize-col" onPointerDown={(e) => beginColResize(e, col)} /></div>;
              })}
            </div></div>
            <div className="row-header"><div className="row-layer" ref={rowLayerRef} style={{height: totalHeight, width: SIDEBAR_WIDTH}}>
              {rows.map((row) => {
                const inSelection = committedSelection && row >= committedSelection.r1 && row <= committedSelection.r2;
                return <div key={row} className={`row-head-cell ${inSelection ? 'selected' : ''}`} style={{top: rowMetrics.offset(row), height: rowMetrics.size(row)}}>{row + 1}<span className="resize-row" onPointerDown={(e) => beginRowResize(e, row)} /></div>;
              })}
            </div></div>
            <div className="viewport" ref={viewportRef} onScroll={onScroll} onContextMenu={onViewportContextMenu} tabIndex={0}>
              <div className="spacer" style={{width: totalWidth, height: totalHeight}}>
                <div className="cell-layer" style={{width: totalWidth, height: totalHeight}}>
                  {rows.map((row) => <RowFragment key={row} row={row} y={rowMetrics.offset(row)} height={rowMetrics.size(row)} columns={columns} colMetrics={colMetrics} registerRow={registerRow} registerCell={registerCell} activeCell={activeCell} dataRef={cellDataRef} dataVersion={dataVersion} onPointerDown={onCellPointerDown} onContextMenu={openContextMenu} onDoubleClick={(e, r, c) => { e.preventDefault(); selectCell(r, c); openEditor(r, c); }} />)}
                </div>
                <div ref={selectionOverlayRef} className="selection-overlay"><div className="fill-handle" /></div>
                {editor && <input ref={editorRef} className="cell-input" style={editorStyle} value={editor.value} onChange={(e) => setEditor((ed) => ({...ed, value: e.target.value}))} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') commitEditor(e.currentTarget.value); if (e.key === 'Escape') setEditor(null); }} onBlur={(e) => commitEditor(e.currentTarget.value)} />}
              </div>
            </div>
            <div ref={resizeGuideRef} className="resize-guide col" />
          </Card>
          {showInspector && <InspectorPanel view={view} activeCell={activeCell} selection={committedSelection} rowOverrides={rowOverrides} colOverrides={colOverrides} cellMetaRef={cellMetaRef} rowMetaRef={rowMetaRef} edits={cellDataRef.current.size} fps={fps} dataRef={cellDataRef} />}
        </main>
        <NativeContextMenu menu={menu} onAction={handleMenuAction} />
      </div>
    </Theme>
  );
}

createRoot(document.getElementById('root')).render(<Spreadsheet />);
