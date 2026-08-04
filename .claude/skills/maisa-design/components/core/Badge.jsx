import React from 'react';

export function Badge({ tone = 'neutral', variant = 'subtle', size = 'md', dot = false, className = '', children, ...rest }) {
  const cls = ['ms-badge', 'ms-badge--' + variant, 'ms-badge--' + tone, 'ms-badge--' + size, className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{dot && <span className="ms-badge__dot" />}{children}</span>;
}
