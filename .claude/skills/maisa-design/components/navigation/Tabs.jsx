import React from 'react';

export function Tabs({ items = [], value, onChange, variant = 'underline', className = '' }) {
  return (
    <div className={['ms-tabs', 'ms-tabs--' + variant, className].filter(Boolean).join(' ')} role="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={active}
            className={'ms-tab' + (active ? ' ms-tab--active' : '')}
            onClick={() => onChange && onChange(it.value)}>
            {it.icon}
            {it.label}
            {it.count != null && <span className="ms-tab__count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
