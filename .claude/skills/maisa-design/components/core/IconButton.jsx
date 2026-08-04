import React from 'react';

export function IconButton({ icon, label, variant = 'ghost', size = 'md', round = false, disabled = false, className = '', ...rest }) {
  const cls = ['ms-iconbtn', 'ms-iconbtn--' + variant, 'ms-iconbtn--' + size, round && 'ms-iconbtn--round', className].filter(Boolean).join(' ');
  return <button type="button" className={cls} aria-label={label} title={label} disabled={disabled} {...rest}>{icon}</button>;
}
