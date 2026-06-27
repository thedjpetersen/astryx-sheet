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
  onEditActiveCell,
  onClearSelection,
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
        <Button label="Edit cell" variant="secondary" size="sm" onClick={onEditActiveCell} />
        <Button label="Clear" variant="secondary" size="sm" onClick={onClearSelection} />
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
