import React from 'react';

export function Logo({ size = 28, tone = 'default', dot = true, as = 'span', className = '', style, ...rest }) {
  const Tag = as;
  const cls = ['ms-logo', tone !== 'default' && 'ms-logo--' + tone, className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} style={{ fontSize: size, ...style }} {...rest}>
      maisa{dot && <span className="ms-logo__dot">.</span>}
    </Tag>
  );
}
