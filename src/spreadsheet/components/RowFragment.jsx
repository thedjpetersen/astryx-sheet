import React, {memo, useLayoutEffect, useRef} from 'react';
import {getCellDisplayValue} from '../engine/index.js';
import {cellKey} from '../model/address.js';
import {defaultCellValue} from '../model/defaultData.js';
import {Cell} from './Cell.jsx';

export const RowFragment = memo(function RowFragment({
  row,
  y,
  height,
  columns,
  colMetrics,
  registerRow,
  registerCell,
  activeCell,
  workbook,
  sheetId,
  dataRef,
  dataVersion,
  getDefaultCellValue = defaultCellValue,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    registerRow(row, {y, height, el: ref.current});
    return () => registerRow(row, null);
  }, [row, y, height, registerRow]);

  return (
    <div ref={ref} className="row-fragment" style={{top: y, left: 0, height, width: colMetrics.total()}}>
      {columns.map((col) => {
        const x = colMetrics.offset(col);
        const width = colMetrics.size(col);
        const key = cellKey(row, col);
        const edited = dataRef.current.has(key);
        const rawValue = edited ? dataRef.current.get(key) : getDefaultCellValue(row, col);
        const value = workbook ? getCellDisplayValue(workbook, sheetId, row, col, {getDefaultCellValue}) : rawValue;
        return (
          <Cell
            key={col}
            row={row}
            col={col}
            x={x}
            y={y}
            width={width}
            height={height}
            value={value}
            rawValue={rawValue}
            active={activeCell.row === row && activeCell.col === col}
            edited={edited}
            registerCell={registerCell}
            onPointerDown={onPointerDown}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
          />
        );
      })}
    </div>
  );
});
