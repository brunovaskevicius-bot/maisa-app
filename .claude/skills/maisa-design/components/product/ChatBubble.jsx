import React from 'react';

export function ChatBubble({ from = 'in', author, time, status, children, className = '' }) {
  if (from === 'note') {
    return <div className="ms-chat-row" style={{ justifyContent: 'center' }}><div className="ms-bubble ms-bubble--note">{children}</div></div>;
  }
  const out = from === 'out';
  return (
    <div className={['ms-chat-row', out && 'ms-chat-row--out', className].filter(Boolean).join(' ')}>
      <div className={'ms-bubble ms-bubble--' + (out ? 'out' : 'in')}>
        {author && <span className="ms-bubble__author">{author}</span>}
        <div>{children}</div>
        {(time || status) && (
          <div className="ms-bubble__meta">
            {time}
            {status === 'read' && <svg width="14" height="10" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6.5 4 9.5 10 2.5" /><path d="M7.5 8.6 8.8 9.9 15 2.5" /></svg>}
            {status === 'sent' && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6.5 4 9.5 11 2.5" /></svg>}
          </div>
        )}
      </div>
    </div>
  );
}
