import React, {memo, useLayoutEffect, useRef} from 'react';
import {cellAddress} from '../model/address.js';

export const Cell = memo(function Cell({row, col, x, y, width, height, value, rawValue, active, edited, registerCell, onPointerDown, onContextMenu, onDoubleClick}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    registerCell(row, col, {x, y, width, height, el: ref.current});
    return () => registerCell(row, col, null);
  }, [row, col, x, y, width, height, registerCell]);

  const status = String(value).toLowerCase();
  const className = `cell ${active ? 'active-cell' : ''} ${edited ? 'edited-cell' : ''} ${String(rawValue).trim().startsWith('=') ? 'formula-cell' : ''}`;
  return (
    <div
      ref={ref}
      className={className}
      data-row={row}
      data-col={col}
      style={{left: x, top: 0, width, height}}
      onPointerDown={(e) => onPointerDown(e, row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onDoubleClick={(e) => onDoubleClick(e, row, col)}
      title={`${cellAddress(row, col)}: ${rawValue}`}>
      {col === 7 && row > 0 ? <span className={`status-pill status-${status.replace(/\s+/g, '-')}`}>{value}</span> : value}
    </div>
  );
});
