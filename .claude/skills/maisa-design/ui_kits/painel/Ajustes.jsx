const { Card, Icon, Badge, Button, Switch, Input, Textarea, Select, Checkbox, Radio, Tag } = window.MaisaDesignSystem_00adcb;

function Secao({ titulo, desc, children }) {
  return (
    <Card pad="md">
      <h2 style={{ font: 'var(--type-h3)' }}>{titulo}</h2>
      {desc && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4, maxWidth: '62ch' }}>{desc}</p>}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </Card>
  );
}

function Ajustes() {
  const [auto, setAuto] = React.useState(true);
  const [nf, setNf] = React.useState(true);
  const [lembrete, setLembrete] = React.useState(true);
  const [ferias, setFerias] = React.useState(false);
  const [tom, setTom] = React.useState('proxima');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Secao titulo="Como a maisa atende" desc="Ela responde no WhatsApp do Studio Lasca. Você entra na conversa quando quiser — é só digitar.">
          <Switch checked={auto} onChange={(e) => setAuto(e.target.checked)} label="Responder sozinha" />
          <Switch checked={lembrete} onChange={(e) => setLembrete(e.target.checked)} label="Lembrar o cliente 24h antes" />
          <Switch checked={ferias} onChange={(e) => setFerias(e.target.checked)} label="Modo férias — avisa que você volta dia 10" />
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ font: 'var(--type-label)', marginBottom: 10 }}>Jeito de falar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Radio name="tom" checked={tom === 'proxima'} onChange={() => setTom('proxima')} label="Próxima" description="“Oi, Juliana! Tenho 9h ou 10h30, qual fica melhor?”" />
              <Radio name="tom" checked={tom === 'formal'} onChange={() => setTom('formal')} label="Mais formal" description="“Olá, Juliana. Temos disponibilidade às 9h ou 10h30.”" />
            </div>
          </div>
          <Textarea label="Regras suas" hint="A maisa segue isso antes de qualquer outra coisa." rows={3} defaultValue={'Sempre oferecer horário de manhã primeiro.\nColoração só com sinal de 30% pago no Pix.'} />
        </Secao>
        <Secao titulo="Nota fiscal" desc="Emissão automática pela prefeitura de São Paulo. Certificado A1 válido até 03/2027.">
          <Switch checked={nf} onChange={(e) => setNf(e.target.checked)} label="Emitir assim que o cliente pagar" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="CNPJ do negócio" defaultValue="41.882.330/0001-07" />
            <Select label="Regime tributário" options={['Simples Nacional', 'Lucro presumido']} />
          </div>
          <Checkbox checked onChange={() => {}} label="Mandar o link da nota no WhatsApp" description="O cliente recebe junto com o agradecimento." />
        </Secao>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card pad="md">
          <h3 style={{ font: 'var(--type-h3)' }}>WhatsApp conectado</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--success-soft)', color: 'var(--success-text)' }}><Icon name="check-circle" variant="solid" size={20} /></span>
            <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-strong)' }}>11 3771-9002</div><div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>ativo há 8 meses</div></div>
          </div>
          <div style={{ marginTop: 14 }}><Button variant="secondary" size="sm" block>Trocar número</Button></div>
        </Card>
        <Card pad="md">
          <h3 style={{ font: 'var(--type-h3)' }}>Serviços</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>O que a maisa pode agendar e cobrar.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {[['Corte + escova', '45 min', 'R$ 180'], ['Barba', '30 min', 'R$ 70'], ['Coloração', '1h30', 'R$ 420'], ['Hidratação', '1h', 'R$ 150']].map(([n, d, v]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{n}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d}</div></div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--text-body)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><Button variant="soft" size="sm" block iconLeft={<Icon name="plus" size={17} />}>Adicionar serviço</Button></div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Ajustes, Secao });
