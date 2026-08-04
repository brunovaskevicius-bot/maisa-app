const { Card, Icon, Button, Badge } = window.MaisaDesignSystem_00adcb;

const PLANOS = [
  { nome: 'Solo', preco: '79', desc: 'Pra quem atende sozinho.', itens: ['1 número de WhatsApp', 'Agenda e lembretes', 'Até 300 conversas por mês', 'Suporte por WhatsApp'], cta: 'Começar', destaque: false },
  { nome: 'Pro', preco: '149', desc: 'O mais escolhido por salões e clínicas.', itens: ['Tudo do Solo', 'NF-e automática', 'Conversas ilimitadas', 'Até 5 profissionais na agenda', 'Relatório mensal'], cta: 'Testar 14 dias', destaque: true },
  { nome: 'Equipe', preco: '289', desc: 'Vários profissionais, uma maisa só.', itens: ['Tudo do Pro', 'Profissionais ilimitados', '2 números de WhatsApp', 'Integração com seu sistema'], cta: 'Falar com a gente', destaque: false },
];

function Precos() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: 'var(--section-y) var(--gutter)' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ font: 'var(--type-h1)', fontSize: 44, letterSpacing: 'var(--tracking-display)' }}>Preço de secretária? Não.</h2>
        <p style={{ font: 'var(--type-body)', fontSize: 18, color: 'var(--text-muted)', marginTop: 12 }}>Sem taxa de instalação, sem fidelidade. Cancela pelo próprio WhatsApp.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 48, alignItems: 'start' }}>
        {PLANOS.map((p) => (
          <Card key={p.nome} pad="lg" variant={p.destaque ? 'raised' : 'default'} style={p.destaque ? { outline: '2px solid var(--brand)', outlineOffset: -2 } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ font: 'var(--type-h3)', fontSize: 20 }}>{p.nome}</h3>
              {p.destaque && <Badge tone="brand" variant="solid" size="sm">Mais escolhido</Badge>}
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--text-muted)', marginTop: 6 }}>{p.desc}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 22 }}>
              <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 500 }}>R$</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, letterSpacing: 'var(--tracking-display)', color: 'var(--text-strong)' }}>{p.preco}</span>
              <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>/mês</span>
            </div>
            <div style={{ marginTop: 20 }}>
              <Button variant={p.destaque ? 'primary' : 'secondary'} size="md" block>{p.cta}</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              {p.itens.map((i) => (
                <span key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14.5, color: 'var(--text-body)' }}>
                  <Icon name="check" size={18} color="var(--brand)" strokeWidth={2.1} />{i}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

const PERGUNTAS = [
  ['Preciso trocar meu número?', 'Não. A maisa entra no número que seus clientes já têm salvo — é uma conexão oficial com o WhatsApp Business.'],
  ['E se eu quiser responder eu mesmo?', 'É só digitar. Assim que você escreve na conversa, a maisa sai de cena e só volta quando você mandar.'],
  ['A nota fiscal funciona na minha cidade?', 'Hoje emitimos em 780 municípios. A gente confirma a sua na hora do cadastro, antes de você pagar qualquer coisa.'],
  ['O cliente percebe que é um robô?', 'A maisa se apresenta como assistente do seu negócio. Nada de fingir que é você.'],
];

function Perguntas() {
  const [aberta, setAberta] = React.useState(0);
  return (
    <section style={{ maxWidth: 'var(--container-narrow)', margin: '0 auto', padding: '0 var(--gutter) var(--section-y)' }}>
      <h2 style={{ font: 'var(--type-h1)', fontSize: 38, letterSpacing: 'var(--tracking-display)', marginBottom: 28 }}>Perguntas que sempre chegam</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PERGUNTAS.map(([q, a], i) => {
          const on = i === aberta;
          return (
            <div key={q} className="ms-card ms-card--pad-none" style={{ overflow: 'hidden' }}>
              <button onClick={() => setAberta(on ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 22px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: 'var(--text-strong)' }}>{q}</span>
                <span style={{ color: 'var(--text-muted)', transform: on ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-out)' }}><Icon name="chevron-down" size={20} /></span>
              </button>
              {on && <p style={{ padding: '0 22px 20px', fontSize: 15.5, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '62ch' }}>{a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

Object.assign(window, { Precos, Perguntas });
