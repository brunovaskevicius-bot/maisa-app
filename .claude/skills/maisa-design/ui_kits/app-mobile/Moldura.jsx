const { Icon } = window.MaisaDesignSystem_00adcb;

function Moldura({ children, tab, setTab }) {
  const abas = [
    { id: 'hoje', label: 'Hoje', icon: 'home' },
    { id: 'conversas', label: 'Conversas', icon: 'chat-bubble-left-right', badge: 2 },
    { id: 'agenda', label: 'Agenda', icon: 'calendar-days' },
    { id: 'notas', label: 'Notas', icon: 'document-text' },
  ];
  return (
    <div style={{ width: 390, height: 844, borderRadius: 46, background: 'var(--ink-900)', padding: 10, boxShadow: 'var(--shadow-lg)', flex: '0 0 auto' }}>
      <div style={{ position: 'relative', height: '100%', borderRadius: 37, background: 'var(--surface-page)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 50, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>14:32</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none" aria-hidden="true"><rect x="0.5" y="0.5" width="20" height="11" rx="3.2" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor"/><path d="M22 4v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity=".4"/></svg>
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</div>
        <div style={{ flex: '0 0 auto', display: 'flex', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)', padding: '8px 6px 22px' }}>
          {abas.map((a) => {
            const on = a.id === tab;
            return (
              <button key={a.id} onClick={() => setTab(a.id)} style={{ flex: 1, minHeight: 'var(--tap-min)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 0, background: 'transparent', cursor: 'pointer', color: on ? 'var(--brand-text)' : 'var(--text-subtle)' }}>
                <span style={{ position: 'relative' }}>
                  <Icon name={a.icon} variant={on ? 'solid' : 'outline'} size={23} />
                  {a.badge && <span style={{ position: 'absolute', top: -3, right: -8, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{a.badge}</span>}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500 }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TopoApp({ titulo, sub, acao }) {
  return (
    <div style={{ padding: '10px 20px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ font: 'var(--type-h2)', fontSize: 28, letterSpacing: 'var(--tracking-display)' }}>{titulo}</h1>
        {sub && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
      {acao}
    </div>
  );
}

Object.assign(window, { Moldura, TopoApp });
