import React from 'react';

export function Radio({ label, description, checked, disabled = false, className = '', ...rest }) {
  const cls = ['ms-check', disabled && 'ms-check--disabled', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input type="radio" checked={checked} disabled={disabled} {...rest} />
      <span className={'ms-check__box ms-check__box--radio' + (checked ? ' ms-check__box--checked' : '')}>
        {checked && <span className="ms-check__radio-dot" />}
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
