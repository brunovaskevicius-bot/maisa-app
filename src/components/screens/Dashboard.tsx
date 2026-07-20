"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  s,
  Icon,
  Card,
  Btn,
  IconBtn,
  Badge,
  Toggle,
  Monogram,
  Screen,
  fmt,
  fmtK,
  toast,
} from "@/lib/ui";
import {
  assinatura,
  metodoPagamento,
  statusTone,
  statusLabel,
  type Status,
  type Conversa,
} from "@/lib/mock";
import { useAdmin } from "@/lib/adminConfig";

/* ---------- tokens do "molde" compartilhado ---------- */
const MONO = "font-family:var(--font-mono);font-weight:800;letter-spacing:-.02em";
const MICRO =
  "font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)";
const PANEL = "background:var(--surface-2);border-radius:14px";
const ROW_TR = "transition:background-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)";

/* matcher local categoria -> tile (replicado de MeusServicos, como já é local lá) */
function catLook(categoria: string, fallbackIcon: string): { icon: string; tint: string; ink: string } {
  switch (categoria) {
    case "Corte":
      return { icon: "scissors", tint: "var(--primary-soft)", ink: "var(--primary-dark)" };
    case "Barba":
      return { icon: "user", tint: "var(--warm-soft)", ink: "var(--warn)" };
    case "Combo":
      return { icon: "sparkle", tint: "var(--success-soft)", ink: "var(--success)" };
    case "Tratamento":
      return { icon: "star", tint: "var(--danger-soft)", ink: "var(--danger)" };
    default: {
      // categorias de outras profissões: ícone da profissão + variedade neutra (nunca tesoura)
      const tones: [string, string, string][] = [
        ["var(--primary-soft)", "var(--primary-dark)", fallbackIcon],
        ["var(--warm-soft)", "var(--warn)", "tag"],
        ["var(--success-soft)", "var(--success)", "sparkle"],
        ["var(--danger-soft)", "var(--danger)", "star"],
      ];
      let h = 0;
      for (const ch of categoria) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const [tint, ink, icon] = tones[h % tones.length];
      return { icon, tint, ink };
    }
  }
}

/* estado das conversas -> aparência (idioma de Atendimentos.tsx) */
const estadoMeta: Record<
  "bot" | "humano" | "resolvido",
  { label: string; tone: "primary" | "warn" | "success" }
> = {
  bot: { label: "IA", tone: "primary" },
  humano: { label: "Você", tone: "warn" },
  resolvido: { label: "Resolvida", tone: "success" },
};

/* ---------- cabeçalho de card (fixo em todos os widgets) ---------- */
function CardHead({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={s("display:flex;align-items:center;gap:11px")}>
      <span
        style={s(
          "width:36px;height:36px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--primary-soft);color:var(--primary-dark)"
        )}
      >
        <Icon name={icon} size={19} />
      </span>
      <span style={s("font-size:15px;font-weight:700;letter-spacing:-.01em;color:var(--ink)")}>{title}</span>
      {action ? <div style={s("margin-left:auto;display:flex;align-items:center;gap:8px")}>{action}</div> : null}
    </div>
  );
}

/* ---------- link "ver tudo →" (cor muted→primary + nudge da seta, só transform/cor) ---------- */
function VerTudo({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="m-press m-focus"
      style={s(
        `display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;cursor:pointer;font-size:12.5px;font-weight:600;padding:2px;white-space:nowrap;transition:color var(--dur-fast) var(--ease-out);color:${
          h ? "var(--primary)" : "var(--muted)"
        }`
      )}
    >
      {label}
      <span
        style={{
          ...s("display:flex;transition:transform var(--dur-fast) var(--ease-out)"),
          transform: h ? "translateX(2px)" : "translateX(0)",
        }}
      >
        <Icon name="arrow-right" size={14} sw={2} />
      </span>
    </button>
  );
}

/* ---------- mini-sparkline LOCAL (SVG inline, sem animação de traço; entra no m-reveal do card) ---------- */
function Spark({ data }: { data: number[] }) {
  const W = 100;
  const H = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
    const y = H - ((v - min) / rng) * (H - 5) - 2.5;
    return [x, y] as [number, number];
  });
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `M0,${H} ` + pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + ` L${W},${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="42"
      preserveAspectRatio="none"
      style={s("display:block;overflow:visible")}
    >
      <path d={area} fill="var(--primary-soft)" opacity="0.55" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="var(--primary)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Dashboard() {
  const { data, t, isOn } = useAdmin();
  const { shop, assistant, equipe, servicos, agendaHoje, conversas, faqs, campanhas, kpis } = data;
  const barbeiroNome = data.nomeDoProfissional;

  /* stagger "construindo" só no 1º mount (não re-anima em re-render) */
  const firstMount = useRef(true);
  useEffect(() => {
    firstMount.current = false;
  }, []);
  const reveal = firstMount.current;

  /* helpers de estilo por widget: base + span/extra + delay do stagger */
  const wCls = reveal ? "m-reveal" : undefined;
  const wStyle = (i: number, extra: string) =>
    s(
      "display:flex;flex-direction:column;gap:14px;min-width:0" +
        (extra ? `;${extra}` : "") +
        (reveal ? `;animation-delay:${Math.min(i, 9) * 70}ms` : "")
    );

  /* ---------- 1. AGENDA ---------- */
  const [agStatus, setAgStatus] = useState<Record<string, Status>>({});
  const stDe = (a: { id: string; status: Status }): Status => agStatus[a.id] ?? a.status;
  const pendentes = agendaHoje.filter((a) => {
    const st = stDe(a);
    return st === "confirmado" || st === "aguardando";
  });
  const proximo = pendentes[0];
  const resto = pendentes.slice(1, 4);
  const concluidos = agendaHoje.filter((a) => stDe(a) === "concluido").length;

  /* ---------- 2. ATENDIMENTOS ---------- */
  const [convEstado, setConvEstado] = useState<Record<string, "bot" | "humano" | "resolvido">>({});
  const estDe = (c: Conversa): "bot" | "humano" | "resolvido" => convEstado[c.id] ?? c.estado;
  const aguardando = conversas.filter((c) => estDe(c) === "bot").length;
  const inboxTop = conversas.filter((c) => estDe(c) !== "resolvido").slice(0, 2);

  /* ---------- 3. EQUIPE ---------- */
  const [ativos, setAtivos] = useState<Record<string, boolean>>(() =>
    equipe.reduce<Record<string, boolean>>((acc, b) => {
      acc[b.id] = b.ativo;
      return acc;
    }, {})
  );
  const [ferias, setFerias] = useState<Record<string, boolean>>({});
  const ativosCount = equipe.filter((b) => ativos[b.id] && !ferias[b.id]).length;

  /* ---------- 4. MAISA ---------- */
  const [maisaOn, setMaisaOn] = useState<boolean>(assistant.ativo);

  /* ---------- 5. DADOS ---------- */
  const [serie, setSerie] = useState<"fat" | "ocup">("fat");
  const semanaFat = [1980, 2210, 1740, 2640, 2380, 3100, 2190];
  const semanaOcup = [62, 71, 58, 80, 74, 88, 69];
  const sparkData = serie === "fat" ? semanaFat : semanaOcup;
  const dadoBig = serie === "fat" ? fmtK(kpis.faturamentoMes) : Math.round(kpis.taxaOcupacao * 100) + "%";
  const dadoSub =
    serie === "fat"
      ? `${kpis.novosClientesMes} novos clientes no mês`
      : `${Math.round(kpis.taxaOcupacao * 100)}% de ocupação média`;

  /* ---------- 6. SERVIÇOS ---------- */
  const [destaques, setDestaques] = useState<Set<string>>(() => new Set());
  const toggleDestaque = (id: string) =>
    setDestaques((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const servicosAtivos = servicos.filter((x) => x.ativo).length;
  const top3 = [...servicos].filter((x) => x.ativo).sort((a, b) => b.preco - a.preco).slice(0, 3);

  /* ---------- 7. FAQ ---------- */
  const faqsAtivas = [...faqs].filter((f) => f.ativo).sort((a, b) => b.usos - a.usos);
  const [faqIdx, setFaqIdx] = useState(0);
  const faqAtual = faqsAtivas.length ? faqsAtivas[faqIdx % faqsAtivas.length] : undefined;

  /* ---------- 8. PAGAMENTOS ---------- */
  const [renovacao, setRenovacao] = useState(true);

  /* ---------- 9. MARKETING ---------- */
  const [avisado, setAvisado] = useState(false);
  const campanhasAtivas = campanhas.filter((c) => c.status === "ativa").length;

  return (
    <Screen>
      {/* ===== Cabeçalho + tira-pulso (o 1 destaque) ===== */}
      <div
        className="m-reveal"
        style={s("display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:20px")}
      >
        <div>
          <div style={s("font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--ink)")}>
            Bom dia, {shop.dono.split(" ")[0]} <span aria-hidden>👋</span>
          </div>
          <div style={s("margin-top:5px;font-size:14px;color:var(--muted);line-height:1.5")}>
            A MAISA está cuidando do seu WhatsApp.
          </div>
        </div>
        <div style={s("display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-bottom:2px")}>
          <Badge tone="success" dot>MAISA no ar</Badge>
          <span style={s("display:inline-flex;align-items:baseline;gap:6px")}>
            <span style={s(`${MONO};font-size:16px;color:var(--ink)`)}>{kpis.agendamentosHoje}</span>
            <span style={s("font-size:12.5px;color:var(--muted)")}>agendamentos</span>
          </span>
          <span style={s("display:inline-flex;align-items:baseline;gap:6px")}>
            <span style={s(`${MONO};font-size:16px;color:var(--ink)`)}>{fmt(kpis.faturamentoHoje)}</span>
            <span style={s("font-size:12.5px;color:var(--muted)")}>hoje</span>
          </span>
        </div>
      </div>

      {/* ===== Bento ===== */}
      <div
        style={s(
          "display:grid;grid-template-columns:var(--bento-cols);grid-auto-rows:minmax(132px,auto);gap:16px"
        )}
      >
        {/* ---------- 1. AGENDA (2×2, herói) ---------- */}
        {isOn("agenda") && (
        <Card hover pad={18} radius={18} className={wCls} style={wStyle(0, "grid-column:span 2;grid-row:span 2")}>
          <CardHead icon="calendar" title="Agenda" action={<VerTudo label="Ver agenda" onClick={() => toast("Abrindo a agenda…")} />} />

          {proximo ? (
            <div style={s(`${PANEL};padding:14px;display:flex;flex-direction:column;gap:12px`)}>
              <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:10px")}>
                <div style={s("display:flex;flex-direction:column;gap:3px")}>
                  <span style={s(MICRO)}>Próximo</span>
                  <span style={s(`${MONO};font-size:26px;color:var(--ink);line-height:1`)}>{proximo.hora}</span>
                </div>
                <Badge tone={statusTone[stDe(proximo)]} dot>{statusLabel[stDe(proximo)]}</Badge>
              </div>
              <div style={s("display:flex;align-items:center;gap:11px")}>
                <Monogram name={barbeiroNome(proximo.barbeiroId)} id={proximo.barbeiroId} size={38} radius={11} />
                <div style={s("min-width:0")}>
                  <div style={s("font-size:14.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {proximo.cliente}
                  </div>
                  <div style={s("font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {proximo.servico} · {barbeiroNome(proximo.barbeiroId).split(" ")[0]}
                  </div>
                </div>
              </div>
              <Btn
                variant="primary"
                size="sm"
                icon="check"
                full
                onClick={() => {
                  setAgStatus((p) => ({ ...p, [proximo.id]: "concluido" }));
                  toast(`Chegada de ${proximo.cliente.split(" ")[0]} confirmada ✅`);
                }}
              >
                Confirmar chegada
              </Btn>
            </div>
          ) : (
            <div style={s(`${PANEL};padding:22px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center`)}>
              <span style={s("width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--success-soft);color:var(--success)")}>
                <Icon name="check" size={22} sw={2.2} />
              </span>
              <span style={s("font-size:14px;font-weight:700;color:var(--ink)")}>Tudo em dia por aqui</span>
              <span style={s("font-size:12.5px;color:var(--muted)")}>Sem próximos horários pendentes.</span>
            </div>
          )}

          {resto.length > 0 ? (
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              <span style={s(MICRO)}>A seguir</span>
              {resto.map((a) => (
                <div
                  key={a.id}
                  className="m-hov-bg m-lift"
                  style={s(`display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;${ROW_TR}`)}
                >
                  <span style={s(`${MONO};font-weight:600;font-size:12px;color:var(--muted);width:42px`)}>{a.hora}</span>
                  <span style={s("flex:1;min-width:0;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {a.cliente.split(" ")[0]}
                  </span>
                  <span style={s("font-size:12px;color:var(--muted)")}>{barbeiroNome(a.barbeiroId).split(" ")[0]}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div style={s("margin-top:auto;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);padding-top:2px")}>
            <span style={s(`${MONO};font-size:13px;color:var(--ink)`)}>{kpis.agendamentosHoje}</span> hoje
            <span style={s("opacity:.5")}>·</span>
            <span style={s(`${MONO};font-size:13px;color:var(--success)`)}>{concluidos}</span> concluídos
          </div>
        </Card>
        )}

        {/* ---------- 2. ATENDIMENTOS (2×1) ---------- */}
        {isOn("atendimentos") && (
        <Card
          hover
          pad={18}
          radius={18}
          className={wCls}
          style={wStyle(1, "grid-column:span 2")}
        >
          <CardHead
            icon="chat"
            title="Atendimentos"
            action={
              <>
                <Badge tone={aguardando > 0 ? "primary" : "neutral"} dot>{aguardando} aguardando</Badge>
                <VerTudo label="Abrir inbox" onClick={() => toast("Abrindo a inbox…")} />
              </>
            }
          />
          <div style={s("display:flex;flex-direction:column;gap:7px")}>
            {inboxTop.map((c) => {
              const est = estDe(c);
              const m = estadoMeta[est];
              return (
                <div
                  key={c.id}
                  className="m-hov-bg m-lift"
                  style={s(`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:12px;${ROW_TR}`)}
                >
                  <Monogram name={c.cliente} id={c.id} size={38} radius={11} />
                  <div style={s("flex:1;min-width:0")}>
                    <div style={s("display:flex;align-items:center;gap:8px")}>
                      <span style={s("font-size:13.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                        {c.cliente}
                      </span>
                      <Badge tone={m.tone}>{m.label}</Badge>
                    </div>
                    <div style={s("font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {c.ultimaMsg}
                    </div>
                  </div>
                  <div style={s("flex-shrink:0;display:flex;align-items:center;gap:8px")}>
                    <span style={s("font-size:11px;color:var(--muted);font-family:var(--font-mono)")}>{c.hora}</span>
                    {c.naoLidas > 0 ? (
                      <span style={s("min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)")}>
                        {c.naoLidas}
                      </span>
                    ) : null}
                    {est === "bot" ? (
                      <IconBtn
                        icon="user"
                        tone="primary"
                        title="Assumir conversa"
                        onClick={() => {
                          setConvEstado((p) => ({ ...p, [c.id]: "humano" }));
                          toast(`Você assumiu a conversa com ${c.cliente.split(" ")[0]}`);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        )}

        {/* ---------- 3. EQUIPE (2×1) ---------- */}
        {isOn("equipe") && (
        <Card
          hover
          pad={18}
          radius={18}
          className={wCls}
          style={wStyle(2, "grid-column:span 2")}
        >
          <CardHead
            icon="equipe"
            title="Equipe"
            action={
              <>
                <Badge tone="success" dot>{ativosCount} ativos</Badge>
                <VerTudo label="Ver equipe" onClick={() => toast("Abrindo a equipe…")} />
              </>
            }
          />
          <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px")}>
            {equipe.map((b) => {
              const on = ativos[b.id];
              const fer = ferias[b.id];
              return (
                <div
                  key={b.id}
                  style={s(
                    `${PANEL};padding:12px;display:flex;flex-direction:column;gap:10px;transition:opacity var(--dur-fast) var(--ease-out);opacity:${
                      fer ? "1" : on ? "1" : ".6"
                    }`
                  )}
                >
                  <div style={s("display:flex;align-items:center;gap:9px")}>
                    <Monogram name={b.nome} id={b.id} size={34} radius={10} />
                    <div style={s("min-width:0")}>
                      <div style={s("font-size:13.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                        {b.nome.split(" ")[0]}
                      </div>
                      <div style={s("font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                        {b.especialidade}
                      </div>
                    </div>
                  </div>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
                    <span style={s("display:inline-flex;align-items:center;gap:4px")}>
                      <Icon name="star" size={13} stroke="var(--warn)" />
                      <span style={s(`${MONO};font-size:12.5px;color:var(--ink)`)}>{b.avaliacao.toFixed(1)}</span>
                    </span>
                    {fer ? <Badge tone="warm">Em férias</Badge> : null}
                  </div>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
                    {fer ? (
                      <span style={s("opacity:.4;pointer-events:none;display:flex")}>
                        <Toggle on={false} />
                      </span>
                    ) : (
                      <Toggle
                        on={on}
                        onChange={() => {
                          setAtivos((p) => ({ ...p, [b.id]: !p[b.id] }));
                          toast(`${b.nome.split(" ")[0]} ${on ? "pausado" : "ativado"}`);
                        }}
                      />
                    )}
                    <button
                      className="m-press m-focus"
                      onClick={() => {
                        setFerias((p) => ({ ...p, [b.id]: !p[b.id] }));
                        toast(fer ? `${b.nome.split(" ")[0]} voltou das férias` : `${b.nome.split(" ")[0]} marcado em férias`);
                      }}
                      style={s("border:none;background:transparent;cursor:pointer;font-size:11.5px;font-weight:600;color:var(--muted);padding:2px")}
                    >
                      {fer ? "voltar" : "entrou de férias?"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        )}

        {/* ---------- 4. MAISA / Config (1×1) ---------- */}
        {isOn("config") && (
        <Card
          hover
          pad={18}
          radius={18}
          className={wCls}
          style={wStyle(3, `transition:opacity var(--dur-base) var(--ease-out);opacity:${maisaOn ? "1" : ".62"}`)}
        >
          <CardHead icon="bot" title="MAISA" action={<VerTudo label="Configurar" onClick={() => toast("Abrindo a configuração…")} />} />
          <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
            <Badge tone={maisaOn ? "success" : "neutral"} dot>{maisaOn ? "No ar" : "Pausada"}</Badge>
            <Toggle
              on={maisaOn}
              onChange={() => {
                setMaisaOn((v) => !v);
                toast(maisaOn ? "MAISA pausada" : `MAISA no ar novamente ${t.emoji}`.trim());
              }}
            />
          </div>
          <div style={s("margin-top:auto;display:flex;flex-direction:column;gap:6px")}>
            <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
              <span style={s("font-size:12.5px;color:var(--muted)")}>Tom</span>
              <Badge tone="primary">{assistant.tom}</Badge>
            </div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
              <span style={s("font-size:12.5px;color:var(--muted)")}>Resposta média</span>
              <span style={s(`${MONO};font-size:13px;color:var(--ink)`)}>~{assistant.respostaMedia}</span>
            </div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
              <span style={s("font-size:12.5px;color:var(--muted)")}>Resolvidas</span>
              <span style={s(`${MONO};font-size:13px;color:var(--ink)`)}>{Math.round(assistant.taxaResolucao * 100)}%</span>
            </div>
          </div>
        </Card>
        )}

        {/* ---------- 5. DADOS (1×1) ---------- */}
        {isOn("dados") && (
        <Card hover pad={18} radius={18} className={wCls} style={wStyle(4, "")}>
          <CardHead icon="trending-up" title="Dados" action={<VerTudo label="Ver dados" onClick={() => toast("Abrindo os dados…")} />} />
          <div style={s("display:flex;align-items:baseline;gap:8px")}>
            <span style={s(`${MONO};font-size:24px;color:var(--ink);line-height:1`)}>{dadoBig}</span>
            <span style={s("font-size:11.5px;color:var(--muted)")}>{serie === "fat" ? "no mês" : "ocupação"}</span>
          </div>
          <Spark data={sparkData} />
          <div style={s("margin-top:auto;display:flex;flex-direction:column;gap:9px")}>
            <span style={s("font-size:11.5px;color:var(--muted)")}>{dadoSub}</span>
            <div style={s("display:inline-flex;padding:3px;border-radius:10px;background:var(--surface-2);gap:3px;align-self:flex-start")}>
              {(["fat", "ocup"] as const).map((k) => {
                const sel = serie === k;
                return (
                  <button
                    key={k}
                    onClick={() => setSerie(k)}
                    className="m-press m-focus"
                    style={s(
                      `border:none;cursor:pointer;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:8px;transition:background-color var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out);${
                        sel ? "background:var(--surface);color:var(--ink);box-shadow:var(--shadow-card)" : "background:transparent;color:var(--muted)"
                      }`
                    )}
                  >
                    {k === "fat" ? "Faturamento" : "Ocupação"}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
        )}

        {/* ---------- 6. SERVIÇOS (1×1) ---------- */}
        {isOn("servicos") && (
        <Card hover pad={18} radius={18} className={wCls} style={wStyle(5, "")}>
          <CardHead
            icon={t.servicoIcon}
            title="Serviços"
            action={
              <>
                <Badge tone="neutral">{servicosAtivos}</Badge>
                <VerTudo label="Gerenciar" onClick={() => toast("Abrindo os serviços…")} />
              </>
            }
          />
          <div style={s("display:flex;flex-direction:column;gap:6px;margin-top:auto")}>
            {top3.map((sv) => {
              const look = catLook(sv.categoria, t.servicoIcon);
              const destaque = destaques.has(sv.id);
              return (
                <div
                  key={sv.id}
                  className="m-hov-bg m-lift"
                  style={s(`display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:11px;${ROW_TR}`)}
                >
                  <span style={s(`width:30px;height:30px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;background:${look.tint};color:${look.ink}`)}>
                    <Icon name={look.icon} size={16} />
                  </span>
                  <div style={s("flex:1;min-width:0;display:flex;flex-direction:column;gap:1px")}>
                    <span style={s("font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {sv.nome}
                    </span>
                    {destaque ? <Badge tone="warm">Destaque</Badge> : null}
                  </div>
                  <span style={s(`${MONO};font-size:13px;color:var(--ink)`)}>{fmt(sv.preco)}</span>
                  <IconBtn
                    icon="star"
                    tone={destaque ? "primary" : "neutral"}
                    title="Destaque do dia"
                    onClick={() => {
                      toggleDestaque(sv.id);
                      toast(destaque ? `"${sv.nome}" saiu dos destaques` : `"${sv.nome}" em destaque hoje ⭐`);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
        )}

        {/* ---------- 7. FAQ (1×1) ---------- */}
        {isOn("faq") && (
        <Card hover pad={18} radius={18} className={wCls} style={wStyle(6, "")}>
          <CardHead
            icon="faq"
            title="FAQ"
            action={
              <>
                <Badge tone="neutral">{faqsAtivas.length}</Badge>
                <VerTudo label="Editar FAQ" onClick={() => toast("Abrindo o FAQ…")} />
              </>
            }
          />
          {faqAtual ? (
            <div style={s(`${PANEL};padding:12px;display:flex;flex-direction:column;gap:6px;margin-top:auto`)}>
              <span style={s("font-size:13px;font-weight:700;color:var(--ink);line-height:1.4")}>{faqAtual.pergunta}</span>
              <span style={s("font-size:12px;color:var(--muted);line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {faqAtual.resposta}
              </span>
              <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px")}>
                <span style={s("display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted)")}>
                  <span style={s(`${MONO};font-size:12px;color:var(--ink)`)}>{faqAtual.usos}</span> usos
                </span>
                <Btn variant="secondary" size="sm" icon="refresh" onClick={() => setFaqIdx((v) => v + 1)}>
                  ver outra
                </Btn>
              </div>
            </div>
          ) : null}
        </Card>
        )}

        {/* ---------- 8. PAGAMENTOS (2×1, banda baixa) ---------- */}
        {isOn("pagamentos") && (
        <Card
          hover
          pad={18}
          radius={18}
          className={wCls}
          style={wStyle(7, "grid-column:span 2")}
        >
          <CardHead
            icon="card"
            title="Pagamentos"
            action={
              <>
                <Badge tone="success" dot>{assinatura.status}</Badge>
                <VerTudo label="Ver plano" onClick={() => toast("Abrindo o plano…")} />
              </>
            }
          />
          <div style={s("display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:auto")}>
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              <span style={s(MICRO)}>Plano {assinatura.plano}</span>
              <span style={s(`${MONO};font-size:20px;color:var(--ink);line-height:1`)}>{fmt(assinatura.valor)}<span style={s("font-size:12px;font-weight:600;color:var(--muted);font-family:inherit;letter-spacing:0")}>/mês</span></span>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              <span style={s(MICRO)}>Próxima cobrança</span>
              <span style={s("font-size:13px;font-weight:600;color:var(--ink)")}>{assinatura.proximaCobranca}</span>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              <span style={s(MICRO)}>Método</span>
              <span style={s("font-size:13px;font-weight:600;color:var(--ink)")}>Cartão final {metodoPagamento.final}</span>
            </div>
            <div style={s("margin-left:auto;display:flex;align-items:center;gap:9px")}>
              <span style={s("font-size:12.5px;font-weight:600;color:var(--ink)")}>Renovação automática</span>
              <Toggle
                on={renovacao}
                onChange={() => {
                  setRenovacao((v) => !v);
                  toast(renovacao ? "Renovação automática desligada" : "Renovação automática ligada");
                }}
              />
            </div>
          </div>
        </Card>
        )}

        {/* ---------- 9. MARKETING (2×1, banda baixa, esmaecido) ---------- */}
        {isOn("marketing") && (
        <Card
          hover
          pad={18}
          radius={18}
          className={wCls}
          style={wStyle(8, "grid-column:span 2;opacity:.82")}
        >
          <CardHead icon="marketing" title="Marketing" action={<Badge tone="neutral">Em breve</Badge>} />
          <div style={s("display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:auto")}>
            <div style={s("flex:1;min-width:0;display:flex;flex-direction:column;gap:3px")}>
              <span style={s("font-size:13px;font-weight:600;color:var(--ink)")}>Campanhas e disparos no WhatsApp</span>
              <span style={s("font-size:12px;color:var(--muted)")}>
                <span style={s(`${MONO};font-size:12px;color:var(--ink)`)}>{campanhasAtivas}</span> campanhas ativas na régua
              </span>
            </div>
            {avisado ? (
              <span style={s("display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--success)")}>
                <Icon name="check" size={16} sw={2.4} stroke="var(--success)" />
                Você será avisado
              </span>
            ) : (
              <Btn
                variant="secondary"
                size="sm"
                icon="bell"
                onClick={() => {
                  setAvisado(true);
                  toast("Avisaremos quando o Marketing chegar 🔔");
                }}
              >
                Avise-me
              </Btn>
            )}
          </div>
        </Card>
        )}
      </div>
    </Screen>
  );
}
