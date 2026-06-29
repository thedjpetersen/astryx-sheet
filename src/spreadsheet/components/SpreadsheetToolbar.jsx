import React, {useEffect, useMemo, useState} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Selector} from '@astryxdesign/core/Selector';
import {Token} from '@astryxdesign/core/Token';
import {
  ArrowDownAZ,
  ArrowUpZA,
  Bold,
  CalendarDays,
  ChevronDown,
  ClipboardPaste,
  Combine,
  Contrast,
  Copy,
  BrushCleaning,
  DollarSign,
  Eraser,
  Filter,
  FilterX,
  Hash,
  Highlighter,
  ListChecks,
  ListX,
  Moon,
  Pencil,
  Percent,
  PaintBucket,
  Redo2,
  Rows3,
  Split,
  Square,
  Tag,
  TagX,
  Type,
  Undo2,
  UnfoldHorizontal,
  UnfoldVertical,
} from 'lucide-react';
import {THEME_OPTIONS} from '../../app/themes.js';
import {FormulaEditor} from './FormulaEditor.jsx';

const iconProps = {size: 16, strokeWidth: 2, 'aria-hidden': true};
const DEFAULT_FILL_COLOR = '#e0f2fe';
const DEFAULT_TEXT_COLOR = '#075985';
const DEFAULT_BORDER_COLOR = '#64748b';
const FILL_SWATCHES = [
  {label: 'Blue', color: '#e0f2fe'},
  {label: 'Green', color: '#dcfce7'},
  {label: 'Yellow', color: '#fef3c7'},
  {label: 'Red', color: '#fee2e2'},
  {label: 'Purple', color: '#ede9fe'},
  {label: 'Gray', color: '#f1f5f9'},
];
const TEXT_SWATCHES = [
  {label: 'Blue', color: '#075985'},
  {label: 'Green', color: '#166534'},
  {label: 'Red', color: '#991b1b'},
  {label: 'Purple', color: '#6d28d9'},
  {label: 'Slate', color: '#334155'},
  {label: 'Black', color: '#0f172a'},
];
const BORDER_SWATCHES = [
  {label: 'Slate', color: '#64748b'},
  {label: 'Black', color: '#0f172a'},
  {label: 'Blue', color: '#0284c7'},
  {label: 'Green', color: '#16a34a'},
  {label: 'Red', color: '#dc2626'},
  {label: 'Amber', color: '#d97706'},
];

function icon(IconComponent, size = 16) {
  return <IconComponent {...iconProps} size={size} />;
}

function normalizeHexColor(value, fallback = DEFAULT_FILL_COLOR) {
  const text = String(value || '').trim();
  const hex = text.startsWith('#') ? text : `#${text}`;
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const [, r, g, b] = hex.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function isValidHexColor(value) {
  const text = String(value || '').trim();
  const hex = text.startsWith('#') ? text : `#${text}`;
  return /^#[0-9a-f]{6}$/i.test(hex) || /^#[0-9a-f]{3}$/i.test(hex);
}

function RibbonGroup({label, children, className = ''}) {
  return (
    <section className={`ribbon-group ${className}`} aria-label={label} data-ribbon-group={label}>
      <div className="ribbon-group-actions">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </section>
  );
}

function RibbonButton({label, icon: buttonIcon, onClick, isDisabled, children, size = 'small'}) {
  return (
    <button
      className={`ribbon-command ${size}`}
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={label}
      aria-label={label}>
      <span className="ribbon-command-icon">{buttonIcon}</span>
      {size === 'icon' ? null : <span className="ribbon-command-label">{children ?? label}</span>}
    </button>
  );
}

function ToggleButton({label, icon: buttonIcon, value, onChange, isDisabled = false}) {
  return (
    <button
      className={`ribbon-toggle ${value ? 'active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={value ? 'true' : 'false'}
      disabled={isDisabled}
      onClick={() => onChange?.(!value)}>
      <span className="ribbon-toggle-icon">{buttonIcon}</span>
      <span>{label}</span>
    </button>
  );
}

function closeRibbonMenu(event) {
  event.currentTarget.closest('[popover]')?.hidePopover?.();
}

function positionRibbonMenu(event, menuId) {
  if (typeof document === 'undefined') return;
  const panel = document.getElementById(menuId);
  if (!panel) return;
  const rect = event.currentTarget.getBoundingClientRect();
  panel.style.setProperty('--ribbon-menu-left', `${Math.max(8, rect.left)}px`);
  panel.style.setProperty('--ribbon-menu-top', `${rect.bottom + 4}px`);
}

function RibbonMenu({label, icon: buttonIcon, children, size = 'small'}) {
  const menuId = `ribbon-menu-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`ribbon-menu ${size}`}>
      <button
        className={`ribbon-command ribbon-menu-summary ${size}`}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        popoverTarget={menuId}
        onClick={(event) => positionRibbonMenu(event, menuId)}>
        <span className="ribbon-command-icon">{buttonIcon}</span>
        {size === 'icon' ? null : <span className="ribbon-command-label">{label}</span>}
        <span className="ribbon-menu-caret">{icon(ChevronDown, 13)}</span>
      </button>
      <div id={menuId} className="ribbon-menu-panel" popover="auto" role="menu" aria-label={`${label} options`}>
        {children}
      </div>
    </div>
  );
}

function RibbonMenuItem({label, onSelect, icon: itemIcon, swatch, detail, isDisabled}) {
  return (
    <button
      className="ribbon-menu-item"
      type="button"
      role="menuitem"
      disabled={isDisabled}
      onClick={(event) => {
        onSelect?.();
        closeRibbonMenu(event);
      }}>
      {swatch ? <span className="ribbon-menu-swatch" style={{background: swatch}} /> : <span className="ribbon-menu-item-icon">{itemIcon}</span>}
      <span className="ribbon-menu-item-text">
        <span className="ribbon-menu-item-label">{label}</span>
        {detail ? <span className="ribbon-menu-item-detail">{detail}</span> : null}
      </span>
    </button>
  );
}

function RibbonColorControl({label, value, fallbackColor, swatches, onApply, onClear}) {
  const initialColor = useMemo(() => normalizeHexColor(value, fallbackColor), [fallbackColor, value]);
  const [hexValue, setHexValue] = useState(initialColor);
  useEffect(() => setHexValue(initialColor), [initialColor]);
  const normalizedValue = isValidHexColor(hexValue) ? normalizeHexColor(hexValue, fallbackColor) : initialColor;
  const canApply = isValidHexColor(hexValue);
  return (
    <div className="ribbon-color-control" role="group" aria-label={label}>
      <div className="ribbon-color-preview">
        <span className="ribbon-color-preview-swatch" style={{background: normalizedValue}} />
        <span className="ribbon-color-preview-text">
          <span className="ribbon-color-label">{label}</span>
          <span className="ribbon-color-value">{canApply ? normalizedValue : 'Invalid hex'}</span>
        </span>
      </div>
      <div className="ribbon-color-swatches" aria-label={`${label} swatches`}>
        {swatches.map((item) => (
          <button
            key={item.color}
            className="ribbon-color-swatch-button"
            type="button"
            aria-label={`${label} ${item.label}`}
            title={`${item.label} ${item.color}`}
            style={{background: item.color}}
            onClick={(event) => {
              onApply(item.color);
              closeRibbonMenu(event);
            }} />
        ))}
      </div>
      <form
        className="ribbon-color-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canApply) return;
          onApply(normalizedValue);
          closeRibbonMenu(event);
        }}>
        <input
          className="ribbon-color-picker"
          type="color"
          aria-label={`${label} picker`}
          value={normalizedValue}
          onChange={(event) => setHexValue(event.target.value)} />
        <input
          className="ribbon-hex-input"
          aria-label={`${label} hex`}
          value={hexValue}
          spellCheck={false}
          maxLength={7}
          onChange={(event) => setHexValue(event.target.value)} />
        <button className="ribbon-color-apply" type="submit" disabled={!canApply}>Apply</button>
      </form>
      {onClear ? (
        <button
          className="ribbon-color-clear"
          type="button"
          onClick={(event) => {
            onClear();
            closeRibbonMenu(event);
          }}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

function SelectionInspector({selectionLabel, selectionShapeLabel, selectionCellCount, currentFillColor, currentTextColor}) {
  const countLabel = Number.isFinite(selectionCellCount) ? `${selectionCellCount.toLocaleString()} cell${selectionCellCount === 1 ? '' : 's'}` : '';
  return (
    <div className="selection-inspector" aria-label="Current selection">
      <div className="selection-inspector-address">{selectionLabel}</div>
      <div className="selection-inspector-meta">{selectionShapeLabel}{countLabel ? ` • ${countLabel}` : ''}</div>
      <div className="selection-inspector-swatches" aria-label="Selection style">
        <span className="selection-style-token">
          <span className="selection-style-swatch" style={{background: currentFillColor || 'transparent'}} />
          Fill
        </span>
        <span className="selection-style-token">
          <span className="selection-style-swatch" style={{background: currentTextColor || 'transparent'}} />
          Text
        </span>
      </div>
    </div>
  );
}

function activateRibbonTab(event, targetGroup) {
  const tab = event.currentTarget;
  const topbar = tab.closest('.topbar');
  if (!topbar) return;
  topbar.querySelectorAll('.ribbon-tab').forEach((node) => {
    const active = node === tab;
    node.classList.toggle('active', active);
    node.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  topbar.querySelector(`[data-ribbon-group="${targetGroup}"]`)?.scrollIntoView({
    block: 'nearest',
    inline: 'start',
    behavior: 'smooth',
  });
}

function RibbonTab({label, targetGroup, isActive = false, className = ''}) {
  return (
    <button
      type="button"
      className={`ribbon-tab ${className} ${isActive ? 'active' : ''}`.trim()}
      role="tab"
      aria-selected={isActive ? 'true' : 'false'}
      aria-controls="spreadsheet-ribbon-tools"
      onClick={(event) => activateRibbonTab(event, targetGroup)}>
      {label}
    </button>
  );
}

export function SpreadsheetToolbar({
  title,
  subtitle,
  activeAddress,
  selectionLabel = activeAddress,
  selectionShapeLabel = '1 x 1',
  selectionCellCount = 1,
  currentFillColor,
  currentTextColor,
  formulaDraft,
  formulaPreview,
  formulaCursorPosition,
  onFormulaChange,
  onFormulaCommit,
  onFormulaReset,
  onToggleFunctionPicker,
  onFormulaFocusChange,
  onFormulaCursorChange,
  formulaContext,
  rowCount,
  colCount,
  mountedCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopySelection,
  onPasteClipboard,
  onEditActiveCell,
  onClearSelection,
  onClearFormatting,
  onFormatNumber,
  onFormatCurrency,
  onFormatPercent,
  onFormatDate,
  onApplyFormat,
  onStyleBold,
  onStyleBorder,
  onStyleFill,
  onStyleText,
  onApplyStyle,
  onSortAscending,
  onSortDescending,
  onFilterSelection,
  onClearFilter,
  onMergeSelection,
  onUnmergeSelection,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnLeft,
  onInsertColumnRight,
  onDeleteActiveRow,
  onDeleteActiveColumn,
  onValidateNumber,
  onValidateList,
  onClearValidation,
  onHighlightGreaterThan,
  onHighlightTextContains,
  onClearConditionalFormat,
  onNameSelection,
  onRemoveNamedRange,
  onWidenActiveColumn,
  onTallerActiveRow,
  onResetActiveSize,
  onFillDown,
  onFillRight,
  themeName,
  onThemeNameChange,
  darkMode,
  onDarkModeChange,
  activeTheme,
  compactRows,
  onCompactRowsChange,
  highContrastSelection,
  onHighContrastSelectionChange,
  showStats = true,
  showThemeControls = true,
  showKeyboardHints = true,
}) {
  return (
    <header className="topbar">
      <div className="brand-mark">✣</div>
      <div className="title">
        <Heading level={1}>{title}</Heading>
        {subtitle ? <Text type="supporting" display="block">{subtitle}</Text> : null}
      </div>
      <div className="ribbon-tabs" role="tablist" aria-label="Ribbon tabs">
        <RibbonTab label="Home" targetGroup="Clipboard" isActive />
        <RibbonTab label="Insert" targetGroup="Insert" />
        <RibbonTab label="Data" targetGroup="Data" />
        <RibbonTab label="View" targetGroup="View" />
      </div>
      <div className="formula-wrap">
        <FormulaEditor
          activeAddress={activeAddress}
          formulaDraft={formulaDraft}
          formulaPreview={formulaPreview}
          formulaCursorPosition={formulaCursorPosition}
          formulaContext={formulaContext}
          onFormulaChange={onFormulaChange}
          onFormulaCommit={onFormulaCommit}
          onFormulaReset={onFormulaReset}
          onToggleFunctionPicker={onToggleFunctionPicker}
          onFormulaFocusChange={onFormulaFocusChange}
          onFormulaCursorChange={onFormulaCursorChange}
        />
      </div>
      {showStats ? (
        <div className="stats">
          <Token color="purple" label={`${rowCount.toLocaleString()} rows`} />
          <Token color="blue" label={`${colCount.toLocaleString()} cols`} />
          <Token color="green" label={`${mountedCount.toLocaleString()} mounted`} />
        </div>
      ) : null}
      <div className="ribbon-tools" id="spreadsheet-ribbon-tools" aria-label="Spreadsheet commands">
        <RibbonGroup label="Clipboard">
          <RibbonMenu label="Paste" icon={icon(ClipboardPaste)}>
            <RibbonMenuItem label="Paste from clipboard" icon={icon(ClipboardPaste)} onSelect={onPasteClipboard} detail="Insert copied table text at the active cell" />
            <RibbonMenuItem label="Paste values" icon={icon(ClipboardPaste)} onSelect={onPasteClipboard} detail="Use plain TSV or copied text" />
          </RibbonMenu>
          <RibbonMenu label="Copy" icon={icon(Copy)}>
            <RibbonMenuItem label="Copy selection" icon={icon(Copy)} onSelect={onCopySelection} detail="Copy selected cells as TSV" />
            <RibbonMenuItem label="Copy active range" icon={icon(Copy)} onSelect={onCopySelection} detail="Use the current selection rectangle" />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Selection" className="ribbon-group-selection">
          <SelectionInspector
            selectionLabel={selectionLabel}
            selectionShapeLabel={selectionShapeLabel}
            selectionCellCount={selectionCellCount}
            currentFillColor={currentFillColor}
            currentTextColor={currentTextColor}
          />
        </RibbonGroup>
        <RibbonGroup label="Edit">
          <RibbonMenu label="History" icon={icon(Undo2)}>
            <RibbonMenuItem label="Undo" icon={icon(Undo2)} onSelect={onUndo} isDisabled={!canUndo} />
            <RibbonMenuItem label="Redo" icon={icon(Redo2)} onSelect={onRedo} isDisabled={!canRedo} />
          </RibbonMenu>
          <RibbonMenu label="Edit" icon={icon(Pencil)}>
            <RibbonMenuItem label="Edit active cell" icon={icon(Pencil)} onSelect={onEditActiveCell} detail="Open the in-cell editor" />
            <RibbonMenuItem label="Fill down" icon={icon(UnfoldVertical)} onSelect={onFillDown} />
            <RibbonMenuItem label="Fill right" icon={icon(UnfoldHorizontal)} onSelect={onFillRight} />
          </RibbonMenu>
          <RibbonMenu label="Clear cells" icon={icon(Eraser)}>
            <RibbonMenuItem label="Clear cell values" icon={icon(Eraser)} onSelect={onClearSelection} />
            <RibbonMenuItem label="Clear formatting" icon={icon(BrushCleaning)} onSelect={onClearFormatting} />
            <RibbonMenuItem label="Clear validation rule" icon={icon(ListX)} onSelect={onClearValidation} />
            <RibbonMenuItem label="Clear highlight rule" icon={icon(BrushCleaning)} onSelect={onClearConditionalFormat} />
            <RibbonMenuItem label="Clear filter" icon={icon(FilterX)} onSelect={onClearFilter} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Number">
          <RibbonMenu label="Number" icon={icon(Hash)}>
            <RibbonMenuItem label="General" icon={icon(Hash)} onSelect={() => onApplyFormat?.(undefined, 'general', true)} detail="Remove number formatting" />
            <RibbonMenuItem label="Number, 2 decimals" icon={icon(Hash)} onSelect={onFormatNumber} />
            <RibbonMenuItem label="Number, no decimals" icon={icon(Hash)} onSelect={() => onApplyFormat?.({type: 'number', decimals: 0}, 'number')} />
            <RibbonMenuItem label="Text" icon={icon(Type)} onSelect={() => onApplyFormat?.({type: 'text'}, 'text')} />
          </RibbonMenu>
          <RibbonMenu label="Currency" icon={icon(DollarSign)}>
            <RibbonMenuItem label="US dollar" icon={icon(DollarSign)} onSelect={onFormatCurrency} detail="$1,234.00" />
            <RibbonMenuItem label="Euro" icon={icon(DollarSign)} onSelect={() => onApplyFormat?.({type: 'currency', currency: 'EUR', decimals: 2}, 'euro')} detail="€1,234.00" />
            <RibbonMenuItem label="British pound" icon={icon(DollarSign)} onSelect={() => onApplyFormat?.({type: 'currency', currency: 'GBP', decimals: 2}, 'pound')} detail="£1,234.00" />
            <RibbonMenuItem label="Japanese yen" icon={icon(DollarSign)} onSelect={() => onApplyFormat?.({type: 'currency', currency: 'JPY', decimals: 0}, 'yen')} detail="¥1,234" />
          </RibbonMenu>
          <RibbonMenu label="Percent" icon={icon(Percent)}>
            <RibbonMenuItem label="Percent, 1 decimal" icon={icon(Percent)} onSelect={onFormatPercent} />
            <RibbonMenuItem label="Percent, no decimals" icon={icon(Percent)} onSelect={() => onApplyFormat?.({type: 'percent', decimals: 0}, 'percent')} />
            <RibbonMenuItem label="Percent, 2 decimals" icon={icon(Percent)} onSelect={() => onApplyFormat?.({type: 'percent', decimals: 2}, 'percent')} />
          </RibbonMenu>
          <RibbonMenu label="Date" icon={icon(CalendarDays)}>
            <RibbonMenuItem label="Default date" icon={icon(CalendarDays)} onSelect={onFormatDate} />
            <RibbonMenuItem label="Short date" icon={icon(CalendarDays)} onSelect={() => onApplyFormat?.({type: 'date', dateStyle: 'short'}, 'short date')} />
            <RibbonMenuItem label="Long date" icon={icon(CalendarDays)} onSelect={() => onApplyFormat?.({type: 'date', dateStyle: 'long'}, 'long date')} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Style">
          <RibbonMenu label="Bold" icon={icon(Bold)}>
            <RibbonMenuItem label="Bold" icon={icon(Bold)} onSelect={onStyleBold} />
            <RibbonMenuItem label="Normal weight" icon={icon(Type)} onSelect={() => onApplyStyle?.({fontWeight: null}, 'normal weight')} />
            <RibbonMenuItem label="Header emphasis" icon={icon(Bold)} onSelect={() => onApplyStyle?.({fontWeight: 700, backgroundColor: '#f1f5f9'}, 'header emphasis')} />
          </RibbonMenu>
          <RibbonMenu label="Border" icon={icon(Square)}>
            <RibbonMenuItem label="All borders" icon={icon(Square)} onSelect={onStyleBorder} />
            <RibbonMenuItem label="Dark borders" icon={icon(Square)} onSelect={() => onApplyStyle?.({border: '1px solid #0f172a'}, 'dark border')} />
            <RibbonMenuItem label="No borders" icon={icon(Square)} onSelect={() => onApplyStyle?.({border: null}, 'no border')} />
            <RibbonColorControl
              label="Border color"
              value={DEFAULT_BORDER_COLOR}
              fallbackColor={DEFAULT_BORDER_COLOR}
              swatches={BORDER_SWATCHES}
              onApply={(color) => onApplyStyle?.({border: `1px solid ${color}`}, `border ${color}`)}
              onClear={() => onApplyStyle?.({border: null}, 'no border')} />
          </RibbonMenu>
          <RibbonMenu label="Fill" icon={icon(PaintBucket)}>
            <RibbonMenuItem label="Light blue" swatch="#e0f2fe" onSelect={onStyleFill} />
            <RibbonMenuItem label="Soft green" swatch="#dcfce7" onSelect={() => onApplyStyle?.({backgroundColor: '#dcfce7'}, 'green fill')} />
            <RibbonMenuItem label="Warm yellow" swatch="#fef3c7" onSelect={() => onApplyStyle?.({backgroundColor: '#fef3c7'}, 'yellow fill')} />
            <RibbonMenuItem label="Clear fill" swatch="transparent" onSelect={() => onApplyStyle?.({backgroundColor: null}, 'clear fill')} />
            <RibbonColorControl
              label="Fill color"
              value={currentFillColor}
              fallbackColor={DEFAULT_FILL_COLOR}
              swatches={FILL_SWATCHES}
              onApply={(color) => onApplyStyle?.({backgroundColor: color}, `fill ${color}`)}
              onClear={() => onApplyStyle?.({backgroundColor: null}, 'clear fill')} />
          </RibbonMenu>
          <RibbonMenu label="Text color" icon={icon(Type)}>
            <RibbonMenuItem label="Blue text" swatch="#075985" onSelect={onStyleText} />
            <RibbonMenuItem label="Green text" swatch="#166534" onSelect={() => onApplyStyle?.({color: '#166534'}, 'green text')} />
            <RibbonMenuItem label="Red text" swatch="#991b1b" onSelect={() => onApplyStyle?.({color: '#991b1b'}, 'red text')} />
            <RibbonMenuItem label="Default text" swatch="transparent" onSelect={() => onApplyStyle?.({color: null}, 'default text')} />
            <RibbonColorControl
              label="Custom text color"
              value={currentTextColor}
              fallbackColor={DEFAULT_TEXT_COLOR}
              swatches={TEXT_SWATCHES}
              onApply={(color) => onApplyStyle?.({color}, `text ${color}`)}
              onClear={() => onApplyStyle?.({color: null}, 'default text')} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Insert">
          <RibbonMenu label="Rows" icon={icon(Rows3)}>
            <RibbonMenuItem label="Row above" icon={icon(Rows3)} onSelect={onInsertRowAbove} />
            <RibbonMenuItem label="Row below" icon={icon(Rows3)} onSelect={onInsertRowBelow} />
            <RibbonMenuItem label="Delete active row" icon={icon(Eraser)} onSelect={onDeleteActiveRow} />
            <RibbonMenuItem label="Taller row" icon={icon(UnfoldVertical)} onSelect={onTallerActiveRow} />
          </RibbonMenu>
          <RibbonMenu label="Columns" icon={icon(UnfoldHorizontal)}>
            <RibbonMenuItem label="Column left" icon={icon(UnfoldHorizontal)} onSelect={onInsertColumnLeft} />
            <RibbonMenuItem label="Column right" icon={icon(UnfoldHorizontal)} onSelect={onInsertColumnRight} />
            <RibbonMenuItem label="Delete active column" icon={icon(Eraser)} onSelect={onDeleteActiveColumn} />
            <RibbonMenuItem label="Widen column" icon={icon(UnfoldHorizontal)} onSelect={onWidenActiveColumn} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Data">
          <RibbonMenu label="Sort" icon={icon(ArrowDownAZ)}>
            <RibbonMenuItem label="Sort A-Z" icon={icon(ArrowDownAZ)} onSelect={onSortAscending} />
            <RibbonMenuItem label="Sort Z-A" icon={icon(ArrowUpZA)} onSelect={onSortDescending} />
          </RibbonMenu>
          <RibbonMenu label="Filter" icon={icon(Filter)}>
            <RibbonMenuItem label="Filter by active value" icon={icon(Filter)} onSelect={onFilterSelection} />
            <RibbonMenuItem label="Clear filter" icon={icon(FilterX)} onSelect={onClearFilter} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Cells">
          <RibbonMenu label="Merge" icon={icon(Combine)}>
            <RibbonMenuItem label="Merge selection" icon={icon(Combine)} onSelect={onMergeSelection} />
            <RibbonMenuItem label="Unmerge active range" icon={icon(Split)} onSelect={onUnmergeSelection} />
          </RibbonMenu>
          <RibbonMenu label="Size" icon={icon(UnfoldHorizontal)}>
            <RibbonMenuItem label="Widen column" icon={icon(UnfoldHorizontal)} onSelect={onWidenActiveColumn} />
            <RibbonMenuItem label="Taller row" icon={icon(UnfoldVertical)} onSelect={onTallerActiveRow} />
            <RibbonMenuItem label="Reset active size" icon={icon(BrushCleaning)} onSelect={onResetActiveSize} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Rules">
          <RibbonMenu label="Validation" icon={icon(ListChecks)}>
            <RibbonMenuItem label="Number rule" icon={icon(ListChecks)} onSelect={onValidateNumber} />
            <RibbonMenuItem label="List rule" icon={icon(Rows3)} onSelect={onValidateList} />
            <RibbonMenuItem label="Clear rule" icon={icon(ListX)} onSelect={onClearValidation} />
          </RibbonMenu>
          <RibbonMenu label="Highlight" icon={icon(Highlighter)}>
            <RibbonMenuItem label="Greater than" icon={icon(Highlighter)} onSelect={onHighlightGreaterThan} />
            <RibbonMenuItem label="Text contains" icon={icon(Highlighter)} onSelect={onHighlightTextContains} />
            <RibbonMenuItem label="Clear highlight" icon={icon(BrushCleaning)} onSelect={onClearConditionalFormat} />
          </RibbonMenu>
        </RibbonGroup>
        <RibbonGroup label="Names">
          <RibbonMenu label="Names" icon={icon(Tag)}>
            <RibbonMenuItem label="Name selection" icon={icon(Tag)} onSelect={onNameSelection} />
            <RibbonMenuItem label="Remove name" icon={icon(TagX)} onSelect={onRemoveNamedRange} />
          </RibbonMenu>
        </RibbonGroup>
        <span className="toolbar-spacer" aria-hidden="true" />
        {showThemeControls ? (
          <RibbonGroup label="View" className="ribbon-group-view">
            <div className="options-group" aria-label="View options">
              <Selector label="Theme" isLabelHidden options={THEME_OPTIONS} value={themeName} onChange={onThemeNameChange} size="sm" width={150} />
              <ToggleButton label="Dark" icon={icon(Moon)} value={activeTheme.forceDark || darkMode} onChange={onDarkModeChange} isDisabled={activeTheme.forceDark} />
              <ToggleButton label="Compact" icon={icon(Rows3)} value={compactRows} onChange={onCompactRowsChange} />
              <ToggleButton label="Contrast" icon={icon(Contrast)} value={highContrastSelection} onChange={onHighContrastSelectionChange} />
            </div>
          </RibbonGroup>
        ) : null}
      </div>
    </header>
  );
}
