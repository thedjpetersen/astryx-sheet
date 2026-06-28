import React from 'react';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Switch} from '@astryxdesign/core/Switch';
import {Selector} from '@astryxdesign/core/Selector';
import {Token} from '@astryxdesign/core/Token';
import {Kbd} from '@astryxdesign/core/Kbd';
import {
  ArrowDownAZ,
  ArrowUpZA,
  Bold,
  CalendarDays,
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

function icon(IconComponent, size = 16) {
  return <IconComponent {...iconProps} size={size} />;
}

function RibbonGroup({label, children, className = ''}) {
  return (
    <section className={`ribbon-group ${className}`} aria-label={label}>
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

export function SpreadsheetToolbar({
  title,
  subtitle,
  activeAddress,
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
  onFormatNumber,
  onFormatCurrency,
  onFormatPercent,
  onFormatDate,
  onStyleBold,
  onStyleBorder,
  onStyleFill,
  onStyleText,
  onSortAscending,
  onSortDescending,
  onFilterSelection,
  onClearFilter,
  onMergeSelection,
  onUnmergeSelection,
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
      <div className="ribbon-tabs" aria-label="Ribbon tabs">
        <span className="ribbon-tab file">File</span>
        <span className="ribbon-tab active">Home</span>
        <span className="ribbon-tab">Insert</span>
        <span className="ribbon-tab">Data</span>
        <span className="ribbon-tab">View</span>
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
      <div className="ribbon-tools" aria-label="Spreadsheet commands">
        <RibbonGroup label="Clipboard">
          <RibbonButton label="Paste" icon={icon(ClipboardPaste, 24)} onClick={onPasteClipboard} size="large" />
          <RibbonButton label="Copy" icon={icon(Copy)} onClick={onCopySelection} />
        </RibbonGroup>
        <RibbonGroup label="Edit">
          <RibbonButton label="Undo" icon={icon(Undo2)} onClick={onUndo} isDisabled={!canUndo} size="icon" />
          <RibbonButton label="Redo" icon={icon(Redo2)} onClick={onRedo} isDisabled={!canRedo} size="icon" />
          <RibbonButton label="Edit" icon={icon(Pencil)} onClick={onEditActiveCell} />
          <RibbonButton label="Clear" icon={icon(Eraser)} onClick={onClearSelection}>Clear cells</RibbonButton>
        </RibbonGroup>
        <RibbonGroup label="Number">
          <RibbonButton label="Number" icon={icon(Hash)} onClick={onFormatNumber} />
          <RibbonButton label="Currency" icon={icon(DollarSign)} onClick={onFormatCurrency}>Currency</RibbonButton>
          <RibbonButton label="Percent" icon={icon(Percent)} onClick={onFormatPercent}>Percent</RibbonButton>
          <RibbonButton label="Date" icon={icon(CalendarDays)} onClick={onFormatDate} />
        </RibbonGroup>
        <RibbonGroup label="Style">
          <RibbonButton label="Bold" icon={icon(Bold)} onClick={onStyleBold} />
          <RibbonButton label="Border" icon={icon(Square)} onClick={onStyleBorder} />
          <RibbonButton label="Fill" icon={icon(PaintBucket)} onClick={onStyleFill} />
          <RibbonButton label="Text color" icon={icon(Type)} onClick={onStyleText}>Text color</RibbonButton>
        </RibbonGroup>
        <RibbonGroup label="Data">
          <RibbonButton label="Sort A-Z" icon={icon(ArrowDownAZ)} onClick={onSortAscending} />
          <RibbonButton label="Sort Z-A" icon={icon(ArrowUpZA)} onClick={onSortDescending} />
          <RibbonButton label="Filter" icon={icon(Filter)} onClick={onFilterSelection} />
          <RibbonButton label="Clear filter" icon={icon(FilterX)} onClick={onClearFilter}>Clear filter</RibbonButton>
        </RibbonGroup>
        <RibbonGroup label="Cells">
          <RibbonButton label="Merge" icon={icon(Combine)} onClick={onMergeSelection} />
          <RibbonButton label="Unmerge" icon={icon(Split)} onClick={onUnmergeSelection} />
          <RibbonButton label="Widen column" icon={icon(UnfoldHorizontal)} onClick={onWidenActiveColumn}>Widen</RibbonButton>
          <RibbonButton label="Taller row" icon={icon(UnfoldVertical)} onClick={onTallerActiveRow}>Taller</RibbonButton>
        </RibbonGroup>
        <RibbonGroup label="Rules">
          <RibbonButton label="Number rule" icon={icon(ListChecks)} onClick={onValidateNumber}>Number rule</RibbonButton>
          <RibbonButton label="List rule" icon={icon(Rows3)} onClick={onValidateList}>List rule</RibbonButton>
          <RibbonButton label="Clear rule" icon={icon(ListX)} onClick={onClearValidation}>Clear rule</RibbonButton>
          <RibbonButton label="Highlight greater than" icon={icon(Highlighter)} onClick={onHighlightGreaterThan}>Greater than</RibbonButton>
          <RibbonButton label="Highlight text" icon={icon(Highlighter)} onClick={onHighlightTextContains}>Text contains</RibbonButton>
          <RibbonButton label="Clear highlight" icon={icon(BrushCleaning)} onClick={onClearConditionalFormat}>Clear highlight</RibbonButton>
        </RibbonGroup>
        <RibbonGroup label="Names">
          <RibbonButton label="Name" icon={icon(Tag)} onClick={onNameSelection} />
          <RibbonButton label="Remove name" icon={icon(TagX)} onClick={onRemoveNamedRange}>Remove</RibbonButton>
        </RibbonGroup>
        <span className="toolbar-spacer" aria-hidden="true" />
        {showThemeControls ? (
          <RibbonGroup label="View" className="ribbon-group-view">
            <div className="options-group" aria-label="View options">
              <Selector label="Theme" isLabelHidden options={THEME_OPTIONS} value={themeName} onChange={onThemeNameChange} size="sm" width={150} />
              <Switch label={<span className="switch-label"><Moon {...iconProps} />Dark</span>} value={darkMode} onChange={onDarkModeChange} labelPosition="start" isDisabled={activeTheme.forceDark} />
              <Switch label={<span className="switch-label"><Rows3 {...iconProps} />Compact</span>} value={compactRows} onChange={onCompactRowsChange} labelPosition="start" />
              <Switch label={<span className="switch-label"><Contrast {...iconProps} />Contrast</span>} value={highContrastSelection} onChange={onHighContrastSelectionChange} labelPosition="start" />
            </div>
          </RibbonGroup>
        ) : null}
        {showKeyboardHints ? <div className="kbd-hint"><Kbd keys="enter" /> edit <Kbd keys="backspace" /> clear</div> : null}
      </div>
    </header>
  );
}
