const { Card, Icon, IconButton, Badge, Button, Avatar, ChatBubble, Tag, Tabs, Switch } = window.MaisaDesignSystem_00adcb;

function Conversas({ onEmitir }) {
  const d = window.MS_DATA;
  const [sel, setSel] = React.useState(1);
  const [filtro, setFiltro] = React.useState('todas');
  const [texto, setTexto] = React.useState('');
  const [auto, setAuto] = React.useState(true);
  const conversa = d.conversas.find((c) => c.id === sel);
  const msgs = d.thread[sel] || [{ from: 'note', txt: 'Nenhuma mensagem nesta conversa ainda.' }];
  const lista = filtro === 'aberto' ? d.conversas.filter((c) => c.naoLidas > 0) : filtro === 'maisa' ? d.conversas.filter((c) => c.porMaisa) : d.conversas;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 280px', gap: 14, height: '100%', minHeight: 0 }}>
      <Card pad="none" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <Tabs variant="pill" value={filtro} onChange={setFiltro} items={[{ value: 'todas', label: 'Todas' }, { value: 'aberto', label: 'Em aberto' }, { value: 'maisa', label: 'maisa' }]} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lista.map((c) => {
            const on = c.id === sel;
            return (
              <button key={c.id} onClick={() => setSel(c.id)} style={{ display: 'flex', gap: 11, width: '100%', padding: '13px 14px', border: 0, borderBottom: '1px solid var(--border-subtle)', background: on ? 'var(--brand-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition-control)' }}>
                <Avatar name={c.nome} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>{c.hora}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    {c.porMaisa && <Icon name="sparkles" size={13} color="var(--brand)" />}
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultima}</span>
                    {c.naoLidas > 0 && <span className="ms-badge ms-badge--solid ms-badge--brand ms-badge--sm">{c.naoLidas}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card pad="none" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Avatar name={conversa.nome} size="md" status="online" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{conversa.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{conversa.tel}</div>
          </div>
          <Switch checked={auto} onChange={(e) => setAuto(e.target.checked)} label="maisa responde" />
          <IconButton icon={<Icon name="ellipsis-vertical" />} label="Mais opções" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, background: 'var(--surface-sunken)' }}>
          {msgs.map((m, i) => <ChatBubble key={i} from={m.from} author={m.a} time={m.t} status={m.s}>{m.txt}</ChatBubble>)}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <input className="ms-input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={auto ? 'A maisa está cuidando. Escreva para assumir a conversa.' : 'Escreva uma mensagem'} />
          <IconButton variant="solid" round size="md" icon={<Icon name="paper-airplane" size={19} />} label="Enviar" onClick={() => setTexto('')} />
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <Card pad="md">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <Avatar name={conversa.nome} size="xl" />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-strong)' }}>{conversa.nome}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {conversa.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              <Tag>Cliente desde 2024</Tag>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <div><div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Atendimentos</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--text-strong)' }}>14</div></div>
            <div><div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Total gasto</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--text-strong)' }}>R$ 2.310</div></div>
          </div>
        </Card>
        <Card pad="md">
          <h3 style={{ font: 'var(--type-label)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', fontSize: 11 }}>Próximo atendimento</h3>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="calendar-days" size={19} /></span>
            <div><div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>Quinta, 9h</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Corte + escova · R$ 180</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <Button variant="primary" size="sm" block iconLeft={<Icon name="document-text" size={17} />} onClick={onEmitir}>Emitir nota fiscal</Button>
            <Button variant="secondary" size="sm" block>Reagendar</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Conversas });
