"use client";
/* MAISA — Agenda do dia.
 *
 * Grade hora × profissional. Arrastar um bloco remarca de verdade: muda hora E
 * profissional, e o Fluxo de hoje enxerga a mudança na hora (é o mesmo estado).
 *
 * Duas escolhas que o design de origem não tinha:
 *  • Passo de 30 min. Cada hora tem duas zonas de soltura, não uma — remarcar
 *    para 14:30 não deveria exigir um segundo ajuste em outro lugar.
 *  • Blocos sobrepostos escalonam para a direita em vez de um cobrir o outro.
 *    Depois de arrastar dá para criar sobreposição, e um bloco invisível seria
 *    um atendimento perdido.
 *
 * No mobile a grade sai: arrastar não existe no toque e três colunas num celular
 * são ilegíveis. Vira linha do tempo. */

import React from "react";
import { s, Icon, Monogram, EmptyState } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore, type AgendamentoVivo } from "@/lib/store";

const LINHA = 64;   // altura de 1 hora, em px
const PASSO = 0.5;  // granularidade de remarcação, em horas

/** Aparência do bloco conforme onde o atendimento está no dia. */
function tomDoBloco(ag: AgendamentoVivo): { bg: string; ac: string; fg: string } {
  if (ag.etapa === "feito") return { bg: "var(--success-soft)", ac: "var(--success)", fg: "var(--success)" };
  if (ag.etapa === "atendendo") return { bg: "var(--warn-soft)", ac: "var(--warm)", fg: "oklch(0.38 0.07 72)" };
  if (!ag.confirmado) return { bg: "var(--surface)", ac: "var(--warm)", fg: "var(--muted)" };
  return { bg: "var(--primary-soft)", ac: "var(--primary)", fg: "var(--primary-dark)" };
}

/** Quantos blocos anteriores da coluna ainda estão em curso — define o recuo. */
function escalonar(blocos: AgendamentoVivo[]): Map<string, number> {
  const ordem = new Map<string, number>();
  const anteriores: AgendamentoVivo[] = [];
  for (const b of [...blocos].sort((x, y) => x.inicio - y.inicio)) {
    ordem.set(b.id, anteriores.filter((a) => a.fim > b.inicio).length);
    anteriores.push(b);
  }
  return ordem;
}

/* ───────────────────────────── desktop ───────────────────────────── */

function Grade() {
  const st = useStore();
  const horas = Array.from({ length: D.AGENDA_HORAS }, (_, i) => D.AGENDA_INICIO + i);
  const fatias = D.AGENDA_HORAS / PASSO;
  const colunas = `58px repeat(${D.COLUNAS_AGENDA.length},minmax(0,1fr))`;

  return (
    <div style={s("flex:1;min-height:0;overflow-y:auto;padding:0 24px 24px")}>
      {/* cabeçalho de colunas — cola no topo ao rolar */}
      <div style={s(`display:grid;grid-template-columns:${colunas};position:sticky;top:0;background:var(--bg);z-index:8;padding-top:14px`)}>
        <div />
        {D.COLUNAS_AGENDA.map((pid) => {
          const p = D.profissional(pid)!;
          const on = st.profAtivo(pid);
          return (
            <div key={pid} style={s(`display:flex;align-items:center;gap:9px;padding:0 10px 12px;opacity:${on ? "1" : "0.55"}`)}>
              <Monogram name={p.nome} id={pid} size={28} radius={9} />
              <span style={s("font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{D.primeiroNome(p.nome)}</span>
              {!on && <span style={s("font-size:10.5px;font-weight:700;color:var(--muted);background:var(--line);padding:2px 7px;border-radius:999px;flex-shrink:0")}>pausado</span>}
            </div>
          );
        })}
      </div>

      <div style={s(`display:grid;grid-template-columns:${colunas}`)}>
        {/* régua de horas */}
        <div style={s("display:flex;flex-direction:column")}>
          {horas.map((h) => (
            <div key={h} style={s(`height:${LINHA}px;font-family:var(--font-mono);font-size:11.5px;color:var(--muted);text-align:right;padding-right:12px`)}>
              {D.hhmm(h)}
            </div>
          ))}
        </div>

        {D.COLUNAS_AGENDA.map((pid) => {
          const blocos = st.agendamentos.filter((a) => a.profissionalId === pid);
          const recuo = escalonar(blocos);
          return (
            <div key={pid} style={s("position:relative;border-left:1px solid var(--line)")}>
              {/* zonas de soltura — uma a cada 30 min */}
              {Array.from({ length: fatias }, (_, i) => {
                const inicio = D.AGENDA_INICIO + i * PASSO;
                const chave = `${pid}@${inicio}`;
                const alvo = st.alvoSolta === chave && !!st.arrastando;
                const horaCheia = i % 2 === 0;
                return (
                  <div
                    key={chave}
                    onDragOver={(e) => { e.preventDefault(); st.marcarAlvo(chave); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain") || st.arrastando;
                      if (id) st.reposicionar(id, pid, inicio);
                    }}
                    style={s(`height:${LINHA * PASSO}px;border-bottom:1px ${horaCheia ? "dotted" : "solid"} var(--line);background:${alvo ? "var(--primary-soft)" : "transparent"};transition:background-color 120ms linear`)}
                  />
                );
              })}

              {/* blocos */}
              {blocos.map((ag) => {
                const tom = tomDoBloco(ag);
                const n = recuo.get(ag.id) ?? 0;
                return (
                  <div
                    key={ag.id}
                    draggable
                    // Ver comentário em FluxoHoje: o id do arrasto vai no payload
                    // do evento; o estado só serve para o realce visual.
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ag.id); st.iniciarArrasto(ag.id); }}
                    onDragEnd={st.encerrarArrasto}
                    onClick={() => st.abrir(ag.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.abrir(ag.id); } }}
                    aria-label={`${ag.cliente.nome}, ${D.hhmm(ag.inicio)}, ${ag.servico.nome}, ${D.primeiroNome(ag.profissional.nome)}`}
                    className="m-drag m-focus m-lift"
                    style={{
                      ...s(`position:absolute;border-radius:12px;padding:8px 11px;overflow:hidden;background:${tom.bg};border:1px solid var(--line);border-left:3px solid ${tom.ac};box-shadow:var(--shadow-card)`),
                      top: (ag.inicio - D.AGENDA_INICIO) * LINHA + 3,
                      height: Math.max((ag.duracao / 60) * LINHA - 6, 42),
                      left: 6 + n * 12,
                      right: 6,
                      zIndex: 5 + n,
                      opacity: st.arrastando === ag.id ? 0.4 : 1,
                    }}
                  >
                    <div style={s(`font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${tom.fg};line-height:1.25`)}>
                      {ag.cliente.nome}
                    </div>
                    {ag.duracao >= 40 && (
                      <div style={s(`font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${tom.fg};opacity:.85;margin-top:1px`)}>
                        {D.hhmm(ag.inicio)} · {ag.servico.nome}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── mobile ───────────────────────────── */

function LinhaDoTempo() {
  const st = useStore();
  if (!st.agendamentos.length) {
    return <EmptyState icon="calendar" title="Dia livre" sub="Nenhum atendimento marcado para hoje." />;
  }
  return (
    <div style={s("display:flex;flex-direction:column;gap:10px;padding:16px")}>
      {st.agendamentos.map((ag) => {
        const tom = tomDoBloco(ag);
        return (
          <button
            key={ag.id}
            onClick={() => st.abrir(ag.id)}
            className="m-press m-focus"
            style={s(`display:flex;align-items:center;gap:12px;text-align:left;padding:14px;border-radius:16px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${tom.ac};cursor:pointer;box-shadow:var(--shadow-card)`)}
          >
            <span style={s("flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;width:44px")}>
              <span style={s("font-family:var(--font-mono);font-size:14.5px;font-weight:700")}>{D.hhmm(ag.inicio)}</span>
              <span style={s("font-size:10.5px;color:var(--muted)")}>{ag.duracao}min</span>
            </span>
            <span style={s("flex:1;min-width:0")}>
              <span style={s("display:block;font-size:15.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ag.cliente.nome}</span>
              <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {ag.servico.nome} · {D.primeiroNome(ag.profissional.nome)}
              </span>
            </span>
            {!ag.confirmado && (
              <span style={s("flex-shrink:0;font-size:11px;font-weight:700;color:var(--warn);background:var(--warn-soft);padding:3px 8px;border-radius:999px")}>a confirmar</span>
            )}
            <Monogram name={ag.profissional.nome} id={ag.profissionalId} size={30} radius={10} />
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */

export default function Agenda() {
  const mobile = useIsMobile();

  return (
    <div className="m-enter" style={s("flex:1;min-height:0;height:100%;display:flex;flex-direction:column;background:var(--bg)")}>
      {/* seletor de dia + dica de interação */}
      <div style={s("flex-shrink:0;display:flex;align-items:center;gap:14px;padding:12px 24px;border-bottom:1px solid var(--line);overflow-x:auto")}>
        <div style={s("display:flex;gap:6px")}>
          {D.SEMANA.map(([dow, num]) => {
            const hoje = num === D.HOJE.num;
            return (
              <button
                key={dow}
                aria-current={hoje}
                className="m-press m-focus m-hov-bg"
                style={s(`display:flex;align-items:center;gap:7px;padding:7px 12px;border:none;border-radius:10px;cursor:pointer;flex-shrink:0;background:${hoje ? "var(--primary)" : "transparent"}`)}
              >
                <span style={s(`font-size:11px;font-weight:700;letter-spacing:.05em;color:${hoje ? "oklch(0.87 0.045 262)" : "var(--muted)"}`)}>{dow}</span>
                <span style={s(`font-family:var(--font-mono);font-size:13.5px;font-weight:700;color:${hoje ? "#fff" : "var(--ink)"}`)}>{num}</span>
              </button>
            );
          })}
        </div>
        {!mobile && (
          <div style={s("margin-left:auto;font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:8px;white-space:nowrap")}>
            <Icon name="clock" size={15} sw={1.9} />
            arraste para remarcar · clique para ver
          </div>
        )}
      </div>

      {mobile
        ? <div style={s("flex:1;min-height:0;overflow-y:auto")}><LinhaDoTempo /></div>
        : <Grade />}
    </div>
  );
}
