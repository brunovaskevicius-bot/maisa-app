const { Logo, Button, Icon } = window.MaisaDesignSystem_00adcb;

function Chamada() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '0 var(--gutter) var(--section-y)' }}>
      <div style={{ background: 'var(--brand)', borderRadius: 'var(--radius-2xl)', padding: '64px 56px', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px' }}>
          <h2 style={{ font: 'var(--type-h1)', fontSize: 44, letterSpacing: 'var(--tracking-display)', color: 'var(--white)' }}>Deixa a maisa atender hoje à tarde</h2>
          <p style={{ fontSize: 18, color: 'var(--green-100)', marginTop: 14, maxWidth: '44ch' }}>Quatorze dias de graça, sem cartão. Se não gostar, é só desconectar.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="accent" size="lg" iconRight={<Icon name="arrow-right" size={19} />}>Testar de graça</Button>
          <Button variant="soft" size="lg">Falar com a gente</Button>
        </div>
      </div>
    </section>
  );
}

function Rodape() {
  const cols = [
    ['Produto', ['Como funciona', 'Preços', 'Nota fiscal', 'Agenda', 'Novidades']],
    ['Para quem é', ['Salões e barbearias', 'Clínicas', 'Estúdios', 'Oficinas', 'Petshops']],
    ['A gente', ['Sobre a maisa', 'Blog', 'Trabalhe com a gente', 'Contato']],
    ['Jurídico', ['Termos de uso', 'Privacidade', 'LGPD', 'Status']],
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '56px var(--gutter) 32px', display: 'grid', gridTemplateColumns: '1.4fr repeat(4,1fr)', gap: 32 }}>
        <div>
          <Logo size={24} />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12, maxWidth: '28ch', lineHeight: 1.6 }}>A secretária de IA que atende no WhatsApp, marca horário e emite nota fiscal.</p>
        </div>
        {cols.map(([t, links]) => (
          <div key={t}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 14 }}>{t}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {links.map((l) => <a key={l} href="#" style={{ fontSize: 14.5, color: 'var(--text-body)', textDecoration: 'none' }}>{l}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '20px var(--gutter) 40px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>© 2026 maisa tecnologia ltda · CNPJ 41.882.330/0001-07</span>
        <span style={{ fontSize: 13, color: 'var(--text-subtle)', marginLeft: 'auto' }}>Feito em São Paulo</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Chamada, Rodape });
