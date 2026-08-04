import React from 'react';

export function StatCard({ label, value, icon, delta, deltaDirection = 'up', footnote, className = '' }) {
  return (
    <div className={['ms-card', 'ms-card--pad-md', 'ms-stat', className].filter(Boolean).join(' ')}>
      <div className="ms-stat__head">
        <span className="ms-stat__label">{label}</span>
        {icon && <span className="ms-stat__icon">{icon}</span>}
      </div>
      <span className="ms-stat__value">{value}</span>
      {(delta || footnote) && (
        <div className="ms-stat__foot">
          {delta && <span className={'ms-stat__delta ms-stat__delta--' + deltaDirection}>{deltaDirection === 'up' ? '↑' : '↓'} {delta}</span>}
          {footnote && <span>{footnote}</span>}
        </div>
      )}
    </div>
  );
}
