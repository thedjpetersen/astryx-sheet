import React, {memo} from 'react';
import {getCellDisplayValue, getCellRecord, getCellSpillInfo, getConditionalFormatStyle, getEffectiveCellStyle, getMergeAtCell, validateCellValue} from '../engine/index.js';
import {cellKey} from '../model/address.js';
import {defaultCellValue} from '../model/defaultData.js';
import {Cell} from './Cell.jsx';

export const RowFragment = memo(function RowFragment({
  row,
  y,
  height,
  columns,
  colMetrics,
  rowMetrics,
  firstRenderedRow,
  firstRenderedCol,
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
  return (
    <div className="row-fragment" style={{top: y, left: 0, height, width: colMetrics.total()}}>
      {columns.map((col) => {
        const sheet = workbook?.sheets.get(sheetId);
        const merge = sheet ? getMergeAtCell(sheet, row, col) : null;
        const mergeRange = merge?.range;
        if (mergeRange) {
          const renderRow = Math.max(mergeRange.r1, firstRenderedRow);
          const renderCol = Math.max(mergeRange.c1, firstRenderedCol);
          if (row !== renderRow || col !== renderCol) return null;
        }

        const cellRow = mergeRange ? mergeRange.r1 : row;
        const cellCol = mergeRange ? mergeRange.c1 : col;
        const x = colMetrics.offset(cellCol);
        const absoluteY = mergeRange ? rowMetrics.offset(cellRow) : y;
        const top = absoluteY - y;
        const width = mergeRange ? colMetrics.span(mergeRange.c1, mergeRange.c2) : colMetrics.size(col);
        const cellHeight = mergeRange ? rowMetrics.span(mergeRange.r1, mergeRange.r2) : height;
        const key = cellKey(cellRow, cellCol);
        const edited = dataRef.current.has(key);
        const rawValue = edited ? dataRef.current.get(key) : getDefaultCellValue(cellRow, cellCol);
        const value = workbook ? getCellDisplayValue(workbook, sheetId, cellRow, cellCol, {getDefaultCellValue}) : rawValue;
        const cellRecord = workbook ? getCellRecord(workbook, sheetId, cellRow, cellCol) : null;
        const effectiveCellStyle = sheet ? getEffectiveCellStyle(sheet, cellRow, cellCol, cellRecord?.style) : cellRecord?.style;
        const spillInfo = sheet ? getCellSpillInfo(sheet, cellRow, cellCol) : null;
        const conditionalValue = cellRecord?.formula && 'computedValue' in cellRecord ? cellRecord.computedValue : rawValue;
        const conditionalStyle = sheet ? getConditionalFormatStyle(sheet, cellRow, cellCol, conditionalValue) : null;
        const validationValue = typeof rawValue === 'string' && rawValue.trim().startsWith('=') ? value : rawValue;
        const validation = sheet ? validateCellValue(sheet, cellRow, cellCol, validationValue) : null;
        const active = mergeRange
          ? activeCell.row >= mergeRange.r1 && activeCell.row <= mergeRange.r2 && activeCell.col >= mergeRange.c1 && activeCell.col <= mergeRange.c2
          : activeCell.row === row && activeCell.col === col;
        return (
          <Cell
            key={col}
            row={cellRow}
            col={cellCol}
            x={x}
            top={top}
            width={width}
            height={cellHeight}
            value={value}
            rawValue={rawValue}
            spillInfo={spillInfo}
            note={cellRecord?.note}
            link={cellRecord?.link}
            cellStyle={effectiveCellStyle}
            validation={validation}
            conditionalStyle={conditionalStyle}
            mergeRange={mergeRange}
            active={active}
            edited={edited}
            onPointerDown={onPointerDown}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
          />
        );
      })}
    </div>
  );
});
