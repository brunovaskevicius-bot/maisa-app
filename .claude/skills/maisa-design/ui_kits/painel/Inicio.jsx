const { Card, Icon, Badge, Button, StatCard, Avatar, EmptyState } = window.MaisaDesignSystem_00adcb;

const TOM = { confirmado: 'success', aguardando: 'warning', cancelado: 'danger' };
const ROTULO = { confirmado: 'Confirmado', aguardando: 'Aguardando', cancelado: 'Cancelado' };

function LinhaAgenda({ a }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: '1px solid var(--border-subtle)', opacity: a.status === 'cancelado' ? .55 : 1 }}>
      <div style={{ width: 62, flex: '0 0 auto' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{a.hora}</div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{a.dur}</div>
      </div>
      <Avatar name={a.cliente} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)', textDecoration: a.status === 'cancelado' ? 'line-through' : 'none' }}>{a.cliente}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.servico}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{a.valor}</span>
      <Badge tone={TOM[a.status]} size="sm" dot={a.status === 'confirmado'}>{ROTULO[a.status]}</Badge>
    </div>
  );
}

function Inicio({ go }) {
  const d = window.MS_DATA;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {d.stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={<Icon name={s.icon} size={18} />} delta={s.delta} deltaDirection={s.dir} footnote={s.foot} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, alignItems: 'start' }}>
        <Card pad="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div><h2 style={{ font: 'var(--type-h3)' }}>Hoje, 27 de julho</h2><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>6 atendimentos · 3 horários vagos</p></div>
            <Button variant="soft" size="sm" iconLeft={<Icon name="plus" size={17} />} onClick={() => go('agenda')}>Novo</Button>
          </div>
          <div style={{ marginTop: 10 }}>{d.agenda.map((a) => <LinhaAgenda key={a.hora} a={a} />)}</div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="md">
            <h2 style={{ font: 'var(--type-h3)', marginBottom: 12 }}>O que a maisa fez hoje</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[['chat-bubble-oval-left-ellipsis', '31 mensagens respondidas', 'sem passar pra você'],
                ['calendar-days', '4 horários marcados', 'e 1 reagendado sozinho'],
                ['document-text', '3 notas emitidas', 'logo depois do pagamento'],
                ['bell', '9 lembretes enviados', '24h antes de cada atendimento']].map(([ic, t, s]) => (
                <div key={t} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--brand-soft)', color: 'var(--brand-text)', flex: '0 0 auto' }}><Icon name={ic} size={17} /></span>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{t}</div><div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s}</div></div>
                </div>
              ))}
            </div>
          </Card>
          <Card variant="inverse" pad="md">
            <Icon name="shield-check" size={22} color="var(--green-300)" />
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--cream-50)', marginTop: 10 }}>Uma coisa precisa de você</h3>
            <p style={{ fontSize: 13.5, color: 'var(--green-200)', lineHeight: 1.55, marginTop: 6 }}>A nota do Caio Ferraz não saiu — o CPF tem um dígito a mais. É rápido de arrumar.</p>
            <div style={{ marginTop: 14 }}><Button variant="accent" size="sm" onClick={() => go('notas')}>Arrumar agora</Button></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Inicio, LinhaAgenda, TOM, ROTULO });
