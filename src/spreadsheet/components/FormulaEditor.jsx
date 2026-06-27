import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {Check, FunctionSquare, Rows3, Tag, X} from 'lucide-react';
import {
  completeFormulaFunctionDraft,
  completeFormulaIdentifierDraft,
  completeFormulaSheetNameDraft,
  cycleFormulaReferenceDraft,
  getFormulaEditorHint,
  getFormulaFunctionHelp,
  getFormulaEditorSuggestions,
  getFormulaSignatureParts,
  replaceFormulaFunctionNameDraft,
  replaceFormulaIdentifierNameDraft,
  replaceFormulaSheetReferenceDraft,
  tokenizeFormulaEditorDraft,
} from '../model/formulas.js';

function sx(className, ...styleObjects) {
  const props = stylex.props(...styleObjects);
  const mergedClassName = [props.className, className].filter(Boolean).join(' ');
  return {
    ...props,
    ...(mergedClassName ? {className: mergedClassName} : {}),
  };
}

const referenceColorStyles = Object.freeze({
  blue: {color: 'var(--color-text-blue)'},
  green: {color: 'var(--color-text-green)'},
  purple: {color: 'var(--color-text-purple)'},
  orange: {color: 'var(--color-text-orange)'},
  teal: {color: 'var(--color-text-teal)'},
  pink: {color: 'var(--color-text-pink)'},
});

const styles = Object.freeze({
  root: {
    position: 'relative',
    minWidth: 0,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '96px auto auto minmax(180px, 1fr)',
    alignItems: 'center',
    gap: 0,
    minHeight: 32,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
  },
  rootFocused: {
    borderColor: 'var(--color-border-emphasized)',
    boxShadow: 'inset 0 -2px 0 var(--color-accent)',
  },
  nameBox: {
    minWidth: 0,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingBlock: 0,
    paddingInline: 9,
    borderWidth: 0,
    borderRight: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-body)',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: '30px',
    whiteSpace: 'nowrap',
  },
  nameBoxText: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nameBoxChevron: {
    flex: '0 0 auto',
    color: 'var(--color-text-secondary)',
    fontSize: 10,
  },
  editControls: {
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    paddingInline: 2,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: 'var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
  },
  editControlsHidden: {
    width: 0,
    overflow: 'hidden',
    paddingInline: 0,
    borderRightWidth: 0,
  },
  iconButton: {
    appearance: 'none',
    width: 25,
    height: 25,
    display: 'inline-grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: 2,
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'default',
  },
  iconButtonAccept: {
    color: 'var(--color-text-green)',
  },
  iconButtonCancel: {
    color: 'var(--color-text-red)',
  },
  fxButton: {
    appearance: 'none',
    width: 34,
    height: 30,
    display: 'inline-grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRight: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
    color: 'var(--color-text-secondary)',
    cursor: 'default',
    fontFamily: 'Georgia, Times, serif',
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: 700,
    lineHeight: 1,
  },
  inputFrame: {
    position: 'relative',
    minWidth: 0,
    height: 30,
    backgroundColor: 'var(--color-background-input, var(--color-background-surface))',
  },
  inputFrameError: {
    boxShadow: 'inset 0 -2px 0 var(--color-error)',
  },
  highlight: {
    position: 'absolute',
    insetBlock: 0,
    insetInline: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    paddingBlock: 5,
    paddingInline: 8,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-code)',
    fontSize: 13,
    lineHeight: '20px',
    whiteSpace: 'pre',
    tabSize: 2,
  },
  input: {
    position: 'relative',
    minWidth: 0,
    width: '100%',
    height: 30,
    resize: 'none',
    borderWidth: 0,
    outlineWidth: 0,
    overflow: 'auto',
    paddingBlock: 5,
    paddingInline: 8,
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    caretColor: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-code)',
    fontSize: 13,
    lineHeight: '20px',
    whiteSpace: 'pre',
  },
  inputFormula: {
    color: 'transparent',
  },
  callout: {
    position: 'absolute',
    zIndex: 1002,
    top: 'calc(100% + 4px)',
    left: 96,
    width: 'min(760px, calc(100vw - 128px))',
    maxHeight: 338,
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(220px, 0.72fr)',
    gap: 0,
    overflow: 'hidden',
    border: '1px solid var(--color-border-emphasized)',
    borderRadius: 3,
    backgroundColor: 'var(--color-background-popover)',
    boxShadow: '0 10px 28px color-mix(in srgb, var(--color-shadow) 42%, transparent)',
  },
  calloutSingle: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    width: 'min(520px, calc(100vw - 128px))',
  },
  calloutMain: {
    minWidth: 0,
    display: 'grid',
    alignContent: 'start',
  },
  helpPanel: {
    minWidth: 0,
    display: 'grid',
    gap: 6,
    paddingBlock: 8,
    paddingInline: 10,
    borderBottom: '1px solid var(--color-border)',
  },
  helpHeader: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  helpName: {
    flex: '0 0 auto',
    color: 'var(--color-text-blue)',
    fontSize: 12,
    fontWeight: 800,
  },
  helpDescription: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-secondary)',
    fontSize: 11,
  },
  argumentNote: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: 'var(--color-text-secondary)',
    fontSize: 11,
    lineHeight: 1.35,
  },
  argumentLabel: {
    flex: '0 0 auto',
    paddingBlock: 2,
    paddingInline: 6,
    borderRadius: 2,
    backgroundColor: 'var(--color-accent-muted)',
    color: 'var(--color-text-accent)',
    fontFamily: 'var(--font-family-code)',
    fontWeight: 800,
  },
  argumentDescription: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  optionRow: {
    display: 'flex',
    gap: 4,
    minWidth: 0,
    overflow: 'hidden',
  },
  optionChip: {
    flex: '0 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingBlock: 1,
    paddingInline: 5,
    border: '1px solid var(--color-border)',
    borderRadius: 2,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-family-code)',
    fontSize: 10,
  },
  suggestionList: {
    minWidth: 0,
    maxHeight: 228,
    overflow: 'auto',
    paddingBlock: 3,
    paddingInline: 3,
  },
  suggestionButton: {
    appearance: 'none',
    width: '100%',
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: 'minmax(118px, auto) minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 8,
    paddingBlock: 6,
    paddingInline: 7,
    borderWidth: 0,
    borderRadius: 2,
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    textAlign: 'left',
  },
  suggestionButtonActive: {
    backgroundColor: 'var(--color-overlay-hover)',
    boxShadow: 'inset 2px 0 0 var(--color-accent)',
  },
  suggestionName: {
    minWidth: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    overflow: 'hidden',
    color: 'var(--color-text-blue)',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  suggestionSignature: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-code)',
    fontSize: 11,
  },
  suggestionCategory: {
    color: 'var(--color-text-secondary)',
    fontSize: 10,
    whiteSpace: 'nowrap',
  },
  sidePanel: {
    minWidth: 0,
    display: 'grid',
    alignContent: 'start',
    gap: 8,
    paddingBlock: 10,
    paddingInline: 11,
    borderLeft: '1px solid var(--color-border)',
    backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 58%, var(--color-background-popover))',
    color: 'var(--color-text-secondary)',
    fontSize: 11,
  },
  sideTitle: {
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 800,
  },
  example: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingBlock: 5,
    paddingInline: 7,
    border: '1px solid var(--color-border)',
    borderRadius: 2,
    backgroundColor: 'var(--color-background-surface)',
    color: 'var(--color-text-blue)',
    fontFamily: 'var(--font-family-code)',
    fontSize: 11,
  },
  previewRow: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingBlock: 6,
    paddingInline: 10,
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: 11,
  },
  previewValue: {
    minWidth: 0,
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-green)',
    fontFamily: 'var(--font-family-code)',
    fontWeight: 700,
  },
  previewError: {
    color: 'var(--color-text-red)',
  },
  diagnostics: {
    minWidth: 0,
    display: 'grid',
    gap: 4,
    paddingBlock: 6,
    paddingInline: 10,
    borderTop: '1px solid var(--color-border)',
  },
  diagnostic: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--color-text-yellow)',
    fontSize: 11,
    lineHeight: 1.35,
  },
  diagnosticError: {
    color: 'var(--color-text-red)',
  },
  diagnosticMessage: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  diagnosticButton: {
    appearance: 'none',
    flex: '0 0 auto',
    border: '1px solid currentColor',
    borderRadius: 2,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: 'var(--font-family-body)',
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
    paddingBlock: 2,
    paddingInline: 5,
  },
  tokenFunction: {
    color: 'var(--color-text-blue)',
    fontWeight: 700,
  },
  tokenNumber: {
    color: 'var(--color-text-orange)',
  },
  tokenString: {
    color: 'var(--color-text-green)',
  },
  tokenBoolean: {
    color: 'var(--color-text-purple)',
    fontWeight: 700,
  },
  tokenOperator: {
    color: 'var(--color-text-secondary)',
  },
  tokenReference: {
    color: 'var(--formula-token-text, var(--color-text-blue))',
    fontWeight: 700,
  },
  tokenError: {
    color: 'var(--color-text-red)',
  },
  mobileRoot: {
    gridTemplateColumns: '72px auto minmax(120px, 1fr)',
  },
});

function FormulaSignature({signature, activeArgumentIndex = -1}) {
  const parts = getFormulaSignatureParts(signature, activeArgumentIndex);
  if (!parts.hasCall) return <code className="formula-signature-rich">{signature}</code>;
  return (
    <code className="formula-signature-rich">
      <span className="formula-signature-name">{parts.name}</span>
      <span className="formula-signature-paren">(</span>
      {parts.arguments.map((argument, index) => (
        <React.Fragment key={`${argument.raw}-${index}`}>
          {index > 0 ? <span className="formula-signature-separator">, </span> : null}
          <span className={['formula-signature-argument', argument.optional ? 'optional' : '', argument.variadic ? 'variadic' : '', argument.active ? 'active' : ''].filter(Boolean).join(' ')}>
            {argument.raw}
          </span>
        </React.Fragment>
      ))}
      <span className="formula-signature-paren">)</span>
    </code>
  );
}

function tokenStyle(token) {
  if (token.type === 'function') return styles.tokenFunction;
  if (token.type === 'number') return styles.tokenNumber;
  if (token.type === 'string') return styles.tokenString;
  if (token.type === 'boolean') return styles.tokenBoolean;
  if (token.type === 'operator' || token.type === 'delimiter' || token.type === 'paren') return styles.tokenOperator;
  if (token.type === 'reference' || token.type === 'namedRange') return [styles.tokenReference, referenceColorStyles[token.color] || null];
  if (token.type === 'error' || token.type === 'unknown') return styles.tokenError;
  return null;
}

function suggestionIcon(type) {
  if (type === 'function') return <FunctionSquare size={14} aria-hidden />;
  if (type === 'sheet') return <Rows3 size={14} aria-hidden />;
  return <Tag size={14} aria-hidden />;
}

export function FormulaEditor({
  activeAddress,
  formulaDraft,
  formulaPreview,
  formulaCursorPosition,
  formulaContext,
  onFormulaChange,
  onFormulaCommit,
  onFormulaReset,
  onToggleFunctionPicker,
  onFormulaFocusChange,
  onFormulaCursorChange,
}) {
  const entryRef = useRef(null);
  const highlightRef = useRef(null);
  const keepSuggestionsDismissedRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const draft = String(formulaDraft ?? '');
  const isFormula = draft.trim().startsWith('=');
  const editorCursorPosition = focused ? cursorPosition : draft.length;
  const hint = getFormulaEditorHint(draft, editorCursorPosition, formulaContext);
  const suggestions = useMemo(() => getFormulaEditorSuggestions(draft, editorCursorPosition, formulaContext).slice(0, 8), [editorCursorPosition, draft, formulaContext]);
  const syntaxTokens = useMemo(() => tokenizeFormulaEditorDraft(draft, formulaContext), [draft, formulaContext]);
  const activeSuggestion = suggestions[Math.min(selectedSuggestionIndex, Math.max(0, suggestions.length - 1))];
  const activeHelp = activeSuggestion?.type === 'function' ? getFormulaFunctionHelp(activeSuggestion.name, formulaContext) : hint.help;
  const activeArgumentHelp = hint.activeArgumentHelp;
  const diagnostics = formulaPreview?.diagnostics || [];
  const hasDiagnostics = isFormula && diagnostics.length > 0;
  const showSuggestions = focused && isFormula && suggestions.length > 0 && !suggestionsDismissed;
  const showHelp = focused && isFormula && Boolean(activeHelp);
  const showPreview = focused && isFormula && formulaPreview && draft.trim().length > 1;
  const showCallout = showSuggestions || showHelp || hasDiagnostics || showPreview;
  const showEditControls = focused;

  useEffect(() => {
    setSelectedSuggestionIndex(0);
    if (keepSuggestionsDismissedRef.current) {
      keepSuggestionsDismissedRef.current = false;
      return;
    }
    setSuggestionsDismissed(false);
  }, [editorCursorPosition, draft, suggestions.length, suggestions[0]?.name]);

  useEffect(() => {
    if (!focused || typeof formulaCursorPosition !== 'number') return;
    setCursorPosition(formulaCursorPosition);
    requestAnimationFrame(() => entryRef.current?.setSelectionRange(formulaCursorPosition, formulaCursorPosition));
  }, [focused, formulaCursorPosition]);

  const setCursor = (nextCursor) => {
    setCursorPosition(nextCursor);
    onFormulaCursorChange?.(nextCursor);
  };
  const syncHighlightScroll = (target) => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = target.scrollTop;
    highlightRef.current.scrollLeft = target.scrollLeft;
  };
  const pickSuggestion = (suggestion) => {
    const next = suggestion.type === 'function'
      ? completeFormulaFunctionDraft(draft, suggestion.name, editorCursorPosition, {pairedParentheses: true})
      : suggestion.type === 'sheet'
        ? completeFormulaSheetNameDraft(draft, suggestion.name, editorCursorPosition)
        : completeFormulaIdentifierDraft(draft, suggestion.name, editorCursorPosition);
    onFormulaChange(next.value);
    setCursor(next.cursor);
    keepSuggestionsDismissedRef.current = true;
    setSuggestionsDismissed(true);
    requestAnimationFrame(() => entryRef.current?.setSelectionRange(next.cursor, next.cursor));
    setFocused(true);
  };
  const cycleActiveReference = () => {
    const next = cycleFormulaReferenceDraft(draft, editorCursorPosition);
    if (!next) return false;
    onFormulaChange(next.value);
    setCursor(next.cursor);
    keepSuggestionsDismissedRef.current = true;
    setSuggestionsDismissed(true);
    requestAnimationFrame(() => entryRef.current?.setSelectionRange(next.cursor, next.cursor));
    return true;
  };
  const applyDiagnosticSuggestion = (diagnostic) => {
    if (!diagnostic?.suggestion) return;
    const next = diagnostic.functionName
      ? replaceFormulaFunctionNameDraft(draft, diagnostic.functionName, diagnostic.suggestion, editorCursorPosition)
      : diagnostic.name
        ? replaceFormulaIdentifierNameDraft(draft, diagnostic.name, diagnostic.suggestion, editorCursorPosition, formulaContext)
        : diagnostic.sheetName
          ? replaceFormulaSheetReferenceDraft(draft, diagnostic.sheetName, diagnostic.suggestion, editorCursorPosition, formulaContext)
          : null;
    if (!next) return;
    onFormulaChange(next.value);
    setCursor(next.cursor);
    keepSuggestionsDismissedRef.current = true;
    setSuggestionsDismissed(true);
    requestAnimationFrame(() => entryRef.current?.setSelectionRange(next.cursor, next.cursor));
  };
  const updateCursor = (target) => {
    setCursor(target.selectionStart ?? String(target.value ?? '').length);
    syncHighlightScroll(target);
  };

  return (
    <div {...sx('excel-formula-bar', styles.root, focused && styles.rootFocused)}>
      <div {...sx(null, styles.nameBox)} aria-label="Name box">
        <span {...sx(null, styles.nameBoxText)}>{activeAddress}</span>
        <span {...sx(null, styles.nameBoxChevron)}>▾</span>
      </div>
      <div {...sx(null, styles.editControls, !showEditControls && styles.editControlsHidden)} aria-hidden={!showEditControls}>
        <button {...sx('excel-formula-button', styles.iconButton, styles.iconButtonCancel)} type="button" aria-label="Cancel formula edit" tabIndex={showEditControls ? 0 : -1} onMouseDown={(event) => event.preventDefault()} onClick={onFormulaReset}>
          <X size={15} aria-hidden />
        </button>
        <button {...sx('excel-formula-button', styles.iconButton, styles.iconButtonAccept)} type="button" aria-label="Accept formula edit" tabIndex={showEditControls ? 0 : -1} onMouseDown={(event) => event.preventDefault()} onClick={onFormulaCommit}>
          <Check size={15} aria-hidden />
        </button>
      </div>
      <button {...sx('excel-formula-fx', styles.fxButton)} type="button" aria-label="Insert function" onMouseDown={(event) => event.preventDefault()} onClick={onToggleFunctionPicker}>
        fx
      </button>
      <div {...sx(null, styles.inputFrame, formulaPreview?.error && isFormula && styles.inputFrameError)}>
        {isFormula ? (
          <div ref={highlightRef} {...sx(null, styles.highlight)} aria-hidden="true">
            {syntaxTokens.map((token) => (
              <span key={`${token.start}-${token.end}-${token.value}`} {...sx(null, tokenStyle(token))}>
                {token.value}
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          ref={entryRef}
          {...sx(isFormula ? 'excel-formula-entry formula' : 'excel-formula-entry', styles.input, isFormula && styles.inputFormula)}
          aria-label={`Formula for ${activeAddress}`}
          value={draft}
          rows={1}
          spellCheck={false}
          onFocus={(event) => { setFocused(true); setSuggestionsDismissed(false); onFormulaFocusChange?.(true); updateCursor(event.currentTarget); }}
          onBlur={() => { setFocused(false); onFormulaFocusChange?.(false); onFormulaCommit(); }}
          onClick={(event) => { setSuggestionsDismissed(false); updateCursor(event.currentTarget); }}
          onScroll={(event) => syncHighlightScroll(event.currentTarget)}
          onKeyUp={(event) => updateCursor(event.currentTarget)}
          onChange={(event) => { setSuggestionsDismissed(false); onFormulaChange(event.target.value); updateCursor(event.currentTarget); }}
          onKeyDown={(event) => {
            if (event.key === 'F4' && isFormula && cycleActiveReference()) {
              event.preventDefault();
              return;
            }
            if (showSuggestions && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault();
              setSelectedSuggestionIndex((index) => {
                const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
                return (next + suggestions.length) % suggestions.length;
              });
              return;
            }
            if (showSuggestions && (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey))) {
              event.preventDefault();
              pickSuggestion(activeSuggestion);
              return;
            }
            if (event.key === 'Escape' && showSuggestions) {
              event.preventDefault();
              setSuggestionsDismissed(true);
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onFormulaCommit();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onFormulaReset();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {showCallout ? (
        <div {...sx('excel-formula-callout', styles.callout, !showSuggestions && styles.calloutSingle)}>
          <div {...sx(null, styles.calloutMain)}>
            {showHelp ? (
              <div {...sx(null, styles.helpPanel)}>
                <div {...sx(null, styles.helpHeader)}>
                  <span {...sx(null, styles.helpName)}>{activeHelp.name}</span>
                  <FormulaSignature signature={activeHelp.signature} activeArgumentIndex={hint.argumentIndex} />
                  <span {...sx(null, styles.helpDescription)}>{activeHelp.description}</span>
                </div>
                {hint.activeArgument ? (
                  <div {...sx(null, styles.argumentNote)}>
                    <strong {...sx(null, styles.argumentLabel)}>{hint.activeArgument}</strong>
                    {activeArgumentHelp?.description ? <span {...sx(null, styles.argumentDescription)}>{activeArgumentHelp.description}</span> : null}
                  </div>
                ) : null}
                {activeArgumentHelp?.options?.length ? (
                  <div {...sx(null, styles.optionRow)} aria-label="Argument options">
                    {activeArgumentHelp.options.slice(0, 4).map((option) => (
                      <span key={option} {...sx(null, styles.optionChip)}>{option}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {showSuggestions ? (
              <div {...sx(null, styles.suggestionList)} role="listbox" aria-label="Formula suggestions">
                {suggestions.map((item, index) => (
                  <button key={`${item.type}-${item.name}`} type="button" role="option" aria-selected={index === selectedSuggestionIndex} {...sx('excel-formula-suggestion', styles.suggestionButton, index === selectedSuggestionIndex && styles.suggestionButtonActive)} onMouseEnter={() => setSelectedSuggestionIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => pickSuggestion(item)}>
                    <span {...sx(null, styles.suggestionName)}>{suggestionIcon(item.type)}{item.name}</span>
                    <span {...sx(null, styles.suggestionSignature)}>{item.signature}</span>
                    <span {...sx(null, styles.suggestionCategory)}>{item.detail}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {hasDiagnostics ? (
              <div {...sx(null, styles.diagnostics)} aria-label="Formula diagnostics">
                {diagnostics.slice(0, 3).map((diagnostic, index) => (
                  <div key={`${diagnostic.code}-${index}`} {...sx(null, styles.diagnostic, diagnostic.severity === 'error' && styles.diagnosticError)}>
                    <span {...sx(null, styles.diagnosticMessage)}>{diagnostic.message}</span>
                    {diagnostic.suggestion ? (
                      <button {...sx(null, styles.diagnosticButton)} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyDiagnosticSuggestion(diagnostic)}>
                        Use {diagnostic.suggestion}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {showPreview ? (
              <div {...sx(null, styles.previewRow)}>
                <span>{formulaPreview.error ? 'Error' : 'Result'}</span>
                <code {...sx(null, styles.previewValue, formulaPreview.error && styles.previewError)}>{formulaPreview.displayValue || ' '}</code>
              </div>
            ) : null}
          </div>
          {showSuggestions && activeSuggestion ? (
            <aside {...sx(null, styles.sidePanel)}>
              <div {...sx(null, styles.sideTitle)}>{activeSuggestion.name}</div>
              <FormulaSignature signature={activeSuggestion.signature} />
              <span>{activeSuggestion.description}</span>
              {activeSuggestion.type === 'function' && activeHelp?.example ? <code {...sx(null, styles.example)}>{activeHelp.example}</code> : null}
            </aside>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
