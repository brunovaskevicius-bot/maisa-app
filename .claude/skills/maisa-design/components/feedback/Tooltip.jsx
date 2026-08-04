import React from 'react';

export function Tooltip({ content, side = 'top', children, className = '' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className={['ms-tooltip', className].filter(Boolean).join(' ')}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {open && <span className={'ms-tooltip__bubble ms-tooltip__bubble--' + side} role="tooltip">{content}</span>}
    </span>
  );
}
