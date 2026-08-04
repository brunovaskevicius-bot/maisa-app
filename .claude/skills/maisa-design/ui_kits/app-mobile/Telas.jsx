const { Card, Icon, IconButton, Badge, Button, Avatar, ChatBubble, StatCard, Switch, EmptyState, Tabs } = window.MaisaDesignSystem_00adcb;

const TOM = { confirmado: 'success', aguardando: 'warning', cancelado: 'danger' };
const ROT = { confirmado: 'Confirmado', aguardando: 'Aguardando', cancelado: 'Cancelado' };

function Hoje({ setTab }) {
  const d = window.MS_DATA;
  return (
    <div style={{ padding: '0 0 20px' }}>
      <TopoApp titulo="Boa tarde, Renata" sub="Quinta, 27 de julho" acao={<IconButton variant="outline" icon={<Icon name="bell" size={19} />} label="Avisos" />} />
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card variant="inverse" pad="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkles" size={18} color="var(--green-300)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 'var(--tracking-wide)', color: 'var(--green-300)' }}>maisa hoje</span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: 'var(--tracking-tight)', color: 'var(--cream-50)', marginTop: 10, lineHeight: 1.3 }}>31 mensagens respondidas e 4 horários marcados.</p>
          <p style={{ fontSize: 13.5, color: 'var(--green-200)', marginTop: 8 }}>Só uma coisa precisa de você.</p>
          <div style={{ marginTop: 14 }}><Button variant="accent" size="sm" onClick={() => setTab('notas')}>Ver o que é</Button></div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard label="Atendimentos" value="6" icon={<Icon name="clock" size={17} />} footnote="hoje" />
          <StatCard label="A receber" value="R$ 1.060" icon={<Icon name="banknotes" size={17} />} footnote="hoje" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <h2 style={{ font: 'var(--type-h3)', fontSize: 18 }}>Agenda de hoje</h2>
          <button onClick={() => setTab('agenda')} style={{ border: 0, background: 'transparent', color: 'var(--brand-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ver tudo</button>
        </div>
        {d.agenda.slice(0, 4).map((a) => (
          <Card key={a.hora} pad="sm" style={{ opacity: a.status === 'cancelado' ? .55 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-strong)' }}>{a.hora}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}>{a.dur}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{a.cliente}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{a.servico} · {a.valor}</div>
              </div>
              <Badge tone={TOM[a.status]} size="sm">{ROT[a.status]}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ListaConversas({ abrir }) {
  const d = window.MS_DATA;
  return (
    <div>
      <TopoApp titulo="Conversas" sub="2 esperando você" acao={<IconButton variant="outline" icon={<Icon name="magnifying-glass" size={19} />} label="Buscar" />} />
      <div style={{ padding: '0 20px 10px' }}>
        <Tabs variant="pill" value="todas" onChange={() => {}} items={[{ value: 'todas', label: 'Todas' }, { value: 'aberto', label: 'Em aberto' }, { value: 'maisa', label: 'maisa' }]} />
      </div>
      <div style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
        {d.conversas.map((c) => (
          <button key={c.id} onClick={() => abrir(c.id)} style={{ display: 'flex', gap: 12, width: '100%', minHeight: 'var(--tap-min)', padding: '14px 20px', border: 0, borderBottom: '1px solid var(--border-subtle)', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
            <Avatar name={c.nome} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>{c.hora}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                {c.porMaisa && <Icon name="sparkles" size={13} color="var(--brand)" />}
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultima}</span>
                {c.naoLidas > 0 && <span className="ms-badge ms-badge--solid ms-badge--brand ms-badge--sm">{c.naoLidas}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Conversa({ id, voltar }) {
  const d = window.MS_DATA;
  const c = d.conversas.find((x) => x.id === id);
  const msgs = d.thread[id] || [{ from: 'note', txt: 'Nenhuma mensagem por aqui ainda.' }];
  const [auto, setAuto] = React.useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
        <IconButton icon={<Icon name="chevron-left" size={22} />} label="Voltar" onClick={voltar} />
        <Avatar name={c.nome} size="sm" status="online" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{c.nome}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.tel}</div>
        </div>
        <IconButton icon={<Icon name="ellipsis-vertical" size={20} />} label="Opções" />
      </div>
      <div style={{ padding: '10px 14px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="sparkles" size={16} color="var(--accent-text)" />
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ochre-700)' }}>A maisa está cuidando desta conversa</span>
        <Switch checked={auto} onChange={(e) => setAuto(e.target.checked)} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', background: 'var(--surface-sunken)' }}>
        {msgs.map((m, i) => <ChatBubble key={i} from={m.from} author={m.a} time={m.t} status={m.s}>{m.txt}</ChatBubble>)}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
        <input className="ms-input ms-input--sm" placeholder="Assumir a conversa" />
        <IconButton variant="solid" round icon={<Icon name="paper-airplane" size={18} />} label="Enviar" />
      </div>
    </div>
  );
}

function AgendaMob() {
  const d = window.MS_DATA;
  return (
    <div style={{ paddingBottom: 20 }}>
      <TopoApp titulo="Agenda" sub="Quinta, 27 de julho" acao={<IconButton variant="solid" round icon={<Icon name="plus" size={20} />} label="Novo agendamento" />} />
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
        {[['seg', 24], ['ter', 25], ['qua', 26], ['qui', 27], ['sex', 28], ['sáb', 29], ['dom', 30]].map(([dia, n]) => {
          const on = n === 27;
          return (
            <div key={n} style={{ flex: '0 0 auto', width: 46, minHeight: 'var(--tap-min)', padding: '8px 0', textAlign: 'center', borderRadius: 'var(--radius-md)', background: on ? 'var(--brand)' : 'var(--surface-card)', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--border-subtle)'), color: on ? '#fff' : 'var(--text-body)' }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', opacity: .8 }}>{dia}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{n}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {d.agenda.map((a) => (
          <div key={a.hora} style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 48, flex: '0 0 auto', paddingTop: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-subtle)' }}>{a.hora}</div>
            <Card pad="sm" style={{ flex: 1, opacity: a.status === 'cancelado' ? .55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{a.cliente}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{a.servico} · {a.dur}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-body)' }}>{a.valor}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

const TOM_NF = { emitida: 'success', processando: 'info', erro: 'danger', cancelada: 'neutral' };
const ROT_NF = { emitida: 'Emitida', processando: 'Processando', erro: 'Não saiu', cancelada: 'Cancelada' };

function NotasMob() {
  const d = window.MS_DATA;
  return (
    <div style={{ paddingBottom: 20 }}>
      <TopoApp titulo="Notas fiscais" sub="Julho · 112 emitidas" acao={<IconButton variant="solid" round icon={<Icon name="plus" size={20} />} label="Emitir nota" />} />
      <div style={{ padding: '0 20px 14px' }}>
        <Card variant="accent" pad="sm">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="exclamation-triangle" size={19} color="var(--accent-text)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-text)' }}>Uma nota não saiu</div>
              <p style={{ fontSize: 13, color: 'var(--ochre-700)', marginTop: 2, lineHeight: 1.5 }}>O CPF do Caio Ferraz tem um dígito a mais.</p>
              <div style={{ marginTop: 10 }}><Button variant="accent" size="sm">Arrumar</Button></div>
            </div>
          </div>
        </Card>
      </div>
      <div style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
        {d.notas.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{n.cliente}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>NF {n.num} · {n.data}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-strong)' }}>{n.valor}</div>
              <div style={{ marginTop: 4 }}><Badge tone={TOM_NF[n.status]} size="sm">{ROT_NF[n.status]}</Badge></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Hoje, ListaConversas, Conversa, AgendaMob, NotasMob });
