import React from 'react';

function Field({ label, hint, error, optional, htmlFor, children }) {
  return (
    <div className="ms-field">
      {label && <label className="ms-field__label" htmlFor={htmlFor}>{label}{optional && <span className="ms-field__optional"> (opcional)</span>}</label>}
      {children}
      {error ? <span className="ms-field__error">{error}</span> : hint ? <span className="ms-field__hint">{hint}</span> : null}
    </div>
  );
}

export function Select({ label, hint, error, optional, size = 'md', options = [], placeholder, id, className = '', children, ...rest }) {
  const cls = ['ms-select', size !== 'md' && 'ms-select--' + size, error && 'ms-input--invalid', className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <div className="ms-select-wrap">
        <select id={id} className={cls} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>))}
          {children}
        </select>
        <span className="ms-select__chevron">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
        </span>
      </div>
    </Field>
  );
}
