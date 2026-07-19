"use client";
import { useEffect, useMemo, useState } from "react";
import { s, Icon, Card, Badge, Monogram, SectionTitle, Screen, fmt, toast } from "@/lib/ui";
import { MetricCard, RingTotalCard, formatCompact, type Pt } from "@/components/charts";
import { useAdmin } from "@/lib/adminConfig";

// séries determinísticas (sem random) p/ os gráficos — 30 dias até 17/07. drift = viés de alta/baixa.
function mkSerie(n: number, base: number, amp: number, seed: number, drift = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const v = base + i * drift + amp * Math.sin(i * 0.55 + seed) + amp * 0.4 * Math.sin(i * 1.9 + seed * 1.7);
    const d = new Date(2026, 6, 17);
    d.setDate(d.getDate() - (n - 1 - i));
    return { value: Math.max(0, Math.round(v)), label: `${d.getDate()}/${d.getMonth() + 1}` };
  });
}
const serieFat = mkSerie(30, 380, 80, 1, 10);
const serieAt = mkSerie(30, 22, 7, 2, 0.1);
const serieCli = mkSerie(30, 9, 3, 3, 0.14);
const serieOcup = mkSerie(30, 76, 9, 4, 0.16).map((p) => ({ ...p, value: Math.min(98, p.value) }));

type Filtro = "todos" | "pago" | "pendente";

export default function Dados() {
  const { t, data } = useAdmin();
  const { kpis, equipe, assistant, pagamentos } = data;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // motion: entrada única — barras do ranking crescem (scaleX) só na montagem
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const ativos = equipe.filter((b) => b.ativo);
  const totalAtend = equipe.reduce((a, b) => a + b.atendimentosMes, 0);
  const rankeados = [...equipe].filter((b) => b.atendimentosMes > 0).sort((a, b) => b.atendimentosMes - a.atendimentosMes);
  const maxAtend = Math.max(...rankeados.map((b) => b.atendimentosMes), 1);

  const abas: { id: Filtro; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "pago", label: "Pagos" },
    { id: "pendente", label: "Pendentes" },
  ];
  const lista = useMemo(() => pagamentos.filter((p) => (filtro === "todos" ? true : p.status === filtro)), [filtro, pagamentos]);

  const mes = kpis.faturamentoMes;

  return (
    <Screen>
      {/* ============ HERO: TOTAL (dots) + faturamento diário ============ */}
      <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px")}>
        <div className="m-reveal" style={s("display:grid;animation-delay:0ms")}>
          <RingTotalCard
            total={"R$ " + formatCompact(mes)}
            label="FATURAMENTO DO MÊS"
            sub={[
              { label: "Serviços avulsos", value: "R$ " + formatCompact(Math.round(mes * 0.63)), pct: "+12,4%", color: "var(--primary)" },
              { label: "Combos", value: "R$ " + formatCompact(Math.round(mes * 0.37)), pct: "+6,1%", color: "var(--success)" },
            ]}
            onDetails={() => toast("Detalhamento de faturamento em breve ✨")}
          />
        </div>
        <div className="m-reveal" style={s("display:grid;animation-delay:50ms")}>
          <MetricCard title="Faturamento diário" data={serieFat} prefix="R$ " deltaLabel="vs. ontem" drawDelay={250} />
        </div>
      </div>

      {/* ============ MÉTRICAS ============ */}
      <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px;margin-top:16px")}>
        <div className="m-reveal" style={s("display:grid;animation-delay:100ms")}>
          <MetricCard title="Atendimentos" data={serieAt} defaultView="barra" deltaLabel="vs. ontem" drawDelay={450} />
        </div>
        <div className="m-reveal" style={s("display:grid;animation-delay:150ms")}>
          <MetricCard title="Novos clientes" data={serieCli} deltaLabel="vs. ontem" drawDelay={650} />
        </div>
        <div className="m-reveal" style={s("display:grid;animation-delay:200ms")}>
          <MetricCard title="Taxa de ocupação" data={serieOcup} total={serieOcup[serieOcup.length - 1].value + "%"} accent="primary" deltaLabel="vs. ontem" drawDelay={850} />
        </div>
      </div>

      {/* ============ DESEMPENHO DA EQUIPE ============ */}
      <Card pad={22} radius={20} style={s("margin-top:16px")}>
        <SectionTitle title="Desempenho da equipe" sub={`${equipe.length} ${t.profissionalPlur} · ${ativos.length} ativos · ${totalAtend} atendimentos no mês`} />
        <div style={s("display:flex;flex-direction:column;gap:14px")}>
          {rankeados.map((b, i) => (
            <div key={b.id} style={s("display:flex;align-items:center;gap:12px")}>
              <span style={s("font-family:var(--font-mono);font-size:12px;font-weight:800;color:var(--muted);width:18px;flex-shrink:0")}>{i + 1}º</span>
              <Monogram name={b.nome} id={b.id} size={34} radius={11} />
              <div style={s("flex:1;min-width:0")}>
                <div style={s("font-size:13.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{b.nome}</div>
                <div style={s("height:7px;border-radius:20px;background:var(--surface-2);margin-top:6px;overflow:hidden")}>
                  <div style={s(`height:100%;width:${(b.atendimentosMes / maxAtend) * 100}%;border-radius:20px;background:linear-gradient(90deg,var(--primary),var(--primary-dark));transform-origin:left;transform:scaleX(${mounted ? 1 : 0});transition:transform var(--dur-slow) var(--ease-out)`)} />
                </div>
              </div>
              <span style={s("font-family:var(--font-mono);font-size:14px;font-weight:800;color:var(--ink);flex-shrink:0")}>{b.atendimentosMes}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ============ A MAISA hoje ============ */}
      <Card pad={22} radius={20} style={s("margin-top:16px")}>
        <SectionTitle title="A MAISA hoje" sub="Como o assistente está atuando" />
        <div style={s("margin-bottom:16px")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px")}>
            <span style={s("display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--ink)")}>
              <Icon name="bot" size={17} stroke="var(--primary-dark)" /> Respondidas pela MAISA
            </span>
            <span style={s("font-family:var(--font-mono);font-size:16px;font-weight:800;color:var(--primary-dark)")}>{Math.round(kpis.respondidasBot * 100)}%</span>
          </div>
          <div style={s("height:12px;border-radius:20px;background:var(--surface-2);overflow:hidden")}>
            <div style={s(`height:100%;width:${kpis.respondidasBot * 100}%;border-radius:20px;background:linear-gradient(90deg,var(--primary),var(--primary-dark))`)} />
          </div>
        </div>
        <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px")}>
          <MaisaMini icon="chat" label="Mensagens hoje" value={String(kpis.mensagensHoje)} />
          <MaisaMini icon="clock" label="Resposta média" value={assistant.respostaMedia} />
          <MaisaMini icon="sparkle" label="Taxa de resolução" value={Math.round(assistant.taxaResolucao * 100) + "%"} />
        </div>
      </Card>

      {/* ============ RECEBIMENTOS ============ */}
      <div style={s("margin-top:32px")}>
        <SectionTitle title="Recebimentos" sub="O que entrou no caixa" />
      </div>
      <Card radius={20} pad={0} style={s("overflow:hidden")}>
        <div style={s("display:flex;gap:8px;padding:16px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap")}>
          {abas.map((a) => {
            const ativo = filtro === a.id;
            return (
              <button key={a.id} onClick={() => setFiltro(a.id)} className="m-hov-bg" style={s(`border:1px solid ${ativo ? "var(--primary)" : "var(--border)"};background:${ativo ? "var(--primary-soft)" : "transparent"};color:${ativo ? "var(--primary-dark)" : "var(--muted)"};font-size:13px;font-weight:700;padding:7px 16px;border-radius:999px;cursor:pointer`)}>
                {a.label}
              </button>
            );
          })}
        </div>
        <div style={s("display:grid;grid-template-columns:88px 1.5fr 1.4fr 120px 130px;gap:12px;padding:12px 20px;border-bottom:1px solid var(--line);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)")}>
          <span>Data</span><span>Cliente</span><span>Serviço</span><span>Método</span><span style={s("text-align:right")}>Valor</span>
        </div>
        {lista.length === 0 ? (
          <div style={s("padding:40px;text-align:center;color:var(--muted);font-size:14px")}>Nenhum recebimento nesse filtro.</div>
        ) : (
          lista.map((p, i) => (
            <div key={p.id} className="m-hov-bg" style={s(`display:grid;grid-template-columns:88px 1.5fr 1.4fr 120px 130px;gap:12px;align-items:center;padding:13px 20px;${i < lista.length - 1 ? "border-bottom:1px solid var(--line);" : ""}`)}>
              <span style={s("font-family:var(--font-mono);font-size:13px;color:var(--muted)")}>{p.data}</span>
              <div style={s("display:flex;align-items:center;gap:10px;min-width:0")}>
                <Monogram name={p.cliente} id={p.id} size={30} radius={10} />
                <span style={s("font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.cliente}</span>
              </div>
              <span style={s("font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.servico}</span>
              <span><Badge tone="neutral">{p.metodo}</Badge></span>
              <span style={s("display:flex;align-items:center;justify-content:flex-end;gap:8px")}>
                <span style={{ ...s("width:7px;height:7px;border-radius:50%;flex-shrink:0"), background: p.status === "pago" ? "var(--success)" : "var(--warn)" }} />
                <span style={s("font-family:var(--font-mono);font-size:14px;font-weight:700")}>{fmt(p.valor)}</span>
              </span>
            </div>
          ))
        )}
      </Card>
    </Screen>
  );
}

function MaisaMini({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={s("display:flex;flex-direction:column;gap:5px;padding:14px;border-radius:14px;background:var(--surface-2)")}>
      <span style={s("display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:var(--muted)")}>
        <Icon name={icon} size={15} /> {label}
      </span>
      <span style={s("font-family:var(--font-mono);font-size:22px;font-weight:800;letter-spacing:-.02em")}>{value}</span>
    </div>
  );
}
