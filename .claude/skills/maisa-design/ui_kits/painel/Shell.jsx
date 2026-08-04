const { Logo, Icon, IconButton, Avatar, Badge, Button } = window.MaisaDesignSystem_00adcb;

const NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'conversas', label: 'Conversas', icon: 'chat-bubble-left-right', count: 2 },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'notas', label: 'Notas fiscais', icon: 'document-text' },
  { id: 'ajustes', label: 'Ajustes', icon: 'cog-6-tooth' },
];

function Sidebar({ view, setView }) {
  return (
    <aside style={{ width: 'var(--sidebar-w)', flex: '0 0 auto', background: 'var(--surface-card)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '20px 14px' }}>
      <div style={{ padding: '0 8px 22px' }}><Logo size={26} /></div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => {
          const on = n.id === view;
          return (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 10px', border: 0, cursor: 'pointer',
              borderRadius: 'var(--radius-control)', background: on ? 'var(--brand-soft)' : 'transparent',
              color: on ? 'var(--brand-text)' : 'var(--text-muted)', fontWeight: on ? 600 : 500, fontSize: 15,
              transition: 'var(--transition-control)', textAlign: 'left',
            }}>
              <Icon name={n.icon} size={20} strokeWidth={on ? 1.9 : 1.6} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.count ? <span className="ms-tab__count" style={{ background: on ? 'var(--green-200)' : 'var(--ink-100)' }}>{n.count}</span> : null}
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ms-card ms-card--accent ms-card--pad-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="sparkles" size={17} color="var(--accent-text)" />
            <strong style={{ fontSize: 13, color: 'var(--accent-text)' }}>maisa está no ar</strong>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ochre-700)', lineHeight: 1.45 }}>Respondeu 31 mensagens hoje sem te chamar.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderTop: '1px solid var(--border-subtle)' }}>
          <Avatar name="Renata Lasca" size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Renata Lasca</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Studio Lasca · Pro</div>
          </div>
          <IconButton size="sm" icon={<Icon name="chevron-up" size={16} />} label="Conta" />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, action }) {
  return (
    <header style={{ height: 'var(--header-h)', flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-page)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ font: 'var(--type-h3)', letterSpacing: 'var(--tracking-tight)' }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <div style={{ position: 'relative', width: 260 }}>
        <span className="ms-input__affix ms-input__affix--prefix"><Icon name="magnifying-glass" size={18} /></span>
        <input className="ms-input ms-input--sm ms-input--with-prefix" placeholder="Buscar cliente ou nota" />
      </div>
      <IconButton variant="outline" icon={<Icon name="bell" size={19} />} label="Notificações" />
      {action}
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar, NAV });
