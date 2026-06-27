import React from 'react';

export function NativeContextMenu({menu, onAction}) {
  if (!menu.open) return null;
  const items = [
    ['edit', '✎', 'Edit cell', 'Enter'],
    ['clear', '⌫', 'Clear contents', 'Del'],
    ['copy', '⧉', 'Copy value', ''],
    ['address', '⌖', 'Copy address', ''],
    ['sep'],
    ['widen', '↔', 'Widen column', '+20'],
    ['taller', '↕', 'Taller row', '+6'],
    ['resetSize', '□', 'Reset row/column size', ''],
    ['sep'],
    ['sample', 'ƒ', 'Set sample formula', ''],
  ];
  return (
    <div className="context-menu open" style={{left: menu.x, top: menu.y}} onPointerDown={(e) => e.preventDefault()}>
      {items.map((item, i) => item[0] === 'sep' ? <div key={`sep-${i}`} className="menu-separator" /> : (
        <button key={item[0]} className="menu-item" onClick={() => onAction(item[0])}>
          <span className="menu-icon">{item[1]}</span><span>{item[2]}</span><span className="menu-shortcut">{item[3]}</span>
        </button>
      ))}
    </div>
  );
}
