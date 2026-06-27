import React, {memo, useMemo} from 'react';
import {cellAddress} from '../model/address.js';

export const Cell = memo(function Cell({row, col, x, top = 0, width, height, value, rawValue, spillInfo, note, link, cellStyle, validation, conditionalStyle, mergeRange, active, edited, onPointerDown, onContextMenu, onDoubleClick}) {
  const status = String(value).toLowerCase();
  const validationMessage = validation?.valid === false ? validation.failures?.[0]?.message || 'Invalid value' : '';
  const className = `cell ${active ? 'active-cell' : ''} ${edited ? 'edited-cell' : ''} ${spillInfo ? 'spill-cell' : ''} ${note ? 'note-cell' : ''} ${link?.href ? 'hyperlink-cell' : ''} ${validationMessage ? 'invalid-cell' : ''} ${conditionalStyle ? 'conditional-format-cell' : ''} ${mergeRange ? 'merged-cell' : ''} ${String(rawValue).trim().startsWith('=') ? 'formula-cell' : ''}`;
  const title = useMemo(() => (
    `${mergeRange ? `${cellAddress(mergeRange.r1, mergeRange.c1)}:${cellAddress(mergeRange.r2, mergeRange.c2)}` : cellAddress(row, col)}: ${rawValue}${spillInfo ? `\nSpill from ${cellAddress(spillInfo.origin.row, spillInfo.origin.col)}` : ''}${link?.href ? `\nLink: ${link.href}` : ''}${note ? `\nNote: ${note}` : ''}${validationMessage ? `\n${validationMessage}` : ''}`
  ), [col, link, mergeRange, note, rawValue, row, spillInfo, validationMessage]);
  return (
    <div
      className={className}
      aria-invalid={validationMessage ? 'true' : undefined}
      data-row={row}
      data-col={col}
      style={{left: x, top, width, height, ...(cellStyle || {}), ...(conditionalStyle || {})}}
      onPointerDown={(e) => onPointerDown(e, row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onDoubleClick={(e) => onDoubleClick(e, row, col)}
      title={title}>
      {col === 7 && row > 0 ? <span className={`status-pill status-${status.replace(/\s+/g, '-')}`}>{value}</span> : value}
    </div>
  );
});
