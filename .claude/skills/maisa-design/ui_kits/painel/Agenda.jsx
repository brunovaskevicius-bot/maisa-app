const { Card, Icon, Badge, Button, Avatar, Tabs, IconButton } = window.MaisaDesignSystem_00adcb;

const HORAS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const DIAS = [
  { d: 'seg', n: 24 }, { d: 'ter', n: 25 }, { d: 'qua', n: 26 },
  { d: 'qui', n: 27, hoje: true }, { d: 'sex', n: 28 }, { d: 'sáb', n: 29 }, { d: 'dom', n: 30 },
];
const BLOCOS = [
  { dia: 0, h: 1, dur: 1, cliente: 'Ana Beatriz', serv: 'Corte', tom: 'brand' },
  { dia: 1, h: 3, dur: 2, cliente: 'Marina C.', serv: 'Coloração', tom: 'brand' },
  { dia: 2, h: 2, dur: 1, cliente: 'Léo Prado', serv: 'Barba', tom: 'brand' },
  { dia: 3, h: 1, dur: 1, cliente: 'Juliana Prado', serv: 'Corte + escova', tom: 'brand' },
  { dia: 3, h: 2, dur: 1, cliente: 'Marcos Aurélio', serv: 'Barba', tom: 'brand' },
  { dia: 3, h: 3.5, dur: 1.5, cliente: 'Beatriz Nunes', serv: 'Coloração', tom: 'accent' },
  { dia: 3, h: 5, dur: 1, cliente: 'Caio Ferraz', serv: 'Corte', tom: 'brand' },
  { dia: 3, h: 9, dur: 1, cliente: 'Pedro Lemos', serv: 'Corte + barba', tom: 'brand' },
  { dia: 4, h: 2, dur: 1.5, cliente: 'Rita Alencar', serv: 'Hidratação', tom: 'brand' },
  { dia: 4, h: 6, dur: 1, cliente: 'Nina Toledo', serv: 'Corte', tom: 'brand' },
  { dia: 5, h: 1, dur: 2, cliente: 'Fernanda D.', serv: 'Progressiva', tom: 'brand' },
];
const ALT = 52;

function Agenda() {
  const [vis, setVis] = React.useState('semana');
  return (
    <Card pad="none" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton variant="outline" size="sm" icon={<Icon name="chevron-left" size={17} />} label="Semana anterior" />
          <IconButton variant="outline" size="sm" icon={<Icon name="chevron-right" size={17} />} label="Próxima semana" />
        </div>
        <h2 style={{ font: 'var(--type-h3)', flex: 1 }}>24 – 30 de julho</h2>
        <Tabs variant="pill" value={vis} onChange={setVis} items={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} />
        <Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={17} />}>Novo agendamento</Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', minWidth: 860 }}>
          <div style={{ borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 2 }}></div>
          {DIAS.map((d) => (
            <div key={d.n} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: d.hoje ? 'var(--green-50)' : 'var(--surface-card)', zIndex: 2 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: d.hoje ? 'var(--brand-text)' : 'var(--text-subtle)', fontWeight: 600 }}>{d.d}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: d.hoje ? 'var(--brand-text)' : 'var(--text-strong)' }}>{d.n}</div>
            </div>
          ))}
          <div>
            {HORAS.map((h) => <div key={h} style={{ height: ALT, borderBottom: '1px solid var(--border-subtle)', paddingRight: 8, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)', paddingTop: 4 }}>{h}</div>)}
          </div>
          {DIAS.map((d, di) => (
            <div key={d.n} style={{ position: 'relative', borderLeft: '1px solid var(--border-subtle)', background: d.hoje ? 'var(--green-50)' : 'transparent' }}>
              {HORAS.map((h) => <div key={h} style={{ height: ALT, borderBottom: '1px solid var(--border-subtle)' }} />)}
              {BLOCOS.filter((b) => b.dia === di).map((b, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 4, right: 4, top: b.h * ALT + 3, height: b.dur * ALT - 6,
                  background: b.tom === 'accent' ? 'var(--accent-soft)' : 'var(--brand-soft)',
                  border: '1px solid ' + (b.tom === 'accent' ? 'var(--ochre-200)' : 'var(--green-200)'),
                  borderRadius: 'var(--radius-sm)', padding: '6px 8px', overflow: 'hidden', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: b.tom === 'accent' ? 'var(--accent-text)' : 'var(--green-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.cliente}</div>
                  <div style={{ fontSize: 11.5, color: b.tom === 'accent' ? 'var(--ochre-600)' : 'var(--green-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.serv}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

Object.assign(window, { Agenda });
