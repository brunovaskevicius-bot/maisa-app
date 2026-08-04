const { Card, Icon, IconButton, Badge, Button, Tabs, Tooltip, Select } = window.MaisaDesignSystem_00adcb;

const TOM_NF = { emitida: 'success', processando: 'info', erro: 'danger', cancelada: 'neutral' };
const ROT_NF = { emitida: 'Emitida', processando: 'Processando', erro: 'Não saiu', cancelada: 'Cancelada' };

function Notas({ onEmitir }) {
  const d = window.MS_DATA;
  const [aba, setAba] = React.useState('todas');
  const lista = aba === 'todas' ? d.notas : d.notas.filter((n) => n.status === aba);
  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-subtle)', borderBottom: '1px solid var(--border-subtle)' };
  const td = { padding: '13px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 14, color: 'var(--text-body)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Card pad="md"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Faturado em julho</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>R$ 48.230</div></Card>
        <Card pad="md"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Notas emitidas</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>112</div></Card>
        <Card variant="accent" pad="md"><div style={{ fontSize: 13, color: 'var(--ochre-700)' }}>Precisam de você</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--accent-text)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>1</div></Card>
      </div>
      <Card pad="none" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Tabs variant="pill" value={aba} onChange={setAba} items={[{ value: 'todas', label: 'Todas' }, { value: 'emitida', label: 'Emitidas' }, { value: 'processando', label: 'Processando' }, { value: 'erro', label: 'Com erro' }]} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tooltip content="Exportar em CSV"><IconButton variant="outline" icon={<Icon name="arrow-down-tray" size={18} />} label="Exportar" /></Tooltip>
            <Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={17} />} onClick={onEmitir}>Emitir nota</Button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Nº</th><th style={th}>Cliente</th><th style={th}>CPF / CNPJ</th><th style={th}>Serviço</th><th style={{ ...th, textAlign: 'right' }}>Valor</th><th style={th}>Data</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {lista.map((n, i) => (
              <tr key={i} style={{ transition: 'background-color var(--dur-fast) var(--ease-out)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream-50)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{n.num}</td>
                <td style={{ ...td, fontWeight: 600, color: 'var(--text-strong)' }}>{n.cliente}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>{n.doc}</td>
                <td style={td}>{n.servico}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n.valor}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>{n.data}</td>
                <td style={td}><Badge tone={TOM_NF[n.status]} size="sm">{ROT_NF[n.status]}</Badge></td>
                <td style={{ ...td, textAlign: 'right' }}>{n.status === 'erro'
                  ? <Button variant="soft" size="sm">Arrumar</Button>
                  : <IconButton size="sm" icon={<Icon name="ellipsis-horizontal" size={17} />} label="Opções da nota" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { Notas });
