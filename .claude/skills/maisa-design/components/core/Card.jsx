import React from 'react';

export function Card({ variant = 'default', pad = 'md', interactive = false, as = 'div', className = '', children, ...rest }) {
  const Tag = as;
  const cls = ['ms-card', variant !== 'default' && 'ms-card--' + variant, 'ms-card--pad-' + pad, interactive && 'ms-card--interactive', className].filter(Boolean).join(' ');
  return <Tag className={cls} {...rest}>{children}</Tag>;
}
