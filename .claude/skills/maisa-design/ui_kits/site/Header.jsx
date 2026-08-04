const { Logo, Button, Icon, IconButton } = window.MaisaDesignSystem_00adcb;

function Header() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,242,233,.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '0 var(--gutter)', height: 72, display: 'flex', alignItems: 'center', gap: 32 }}>
        <Logo size={26} />
        <nav style={{ display: 'flex', gap: 26, flex: 1 }}>
          {['Como funciona', 'Preços', 'Para quem é', 'Ajuda'].map((l) => (
            <a key={l} href="#" style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-body)', textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <a href="#" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-body)', textDecoration: 'none' }}>Entrar</a>
        <Button variant="primary" iconRight={<Icon name="arrow-right" size={18} />}>Testar 14 dias</Button>
      </div>
    </header>
  );
}

Object.assign(window, { Header });
