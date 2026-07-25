"use client";
/* MAISA — Conversas.
 *
 * Painel duplo: a lista de quem está falando e a conversa em si. A pergunta que
 * a tela responde não é "quem me mandou mensagem" — é "quem está conduzindo".
 * Daí o ponto de estado em cada linha e o botão único de assumir/devolver.
 *
 * Enquanto a MAISA conduz, o campo de texto fica travado: escrever por cima dela
 * sem assumir criaria duas vozes na mesma conversa. Clicar numa sugestão assume
 * a conversa e já preenche o texto — um gesto, não três.
 *
 * No mobile é uma coisa por vez: lista → conversa, com voltar. */

import React, { useEffect, useRef, useState } from "react";
import { s, Icon, Monogram } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore, type AbaConversa } from "@/lib/store";

const ABAS: [AbaConversa, string][] = [
  ["todas", "Todas"], ["espera", "Esperando"], ["maisa", "MAISA"], ["ok", "Resolvidas"],
];

const PONTO: Record<D.EstadoConversa, string> = {
  espera: "var(--warm)",
  voce: "var(--warm)",
  maisa: "var(--primary)",
  ok: "var(--success)",
};

const SITUACAO: Record<D.EstadoConversa, string> = {
  espera: "esperando sua resposta",
  voce: "você está respondendo",
  maisa: "a MAISA está conduzindo",
  ok: "conversa resolvida",
};

/* ───────────────────────────── lista ───────────────────────────── */

function Lista({ onEscolher }: { onEscolher: (id: string) => void }) {
  const st = useStore();

  const visiveis = D.CONVERSAS.filter((c) => {
    const e = st.estadoConversa(c.id);
    if (st.abaConv === "todas") return true;
    if (st.abaConv === "espera") return e === "espera" || e === "voce";
    return e === st.abaConv;
  });

  return (
    <>
      <div style={s("padding:16px 14px 12px;display:flex;flex-direction:column;gap:12px;flex-shrink:0")}>
        <div style={s("display:flex;gap:4px;padding:3px;border-radius:12px;background:var(--bg)")} role="tablist" aria-label="Filtrar conversas">
          {ABAS.map(([id, label]) => {
            const on = st.abaConv === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                onClick={() => st.setAbaConv(id)}
                className="m-press m-focus"
                style={s(`flex:1;border:none;cursor:pointer;height:34px;border-radius:9px;font-size:12.5px;font-weight:700;background:${on ? "var(--surface)" : "transparent"};color:${on ? "var(--primary)" : "var(--muted)"};box-shadow:${on ? "0 1px 3px oklch(0.30 0.03 60 / 0.10)" : "none"};transition:var(--tr-ui)`)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={s("flex:1;overflow-y:auto;padding:0 10px 12px;display:flex;flex-direction:column;gap:3px")}>
        {visiveis.length === 0 && (
          <div style={s("padding:36px 14px;text-align:center;font-size:13px;color:var(--muted);line-height:1.5")}>
            Nenhuma conversa neste filtro.
          </div>
        )}
        {visiveis.map((c) => {
          const e = st.estadoConversa(c.id);
          const sel = st.convSel === c.id;
          const ultima = st.threadDe(c.id).slice(-1)[0];
          return (
            <button
              key={c.id}
              onClick={() => onEscolher(c.id)}
              aria-current={sel}
              className="m-hov-bg m-press m-focus"
              style={s(`text-align:left;border:none;cursor:pointer;width:100%;padding:13px 12px;border-radius:16px;display:flex;gap:12px;align-items:center;background:${sel ? "var(--primary-soft)" : "transparent"};transition:var(--tr-ui)`)}
            >
              <Monogram name={c.nome} id={c.id} size={44} radius={14} />
              <span style={s("flex:1;min-width:0;display:flex;flex-direction:column;gap:3px")}>
                <span style={s("display:flex;align-items:center;gap:8px")}>
                  <span style={s("flex:1;min-width:0;font-weight:700;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{c.nome}</span>
                  <span style={s("flex-shrink:0;font-family:var(--font-mono);font-size:11px;color:var(--muted)")}>{c.hora}</span>
                </span>
                <span style={s("display:flex;align-items:center;gap:7px")}>
                  <span style={s(`width:6px;height:6px;flex-shrink:0;border-radius:50%;background:${PONTO[e]}`)} />
                  <span style={s("flex:1;min-width:0;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                    {ultima ? (ultima.de === "cliente" ? ultima.txt : `Você/MAISA: ${ultima.txt}`) : "—"}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ───────────────────────────── conversa ───────────────────────────── */

function Thread({ onVoltar }: { onVoltar?: () => void }) {
  const st = useStore();
  const cv = D.conversa(st.convSel) ?? D.CONVERSAS[0];
  const estado = st.estadoConversa(cv.id);
  const daMaisa = estado === "maisa" || estado === "espera";
  const minha = estado === "voce";
  const msgs = st.threadDe(cv.id);

  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Rola para a última mensagem ao trocar de conversa ou ao enviar.
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [cv.id, msgs.length]);
  // Trocar de conversa não deve carregar o rascunho da anterior.
  useEffect(() => { setTexto(""); }, [cv.id]);

  const enviar = () => {
    if (!minha || !texto.trim()) return;
    st.enviar(cv.id, texto);
    setTexto("");
  };

  /* Uma sugestão da MAISA vale como "quero responder isto": se ela ainda está
     conduzindo, assumir faz parte do gesto. */
  const usarSugestao = (txt: string) => {
    if (!minha) st.assumir(cv.id);
    setTexto(txt);
    campo.current?.focus();
  };

  return (
    <>
      {/* cabeçalho */}
      <div style={s("flex-shrink:0;padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);background:var(--surface)")}>
        {onVoltar && (
          <button onClick={onVoltar} aria-label="Voltar" className="m-hov-bg m-press-icon m-focus" style={s("width:38px;height:38px;flex-shrink:0;border:1px solid var(--border);border-radius:11px;background:var(--surface);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center")}>
            <Icon name="chevron-left" size={18} sw={2.2} />
          </button>
        )}
        <Monogram name={cv.nome} id={cv.id} size={44} radius={14} />
        <div style={s("flex:1;min-width:0")}>
          <div style={s("font-weight:700;font-size:16px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{cv.nome}</div>
          <div style={s("display:flex;align-items:center;gap:7px;margin-top:2px")}>
            <span style={s(`width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${PONTO[estado]}`)} />
            <span style={s("font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{SITUACAO[estado]} · {cv.telefone}</span>
          </div>
        </div>
        <a
          href={`https://wa.me/55${cv.telefone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir no WhatsApp"
          aria-label="Abrir no WhatsApp"
          className="m-hov-bg m-press-icon m-focus"
          style={s("width:40px;height:40px;flex-shrink:0;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--whatsapp);cursor:pointer;display:flex;align-items:center;justify-content:center")}
        >
          <Icon name="whatsapp" size={18} sw={1.9} />
        </a>
        <button
          onClick={() => (minha ? st.devolver(cv.id) : st.assumir(cv.id))}
          className={`${daMaisa ? "m-hov-primary" : "m-hov-bg"} m-press m-focus`}
          style={s(`height:40px;padding:0 16px;flex-shrink:0;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;${daMaisa ? "border:1px solid var(--primary);background:var(--primary);color:#fff" : "border:1px solid var(--border);background:var(--surface);color:var(--muted)"}`)}
        >
          {daMaisa ? "Assumir" : minha ? "Devolver à MAISA" : "Reabrir"}
        </button>
      </div>

      {/* mensagens */}
      <div style={s("flex:1;min-height:0;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px;background:var(--bg)")}>
        <div style={s("align-self:center;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);background:var(--surface);border:1px solid var(--line);padding:5px 14px;border-radius:999px")}>
          Hoje
        </div>
        {msgs.map((m, i) => {
          const meu = m.de !== "cliente";
          const bot = m.de === "bot";
          return (
            <div key={i} className="m-bubble" style={s(`max-width:72%;align-self:${meu ? "flex-end" : "flex-start"};display:flex;flex-direction:column;align-items:${meu ? "flex-end" : "flex-start"};gap:5px`)}>
              {meu && (
                <span style={s(`display:flex;align-items:center;gap:5px;color:${bot ? "var(--primary)" : "var(--muted)"}`)}>
                  {bot && <Icon name="bot" size={13} sw={1.9} />}
                  <span style={s("font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase")}>{bot ? "MAISA" : "Você"}</span>
                </span>
              )}
              <div style={s(`padding:11px 15px;border-radius:20px;font-size:14.5px;line-height:1.5;border:1px solid ${bot ? "oklch(0.92 0.020 262)" : "var(--line)"};background:${bot ? "var(--primary-soft)" : "var(--surface)"};color:${bot ? "var(--primary-dark)" : "var(--ink)"};border-bottom-${meu ? "right" : "left"}-radius:7px`)}>
                {m.txt}
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      {/* sugestões + composer */}
      <div style={s("flex-shrink:0;padding:12px 18px 16px;border-top:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;gap:11px")}>
        <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
          <span style={s("display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)")}>
            <Icon name="sparkle" size={14} sw={1.9} stroke="var(--warm)" />
            Sugestões
          </span>
          {(D.SUGESTOES[cv.id] ?? []).map((sg) => (
            <button
              key={sg}
              onClick={() => usarSugestao(sg)}
              className="m-hov-prim-border m-press m-focus"
              style={s("border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;white-space:nowrap")}
            >
              {sg}
            </button>
          ))}
        </div>
        <div style={s("display:flex;align-items:center;gap:10px")}>
          <input
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }}
            disabled={!minha}
            placeholder={minha ? "Escreva uma mensagem…" : "Assuma a conversa para escrever você mesmo"}
            aria-label="Mensagem"
            className="m-focus"
            style={s(`flex:1;min-width:0;height:46px;padding:0 16px;border-radius:14px;background:${minha ? "var(--surface)" : "var(--bg)"};border:1px solid var(--border);font-size:14.5px;color:var(--ink);outline:none;cursor:${minha ? "text" : "not-allowed"}`)}
          />
          <button
            onClick={enviar}
            disabled={!minha || !texto.trim()}
            aria-label="Enviar"
            className="m-hov-primary m-press m-focus"
            style={s(`width:46px;height:46px;flex-shrink:0;border:none;border-radius:14px;background:var(--primary);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:${!minha || !texto.trim() ? "0.4" : "1"}`)}
          >
            <Icon name="send" size={19} sw={2} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */

export default function Conversas() {
  const st = useStore();
  const mobile = useIsMobile();
  const [abertaNoMobile, setAbertaNoMobile] = useState(false);

  // Voltar ao layout de duas colunas cancela o modo "conversa aberta".
  useEffect(() => { if (!mobile) setAbertaNoMobile(false); }, [mobile]);

  if (mobile) {
    return (
      <div className="m-enter" style={s("flex:1;display:flex;flex-direction:column;min-height:0;background:var(--surface)")}>
        {abertaNoMobile
          ? <Thread onVoltar={() => setAbertaNoMobile(false)} />
          : <Lista onEscolher={(id) => { st.selecionarConversa(id); setAbertaNoMobile(true); }} />}
      </div>
    );
  }

  return (
    <div className="m-enter" style={s("flex:1;min-height:0;height:100%;display:grid;grid-template-columns:340px minmax(0,1fr)")}>
      <div style={s("border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0;background:var(--surface)")}>
        <Lista onEscolher={st.selecionarConversa} />
      </div>
      <div style={s("display:flex;flex-direction:column;min-height:0;background:var(--bg)")}>
        <Thread />
      </div>
    </div>
  );
}
