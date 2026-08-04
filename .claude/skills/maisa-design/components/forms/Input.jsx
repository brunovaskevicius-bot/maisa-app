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

export function Input({ label, hint, error, optional, size = 'md', prefix, suffix, id, className = '', ...rest }) {
  const cls = ['ms-input', size !== 'md' && 'ms-input--' + size, error && 'ms-input--invalid', prefix && 'ms-input--with-prefix', suffix && 'ms-input--with-suffix', className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <div className="ms-input-wrap">
        {prefix && <span className="ms-input__affix ms-input__affix--prefix">{prefix}</span>}
        <input id={id} className={cls} aria-invalid={error ? true : undefined} {...rest} />
        {suffix && <span className="ms-input__affix ms-input__affix--suffix">{suffix}</span>}
      </div>
    </Field>
  );
}
