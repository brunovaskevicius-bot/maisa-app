const { Button, Icon, Badge, ChatBubble, Logo } = window.MaisaDesignSystem_00adcb;

function Telefone() {
  return (
    <div style={{ width: 322, borderRadius: 38, background: 'var(--ink-900)', padding: 9, boxShadow: 'var(--shadow-lg)', flex: '0 0 auto' }}>
      <div style={{ borderRadius: 30, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--green-800)', padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="chevron-left" size={20} color="var(--cream-50)" />
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: 'var(--green-600)', color: 'var(--cream-50)', fontSize: 13, fontWeight: 600 }}>SL</span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--cream-50)' }}>Studio Lasca</div>
            <div style={{ fontSize: 11.5, color: 'var(--green-300)' }}>online</div>
          </div>
        </div>
        <div style={{ padding: '14px 12px 10px', minHeight: 388 }}>
          <ChatBubble from="in" time="14:31">Oi! Tem horário amanhã de manhã?</ChatBubble>
          <ChatBubble from="out" time="14:31" status="read">Oi, Juliana! Tenho sim. 9h ou 10h30, qual fica melhor?</ChatBubble>
          <ChatBubble from="in" time="14:33">9h fica ótimo</ChatBubble>
          <ChatBubble from="out" time="14:33" status="read">Fechado. Corte + escova, quinta às 9h. Te lembro na véspera.</ChatBubble>
          <ChatBubble from="note">Agendamento criado · quinta, 9h</ChatBubble>
        </div>
        <div style={{ padding: '10px 12px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, height: 38, borderRadius: 999, background: 'var(--surface-card)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: 'var(--text-subtle)' }}>Mensagem</div>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--brand)', color: '#fff' }}><Icon name="paper-airplane" size={18} /></span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '80px var(--gutter) 72px', display: 'grid', gridTemplateColumns: '1.15fr auto', gap: 64, alignItems: 'center' }}>
      <div>
        <span className="ms-badge ms-badge--subtle ms-badge--brand ms-badge--md" style={{ marginBottom: 22 }}>
          <Icon name="sparkles" size={14} /> Funciona no WhatsApp que você já tem
        </span>
        <h1 style={{ font: 'var(--type-display)', letterSpacing: 'var(--tracking-display)', fontSize: 68 }}>
          Sua secretária<br />que nunca dorme
        </h1>
        <p style={{ font: 'var(--type-body)', fontSize: 20, color: 'var(--text-muted)', maxWidth: '38ch', marginTop: 22 }}>
          A maisa atende seus clientes no WhatsApp, marca o horário na sua agenda e emite a nota fiscal. Você só aparece quando o cliente chega.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <Button variant="primary" size="lg" iconRight={<Icon name="arrow-right" size={19} />}>Testar 14 dias de graça</Button>
          <Button variant="secondary" size="lg">Ver como funciona</Button>
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 26, flexWrap: 'wrap' }}>
          {['Sem cartão', 'Configura em 10 minutos', 'Cancela quando quiser'].map((t) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, color: 'var(--text-muted)' }}>
              <Icon name="check-circle" variant="solid" size={17} color="var(--brand)" />{t}
            </span>
          ))}
        </div>
      </div>
      <Telefone />
    </section>
  );
}

Object.assign(window, { Hero, Telefone });
