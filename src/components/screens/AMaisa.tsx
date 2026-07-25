"use client";
/* MAISA — Ajustes da assistente.
 *
 * Uma seção por vez, e um celular ao lado mostrando o efeito. É a tela mais
 * importante do produto: aqui o usuário decide quanto vai delegar. Se ele não
 * enxerga a consequência, não delega.
 *
 * Por isso o preview não é decorativo — ele troca de conteúdo conforme a seção
 * aberta e reflete o tom e o estado (online/pausada) que estão configurados
 * agora. Abrir "Horário" mostra a MAISA respondendo sobre horário.
 *
 * Tudo aqui é controlado pelo store, então o preview reage enquanto você digita. */

import React from "react";
import { s, Icon, Toggle } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore } from "@/lib/store";

const ICONE: Record<string, string> = {
  personalidade: "sparkle",
  horarios: "clock",
  agendamentos: "calendar-check",
  comportamento: "bot",
};

/* ───────────────────────────── peças ───────────────────────────── */

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>{children}</span>;
}

const CAMPO = "width:100%;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg);font-family:inherit;font-size:14.5px;font-weight:600;color:var(--ink);outline:none";

function LinhaToggle({ titulo, desc, on, alternar }: { titulo: string; desc: string; on: boolean; alternar: () => void }) {
  return (
    <div style={s("display:flex;align-items:center;gap:16px;padding:13px 0;border-bottom:1px solid var(--line)")}>
      <span style={s("flex:1;min-width:0")}>
        <span style={s("display:block;font-size:14px;font-weight:700")}>{titulo}</span>
        <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.45")}>{desc}</span>
      </span>
      <Toggle on={on} onChange={alternar} />
    </div>
  );
}

/* ───────────────────────────── conteúdo de cada seção ───────────────────────────── */

function Personalidade() {
  const st = useStore();
  return (
    <div style={s("display:flex;flex-direction:column;gap:18px")}>
      <label style={s("display:flex;flex-direction:column;gap:7px")}>
        <Rotulo>Nome do assistente</Rotulo>
        <input
          value={st.assistente.nome}
          onChange={(e) => st.setAssistente({ nome: e.target.value })}
          className="m-focus"
          style={s(CAMPO)}
        />
      </label>

      <div style={s("display:flex;flex-direction:column;gap:8px")}>
        <Rotulo>Tom de voz</Rotulo>
        <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
          {D.TONS.map((t) => {
            const on = st.assistente.tom === t;
            return (
              <button
                key={t}
                onClick={() => st.setAssistente({ tom: t })}
                aria-pressed={on}
                className="m-press m-focus m-hov-prim-border"
                style={s(`display:inline-flex;align-items:center;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;text-transform:capitalize;border:1px solid ${on ? "var(--primary)" : "var(--border)"};background:${on ? "var(--primary-soft)" : "var(--surface)"};color:${on ? "var(--primary-dark)" : "var(--muted)"}`)}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <label style={s("display:flex;flex-direction:column;gap:7px")}>
        <Rotulo>Mensagem de saudação</Rotulo>
        <textarea
          rows={3}
          value={st.assistente.saudacao}
          onChange={(e) => st.setAssistente({ saudacao: e.target.value })}
          className="m-focus"
          style={s("width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg);font-family:inherit;font-size:14.5px;line-height:1.55;color:var(--ink);outline:none;resize:vertical;min-height:88px")}
        />
      </label>

      <div style={s("display:flex;align-items:center;gap:16px;padding:14px 15px;border-radius:14px;border:1px solid var(--line);background:var(--bg)")}>
        <span style={s("flex:1;min-width:0")}>
          <span style={s("display:block;font-size:14px;font-weight:700")}>Assistente ativa</span>
          <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.45")}>
            Quando ligada, a MAISA responde no WhatsApp automaticamente
          </span>
        </span>
        <Toggle on={st.assistente.ativa} onChange={(v) => st.setAssistente({ ativa: v })} />
      </div>
    </div>
  );
}

function Horarios() {
  const st = useStore();
  return (
    <div style={s("display:flex;flex-direction:column")}>
      {st.dias.map((d) => (
        <div
          key={d.nome}
          style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:11px 0;border-bottom:1px solid var(--line)")}
        >
          <span style={s(`font-size:14px;font-weight:700;width:96px;flex-shrink:0;color:${d.aberto ? "var(--ink)" : "var(--muted)"}`)}>{d.nome}</span>
          <Toggle on={d.aberto} onChange={() => st.alternarDia(d.nome)} />
          {d.aberto ? (
            <div style={s("margin-left:auto;display:flex;align-items:center;gap:9px")}>
              <input
                type="time"
                value={d.de}
                onChange={(e) => st.setHorario(d.nome, "de", e.target.value)}
                aria-label={`${d.nome} — abre às`}
                className="m-focus"
                style={s("width:104px;height:38px;text-align:center;border-radius:11px;border:1px solid var(--border);background:var(--bg);font-family:var(--font-mono);font-size:13.5px;font-weight:600;color:var(--ink);outline:none")}
              />
              <span style={s("font-size:13px;color:var(--muted)")}>às</span>
              <input
                type="time"
                value={d.ate}
                onChange={(e) => st.setHorario(d.nome, "ate", e.target.value)}
                aria-label={`${d.nome} — fecha às`}
                className="m-focus"
                style={s("width:104px;height:38px;text-align:center;border-radius:11px;border:1px solid var(--border);background:var(--bg);font-family:var(--font-mono);font-size:13.5px;font-weight:600;color:var(--ink);outline:none")}
              />
            </div>
          ) : (
            <span style={s("margin-left:auto;font-size:13px;font-weight:600;color:var(--muted)")}>Fechado</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ListaToggles({ itens }: { itens: { chave: D.ChaveCfg; titulo: string; desc: string }[] }) {
  const st = useStore();
  return (
    <div style={s("display:flex;flex-direction:column")}>
      {itens.map((t) => (
        <LinhaToggle key={t.chave} titulo={t.titulo} desc={t.desc} on={st.cfg[t.chave]} alternar={() => st.alternarCfg(t.chave)} />
      ))}
    </div>
  );
}

function Corpo({ id }: { id: string }) {
  if (id === "personalidade") return <Personalidade />;
  if (id === "horarios") return <Horarios />;
  if (id === "agendamentos") return <ListaToggles itens={D.TOGGLES_AGENDAMENTO} />;
  return <ListaToggles itens={D.TOGGLES_COMPORTAMENTO} />;
}

/* Subtítulo de cada seção — reflete a configuração atual, não um texto fixo.
   É o que permite ler o estado do assistente sem abrir nada. */
function resumoDaSecao(id: string, st: ReturnType<typeof useStore>): string {
  if (id === "personalidade") return `${st.assistente.nome} · tom ${st.assistente.tom}${st.assistente.ativa ? "" : " · pausada"}`;
  if (id === "horarios") {
    const abertos = st.dias.filter((d) => d.aberto);
    if (!abertos.length) return "Nenhum dia aberto — a MAISA não agenda";
    return `${abertos.length} dias abertos · ${abertos[0].nome.slice(0, 3)}–${abertos[abertos.length - 1].nome.slice(0, 3)}, ${abertos[0].de}–${abertos[0].ate}`;
  }
  if (id === "agendamentos") {
    const n = D.TOGGLES_AGENDAMENTO.filter((t) => st.cfg[t.chave]).length;
    return `${n} de ${D.TOGGLES_AGENDAMENTO.length} automações ligadas`;
  }
  return st.cfg.encaminhar ? "Chama você quando não sabe" : "Responde sozinha sempre";
}

/* ───────────────────────────── preview de WhatsApp ───────────────────────────── */

function Preview() {
  const st = useStore();
  const pv = D.PREVIEWS[st.secAtiva ?? "personalidade"] ?? D.PREVIEWS.personalidade;
  // A saudação vem do campo que está sendo editado, não do dataset — é isso que
  // faz o preview responder enquanto você digita.
  const msgs = st.secAtiva === "personalidade"
    ? [{ de: "cliente" as const, txt: "Oi, bom dia!" }, { de: "bot" as const, txt: st.assistente.saudacao || "…" }]
    : pv.msgs;

  return (
    <div style={s("flex:1;min-height:0;border-radius:30px;padding:9px;background:linear-gradient(150deg, oklch(0.32 0.03 262), oklch(0.20 0.02 262));box-shadow:0 22px 46px oklch(0.28 0.03 262 / 0.26);display:flex")}>
      <div style={s("flex:1;min-width:0;border-radius:23px;overflow:hidden;background:var(--bg);display:flex;flex-direction:column")}>
        <div style={s("flex-shrink:0;display:flex;align-items:center;gap:10px;padding:13px 14px;background:var(--nav)")}>
          <span style={s("width:36px;height:36px;flex-shrink:0;border-radius:50%;background:var(--nav-active);color:var(--warm);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px")}>m</span>
          <span style={s("flex:1;min-width:0")}>
            <span style={s("display:block;font-size:14px;font-weight:800;color:var(--nav-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              {st.assistente.nome || "MAISA"}
            </span>
            <span style={s("display:flex;align-items:center;gap:5px;font-size:11px;color:var(--nav-soft);margin-top:1px")}>
              <span style={s(`width:6px;height:6px;border-radius:50%;background:${st.assistente.ativa ? "var(--warm)" : "oklch(0.70 0.02 262)"}`)} />
              {st.assistente.ativa ? "online" : "pausada"} · tom {st.assistente.tom}
            </span>
          </span>
        </div>

        <div style={s("flex:1;min-height:0;overflow-y:auto;padding:16px 13px;display:flex;flex-direction:column;gap:9px")}>
          <span style={s("align-self:center;font-size:10.5px;font-weight:700;color:var(--muted);background:var(--surface);padding:4px 12px;border-radius:999px")}>{pv.titulo}</span>
          {msgs.map((m, i) => {
            const bot = m.de === "bot";
            return (
              <div
                key={`${st.secAtiva}-${i}`}
                className="m-bubble"
                style={s(`max-width:84%;align-self:${bot ? "flex-end" : "flex-start"};padding:10px 13px;font-size:13.5px;line-height:1.5;border-radius:15px;background:${bot ? "var(--primary-soft)" : "var(--surface)"};color:${bot ? "var(--primary-dark)" : "var(--ink)"};border-bottom-${bot ? "right" : "left"}-radius:5px;box-shadow:0 1px 2px oklch(0.30 0.03 60 / 0.08)`)}
              >
                {m.txt}
              </div>
            );
          })}
        </div>

        <div style={s("flex-shrink:0;display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface);border-top:1px solid var(--line)")}>
          <span style={s("flex:1;background:var(--bg);border-radius:999px;padding:8px 14px;font-size:12.5px;color:var(--muted)")}>Mensagem</span>
          <span style={s("width:34px;height:34px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#fff")}>
            <Icon name="send" size={15} sw={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── seção (acordeão) ───────────────────────────── */

function Secao({ sec }: { sec: D.SecaoAjuste }) {
  const st = useStore();
  const aberta = st.secAtiva === sec.id;

  return (
    <div style={s(`background:var(--surface);border:1px solid ${aberta ? "var(--primary)" : "var(--border)"};border-radius:20px;overflow:hidden;box-shadow:${aberta ? "0 14px 34px oklch(0.30 0.03 60 / 0.12)" : "var(--shadow-card)"};transition:border-color var(--dur-slow) var(--ease-out),box-shadow var(--dur-slow) var(--ease-out)`)}>
      <button
        onClick={() => st.abrirSecao(sec.id)}
        aria-expanded={aberta}
        className="m-press m-focus"
        style={s("width:100%;display:flex;align-items:center;gap:13px;padding:16px 18px;background:transparent;border:none;cursor:pointer;text-align:left")}
      >
        <span style={s(`width:40px;height:40px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${aberta ? "var(--primary)" : "var(--primary-soft)"};color:${aberta ? "#fff" : "var(--primary-dark)"};transition:var(--tr-ui)`)}>
          <Icon name={ICONE[sec.id]} size={20} sw={1.9} />
        </span>
        <span style={s("flex:1;min-width:0")}>
          <span style={s("display:block;font-size:15.5px;font-weight:800;letter-spacing:-.01em")}>{sec.titulo}</span>
          <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
            {resumoDaSecao(sec.id, st)}
          </span>
        </span>
        <span style={s(`flex-shrink:0;display:flex;color:var(--muted);transform:rotate(${aberta ? "180deg" : "0deg"});transition:transform var(--dur-slow) var(--ease-out)`)}>
          <Icon name="chevron-down" size={20} sw={2.2} />
        </span>
      </button>

      <div className={`m-acc${aberta ? " is-open" : ""}`}>
        <div>
          <div style={s("padding:2px 18px 20px")}>
            <Corpo id={sec.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */

export default function AMaisa() {
  const st = useStore();
  const mobile = useIsMobile();

  const rodape = (
    <div style={s("display:flex;align-items:center;justify-content:flex-end;gap:14px;flex-wrap:wrap")}>
      <span
        aria-live="polite"
        style={s(`display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--success);opacity:${st.salvo ? "1" : "0"};transition:opacity var(--dur-base) ease`)}
      >
        <Icon name="check" size={16} sw={2.4} />
        Alterações salvas
      </span>
      <button
        onClick={st.salvar}
        className="m-hov-primary m-press m-focus"
        style={s(`height:${mobile ? "52px" : "46px"};padding:0 22px;border:none;border-radius:14px;background:var(--primary);color:#fff;font-size:15px;font-weight:700;cursor:pointer;${mobile ? "width:100%;justify-content:center;" : ""}display:inline-flex;align-items:center;gap:9px`)}
      >
        {st.salvo ? "Salvo" : "Salvar alterações"}
      </button>
    </div>
  );

  const secoes = (
    <div style={s("display:flex;flex-direction:column;gap:12px")}>
      {D.SECOES_AJUSTE.map((sec) => <Secao key={sec.id} sec={sec} />)}
    </div>
  );

  if (mobile) {
    return (
      <div className="m-enter" style={s("flex:1;min-height:0;overflow-y:auto;padding:2px 16px 24px;display:flex;flex-direction:column;gap:14px")}>
        {/* No celular o preview vem primeiro e é curto: é a prova do que os
            ajustes abaixo fazem, então precisa estar visível sem rolar. */}
        <div style={s("height:340px;display:flex")}><Preview /></div>
        {secoes}
        {rodape}
      </div>
    );
  }

  return (
    <div className="m-enter" style={s("flex:1;min-height:0;height:100%;display:grid;grid-template-columns:minmax(0,1fr) 306px;gap:24px;padding:22px 26px;overflow:hidden")}>
      <div style={s("min-height:0;overflow-y:auto;padding-right:2px;display:flex;flex-direction:column;gap:14px")}>
        {secoes}
        {rodape}
      </div>

      <div style={s("min-height:0;display:flex;flex-direction:column;gap:10px")}>
        <span style={s("font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)")}>No WhatsApp</span>
        <Preview />
        <span style={s("font-size:12px;line-height:1.5;color:var(--muted)")}>Muda conforme a seção aberta ao lado.</span>
      </div>
    </div>
  );
}
