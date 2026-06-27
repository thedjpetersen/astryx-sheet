import React, {memo, useLayoutEffect, useMemo, useRef} from 'react';
import {cellAddress} from '../model/address.js';

export const Cell = memo(function Cell({row, col, x, y, width, height, value, rawValue, validation, active, edited, registerCell, onPointerDown, onContextMenu, onDoubleClick}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    registerCell(row, col, {x, y, width, height, el: ref.current});
    return () => registerCell(row, col, null);
  }, [row, col, x, y, width, height, registerCell]);

  const status = String(value).toLowerCase();
  const validationMessage = validation?.valid === false ? validation.failures?.[0]?.message || 'Invalid value' : '';
  const className = `cell ${active ? 'active-cell' : ''} ${edited ? 'edited-cell' : ''} ${validationMessage ? 'invalid-cell' : ''} ${String(rawValue).trim().startsWith('=') ? 'formula-cell' : ''}`;
  const title = useMemo(() => (
    `${cellAddress(row, col)}: ${rawValue}${validationMessage ? `\n${validationMessage}` : ''}`
  ), [col, rawValue, row, validationMessage]);
  return (
    <div
      ref={ref}
      className={className}
      aria-invalid={validationMessage ? 'true' : undefined}
      data-row={row}
      data-col={col}
      style={{left: x, top: 0, width, height}}
      onPointerDown={(e) => onPointerDown(e, row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onDoubleClick={(e) => onDoubleClick(e, row, col)}
      title={title}>
      {col === 7 && row > 0 ? <span className={`status-pill status-${status.replace(/\s+/g, '-')}`}>{value}</span> : value}
    </div>
  );
});
