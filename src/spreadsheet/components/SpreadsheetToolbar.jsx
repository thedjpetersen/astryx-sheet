import React from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Switch} from '@astryxdesign/core/Switch';
import {Selector} from '@astryxdesign/core/Selector';
import {Token} from '@astryxdesign/core/Token';
import {Kbd} from '@astryxdesign/core/Kbd';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {THEME_OPTIONS} from '../../app/themes.js';

export function SpreadsheetToolbar({
  title,
  subtitle,
  activeAddress,
  formulaDraft,
  onFormulaChange,
  onFormulaCommit,
  onFormulaReset,
  onToggleFunctionPicker,
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
  onSortAscending,
  onSortDescending,
  onFilterSelection,
  onClearFilter,
  onWidenActiveColumn,
  onTallerActiveRow,
  themeName,
  onThemeNameChange,
  darkMode,
  onDarkModeChange,
  activeTheme,
  showInspector,
  onShowInspectorChange,
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
      <div className="formula-wrap">
        <Badge variant="purple" label={activeAddress} />
        <Tooltip content="Insert a formula from the current selection"><Button label="fx" variant="secondary" size="sm" onClick={onToggleFunctionPicker} /></Tooltip>
        <TextInput
          label="Formula bar"
          isLabelHidden
          value={formulaDraft}
          onChange={onFormulaChange}
          onEnter={onFormulaCommit}
          onKeyDown={(e) => { if (e.key === 'Escape') onFormulaReset(); }}
          onBlur={onFormulaCommit}
          width="100%"
        />
      </div>
      {showStats ? (
        <div className="stats">
          <Token color="purple" label={`${rowCount.toLocaleString()} rows`} />
          <Token color="blue" label={`${colCount.toLocaleString()} cols`} />
          <Token color="green" label={`${mountedCount.toLocaleString()} mounted`} />
        </div>
      ) : null}
      <div className="ribbon-tools">
        <Button label="Undo" variant="secondary" size="sm" onClick={onUndo} isDisabled={!canUndo} />
        <Button label="Redo" variant="secondary" size="sm" onClick={onRedo} isDisabled={!canRedo} />
        <Button label="Copy" variant="secondary" size="sm" onClick={onCopySelection} />
        <Button label="Paste" variant="secondary" size="sm" onClick={onPasteClipboard} />
        <Button label="Edit cell" variant="secondary" size="sm" onClick={onEditActiveCell} />
        <Button label="Clear" variant="secondary" size="sm" onClick={onClearSelection} />
        <Button label="Number" variant="secondary" size="sm" onClick={onFormatNumber} />
        <Button label="$" variant="secondary" size="sm" onClick={onFormatCurrency} />
        <Button label="%" variant="secondary" size="sm" onClick={onFormatPercent} />
        <Button label="Date" variant="secondary" size="sm" onClick={onFormatDate} />
        <Button label="Sort A-Z" variant="secondary" size="sm" onClick={onSortAscending} />
        <Button label="Sort Z-A" variant="secondary" size="sm" onClick={onSortDescending} />
        <Button label="Filter" variant="secondary" size="sm" onClick={onFilterSelection} />
        <Button label="Clear filter" variant="secondary" size="sm" onClick={onClearFilter} />
        <Button label="Widen column" variant="secondary" size="sm" onClick={onWidenActiveColumn} />
        <Button label="Taller row" variant="secondary" size="sm" onClick={onTallerActiveRow} />
        <span className="toolbar-spacer" />
        {showThemeControls ? (
          <div className="options-group" aria-label="Demo options">
            <Selector label="Theme" isLabelHidden options={THEME_OPTIONS} value={themeName} onChange={onThemeNameChange} size="sm" width={170} />
            <Switch label="Dark" value={darkMode} onChange={onDarkModeChange} labelPosition="start" isDisabled={activeTheme.forceDark} />
            <Switch label="Inspector" value={showInspector} onChange={onShowInspectorChange} labelPosition="start" />
            <Switch label="Compact rows" value={compactRows} onChange={onCompactRowsChange} labelPosition="start" />
            <Switch label="High contrast" value={highContrastSelection} onChange={onHighContrastSelectionChange} labelPosition="start" />
          </div>
        ) : null}
        {showKeyboardHints ? <div className="kbd-hint"><Kbd keys="enter" /> edit <Kbd keys="backspace" /> clear</div> : null}
      </div>
    </header>
  );
}
