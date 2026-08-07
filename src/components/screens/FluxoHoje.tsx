"use client";
/* MAISA — Fluxo de hoje.
 *
 * A tela que abre o app. Responde "o que acontece agora" em duas metades:
 *   • o quadro do dia — Chegando → Em atendimento → Feito, arrastável
 *   • "Precisa de você" — o que a MAISA NÃO resolveu sozinha
 *
 * O painel da direita é o coração do produto: se ele está vazio, a assistente
 * está fazendo o trabalho. Por isso o estado vazio é comemorativo, não neutro.
 *
 * Arrastar e o botão de avançar mexem no MESMO estado que a Agenda lê — não são
 * duas listas paralelas. Ver src/lib/data.ts → AGENDAMENTOS. */

import React from "react";
import { s, Icon, Monogram, EmptyState } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore, type AgendamentoVivo } from "@/lib/store";

/* Cada etapa tem um rótulo, uma cor de ponto e o verbo que a avança.
 * "Chegando" era --warm (âmbar): 1,57:1 sobre fundo claro, o ponto sumia. Virou --warn e não
 * --primary porque quem ainda não chegou é a única etapa que pode exigir ação sua (ligar, cobrar
 * confirmação) — e porque --primary já é o ponto de "Em atendimento": dois pontos iguais em
 * colunas vizinhas apagariam a distinção que o ponto existe para fazer. */
const COLUNAS: { id: D.Etapa; titulo: string; dot: string; acao: string | null; primaria: boolean }[] = [
  { id: "chegando", titulo: "Chegando", dot: "var(--warn)", acao: "Chegou", primaria: true },
  { id: "atendendo", titulo: "Em atendimento", dot: "var(--primary)", acao: "Concluir", primaria: false },
  { id: "feito", titulo: "Feito hoje", dot: "var(--success)", acao: null, primaria: false },
];

/* ───────────────────────────── cartão do quadro ───────────────────────────── */

function CartaoFluxo({ ag, acao, primaria }: { ag: AgendamentoVivo; acao: string | null; primaria: boolean }) {
  const st = useStore();
  const arrastando = st.arrastando === ag.id;

  return (
    <div
      draggable
      // O id viaja no dataTransfer, não só no estado: o estado serve para
      // destacar a coluna alvo, mas quem manda no drop é o payload do evento —
      // assim o soltar não depende de o re-render do dragstart já ter ocorrido.
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ag.id); st.iniciarArrasto(ag.id); }}
      onDragEnd={st.encerrarArrasto}
      onClick={() => st.abrir(ag.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.abrir(ag.id); } }}
      aria-label={`${ag.cliente.nome}, ${D.hhmm(ag.inicio)}, ${ag.servico.nome}`}
      className="m-drag m-focus"
      style={s(`background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-card);opacity:${arrastando ? "0.4" : "1"};transition:opacity var(--dur-fast) linear`)}
    >
      <div style={s("display:flex;align-items:center;gap:10px")}>
        {/* hora é DADO, não string de máquina: saiu o mono (e o tracking negativo que só destruía
            o avanço fixo do mono). Os dígitos da Plex Sans já são tabulares — .n é o contrato,
            e as horas seguem alinhadas na coluna do kanban. */}
        <span className="n" style={s("font-size:var(--t-body);font-weight:var(--w-data)")}>{D.hhmm(ag.inicio)}</span>
        {!ag.confirmado && (
          <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);color:var(--warn);background:var(--warn-soft);padding:3px 9px;border-radius:999px")}>a confirmar</span>
        )}
        <span style={s("margin-left:auto")} title={ag.profissional.nome}>
          <Monogram name={ag.profissional.nome} id={ag.profissionalId} size={28} radius={9} />
        </span>
      </div>
      <div>
        <div style={s("font-size:var(--t-body);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ag.cliente.nome}</div>
        <div style={s("font-size:var(--t-sm);color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ag.servico.nome}</div>
      </div>
      {acao && (
        <button
          onClick={(e) => { e.stopPropagation(); st.avancarEtapa(ag.id); }}
          className={`${primaria ? "m-hov-primary" : "m-hov-bg"} m-press m-focus`}
          style={s(`height:38px;border:none;border-radius:10px;font-size:var(--t-sm);font-weight:var(--w-title);cursor:pointer;${primaria ? "background:var(--primary);color:var(--on-primary)" : "background:var(--primary-soft);color:var(--primary-dark)"}`)}
        >
          {acao}
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────── painel da fila ───────────────────────────── */

function PrecisaDeVoce() {
  const st = useStore();
  const fila = st.fila;

  return (
    <>
      <div style={s("padding:20px 20px 14px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--line);flex-shrink:0")}>
        <span style={s("font-size:var(--t-body);font-weight:var(--w-title)")}>Precisa de você</span>
        {fila.length > 0 && (
          // contagem é dado: sai o mono, entra .n. O âmbar aqui é marca (o selo da MAISA sobre a
          // fila dela), não estado — e o texto passou a --warm-ink, 7,51:1 sobre o ouro.
          <span className="n" style={s("min-width:20px;height:20px;padding:0 7px;border-radius:999px;background:var(--warm);color:var(--warm-ink);font-size:var(--t-micro);font-weight:var(--w-data);display:inline-flex;align-items:center;justify-content:center")}>
            {fila.length}
          </span>
        )}
      </div>

      <div style={s("flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px")}>
        {fila.length === 0 ? (
          <div style={s("padding:32px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px")}>
            <span style={s("width:44px;height:44px;border-radius:14px;background:var(--success-soft);color:var(--success);display:flex;align-items:center;justify-content:center")}>
              <Icon name="check" size={22} sw={2.2} />
            </span>
            <span style={s("font-size:var(--t-sm);font-weight:var(--w-title)")}>Nada pendente</span>
            <span style={s("font-size:var(--t-label);color:var(--muted);line-height:var(--lh-prose);max-width:210px")}>
              A MAISA está resolvendo tudo sozinha agora.
            </span>
          </div>
        ) : fila.map((f) => (
          <div
            key={f.id}
            style={s("border:1px solid var(--border);border-radius:16px;background:var(--bg);display:flex;flex-direction:column")}
          >
            <button
              onClick={() => st.abrir(f.alvo)}
              className="m-press m-focus m-lift"
              style={s("text-align:left;border:none;background:transparent;padding:14px 14px 10px;display:flex;flex-direction:column;gap:8px;cursor:pointer;border-radius:16px")}
            >
              <span style={s("display:flex;align-items:center;gap:10px;width:100%")}>
                <Monogram name={f.titulo} id={f.id} size={30} radius={10} />
                <span style={s("flex:1;min-width:0;font-size:var(--t-sm);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{f.titulo}</span>
                <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);color:var(--warn);background:var(--warn-soft);padding:3px 8px;border-radius:999px;white-space:nowrap")}>{f.tag}</span>
              </span>
              <span style={s("font-size:var(--t-sm);line-height:var(--lh-prose);color:var(--muted);text-align:left")}>{f.msg}</span>
            </button>
            <div style={s("display:flex;justify-content:flex-end;padding:0 12px 10px")}>
              <button
                onClick={() => st.resolverFila(f.alvo)}
                className="m-hov-bg m-press m-focus"
                style={s("border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:9px;font-size:var(--t-label);font-weight:var(--w-title);padding:6px 12px;cursor:pointer")}
              >
                Já resolvi
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */

export default function FluxoHoje() {
  const st = useStore();
  const mobile = useIsMobile();

  // `st.agendamentos` é a JANELA visível da Agenda (a Agenda ganhou Semana e Mês). O Fluxo é de
  // hoje e continua sendo: sem este recorte o kanban encheria com trinta dias.
  // O store garante que hoje está sempre na lista, mesmo com a Agenda aberta em outro mês.
  const doDia = st.agendamentosDoDia(D.HOJE.iso);
  const porEtapa = (e: D.Etapa) => doDia.filter((a) => a.etapa === e);

  /* ── mobile: sem arrastar (não funciona no toque). A fila vem primeiro porque
        é o que exige decisão; depois o dia em lista, com o botão de avançar. ── */
  if (mobile) {
    return (
      <div className="m-enter" style={s("flex:1;min-height:0;overflow-y:auto;padding:2px 16px 24px;display:flex;flex-direction:column;gap:14px")}>
        {st.fila.length > 0 && (
          <div style={s("border:1px solid var(--border);border-radius:16px;background:var(--surface);display:flex;flex-direction:column;overflow:hidden")}>
            <PrecisaDeVoce />
          </div>
        )}
        {COLUNAS.map((col) => {
          const itens = porEtapa(col.id);
          if (!itens.length) return null;
          return (
            <div key={col.id} style={s("display:flex;flex-direction:column;gap:10px")}>
              <div style={s("display:flex;align-items:center;gap:9px;padding:2px 4px")}>
                <span style={s(`width:9px;height:9px;border-radius:50%;background:${col.dot}`)} />
                <span style={s("font-size:var(--t-sm);font-weight:var(--w-title)")}>{col.titulo}</span>
                <span className="n" style={s("font-size:var(--t-label);font-weight:var(--w-data);color:var(--muted);margin-left:auto")}>{itens.length}</span>
              </div>
              {itens.map((ag) => <CartaoFluxo key={ag.id} ag={ag} acao={col.acao} primaria={col.primaria} />)}
            </div>
          );
        })}
        {doDia.length === 0 && (
          <EmptyState icon="flow" title="Dia livre" sub="Nenhum atendimento marcado para hoje." />
        )}
      </div>
    );
  }

  /* ── desktop: quadro arrastável + painel fixo ── */
  return (
    <div className="m-enter" style={s("flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 330px;height:100%")}>
      <div style={s("padding:22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;min-height:0")}>
        {COLUNAS.map((col) => {
          const itens = porEtapa(col.id);
          const alvo = st.alvoSolta === col.id && st.arrastando;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); st.marcarAlvo(col.id); }}
              onDragLeave={() => st.marcarAlvo(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || st.arrastando;
                if (id) st.moverEtapa(id, col.id);
              }}
              style={s(`display:flex;flex-direction:column;gap:12px;border-radius:16px;padding:14px;min-height:0;background:${alvo ? "var(--primary-soft)" : "var(--bg)"};border:1.5px dashed ${alvo ? "var(--primary)" : "transparent"};transition:background-color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)`)}
            >
              <div style={s("display:flex;align-items:center;gap:9px;padding:2px 4px;flex-shrink:0")}>
                <span style={s(`width:9px;height:9px;border-radius:50%;background:${col.dot}`)} />
                <span style={s("font-size:var(--t-sm);font-weight:var(--w-title)")}>{col.titulo}</span>
                <span className="n" style={s("font-size:var(--t-label);font-weight:var(--w-data);color:var(--muted);margin-left:auto")}>{itens.length}</span>
              </div>
              <div style={s("display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0")}>
                {itens.map((ag) => <CartaoFluxo key={ag.id} ag={ag} acao={col.acao} primaria={col.primaria} />)}
                {itens.length === 0 && (
                  <div style={s("border-radius:16px;padding:22px 12px;text-align:center;font-size:var(--t-sm);color:var(--muted)")}>
                    Arraste alguém para cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={s("border-left:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;min-height:0")}>
        <PrecisaDeVoce />
      </div>
    </div>
  );
}
