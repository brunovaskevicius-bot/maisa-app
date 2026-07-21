"use client";
import React, { useEffect, useState } from "react";
import { s, Icon, Monogram, Toaster } from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import { FEATURE_REGISTRY, GRUPOS_ORDEM, type FeatureId, type FeatureDef } from "@/lib/profiles";
import Dashboard from "./screens/Dashboard";
import Dados from "./screens/Dados";
import Atendimentos from "./screens/Atendimentos";
import Agenda from "./screens/Agenda";
import ConfigAssistente from "./screens/ConfigAssistente";
import MinhaEquipe from "./screens/MinhaEquipe";
import MeusServicos from "./screens/MeusServicos";
import PerguntasFrequentes from "./screens/PerguntasFrequentes";
import Marketing from "./screens/Marketing";
import MeusPagamentos from "./screens/MeusPagamentos";
import ClinicoDashboard from "./screens/ClinicoDashboard";
import Pacientes from "./screens/Pacientes";
import ClinicoServicos from "./screens/ClinicoServicos";
import Calendario from "./screens/Calendario";
import Faturamento from "./screens/Faturamento";
import SuperAdm from "./screens/SuperAdm";

type Key = FeatureId;

// Componentes por id (registry local — SCREEN_C não é exportado da infra p/ não quebrar tsc).
const SCREEN_C: Record<Key, React.ComponentType> = {
  config: ConfigAssistente,
  equipe: MinhaEquipe,
  servicos: MeusServicos,
  faq: PerguntasFrequentes,
  marketing: Marketing,
  pagamentos: MeusPagamentos,
  dashboard: Dashboard,
  atendimentos: Atendimentos,
  agenda: Agenda,
  dados: Dados,
  "clin-dashboard": ClinicoDashboard,
  pacientes: Pacientes,
  "clin-servicos": ClinicoServicos,
  calendario: Calendario,
  faturamento: Faturamento,
  superadm: SuperAdm,
};

const REG: Record<Key, FeatureDef> = Object.fromEntries(
  FEATURE_REGISTRY.map((f) => [f.id, f])
) as Record<Key, FeatureDef>;

// Subtítulos que NÃO dependem da profissão (os demais vêm de t no componente).
const SUB_STATICO: Partial<Record<Key, string>> = {
  config: "Personalidade, horários e respostas da MAISA",
  servicos: "Catálogo, preços e quem atende",
  faq: "O que a MAISA responde sozinha",
  marketing: "Em breve na MAISA",
  pagamentos: "Seu plano MAISA e forma de pagamento",
  dashboard: "Um resumo de tudo, num lugar só",
  "clin-dashboard": "Visão geral do consultório",
  pacientes: "Sua base de pacientes",
  "clin-servicos": "Catálogo e valores",
  calendario: "Sua semana de sessões",
  faturamento: "Notas fiscais e recebimentos",
  superadm: "Profissão, módulos e o que aparece no app",
};

export default function MaisaApp() {
  const { isOn, t, data, profissao } = useAdmin();
  const [screen, setScreen] = useState<Key>("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // viewport mobile (≤900px): estilos inline não têm @media, então o shell reage por estado.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => { if (!isMobile) setDrawerOpen(false); }, [isMobile]);

  // Fallback: primeira feature ligada (na ordem do registry) — nunca cai numa tela desligada.
  const firstEnabled = (): Key =>
    ((FEATURE_REGISTRY.find((f) => isOn(f.id))?.id as Key) ?? "superadm");

  // Se a tela ativa for desligada num toggle, cai para a primeira feature ligada.
  useEffect(() => {
    if (!isOn(screen)) setScreen(firstEnabled());
  }, [isOn, screen]);

  const effScreen: Key = isOn(screen) ? screen : firstEnabled();
  const Active = SCREEN_C[effScreen];

  // Label dinâmica: servicos usa t.catalogoLabel; demais usam a label do registry.
  const labelFor = (k: Key) => (k === "servicos" ? t.catalogoLabel : REG[k].label);
  // Ícone dinâmico: servicos usa o ícone da profissão (nunca tesoura fora da barbearia).
  const iconFor = (k: Key) => (k === "servicos" ? t.servicoIcon : REG[k].icon);

  // Subtítulo: estáticos + os que vêm de t/data.
  const subFor = (k: Key): string => {
    switch (k) {
      case "equipe": return t.equipeSub;
      case "atendimentos": return t.atendimentosSub;
      case "agenda": return t.agendaSub;
      case "dados": return t.dadosSub;
      default: return SUB_STATICO[k] ?? "";
    }
  };

  const NavItem = ({ k }: { k: Key }) => {
    const active = effScreen === k;
    return (
      <button
        onClick={() => { setScreen(k); setDrawerOpen(false); }}
        className="m-nav-item m-press m-focus"
        style={s(`display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:1px solid ${active ? "oklch(1 0 0 / 0.08)" : "transparent"};border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;text-align:left;background:${active ? "var(--nav-active)" : "transparent"};color:${active ? "var(--nav-ink)" : "var(--nav-muted)"}`)}
      >
        <Icon name={iconFor(k)} size={20} sw={1.85} stroke={active ? "var(--nav-accent)" : "currentColor"} />
        <span style={s("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{labelFor(k)}</span>
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span style={s("font-size:11px;font-weight:700;color:var(--nav-muted);letter-spacing:.09em;padding:0 12px 6px")}>{children}</span>
  );

  // Grupos com pelo menos 1 item visível (esconde grupo vazio) — ADMIN sempre tem superadm (fixo).
  const gruposVisiveis = GRUPOS_ORDEM
    .map((g) => ({ g, itens: FEATURE_REGISTRY.filter((f) => f.grupo === g && isOn(f.id)) }))
    .filter((x) => x.itens.length > 0);

  return (
    <div style={{ ...s("display:flex;flex-direction:column;height:100vh;background:transparent"), padding: isMobile ? "max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))" : "14px", gap: isMobile ? "10px" : "14px" }}>
      {/* TOPBAR — barra navy flutuante (logo + título da tela DENTRO dela).
          Opaca e full-width: âncora sólida no topo → o conteúdo rola por baixo
          sem "derreter" no creme. No mobile ganha o hambúrguer que abre a gaveta. */}
      <header style={s(`display:flex;align-items:center;gap:${isMobile ? "12px" : "18px"};background:var(--nav);border:1px solid var(--nav-line);border-radius:20px;box-shadow:0 8px 28px oklch(0.30 0.05 250 / 0.22);padding:${isMobile ? "12px 16px" : "14px 22px"};position:relative;z-index:2`)}>
        {isMobile && (
          <button onClick={() => setDrawerOpen((o) => !o)} aria-label="Abrir menu" aria-expanded={drawerOpen} className="m-press m-focus" style={s("display:flex;align-items:center;justify-content:center;width:42px;height:42px;flex-shrink:0;border:1px solid var(--nav-line);border-radius:12px;background:var(--nav-active);color:var(--nav-ink);cursor:pointer")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        )}
        <div style={s("display:flex;flex-direction:column;line-height:1")}>
          <span style={{ ...s("font-size:25px;font-weight:800;color:var(--warm);letter-spacing:-.01em"), textShadow: "0 1.5px 0 oklch(0.58 0.12 68), 0 3px 5px rgba(0,0,0,.22)" }}>maisa</span>
          <span style={s("font-size:10px;font-weight:700;color:var(--nav-muted);letter-spacing:.14em;margin-top:3px")}>ASSISTENTE</span>
        </div>
        {!isMobile && <div style={s("width:1px;height:34px;background:var(--nav-line)")} />}
        <div style={s("min-width:0")}>
          <h1 style={s("font-size:16px;font-weight:700;color:var(--nav-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{labelFor(effScreen)}</h1>
          <p style={s("font-size:12px;color:var(--nav-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{subFor(effScreen)}</p>
        </div>
      </header>

      {/* BODY — no mobile a sidebar sai do grid (vira gaveta fixa), sobra só o main em 1 coluna */}
      <div style={s(`display:grid;grid-template-columns:${isMobile ? "1fr" : "250px 1fr"};gap:14px;flex:1;min-height:0`)}>
        {/* BACKDROP — só no mobile; escurece o fundo quando a gaveta abre. Clique fecha. */}
        {isMobile && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ ...s("position:fixed;inset:0;z-index:55;background:oklch(0.20 0.03 260 / 0.5)"), backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? "auto" : "none", transition: "opacity .25s var(--ease-out)" }}
          />
        )}
        {/* SIDEBAR — card flutuante; no mobile é gaveta fixa que desliza pela esquerda */}
        <aside style={isMobile
          ? { ...s("background:var(--nav);border:1px solid var(--nav-line);border-radius:24px;box-shadow:0 24px 60px oklch(0.20 0.05 250 / 0.45);display:flex;flex-direction:column;padding:16px 14px;gap:6px;overflow-y:auto"), position: "fixed", top: 10, left: 10, bottom: 10, width: 272, maxWidth: "82vw", zIndex: 60, transform: drawerOpen ? "translateX(0)" : "translateX(calc(-100% - 24px))", transition: "transform .3s var(--ease-out)" }
          : s("background:var(--nav);border:1px solid var(--nav-line);border-radius:24px;box-shadow:0 12px 36px oklch(0.30 0.05 250 / 0.28);display:flex;flex-direction:column;padding:16px 14px;gap:6px;overflow-y:auto")}>
          {gruposVisiveis.map(({ g, itens }, gi) => (
            <React.Fragment key={g}>
              {gi > 0 && <div style={s("height:1px;background:var(--nav-line);margin:14px 8px")} />}
              <SectionLabel>{g}</SectionLabel>
              {itens.map((f) => <NavItem key={f.id} k={f.id} />)}
            </React.Fragment>
          ))}
          <div className="m-lift" style={s("margin-top:16px;display:flex;align-items:center;gap:11px;padding:12px;border-radius:14px;background:var(--nav-active)")}>
            <Monogram name={data.shop.nome} id={data.shop.nome} size={38} radius={11} />
            <div style={s("min-width:0;line-height:1.3")}>
              <div style={s("font-size:13px;font-weight:700;color:var(--nav-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{data.shop.nome}</div>
              <div style={s("font-size:11.5px;color:var(--nav-soft)")}>Plano {data.shop.plano}</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={s("display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden")}>
          <div style={s("flex:1;overflow-y:auto;overflow-x:hidden")}>
            <div key={effScreen + profissao}>
              <Active />
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
