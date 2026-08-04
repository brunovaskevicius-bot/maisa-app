const { Card, Icon, IconButton, Badge, Button, Avatar, Tag, Input } = window.MaisaDesignSystem_00adcb;

const CLIENTES = [
  { nome: 'Juliana Prado', tel: '11 91234-5678', ultimo: '27/07/2026', atend: 14, gasto: 'R$ 2.310', tags: ['VIP'] },
  { nome: 'Marcos Aurélio', tel: '11 98877-1200', ultimo: '27/07/2026', atend: 9, gasto: 'R$ 630', tags: [] },
  { nome: 'Beatriz Nunes', tel: '11 99610-4477', ultimo: '26/07/2026', atend: 3, gasto: 'R$ 1.260', tags: ['Orçamento'] },
  { nome: 'Caio Ferraz', tel: '11 94422-8899', ultimo: '26/07/2026', atend: 21, gasto: 'R$ 1.890', tags: ['VIP'] },
  { nome: 'Pedro Lemos', tel: '11 93311-7788', ultimo: '25/07/2026', atend: 6, gasto: 'R$ 840', tags: [] },
  { nome: 'Sandra Vitório', tel: '11 97010-3355', ultimo: '24/07/2026', atend: 2, gasto: 'R$ 300', tags: ['Faltou 1x'] },
];

function Clientes() {
  return (
    <Card pad="none" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative', width: 280 }}>
          <span className="ms-input__affix ms-input__affix--prefix"><Icon name="magnifying-glass" size={18} /></span>
          <input className="ms-input ms-input--sm ms-input--with-prefix" placeholder="Buscar por nome ou telefone" />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>218 clientes</span>
        <div style={{ marginLeft: 'auto' }}><Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={17} />}>Adicionar cliente</Button></div>
      </div>
      {CLIENTES.map((c) => (
        <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Avatar name={c.nome} size="md" />
          <div style={{ width: 200 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.tel}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Atendimentos</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-strong)' }}>{c.atend}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Total</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-strong)' }}>{c.gasto}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Último</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-body)' }}>{c.ultimo}</div></div>
            <IconButton icon={<Icon name="chat-bubble-oval-left-ellipsis" size={19} />} label="Abrir conversa" />
          </div>
        </div>
      ))}
    </Card>
  );
}

Object.assign(window, { Clientes });
