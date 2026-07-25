"use client";
/* MAISA — o cartão curto e o hero de tela.
 *
 * O cartão é a unidade de todas as telas de listagem. Ele mostra o mínimo para
 * decidir: quem, uma linha de contexto, e um estado. O resumo aparece no hover
 * (CSS, classe .m-exp) e o detalhe editável vive na Gaveta.
 *
 * Tudo aqui é <span>: o cartão é um <button>, e só conteúdo de frase é válido
 * dentro dele. O layout vem de display:flex/block nos spans. */

import React from "react";
import { s, Icon, Monogram } from "@/lib/ui";

export type TomTag = "success" | "warn" | "primary" | "neutral" | "danger";

const TAG: Record<TomTag, [string, string]> = {
  success: ["var(--success-soft)", "var(--success)"],
  warn: ["var(--warn-soft)", "var(--warn)"],
  primary: ["var(--primary-soft)", "var(--primary-dark)"],
  danger: ["var(--danger-soft)", "var(--danger)"],
  neutral: ["var(--line)", "var(--muted)"],
};

/** Cor do pontinho quando o cartão não tem avatar. */
export const DOT: Record<TomTag, string> = {
  success: "var(--success)",
  warn: "var(--warm)",
  primary: "var(--primary)",
  danger: "var(--danger)",
  neutral: "var(--border)",
};

export type CartaoProps = {
  titulo: string;
  sub: string;
  onClick: () => void;
  /** Semente do monograma. Sem ela, use `dot`. */
  seed?: string;
  dot?: TomTag;
  /** Número/valor à direita, em mono. */
  meta?: string;
  tag?: { label: string; tom: TomTag };
  /** Linha extra que aparece no hover. */
  resumo?: string;
  chips?: string[];
  /** Item pausado/inativo — cartão atenuado. */
  atenuado?: boolean;
};

export function Cartao({ titulo, sub, onClick, seed, dot, meta, tag, resumo, chips, atenuado }: CartaoProps) {
  const temResumo = !!(resumo || chips?.length);
  return (
    <button
      onClick={onClick}
      // Nome acessível explícito: o conteúdo é uma pilha de spans (monograma,
      // título, sub, meta, tag) e o nome calculado sai como uma tripa confusa.
      aria-label={[titulo, sub, meta, tag?.label].filter(Boolean).join(", ")}
      className="m-exp m-focus"
      style={s(`text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:18px;display:block;width:100%;align-self:flex-start;cursor:pointer;box-shadow:var(--shadow-card);opacity:${atenuado ? "0.66" : "1"}`)}
    >
      <span style={s("display:flex;align-items:center;gap:14px;width:100%")}>
        {seed && <Monogram name={titulo} id={seed} size={46} radius={14} />}
        {!seed && dot && <span style={s(`width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${DOT[dot]}`)} />}
        <span style={s("flex:1;min-width:0;display:block")}>
          <span style={s("display:block;font-size:16px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{titulo}</span>
          <span style={s("display:block;font-size:13px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{sub}</span>
        </span>
        {(meta || tag) && (
          <span style={s("flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:7px")}>
            {meta && <span style={s("font-family:var(--font-mono);font-size:15px;font-weight:700")}>{meta}</span>}
            {tag && (
              <span style={s(`font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;background:${TAG[tag.tom][0]};color:${TAG[tag.tom][1]}`)}>
                {tag.label}
              </span>
            )}
          </span>
        )}
      </span>

      {/* Sem style inline no .m-exp-body de propósito: estilo inline vence media
          query, e é a media query (hover:none) que remove o resumo no toque. */}
      {temResumo && (
        <span className="m-exp-body">
          <span style={s("display:block")}>
            <span style={s("display:block;padding-top:14px;border-top:1px solid var(--line)")}>
              {resumo && <span style={s("display:block;font-size:13.5px;line-height:1.55;color:var(--muted)")}>{resumo}</span>}
              {!!chips?.length && (
                <span style={s("display:flex;flex-wrap:wrap;gap:6px;margin-top:11px")}>
                  {chips.map((c) => (
                    <span key={c} style={s("display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;background:var(--bg);color:var(--muted);border:1px solid var(--line)")}>{c}</span>
                  ))}
                </span>
              )}
              <span style={s("display:flex;justify-content:flex-end;margin-top:12px")}>
                <span style={s("display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;background:var(--primary-soft);color:var(--primary-dark)")}>
                  abrir e editar
                  <Icon name="arrow-right" size={13} sw={2.2} />
                </span>
              </span>
            </span>
          </span>
        </span>
      )}
    </button>
  );
}

/** Grade de cartões — auto-fill, então vira coluna única sem media query. */
export function GradeCartoes({ children }: { children: React.ReactNode }) {
  return (
    <div style={s("display:grid;gap:16px;align-items:start;grid-template-columns:repeat(auto-fill,minmax(290px,1fr))")}>
      {children}
    </div>
  );
}

/* ───────────────────────────── hero de tela ─────────────────────────────
 * Uma linha só de "onde o mês está" + a ação que resolve o que falta. */

export type Marco = { n: number | string; label: string; tom: TomTag };

export function Hero({
  rotulo, valor, sub, marcos, acao, pronto,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  marcos: Marco[];
  acao?: { label: string; icon?: string; onClick: () => void };
  pronto?: string;
}) {
  return (
    <div style={s("display:flex;align-items:center;gap:26px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px 22px;box-shadow:var(--shadow-card)")}>
      <div style={s("min-width:0")}>
        <div style={s("font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)")}>{rotulo}</div>
        <div style={s("display:flex;align-items:baseline;gap:10px;margin-top:7px;flex-wrap:wrap")}>
          <span style={s("font-family:var(--font-mono);font-size:32px;font-weight:700;letter-spacing:-.03em;line-height:1")}>{valor}</span>
          <span style={s("font-size:13.5px;color:var(--muted)")}>{sub}</span>
        </div>
      </div>
      <div style={s("display:flex;align-items:center;gap:20px;flex-wrap:wrap")}>
        {marcos.map((m) => (
          <div key={m.label} style={s("display:flex;align-items:center;gap:9px")}>
            <span style={s(`width:9px;height:9px;border-radius:50%;background:${DOT[m.tom]}`)} />
            <span style={s("font-size:13.5px;color:var(--muted)")}>
              <span style={s("font-family:var(--font-mono);font-weight:700;color:var(--ink)")}>{m.n}</span> {m.label}
            </span>
          </div>
        ))}
      </div>
      {acao && (
        <button
          onClick={acao.onClick}
          className="m-hov-bright m-press m-focus"
          style={s("margin-left:auto;height:48px;padding:0 22px;border:none;border-radius:14px;background:var(--warm);color:oklch(0.29 0.06 72);font-size:15px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;white-space:nowrap")}
        >
          {acao.icon && <Icon name={acao.icon} size={18} sw={2.1} />}
          {acao.label}
        </button>
      )}
      {!acao && pronto && (
        <span style={s("margin-left:auto;display:inline-flex;align-items:center;gap:9px;height:48px;padding:0 20px;border-radius:14px;background:var(--success-soft);color:var(--success);font-size:14.5px;font-weight:700;white-space:nowrap")}>
          <Icon name="check" size={18} sw={2.3} />
          {pronto}
        </span>
      )}
    </div>
  );
}

/* Envelope padrão das telas de grade: hero + filtros + cartões.
   É ele o contêiner de rolagem — o shell só dá a caixa; cada tela decide o que
   rola. Sem isso, telas de altura fixa (Agenda, Conversas) ganhariam duas
   barras de rolagem aninhadas. */
export function TelaGrade({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-enter" style={s("flex:1;min-height:0;overflow-y:auto;padding:22px 24px 32px;display:flex;flex-direction:column;gap:18px")}>
      {children}
    </div>
  );
}
