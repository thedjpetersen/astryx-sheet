import React from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import {cellAddress} from '../model/address.js';
import {displayCellValue, readCell} from '../model/formulas.js';

export function InspectorPanel({gridConfig, getDefaultCellValue, view, activeCell, selection, rowOverrides, colOverrides, cellMetaRef, rowMetaRef, edits, calculationStats, fps, dataRef}) {
  const selectedText = selection ? `${cellAddress(selection.r1, selection.c1)}:${cellAddress(selection.r2, selection.c2)}` : 'none';
  const visibleCells = Math.max(0, (view.rowEnd - view.rowStart + 1) * (view.colEnd - view.colStart + 1));
  const activeRaw = readCell(dataRef, activeCell.row, activeCell.col, getDefaultCellValue);
  const activeDisplay = displayCellValue(dataRef, activeCell.row, activeCell.col, getDefaultCellValue);
  const metricsRows = [
    {id: 'mounted', metric: 'Mounted cells', value: visibleCells.toLocaleString(), status: 'Live'},
    {id: 'total', metric: 'Logical cells', value: (gridConfig.rows * gridConfig.cols).toLocaleString(), status: 'Virtual'},
    {id: 'edits', metric: 'Edited cells', value: String(edits), status: 'Sparse'},
    {id: 'formulas', metric: 'Formula cells', value: String(calculationStats?.formulas || 0), status: 'Calc'},
    {id: 'cached', metric: 'Cached formulas', value: String(calculationStats?.cached || 0), status: 'Cache'},
    {id: 'errors', metric: 'Formula errors', value: String(calculationStats?.errors || 0), status: 'Calc'},
    {id: 'rows', metric: 'Custom rows', value: String(rowOverrides.size), status: 'Map'},
    {id: 'cols', metric: 'Custom columns', value: String(colOverrides.size), status: 'Map'},
    {id: 'fps', metric: 'Approx FPS', value: String(fps), status: 'rAF'},
  ];
  const columns = [
    {key: 'metric', header: 'Metric', width: proportional(1)},
    {key: 'value', header: 'Value', align: 'end', width: pixel(92)},
    {key: 'status', header: 'Mode', align: 'center', width: pixel(88), renderCell: (item) => <Badge variant={item.status === 'Live' ? 'success' : item.status === 'Virtual' ? 'purple' : item.status === 'Calc' ? 'warning' : 'blue'} label={item.status} />},
  ];
  return (
    <Card className="side-panel" padding={4}>
      <div className="panel-header">
        <div>
          <Heading level={2}>Workbook internals</Heading>
          <Text type="supporting" display="block">Powered by Astryx primitives + ref-first hot paths.</Text>
        </div>
        <StatusDot variant="success" label="Live" isPulsing />
      </div>
      <div className="active-card">
        <Text type="label" display="block">{cellAddress(activeCell.row, activeCell.col)}</Text>
        <Text type="supporting" display="block" maxLines={1}>Raw: {String(activeRaw)}</Text>
        <Text type="supporting" display="block" maxLines={1}>Display: {String(activeDisplay)}</Text>
      </div>
      <ProgressBar value={Math.min(100, visibleCells / 8)} label="Viewport budget" hasValueLabel variant="accent" />
      <Table data={metricsRows} columns={columns} idKey="id" density="compact" dividers="rows" hasHover textOverflow="truncate" />
      <div className="checklist">
        <div className="check"><StatusDot variant="accent" label="Selection" /><span><b>Selection</b><br />{selectedText}</span></div>
        <div className="check"><StatusDot variant="success" label="Geometry" /><span><b>Effect geometry</b><br />Rows tracked: {rowMetaRef.current.size}; cells tracked: {cellMetaRef.current.size}.</span></div>
        <div className="check"><StatusDot variant="warning" label="Render split" /><span><b>Render loop split</b><br />Scroll transforms headers immediately; React updates visible range on rAF.</span></div>
      </div>
      <pre className="mini-code">{`Mutable refs:
cellDataRef      -> Map<"row:col", value>
rowHeightsRef    -> Map<row, px>
colWidthsRef     -> Map<col, px>
rowMetaRef       -> Map<row, { y, h }>
cellMetaRef      -> Map<"r:c", { x, y, w, h }>
selectionRef     -> anchor + live extent

Hot paths:
- drag selection draws a DOM overlay
- scroll moves headers via transform
- resize writes sparse maps, then rAF renders`}</pre>
    </Card>
  );
}
