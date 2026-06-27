import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

let viteServer;
let uiModulesPromise;

async function loadUiModules() {
  if (!uiModulesPromise) {
    uiModulesPromise = (async () => {
      viteServer = await createServer({
        configFile: 'vite.config.mjs',
        appType: 'custom',
        server: {middlewareMode: true},
        logLevel: 'error',
      });
      const [
        toolbarModule,
        pickerModule,
        contextMenuModule,
        sheetTabsModule,
        cellModule,
        spreadsheetModule,
        formulaEditorModule,
      ] = await Promise.all([
        viteServer.ssrLoadModule('/src/spreadsheet/components/SpreadsheetToolbar.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/components/FunctionPicker.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/components/NativeContextMenu.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/components/SheetTabs.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/components/Cell.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/Spreadsheet.jsx'),
        viteServer.ssrLoadModule('/src/spreadsheet/components/FormulaEditor.jsx'),
      ]);
      return {
        SpreadsheetToolbar: toolbarModule.SpreadsheetToolbar,
        FunctionPicker: pickerModule.FunctionPicker,
        NativeContextMenu: contextMenuModule.NativeContextMenu,
        SheetTabs: sheetTabsModule.SheetTabs,
        Cell: cellModule.Cell,
        Spreadsheet: spreadsheetModule.Spreadsheet,
        FormulaEditor: formulaEditorModule.FormulaEditor,
      };
    })();
  }
  return uiModulesPromise;
}

test.after(async () => {
  await viteServer?.close();
});

function walkElements(node, visitor) {
  if (node == null || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    node.forEach((child) => walkElements(child, visitor));
    return;
  }
  if (!React.isValidElement(node)) return;
  visitor(node);
  React.Children.toArray(node.props.children).forEach((child) => walkElements(child, visitor));
}

function collectElements(node, predicate) {
  const matches = [];
  walkElements(node, (element) => {
    if (predicate(element)) matches.push(element);
  });
  return matches;
}

function toolbarProps(overrides = {}) {
  const handlerNames = [
    'onFormulaChange',
    'onFormulaCommit',
    'onFormulaReset',
    'onToggleFunctionPicker',
    'onFormulaFocusChange',
    'onFormulaCursorChange',
    'onUndo',
    'onRedo',
    'onCopySelection',
    'onPasteClipboard',
    'onEditActiveCell',
    'onClearSelection',
    'onFormatNumber',
    'onFormatCurrency',
    'onFormatPercent',
    'onFormatDate',
    'onStyleBold',
    'onStyleBorder',
    'onStyleFill',
    'onStyleText',
    'onSortAscending',
    'onSortDescending',
    'onFilterSelection',
    'onClearFilter',
    'onMergeSelection',
    'onUnmergeSelection',
    'onValidateNumber',
    'onValidateList',
    'onClearValidation',
    'onHighlightGreaterThan',
    'onHighlightTextContains',
    'onClearConditionalFormat',
    'onNameSelection',
    'onRemoveNamedRange',
    'onWidenActiveColumn',
    'onTallerActiveRow',
    'onThemeNameChange',
    'onDarkModeChange',
    'onCompactRowsChange',
    'onHighContrastSelectionChange',
  ];
  const calls = [];
  const handlers = Object.fromEntries(handlerNames.map((name) => [name, (...args) => calls.push({name, args})]));
  return {
    props: {
      title: 'Astryx Sheet',
      subtitle: 'UI test',
      activeAddress: 'B2',
      formulaDraft: '=SUM(A1:A3)',
      formulaPreview: {displayValue: '6', diagnostics: []},
      formulaCursorPosition: 4,
      formulaContext: {range: 'A1:B2', firstCell: 'A1', lastCell: 'B2'},
      rowCount: 100,
      colCount: 26,
      mountedCount: 40,
      canUndo: true,
      canRedo: true,
      themeName: 'neutral',
      darkMode: false,
      activeTheme: {forceDark: false},
      compactRows: false,
      highContrastSelection: false,
      showStats: true,
      showThemeControls: true,
      showKeyboardHints: true,
      ...handlers,
      ...overrides,
    },
    calls,
    handlers,
  };
}

const toolbarCommandCallbacks = Object.freeze([
  'onUndo',
  'onRedo',
  'onCopySelection',
  'onPasteClipboard',
  'onEditActiveCell',
  'onClearSelection',
  'onFormatNumber',
  'onFormatCurrency',
  'onFormatPercent',
  'onFormatDate',
  'onStyleBold',
  'onStyleBorder',
  'onStyleFill',
  'onStyleText',
  'onSortAscending',
  'onSortDescending',
  'onFilterSelection',
  'onClearFilter',
  'onMergeSelection',
  'onUnmergeSelection',
  'onValidateNumber',
  'onValidateList',
  'onClearValidation',
  'onHighlightGreaterThan',
  'onHighlightTextContains',
  'onClearConditionalFormat',
  'onNameSelection',
  'onRemoveNamedRange',
  'onWidenActiveColumn',
  'onTallerActiveRow',
]);

const contextMenuActions = Object.freeze([
  'edit',
  'clear',
  'copy',
  'address',
  'link',
  'openLink',
  'clearLink',
  'note',
  'clearNote',
  'fillDown',
  'fillRight',
  'widen',
  'taller',
  'resetSize',
  'insertRowAbove',
  'insertRowBelow',
  'deleteRow',
  'insertColumnLeft',
  'insertColumnRight',
  'deleteColumn',
  'sample',
]);

test('spreadsheet toolbar command buttons are wired to their callbacks', async () => {
  const {SpreadsheetToolbar} = await loadUiModules();
  const {props, calls, handlers} = toolbarProps();
  const toolbar = SpreadsheetToolbar(props);
  const buttons = collectElements(toolbar, (element) => element.type?.name === 'RibbonButton');
  const byLabel = new Map(buttons.map((button) => [button.props.label, button]));
  const expected = new Map([
    ['Paste', 'onPasteClipboard'],
    ['Copy', 'onCopySelection'],
    ['Undo', 'onUndo'],
    ['Redo', 'onRedo'],
    ['Edit', 'onEditActiveCell'],
    ['Clear', 'onClearSelection'],
    ['Number', 'onFormatNumber'],
    ['Currency', 'onFormatCurrency'],
    ['Percent', 'onFormatPercent'],
    ['Date', 'onFormatDate'],
    ['Bold', 'onStyleBold'],
    ['Border', 'onStyleBorder'],
    ['Fill', 'onStyleFill'],
    ['Text color', 'onStyleText'],
    ['Sort A-Z', 'onSortAscending'],
    ['Sort Z-A', 'onSortDescending'],
    ['Filter', 'onFilterSelection'],
    ['Clear filter', 'onClearFilter'],
    ['Merge', 'onMergeSelection'],
    ['Unmerge', 'onUnmergeSelection'],
    ['Widen column', 'onWidenActiveColumn'],
    ['Taller row', 'onTallerActiveRow'],
    ['Number rule', 'onValidateNumber'],
    ['List rule', 'onValidateList'],
    ['Clear rule', 'onClearValidation'],
    ['Highlight greater than', 'onHighlightGreaterThan'],
    ['Highlight text', 'onHighlightTextContains'],
    ['Clear highlight', 'onClearConditionalFormat'],
    ['Name', 'onNameSelection'],
    ['Remove name', 'onRemoveNamedRange'],
  ]);

  assert.equal(buttons.length, expected.size);
  for (const [label, handlerName] of expected) {
    const button = byLabel.get(label);
    assert.ok(button, `${label} button should render`);
    assert.equal(button.props.onClick, handlers[handlerName], `${label} should use ${handlerName}`);
    const hostButton = button.type(button.props);
    assert.equal(hostButton.type, 'button');
    assert.equal(hostButton.props['aria-label'], label);
    assert.equal(hostButton.props.onClick, handlers[handlerName]);
    hostButton.props.onClick();
  }
  assert.deepEqual(calls.map((call) => call.name), [...expected.values()]);
});

test('top-level spreadsheet shell renders toolbar, formula bar, grid, and sheet tabs together', async () => {
  const {Spreadsheet} = await loadUiModules();
  const html = renderToStaticMarkup(React.createElement(Spreadsheet, {
    title: 'Wiring Sheet',
    subtitle: 'SSR smoke',
    withTheme: false,
    showToolbar: true,
    showThemeControls: false,
    showKeyboardHints: false,
    gridConfig: {rows: 6, cols: 6, overscanRows: 1, overscanCols: 1},
    initialCells: {
      '1:1': {value: '42'},
      '1:2': {formula: '=B2*2'},
    },
  }));

  assert.match(html, /Wiring Sheet/);
  assert.match(html, /Spreadsheet commands/);
  assert.match(html, /excel-formula-bar/);
  assert.match(html, /Formula for B2/);
  assert.match(html, /Workbook sheets/);
  assert.match(html, /Sheet1/);
  assert.match(html, /42/);
  assert.match(html, /84/);
  assert.match(html, /class="cell /);
});

test('spreadsheet shell keeps toolbar and context-menu action contracts implemented', async () => {
  const spreadsheetSource = await readFile(new URL('../src/spreadsheet/Spreadsheet.jsx', import.meta.url), 'utf8');
  const toolbarSource = await readFile(new URL('../src/spreadsheet/components/SpreadsheetToolbar.jsx', import.meta.url), 'utf8');
  const contextMenuSource = await readFile(new URL('../src/spreadsheet/components/NativeContextMenu.jsx', import.meta.url), 'utf8');

  const toolbarUsage = spreadsheetSource.slice(spreadsheetSource.indexOf('<SpreadsheetToolbar'), spreadsheetSource.indexOf('/>', spreadsheetSource.indexOf('<SpreadsheetToolbar')));
  for (const callbackName of toolbarCommandCallbacks) {
    assert.match(toolbarSource, new RegExp(`\\b${callbackName}\\b`), `${callbackName} should be accepted by SpreadsheetToolbar`);
    assert.match(toolbarUsage, new RegExp(`\\b${callbackName}=`), `${callbackName} should be supplied by Spreadsheet`);
  }

  const menuUsage = spreadsheetSource.slice(spreadsheetSource.indexOf('const handleMenuAction'), spreadsheetSource.indexOf('const rows = useMemo', spreadsheetSource.indexOf('const handleMenuAction')));
  for (const action of contextMenuActions) {
    assert.match(contextMenuSource, new RegExp(`['"]${action}['"]`), `${action} should be exposed by NativeContextMenu`);
    assert.match(menuUsage, new RegExp(`action === ['"]${action}['"]`), `${action} should be handled by Spreadsheet`);
  }
  assert.match(spreadsheetSource, /<NativeContextMenu menu=\{menu\} onAction=\{handleMenuAction\}/);
});

test('spreadsheet toolbar forwards formula editor and view controls', async () => {
  const {SpreadsheetToolbar} = await loadUiModules();
  const {props, handlers} = toolbarProps({activeTheme: {forceDark: true}, canUndo: false, canRedo: false});
  const toolbar = SpreadsheetToolbar(props);
  const formulaEditor = collectElements(toolbar, (element) => element.type?.name === 'FormulaEditor')[0];
  assert.ok(formulaEditor);
  assert.equal(formulaEditor.props.activeAddress, 'B2');
  assert.equal(formulaEditor.props.formulaDraft, '=SUM(A1:A3)');
  assert.equal(formulaEditor.props.onFormulaChange, handlers.onFormulaChange);
  assert.equal(formulaEditor.props.onFormulaCommit, handlers.onFormulaCommit);
  assert.equal(formulaEditor.props.onFormulaReset, handlers.onFormulaReset);
  assert.equal(formulaEditor.props.onToggleFunctionPicker, handlers.onToggleFunctionPicker);
  assert.equal(formulaEditor.props.onFormulaFocusChange, handlers.onFormulaFocusChange);
  assert.equal(formulaEditor.props.onFormulaCursorChange, handlers.onFormulaCursorChange);

  const ribbonButtons = collectElements(toolbar, (element) => element.type?.name === 'RibbonButton');
  const undo = ribbonButtons.find((button) => button.props.label === 'Undo');
  const redo = ribbonButtons.find((button) => button.props.label === 'Redo');
  assert.equal(undo.type(undo.props).props.disabled, true);
  assert.equal(redo.type(redo.props).props.disabled, true);

  const themeSelector = collectElements(toolbar, (element) => element.props?.label === 'Theme' && element.props?.options)[0];
  assert.ok(themeSelector);
  assert.equal(themeSelector.props.value, 'neutral');
  assert.equal(themeSelector.props.onChange, handlers.onThemeNameChange);

  const switches = collectElements(toolbar, (element) => element.props?.labelPosition === 'start');
  assert.equal(switches.length, 3);
  assert.equal(switches[0].props.value, false);
  assert.equal(switches[0].props.onChange, handlers.onDarkModeChange);
  assert.equal(switches[0].props.isDisabled, true);
  assert.equal(switches[1].props.onChange, handlers.onCompactRowsChange);
  assert.equal(switches[2].props.onChange, handlers.onHighContrastSelectionChange);
});

test('formula editor renders spreadsheet edit controls and keeps callback contract wired', async () => {
  const {FormulaEditor} = await loadUiModules();
  const html = renderToStaticMarkup(React.createElement(FormulaEditor, {
    activeAddress: 'C3',
    formulaDraft: '=SUM(A1:A3)',
    formulaPreview: {displayValue: '6', diagnostics: []},
    formulaCursorPosition: 4,
    formulaContext: {range: 'A1:A3', firstCell: 'A1', lastCell: 'A3'},
    onFormulaChange: () => {},
    onFormulaCommit: () => {},
    onFormulaReset: () => {},
    onToggleFunctionPicker: () => {},
    onFormulaFocusChange: () => {},
    onFormulaCursorChange: () => {},
  }));
  assert.match(html, /excel-formula-bar/);
  assert.match(html, /Name box/);
  assert.match(html, /C3/);
  assert.match(html, /Cancel formula edit/);
  assert.match(html, /Accept formula edit/);
  assert.match(html, /Insert function/);
  assert.match(html, /Formula for C3/);

  const source = await readFile(new URL('../src/spreadsheet/components/FormulaEditor.jsx', import.meta.url), 'utf8');
  assert.match(source, /aria-label="Cancel formula edit"[\s\S]*?onClick=\{onFormulaReset\}/);
  assert.match(source, /aria-label="Accept formula edit"[\s\S]*?onClick=\{onFormulaCommit\}/);
  assert.match(source, /aria-label="Insert function"[\s\S]*?onClick=\{onToggleFunctionPicker\}/);
  assert.match(source, /onFocus=\{\(event\) => \{[\s\S]*?onFormulaFocusChange\?\.\(true\)/);
  assert.match(source, /onBlur=\{\(\) => \{[\s\S]*?onFormulaFocusChange\?\.\(false\); onFormulaCommit\(\)/);
  assert.match(source, /onChange=\{\(event\) => \{[\s\S]*?onFormulaChange\(event\.target\.value\)/);
  assert.match(source, /event\.key === 'F4'[\s\S]*?cycleActiveReference\(\)/);
  assert.match(source, /pickSuggestion\(activeSuggestion\)/);
  assert.match(source, /applyDiagnosticSuggestion\(diagnostic\)/);
});

test('function picker exposes draft, insert, search, category, and close wiring', async () => {
  const {FunctionPicker} = await loadUiModules();
  const html = renderToStaticMarkup(React.createElement(FunctionPicker, {
    open: true,
    activeAddress: 'D4',
    formulaDraft: '=',
    selection: {r1: 0, c1: 0, r2: 4, c2: 2},
    onPick: () => {},
    onDraft: () => {},
    onClose: () => {},
  }));
  assert.match(html, /Close functions/);
  assert.match(html, /Search functions/);
  assert.match(html, /Function categories/);
  assert.match(html, /Functions/);
  assert.match(html, /A1:C5/);
  assert.match(html, /Insert SUM/);

  const source = await readFile(new URL('../src/spreadsheet/components/FunctionPicker.jsx', import.meta.url), 'utf8');
  assert.match(source, /aria-label="Close functions" onClick=\{onClose\}/);
  assert.match(source, /onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/);
  assert.match(source, /onClick=\{\(\) => setCategory\(item\)\}/);
  assert.match(source, /onMouseEnter=\{\(\) => setSelectedName\(item\.name\)\}/);
  assert.match(source, /onFocus=\{\(\) => setSelectedName\(item\.name\)\}/);
  assert.match(source, /onClick=\{\(\) => onDraft\?\.\(item\.name\)\}/);
  assert.match(source, /onClick=\{\(\) => onDraft\?\.\('ARITH'\)\}/);
  assert.match(source, /onClick=\{\(\) => onPick\(activeHelp\.name\)\}/);
});

test('native context menu exposes every spreadsheet action', async () => {
  const {NativeContextMenu} = await loadUiModules();
  assert.equal(NativeContextMenu({menu: {open: false}, onAction: () => {}}), null);
  const actions = [];
  const menu = NativeContextMenu({
    menu: {open: true, x: 12, y: 24},
    onAction: (action) => actions.push(action),
  });
  const pointerCalls = [];
  menu.props.onPointerDown({
    preventDefault: () => pointerCalls.push('preventDefault'),
    stopPropagation: () => pointerCalls.push('stopPropagation'),
  });
  assert.deepEqual(pointerCalls, ['preventDefault', 'stopPropagation']);
  const buttons = collectElements(menu, (element) => element.type === 'button');
  const expectedActions = [
    'edit',
    'clear',
    'copy',
    'address',
    'link',
    'openLink',
    'clearLink',
    'note',
    'clearNote',
    'fillDown',
    'fillRight',
    'widen',
    'taller',
    'resetSize',
    'insertRowAbove',
    'insertRowBelow',
    'deleteRow',
    'insertColumnLeft',
    'insertColumnRight',
    'deleteColumn',
    'sample',
  ];
  assert.equal(buttons.length, expectedActions.length);
  buttons.forEach((button) => button.props.onClick());
  assert.deepEqual(actions, expectedActions);
});

test('sheet tabs activate and expose workbook sheet actions', async () => {
  const {SheetTabs} = await loadUiModules();
  const workbook = {
    sheetOrder: ['sheet-1', 'sheet-2'],
    sheets: new Map([
      ['sheet-1', {id: 'sheet-1', name: 'Inputs'}],
      ['sheet-2', {id: 'sheet-2', name: 'Model'}],
    ]),
  };
  const calls = [];
  const tabs = SheetTabs({
    workbook,
    activeSheetId: 'sheet-1',
    onActivateSheet: (sheetId) => calls.push(['activate', sheetId]),
    onAddSheet: () => calls.push(['add']),
    onRenameActiveSheet: () => calls.push(['rename']),
    onRemoveActiveSheet: () => calls.push(['remove']),
  });
  const tabButtons = collectElements(tabs, (element) => element.type === 'button' && element.props.role === 'tab');
  assert.deepEqual(tabButtons.map((button) => button.props.title), ['Inputs', 'Model']);
  assert.equal(tabButtons[0].props['aria-selected'], true);
  assert.equal(tabButtons[1].props['aria-selected'], false);
  tabButtons[1].props.onClick();

  const addButton = collectElements(tabs, (element) => element.props?.['aria-label'] === 'Add sheet')[0];
  const renameButton = collectElements(tabs, (element) => element.props?.['aria-label'] === 'Rename active sheet')[0];
  const removeButton = collectElements(tabs, (element) => element.props?.['aria-label'] === 'Remove active sheet')[0];
  assert.equal(removeButton.props.disabled, false);
  addButton.props.onClick();
  renameButton.props.onClick();
  removeButton.props.onClick();
  assert.deepEqual(calls, [['activate', 'sheet-2'], ['add'], ['rename'], ['remove']]);

  const singleSheetTabs = SheetTabs({
    workbook: {sheetOrder: ['sheet-1'], sheets: new Map([['sheet-1', {id: 'sheet-1', name: 'Only'}]])},
    activeSheetId: 'sheet-1',
    onActivateSheet: () => {},
    onAddSheet: () => {},
    onRenameActiveSheet: () => {},
    onRemoveActiveSheet: () => {},
  });
  const singleRemoveButton = collectElements(singleSheetTabs, (element) => element.props?.['aria-label'] === 'Remove active sheet')[0];
  assert.equal(singleRemoveButton.props.disabled, true);
});

test('function picker and cell components render spreadsheet state correctly', async () => {
  const {FunctionPicker, Cell} = await loadUiModules();
  assert.equal(renderToStaticMarkup(
    React.createElement(FunctionPicker, {
      open: false,
      activeAddress: 'B2',
      formulaDraft: '',
      selection: null,
      onPick: () => {},
      onDraft: () => {},
      onClose: () => {},
    }),
  ), '');
  const pickerHtml = renderToStaticMarkup(
    React.createElement(FunctionPicker, {
      open: true,
      activeAddress: 'B2',
      formulaDraft: '=SUM(A1:A4)',
      selection: {r1: 0, c1: 0, r2: 3, c2: 3},
      onPick: () => {},
      onDraft: () => {},
      onClose: () => {},
    }),
  );
  assert.match(pickerHtml, /Functions/);
  assert.match(pickerHtml, /SUM/);
  assert.match(pickerHtml, /RANDARRAY/);
  assert.match(pickerHtml, /A1:D4/);

  const cellHtml = renderToStaticMarkup(
    React.createElement(Cell, {
      row: 1,
      col: 2,
      x: 10,
      top: 20,
      width: 80,
      height: 24,
      value: '#SPILL!',
      rawValue: '=RANDARRAY(2,2)',
      spillInfo: {origin: {row: 1, col: 2}},
      note: 'Review',
      link: {href: 'https://example.com'},
      validation: {valid: false, failures: [{message: 'Invalid'}]},
      conditionalStyle: {backgroundColor: '#fee2e2'},
      mergeRange: {r1: 1, c1: 2, r2: 2, c2: 3},
      active: true,
      edited: false,
      onPointerDown: () => {},
      onContextMenu: () => {},
      onDoubleClick: () => {},
    }),
  );
  assert.match(cellHtml, /active-cell/);
  assert.match(cellHtml, /spill-cell/);
  assert.match(cellHtml, /note-cell/);
  assert.match(cellHtml, /hyperlink-cell/);
  assert.match(cellHtml, /invalid-cell/);
  assert.match(cellHtml, /merged-cell/);
  assert.match(cellHtml, /formula-cell/);
  assert.match(cellHtml, /aria-invalid="true"/);
});
