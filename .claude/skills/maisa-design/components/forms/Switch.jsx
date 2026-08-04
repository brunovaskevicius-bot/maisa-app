import React from 'react';

export function Switch({ label, checked = false, disabled = false, className = '', ...rest }) {
  const cls = ['ms-switch', disabled && 'ms-switch--disabled', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} {...rest} />
      <span className={'ms-switch__track' + (checked ? ' ms-switch__track--on' : '')}><span className="ms-switch__knob" /></span>
      {label && <span className="ms-check__label">{label}</span>}
    </label>
  );
}
