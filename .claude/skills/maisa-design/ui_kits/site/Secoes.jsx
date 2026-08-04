const { Card, Icon, Button, Badge, Avatar } = window.MaisaDesignSystem_00adcb;

function Faixa() {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '22px var(--gutter)', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: 13.5, color: 'var(--text-subtle)' }}>Já atende em</span>
        {['salões', 'clínicas', 'estúdios de tatuagem', 'consultórios', 'oficinas', 'petshops'].map((t) => (
          <span key={t} style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--ink-300)', letterSpacing: '-.02em' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Passos() {
  const passos = [
    { ic: 'link', t: 'Conecta o WhatsApp', d: 'O mesmo número que seus clientes já salvaram. Leva uns dez minutos e não precisa de técnico.' },
    { ic: 'chat-bubble-left-right', t: 'A maisa atende', d: 'Responde dúvida de preço, oferece horário, confirma e reagenda. Você acompanha tudo pelo painel.' },
    { ic: 'document-text', t: 'A nota sai sozinha', d: 'Pagou, a NF-e é emitida e o link vai direto pro WhatsApp do cliente. Sem planilha, sem correria no fim do mês.' },
  ];
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: 'var(--section-y) var(--gutter)' }}>
      <h2 style={{ font: 'var(--type-h1)', fontSize: 44, letterSpacing: 'var(--tracking-display)', maxWidth: '18ch' }}>Três passos e ela já está trabalhando</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 44 }}>
        {passos.map((p, i) => (
          <Card key={p.t} pad="lg">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 'var(--radius-lg)', background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name={p.ic} size={23} /></span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-subtle)', marginTop: 20 }}>0{i + 1}</div>
            <h3 style={{ font: 'var(--type-h3)', fontSize: 22, marginTop: 4 }}>{p.t}</h3>
            <p style={{ fontSize: 15.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 10 }}>{p.d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Recursos() {
  const items = [
    { ic: 'calendar-days', t: 'Agenda que se organiza', d: 'Ela conhece seus horários, a duração de cada serviço e o intervalo do almoço.' },
    { ic: 'banknotes', t: 'Cobrança e Pix', d: 'Manda o link de pagamento e avisa quando cai.' },
    { ic: 'receipt-percent', t: 'NF-e automática', d: 'Emite pela sua prefeitura e guarda tudo organizado por mês.' },
    { ic: 'bell', t: 'Lembrete na véspera', d: 'Menos falta, menos horário vago.' },
    { ic: 'users', t: 'Ficha do cliente', d: 'Histórico, preferências e o que ele já gastou, sempre à mão.' },
    { ic: 'shield-check', t: 'Você no controle', d: 'Entrou na conversa? A maisa sai de cena na hora.' },
  ];
  return (
    <section style={{ background: 'var(--surface-inverse)' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: 'var(--section-y) var(--gutter)' }}>
        <h2 style={{ font: 'var(--type-h1)', fontSize: 44, letterSpacing: 'var(--tracking-display)', color: 'var(--cream-50)', maxWidth: '20ch' }}>O trabalho chato, feito enquanto você atende</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32, marginTop: 48 }}>
          {items.map((it) => (
            <div key={it.t}>
              <Icon name={it.ic} size={24} color="var(--green-300)" />
              <h3 style={{ font: 'var(--type-h3)', fontSize: 19, color: 'var(--cream-50)', marginTop: 14 }}>{it.t}</h3>
              <p style={{ fontSize: 15, color: 'var(--green-200)', lineHeight: 1.6, marginTop: 6 }}>{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Depoimento() {
  return (
    <section style={{ maxWidth: 'var(--container-narrow)', margin: '0 auto', padding: 'var(--section-y) var(--gutter)', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, letterSpacing: 'var(--tracking-tight)', lineHeight: 1.32, color: 'var(--text-strong)' }}>
        “Eu perdia uma hora por dia respondendo ‘tem horário?’. Agora a maisa responde e eu só olho a agenda de manhã.”
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
        <Avatar name="Renata Lasca" size="md" />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>Renata Lasca</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Studio Lasca · São Paulo</div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Faixa, Passos, Recursos, Depoimento });
