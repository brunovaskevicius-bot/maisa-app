import React from 'react';

export function Checkbox({ label, description, checked, disabled = false, className = '', ...rest }) {
  const cls = ['ms-check', disabled && 'ms-check--disabled', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input type="checkbox" checked={checked} disabled={disabled} {...rest} />
      <span className={'ms-check__box' + (checked ? ' ms-check__box--checked' : '')}>
        {checked && <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>}
      </span>
      {(label || description) && (
        <span className="ms-check__text">
          {label && <span className="ms-check__label">{label}</span>}
          {description && <span className="ms-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
