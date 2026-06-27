import React from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {cellAddress} from '../model/address.js';

export function FunctionPicker({open, activeAddress, formulaDraft, selection, onPick}) {
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
