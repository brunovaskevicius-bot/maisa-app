import React from 'react';

export function Button({ variant = 'primary', size = 'md', block = false, loading = false, disabled = false, iconLeft, iconRight, as = 'button', className = '', children, ...rest }) {
  const Tag = as;
  const cls = ['ms-btn', 'ms-btn--' + variant, 'ms-btn--' + size, block && 'ms-btn--block', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} disabled={Tag === 'button' ? (disabled || loading) : undefined} aria-disabled={disabled || loading || undefined} {...rest}>
      {loading ? <span className="ms-btn__spinner" aria-hidden="true" /> : iconLeft}
      {children}
      {iconRight}
    </Tag>
  );
}
