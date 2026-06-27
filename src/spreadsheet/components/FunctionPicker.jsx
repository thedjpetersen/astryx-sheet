import React, {useMemo, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Search, Sigma, X} from 'lucide-react';
import {cellAddress} from '../model/address.js';
import {getFormulaFunctionHelp, getFormulaSignatureParts, listFormulaFunctions} from '../model/formulas.js';

function FunctionSignature({signature}) {
  const parts = getFormulaSignatureParts(signature);
  if (!parts.hasCall) return <span>{signature}</span>;
  return (
    <span className="formula-signature-rich">
      <span className="formula-signature-name">{parts.name}</span>
      <span className="formula-signature-paren">(</span>
      {parts.arguments.map((argument, index) => (
        <React.Fragment key={`${argument.raw}-${index}`}>
          {index > 0 ? <span className="formula-signature-separator">, </span> : null}
          <span className={['formula-signature-argument', argument.optional ? 'optional' : '', argument.variadic ? 'variadic' : ''].filter(Boolean).join(' ')}>
            {argument.raw}
          </span>
        </React.Fragment>
      ))}
      <span className="formula-signature-paren">)</span>
    </span>
  );
}

export function FunctionPicker({open, activeAddress, formulaDraft, selection, onPick, onDraft, onClose}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedName, setSelectedName] = useState('SUM');
  const range = selection ? `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}` : activeAddress;
  const formulaContext = selection ? {
    range,
    firstCell: cellAddress(selection.r1, selection.c1),
    lastCell: cellAddress(selection.r2, selection.c2),
    firstColumnRange: `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c1)}`,
    lastColumnRange: `${cellAddress(selection.r1, selection.c2)}:${cellAddress(selection.r2, selection.c2)}`,
    lastColumnIndex: Math.max(1, selection.c2 - selection.c1 + 1),
    rowCount: selection.r2 - selection.r1 + 1,
  } : {range: activeAddress, firstCell: activeAddress, lastCell: activeAddress};
  const functions = useMemo(() => listFormulaFunctions({pickerOnly: true}), []);
  const categories = useMemo(() => ['All', ...Array.from(new Set(functions.map((item) => item.category))).sort()], [functions]);
  const filteredFunctions = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return functions.filter((item) => {
      const help = getFormulaFunctionHelp(item.name, formulaContext);
      const matchesCategory = category === 'All' || item.category === category;
      const haystack = `${item.name} ${item.category} ${help.signature} ${help.description}`.toUpperCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [category, formulaContext, functions, query]);
  const activeItem = filteredFunctions.length ? filteredFunctions.find((item) => item.name === selectedName) || filteredFunctions[0] : null;
  const activeHelp = activeItem ? getFormulaFunctionHelp(activeItem.name, formulaContext) : null;
  if (!open) return null;
  return (
    <Card className="formula-popover" padding={3} variant="default">
      <div className="formula-popover-header">
        <div>
          <Heading level={3}>Functions</Heading>
          <Text type="supporting" display="block">{activeAddress} · {range}</Text>
        </div>
        <button className="formula-icon-button" type="button" aria-label="Close functions" onClick={onClose}><X size={16} aria-hidden /></button>
      </div>
      <label className="function-search">
        <Search size={15} aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search functions" />
      </label>
      <div className="function-category-row" aria-label="Function categories">
        {categories.map((item) => (
          <button key={item} type="button" className={`function-category ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="function-picker-body">
        <div className="function-list" role="listbox" aria-label="Functions">
          {filteredFunctions.map((item) => {
            const help = getFormulaFunctionHelp(item.name, formulaContext);
            return (
              <button
                key={item.name}
                type="button"
                className={`function-list-item ${activeItem?.name === item.name ? 'active' : ''}`}
                onMouseEnter={() => setSelectedName(item.name)}
                onFocus={() => setSelectedName(item.name)}
                onClick={() => onDraft?.(item.name)}>
                <span className="function-list-name">{item.name}</span>
                <span className="function-list-meta">{item.category}</span>
                <span className="function-list-signature">{help.signature}</span>
              </button>
            );
          })}
          <button type="button" className="function-list-item" onMouseEnter={() => setSelectedName('ARITH')} onClick={() => onDraft?.('ARITH')}>
            <span className="function-list-name">A1+B1</span>
            <span className="function-list-meta">Arithmetic</span>
            <span className="function-list-signature">cell + cell</span>
          </button>
        </div>
        <aside className="function-detail">
          {activeHelp ? (
            <>
              <div className="function-detail-title"><Sigma size={18} aria-hidden />{activeHelp.name}</div>
              <div className="function-signature rich"><FunctionSignature signature={activeHelp.signature} /></div>
              <Text type="supporting" display="block">{activeHelp.description}</Text>
              <div className="formula-preview">{activeHelp.example}</div>
            </>
          ) : <Text type="supporting">No matches</Text>}
        </aside>
      </div>
      <div className="formula-preview">Current: {formulaDraft || '=SUM(A1:B2)'}</div>
      {activeHelp ? <Button label={`Insert ${activeHelp.name}`} variant="primary" size="sm" onClick={() => onPick(activeHelp.name)} /> : null}
    </Card>
  );
}
