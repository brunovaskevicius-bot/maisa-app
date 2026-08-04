import React from 'react';

export function Tag({ selected = false, onRemove, onClick, className = '', children, ...rest }) {
  const selectable = Boolean(onClick);
  const cls = ['ms-tag', selectable && 'ms-tag--selectable', selected && 'ms-tag--selected', className].filter(Boolean).join(' ');
  return (
    <span className={cls} onClick={onClick} role={selectable ? 'button' : undefined} tabIndex={selectable ? 0 : undefined} {...rest}>
      {children}
      {onRemove && (
        <button type="button" className="ms-tag__remove" aria-label="Remover" onClick={(e) => { e.stopPropagation(); onRemove(e); }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
        </button>
      )}
    </span>
  );
}
