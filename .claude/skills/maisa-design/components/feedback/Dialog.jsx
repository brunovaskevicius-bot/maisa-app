import React from 'react';

export function Dialog({ open = true, title, description, size = 'md', onClose, footer, className = '', children }) {
  if (!open) return null;
  return (
    <div className="ms-dialog__overlay" onClick={onClose} role="presentation">
      <div className={['ms-dialog', size !== 'md' && 'ms-dialog--' + size, className].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button type="button" className="ms-iconbtn ms-iconbtn--sm ms-iconbtn--ghost ms-dialog__close" aria-label="Fechar" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
          </button>
        )}
        {title && <div className="ms-dialog__head"><h2 className="ms-dialog__title">{title}</h2></div>}
        {description && <p className="ms-dialog__desc">{description}</p>}
        {children && <div className="ms-dialog__body">{children}</div>}
        {footer && <div className="ms-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
