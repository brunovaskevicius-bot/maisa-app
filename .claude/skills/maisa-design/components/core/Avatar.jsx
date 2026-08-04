import React from 'react';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name = '', src, size = 'md', status, className = '', style, ...rest }) {
  const cls = ['ms-avatar', 'ms-avatar--' + size, className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={style} title={name || undefined} {...rest}>
      {src ? <img className="ms-avatar__img" src={src} alt={name} /> : initials(name)}
      {status && <span className={'ms-avatar__status ms-avatar__status--' + status} />}
    </span>
  );
}
