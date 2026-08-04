import React from 'react';

export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={['ms-empty', className].filter(Boolean).join(' ')}>
      {icon && <span className="ms-empty__icon">{icon}</span>}
      {title && <h3 className="ms-empty__title">{title}</h3>}
      {description && <p className="ms-empty__desc">{description}</p>}
      {action && <div className="ms-empty__action">{action}</div>}
    </div>
  );
}
