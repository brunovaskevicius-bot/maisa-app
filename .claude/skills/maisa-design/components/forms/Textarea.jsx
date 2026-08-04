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

export function Textarea({ label, hint, error, optional, id, rows = 4, className = '', ...rest }) {
  const cls = ['ms-textarea', error && 'ms-textarea--invalid', className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <textarea id={id} rows={rows} className={cls} aria-invalid={error ? true : undefined} {...rest} />
    </Field>
  );
}
