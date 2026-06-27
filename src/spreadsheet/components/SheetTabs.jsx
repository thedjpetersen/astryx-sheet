import React from 'react';

export function SheetTabs({
  workbook,
  activeSheetId,
  onActivateSheet,
  onAddSheet,
  onRenameActiveSheet,
  onRemoveActiveSheet,
}) {
  const sheets = workbook.sheetOrder.map((sheetId) => workbook.sheets.get(sheetId)).filter(Boolean);
  const canRemoveSheet = sheets.length > 1;

  return (
    <nav className="sheet-tabs" aria-label="Workbook sheets">
      <div className="sheet-tab-list" role="tablist" aria-label="Sheets">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <button
              key={sheet.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`sheet-tab ${isActive ? 'active' : ''}`}
              onClick={() => onActivateSheet(sheet.id)}
              title={sheet.name}
            >
              <span className="sheet-tab-name">{sheet.name}</span>
            </button>
          );
        })}
      </div>
      <div className="sheet-tab-actions">
        <button type="button" className="sheet-tab-action" onClick={onAddSheet} aria-label="Add sheet" title="Add sheet">+</button>
        <button type="button" className="sheet-tab-action text" onClick={onRenameActiveSheet} aria-label="Rename active sheet" title="Rename active sheet">Rename</button>
        <button
          type="button"
          className="sheet-tab-action"
          onClick={onRemoveActiveSheet}
          disabled={!canRemoveSheet}
          aria-label="Remove active sheet"
          title="Remove active sheet"
        >
          x
        </button>
      </div>
    </nav>
  );
}

export default SheetTabs;
