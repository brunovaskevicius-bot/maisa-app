"use client";
/* MAISA — o shell do app.
 *
 * Desktop: rail navy de 76px que abre para 244px no hover (CSS, sem re-render) +
 * uma topbar navy dentro do cartão de conteúdo. O rail é absoluto sobre um
 * espaçador, então expandir sobrepõe o conteúdo em vez de empurrá-lo.
 *
 * Mobile: cabeçalho com data e título + 5 abas fixas embaixo. O rail de 9 itens
 * não caberia, então "Mais" agrupa Faturamento, Equipe, Serviços e A MAISA — e a
 * aba fica acesa quando você está em qualquer uma delas.
 *
 * A topbar só mostra botão de ação primária onde existe ação de verdade
 * (Faturamento, A MAISA, Mais). Um CTA dourado em toda tela ficaria bonito, mas
 * três deles não fariam nada — e botão morto ensina o usuário a ignorar botões. */

import React, { useEffect, useState } from "react";
import { s, Icon, Monogram, Toaster } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore, type TelaId } from "@/lib/store";
import UserMenu from "./UserMenu";
import Gaveta from "./Gaveta";
import Paleta from "./Paleta";
import FluxoHoje from "./screens/FluxoHoje";
import Conversas from "./screens/Conversas";
import Agenda from "./screens/Agenda";
import AMaisa from "./screens/AMaisa";
import { Clientes, Faturamento, Equipe, Servicos, Mais } from "./screens/Grades";

/* ───────────────────────────── mapa de telas ───────────────────────────── */

const TELA: Record<TelaId, { rotulo: string; titulo: string; sub: string; icone: string; Comp: React.ComponentType }> = {
  fluxo: { rotulo: "Fluxo de hoje", titulo: "Fluxo de hoje", sub: `${D.HOJE.label} · arraste entre as colunas`, icone: "flow", Comp: FluxoHoje },
  conversas: { rotulo: "Conversas", titulo: "Conversas", sub: "A MAISA responde; você entra quando precisa", icone: "chat", Comp: Conversas },
  agenda: { rotulo: "Agenda", titulo: "Agenda", sub: `${D.HOJE.label} · arraste para remarcar`, icone: "calendar", Comp: Agenda },
  clientes: { rotulo: "Clientes", titulo: "Clientes", sub: "Quem você atende — toque para ver a ficha", icone: "clientes", Comp: Clientes },
  faturamento: { rotulo: "Faturamento", titulo: "Faturamento", sub: `${D.PERIODO} · o mês fechado cliente por cliente`, icone: "receipt", Comp: Faturamento },
  equipe: { rotulo: "Equipe", titulo: "Equipe", sub: "Quem atende e quando", icone: "equipe", Comp: Equipe },
  servicos: { rotulo: "Serviços", titulo: "Serviços", sub: "O que você oferece e por quanto", icone: "tag", Comp: Servicos },
  assistente: { rotulo: "A MAISA", titulo: "Ajustes da MAISA", sub: "Uma seção por vez — o preview segue você", icone: "bot", Comp: AMaisa },
  mais: { rotulo: "Mais", titulo: "Mais", sub: "Respostas, plano e números", icone: "dots", Comp: Mais },
};

/** Grupos do rail — separados por hairline: o dia, o dinheiro, a configuração. */
const GRUPOS: TelaId[][] = [
  ["fluxo", "conversas", "agenda"],
  ["clientes", "faturamento"],
  ["equipe", "servicos", "assistente", "mais"],
];

/** Abas do mobile e quais telas cada uma representa. */
const ABAS: { id: TelaId; rotulo: string; cobre: TelaId[] }[] = [
  { id: "fluxo", rotulo: "Hoje", cobre: ["fluxo"] },
  { id: "conversas", rotulo: "Conversas", cobre: ["conversas"] },
  { id: "agenda", rotulo: "Agenda", cobre: ["agenda"] },
  { id: "clientes", rotulo: "Clientes", cobre: ["clientes"] },
  { id: "mais", rotulo: "Mais", cobre: ["mais", "faturamento", "equipe", "servicos", "assistente"] },
];

/* ───────────────────────────── contadores ─────────────────────────────
 * Os badges do rail existem para uma coisa: dizer o que exige você sem que você
 * precise entrar na tela. Então contam pendência, não volume. */

function usePendencias() {
  const st = useStore();
  const conversas = D.CONVERSAS.filter((c) => {
    const e = st.estadoConversa(c.id);
    return e === "espera" || e === "voce";
  }).length;
  const notas = st.fechamento.filter((c) => {
    const stt = st.notaDe(c.id).status;
    return stt === "pendente" || stt === "processando" || stt === "erro";
  }).length;
  return { conversas, notas, fila: st.fila.length };
}

/* ───────────────────────────── rail (desktop) ───────────────────────────── */

function ItemRail({ id, badge }: { id: TelaId; badge?: number }) {
  const st = useStore();
  const t = TELA[id];
  const on = st.tela === id;
  return (
    <button
      onClick={() => st.irPara(id)}
      title={t.rotulo}
      aria-current={on ? "page" : undefined}
      className="m-nav-item m-press m-focus"
      style={s(`width:100%;height:46px;flex-shrink:0;border:none;border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:12px;padding:0 15px;position:relative;background:${on ? "var(--nav-active)" : "transparent"}`)}
    >
      {/* barra dourada de tela ativa — some junto com o hover, não pisca */}
      <span style={s(`position:absolute;left:-12px;top:13px;width:3px;height:20px;border-radius:2px;background:${on ? "var(--warm)" : "transparent"}`)} />
      <span style={s("flex-shrink:0;display:flex;position:relative")}>
        <Icon name={t.icone} size={21} sw={1.9} stroke={on ? "var(--nav-ink)" : "var(--nav-muted)"} />
        {!!badge && (
          <span style={s("position:absolute;top:-3px;right:-4px;min-width:8px;height:8px;border-radius:999px;background:var(--warm)")} />
        )}
      </span>
      <span className="m-rail-label" style={s(`flex:1;text-align:left;font-size:14.5px;font-weight:700;color:${on ? "var(--nav-ink)" : "var(--nav-muted)"}`)}>
        {t.rotulo}
      </span>
      {!!badge && (
        <span className="m-rail-label" style={s("flex-shrink:0;min-width:21px;height:21px;padding:0 7px;border-radius:999px;background:var(--warm);color:oklch(0.30 0.06 72);font-family:var(--font-mono);font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center")}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Rail() {
  const p = usePendencias();
  const badge: Partial<Record<TelaId, number>> = { conversas: p.conversas, faturamento: p.notas };

  return (
    <div style={s("width:76px;flex-shrink:0;position:relative;z-index:30")}>
      <nav
        aria-label="Navegação principal"
        className="m-rail"
        style={s("position:absolute;top:0;bottom:0;left:0;background:var(--nav);border-radius:22px;box-shadow:0 10px 30px oklch(0.30 0.05 250 / 0.22);display:flex;flex-direction:column;padding:18px 12px;gap:4px;overflow:hidden")}
      >
        <div style={s("display:flex;align-items:center;gap:12px;padding-left:3px;margin-bottom:14px;flex-shrink:0")}>
          <span style={s("width:40px;height:40px;flex-shrink:0;border-radius:13px;background:var(--nav-active);display:flex;align-items:center;justify-content:center;color:var(--warm);font-weight:800;font-size:20px;line-height:1")}>m</span>
          <span className="m-rail-label" style={s("font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--warm)")}>maisa</span>
        </div>

        {GRUPOS.map((grupo, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={s("height:1px;flex-shrink:0;background:var(--nav-line);margin:12px 3px")} />}
            {grupo.map((id) => <ItemRail key={id} id={id} badge={badge[id]} />)}
          </React.Fragment>
        ))}

        <div style={s("margin-top:auto;display:flex;flex-direction:column;gap:8px;flex-shrink:0")}>
          <div style={s("display:flex;align-items:center;gap:12px;padding-left:3px")}>
            <Monogram name={D.NEGOCIO.nome} id={D.NEGOCIO.nome} size={40} radius={13} />
            <span className="m-rail-label" style={s("min-width:0;line-height:1.3")}>
              <span style={s("display:block;font-size:13.5px;font-weight:700;color:var(--nav-ink)")}>{D.NEGOCIO.nome}</span>
              <span style={s("display:block;font-size:11.5px;color:var(--nav-soft)")}>Plano {D.NEGOCIO.plano}</span>
            </span>
          </div>
          <div className="m-rail-label"><UserMenu /></div>
        </div>
      </nav>
    </div>
  );
}

/* ───────────────────────────── ação primária ─────────────────────────────
 * Só onde existe: emitir as notas que faltam, salvar os ajustes, chamar suporte. */

function AcaoPrimaria() {
  const st = useStore();
  const p = usePendencias();

  const dourado = "height:40px;padding:0 18px;border:none;border-radius:12px;background:var(--warm);color:oklch(0.29 0.06 72);font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;text-decoration:none";

  if (st.tela === "faturamento") {
    const aEmitir = st.fechamento.filter((c) => ["pendente", "erro", "cancelada"].includes(st.notaDe(c.id).status)).length;
    if (!aEmitir) return null;
    return (
      <button onClick={st.emitirPendentes} className="m-hov-bright m-press m-focus" style={s(dourado)}>
        <Icon name="receipt" size={16} sw={2.1} />
        Emitir {aEmitir} {aEmitir === 1 ? "nota" : "notas"}
      </button>
    );
  }

  if (st.tela === "assistente") {
    return (
      <button onClick={st.salvar} className="m-hov-bright m-press m-focus" style={s(dourado)}>
        <Icon name="check" size={16} sw={2.3} />
        {st.salvo ? "Salvo" : "Salvar ajustes"}
      </button>
    );
  }

  if (st.tela === "mais") {
    return (
      <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="m-hov-bright m-press m-focus" style={s(dourado)}>
        <Icon name="whatsapp" size={16} sw={1.9} />
        Falar com o suporte
      </a>
    );
  }

  if (st.tela === "fluxo" && p.fila > 0) {
    return (
      <button onClick={() => st.irPara("conversas")} className="m-hov-bright m-press m-focus" style={s(dourado)}>
        <Icon name="chat" size={16} sw={2} />
        Resolver {p.fila} {p.fila === 1 ? "pendência" : "pendências"}
      </button>
    );
  }

  return null;
}

/* ───────────────────────────── topbar (desktop) ───────────────────────────── */

function Topbar({ onBuscar }: { onBuscar: () => void }) {
  const st = useStore();
  const t = TELA[st.tela];

  return (
    <header style={s("height:70px;flex-shrink:0;display:flex;align-items:center;gap:18px;padding:0 24px;background:var(--nav)")}>
      <div style={s("min-width:0")}>
        <h1 style={s("font-size:20px;font-weight:800;letter-spacing:-.02em;white-space:nowrap;color:var(--nav-ink)")}>{t.titulo}</h1>
        <p style={s("font-size:12.5px;color:var(--nav-soft);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.sub}</p>
      </div>

      <button
        onClick={onBuscar}
        className="m-press m-focus"
        style={s("flex:1;max-width:360px;min-width:0;margin-left:10px;display:flex;align-items:center;gap:10px;height:40px;padding:0 14px;border-radius:12px;background:var(--nav-active);border:1px solid var(--nav-line);color:var(--nav-soft);cursor:pointer;text-align:left")}
      >
        <Icon name="search" size={17} sw={1.9} />
        <span style={s("flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Buscar cliente, conversa ou tela</span>
        <span style={s("flex-shrink:0;font-family:var(--font-mono);font-size:11.5px;font-weight:600;padding:3px 7px;border-radius:6px;background:var(--nav);border:1px solid var(--nav-line)")}>⌘K</span>
      </button>

      <div style={s("margin-left:auto;display:flex;align-items:center;gap:14px;flex-shrink:0")}>
        <span style={s("display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--nav-soft);white-space:nowrap")}>
          <span
            className={st.assistente.ativa ? "m-pulse" : undefined}
            style={s(`width:7px;height:7px;border-radius:50%;background:${st.assistente.ativa ? "var(--warm)" : "oklch(0.70 0.02 262)"}`)}
          />
          {st.assistente.ativa ? "MAISA no ar" : "MAISA pausada"}
        </span>
        <AcaoPrimaria />
      </div>
    </header>
  );
}

/* ───────────────────────────── tab bar (mobile) ───────────────────────────── */

function TabBar() {
  const st = useStore();
  const p = usePendencias();
  const pontos: Partial<Record<TelaId, number>> = { conversas: p.conversas, fluxo: p.fila };

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        ...s("flex-shrink:0;background:var(--surface);border-top:1px solid var(--border);padding:8px 6px 0;display:grid;grid-template-columns:repeat(5,1fr);gap:2px"),
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      {ABAS.map((aba) => {
        const on = aba.cobre.includes(st.tela);
        const cor = on ? "var(--primary)" : "var(--muted)";
        return (
          <button
            key={aba.id}
            onClick={() => st.irPara(aba.id)}
            aria-current={on ? "page" : undefined}
            className="m-press m-focus"
            style={s(`border:none;background:${on ? "var(--primary-soft)" : "transparent"};border-radius:14px;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;position:relative`)}
          >
            <Icon name={TELA[aba.id].icone} size={21} sw={1.9} stroke={cor} />
            <span style={s(`font-size:10.5px;font-weight:700;color:${cor}`)}>{aba.rotulo}</span>
            {!!pontos[aba.id] && (
              <span style={s("position:absolute;top:6px;right:22%;width:7px;height:7px;border-radius:50%;background:var(--warm)")} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ───────────────────────────── shell ───────────────────────────── */

export default function AppShell() {
  const st = useStore();
  const mobile = useIsMobile();
  const [paleta, setPaleta] = useState(false);
  const Ativa = TELA[st.tela].Comp;

  // ⌘K / Ctrl+K em qualquer lugar. Ignora quando o foco está num campo, senão
  // o atalho roubaria o "k" de quem está digitando uma saudação.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (mobile) {
    return (
      <div style={{
        ...s("display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg)"),
        paddingTop: "env(safe-area-inset-top)",
      }}>
        <header style={s("flex-shrink:0;padding:12px 16px 12px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px")}>
          <div style={s("min-width:0")}>
            <div style={s("font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)")}>{D.HOJE.label}</div>
            <h1 style={s("font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{TELA[st.tela].titulo}</h1>
          </div>
          <div style={s("display:flex;align-items:center;gap:8px;flex-shrink:0")}>
            <button
              onClick={() => setPaleta(true)}
              aria-label="Buscar"
              className="m-hov-bg m-press-icon m-focus"
              style={s("width:38px;height:38px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center")}
            >
              <Icon name="search" size={18} sw={1.9} />
            </button>
            <span style={s("width:38px;height:38px;flex-shrink:0;border-radius:12px;background:var(--nav);color:var(--warm);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px")}>m</span>
          </div>
        </header>

        <main key={st.tela} style={s("flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden")}>
          <Ativa />
        </main>

        <TabBar />
        <Gaveta />
        <Paleta aberta={paleta} fechar={() => setPaleta(false)} />
        <Toaster />
      </div>
    );
  }

  return (
    <div style={s("display:flex;gap:14px;height:100vh;padding:14px;overflow:hidden;background:transparent")}>
      <Rail />
      <main style={s("flex:1;min-width:0;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;background:var(--bg);border:1px solid var(--border);box-shadow:var(--shadow-card)")}>
        <Topbar onBuscar={() => setPaleta(true)} />
        <div key={st.tela} style={s("flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden")}>
          <Ativa />
        </div>
      </main>
      <Gaveta />
      <Paleta aberta={paleta} fechar={() => setPaleta(false)} />
      <Toaster />
    </div>
  );
}
