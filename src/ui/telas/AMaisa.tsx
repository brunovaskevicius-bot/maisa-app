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
import { s, Btn, Icon, Toggle } from "@/ui/primitivos";
import { useIsMobile } from "@/ui/useIsMobile";
import * as D from "@/adaptadores/saida/demo";
import { useStore } from "@/ui/estado/store";

const ICONE: Record<string, string> = {
  personalidade: "sparkle",
  horarios: "clock",
  agendamentos: "calendar-check",
  comportamento: "bot",
};

/* ───────────────────────────── peças ───────────────────────────── */

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span style={s("font-size:var(--t-label);font-weight:var(--w-title);color:var(--muted)")}>{children}</span>;
}

const CAMPO = "width:100%;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);color:var(--ink);outline:none";

function LinhaToggle({ titulo, desc, on, alternar }: { titulo: string; desc: string; on: boolean; alternar: () => void }) {
  return (
    <div style={s("display:flex;align-items:center;gap:16px;padding:13px 0;border-bottom:1px solid var(--line)")}>
      <span style={s("flex:1;min-width:0")}>
        <span style={s("display:block;font-size:var(--t-sm);font-weight:var(--w-title)")}>{titulo}</span>
        <span style={s("display:block;font-size:var(--t-label);color:var(--muted);margin-top:2px;line-height:1.45")}>{desc}</span>
      </span>
      <Toggle on={on} onChange={alternar} rotulo={titulo} />
    </div>
  );
}

/* Interruptor mestre. Vive fora do acordeão porque é a decisão mais consequente da
   tela — desligar aqui para o atendimento inteiro — e estava enterrada no fim de
   "Personalidade", uma seção que fala de tom de voz. A faixa diz a CONSEQUÊNCIA
   (as mensagens esperam por você), não o mecanismo, e o estado tem rótulo em texto
   além da cor. */
function FaixaAssistente() {
  const st = useStore();
  const ativa = st.assistente.ativa;
  const forte = ativa ? "var(--success)" : "var(--warn)";
  const fundo = ativa ? "var(--success-soft)" : "var(--warn-soft)";
  return (
    <div style={s(`flex-shrink:0;display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:16px;background:${fundo};border:1px solid ${forte}`)}>
      <span style={s(`width:9px;height:9px;flex-shrink:0;border-radius:50%;background:${forte}`)} />
      <span style={s("flex:1;min-width:0")}>
        <span style={s(`display:block;font-size:var(--t-sm);font-weight:var(--w-title);color:${forte}`)}>
          {ativa ? "Assistente ativa" : "Assistente pausada"}
        </span>
        <span style={s("display:block;font-size:var(--t-label);color:var(--ink);margin-top:2px;line-height:var(--lh-ui)")}>
          {ativa
            ? "A MAISA responde no WhatsApp automaticamente"
            : "As mensagens ficam esperando você responder"}
        </span>
      </span>
      <Toggle on={ativa} onChange={(v) => st.setAssistente({ ativa: v })} rotulo="Assistente ativa" />
    </div>
  );
}

/* ───────────────────────────── o canal de WhatsApp ─────────────────────────────
 * PROVISÓRIA, e assumidamente. A tela oficial de conexão entra na segunda leva de
 * onboarding; esta existe para que o canal deixe de ser operável só por `curl`.
 *
 * Mora AQUI, junto da faixa de "assistente ativa", porque as duas respondem à mesma
 * pergunta do dono: "a MAISA está no ar?". Assistente pausada e WhatsApp desconectado
 * produzem o mesmo silêncio do lado do cliente, e separá-las em telas diferentes faria
 * procurar em dois lugares por um sintoma só.
 *
 * ⚠️ AS DUAS AÇÕES DESTRUTIVAS PEDEM CONFIRMAÇÃO EM DOIS TOQUES, e não é cerimônia:
 * desconectar derruba o atendimento de um negócio que pode estar no meio de uma conversa,
 * e trocar número perde o pareamento atual sem volta. Um `confirm()` do navegador seria
 * mais fácil e é pior — ele é bloqueante, alguns navegadores o suprimem, e ninguém lê.
 */

function FaixaCanal() {
  const st = useStore();
  const [confirmando, setConfirmando] = React.useState<"trocar" | "desconectar" | null>(null);

  const status = st.canal?.status ?? "desconectado";
  const conectado = status === "conectado";
  const pareando = status === "pareando" || !!st.qrcode;

  const forte = conectado ? "var(--success)" : pareando ? "var(--warn)" : "var(--muted)";
  const fundo = conectado ? "var(--success-soft)" : pareando ? "var(--warn-soft)" : "var(--surface-2)";

  const titulo = conectado ? "WhatsApp conectado" : pareando ? "Aguardando leitura do QR" : "WhatsApp não conectado";
  const sub = conectado
    ? st.canal?.numero ? `+${st.canal.numero}` : "Número conectado"
    : pareando
      ? "Abra o WhatsApp do negócio → Aparelhos conectados → Conectar aparelho"
      : "A MAISA não consegue responder enquanto isso";

  /* Rótulo em vez de `disabled`: `Btn` não tem essa prop, e criar uma só para cá
   * significaria mexer num primitivo usado por toda a aplicação por causa desta faixa. */
  const ocupado = st.canalOcupado;

  /* O servidor não consegue conectar (falta variável de ambiente). A faixa some com os
   * botões que derrubariam o canal atual — porque derrubar seria definitivo: o
   * `conectar` de volta é justamente o que não funciona. Ver `trocarNumero` no store. */
  const travado = st.canalFaltando.length > 0;

  return (
    <div style={s(`flex-shrink:0;display:flex;flex-direction:column;gap:12px;padding:13px 16px;border-radius:16px;background:${fundo};border:1px solid ${forte}`)}>
      <div style={s("display:flex;align-items:center;gap:14px")}>
        <span style={s(`width:9px;height:9px;flex-shrink:0;border-radius:50%;background:${forte}`)} />
        <span style={s("flex:1;min-width:0")}>
          <span style={s(`display:block;font-size:var(--t-sm);font-weight:var(--w-title);color:${forte}`)}>{titulo}</span>
          <span style={s("display:block;font-size:var(--t-label);color:var(--ink);margin-top:2px;line-height:var(--lh-ui)")}>{sub}</span>
        </span>

        <span style={s("display:flex;gap:8px;flex-shrink:0")}>
          {!conectado && !pareando && !travado && (
            <Btn variant="whats" size="sm" onClick={ocupado ? undefined : () => void st.conectarCanal()}>
              {ocupado ? "Gerando…" : "Conectar WhatsApp"}
            </Btn>
          )}

          {pareando && (
            <Btn variant="secondary" size="sm" onClick={ocupado ? undefined : () => void st.desconectarCanal()}>
              {ocupado ? "…" : "Cancelar"}
            </Btn>
          )}

          {conectado && confirmando === null && !travado && (
            <>
              <Btn variant="secondary" size="sm" onClick={() => setConfirmando("trocar")}>Trocar número</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmando("desconectar")}>Desconectar</Btn>
            </>
          )}

          {conectado && confirmando !== null && (
            <>
              <Btn
                variant="danger"
                size="sm"
                onClick={ocupado ? undefined : () => {
                  const acao = confirmando === "trocar" ? st.trocarNumero : st.desconectarCanal;
                  setConfirmando(null);
                  void acao();
                }}
              >
                {ocupado ? "…" : confirmando === "trocar" ? "Sim, trocar" : "Sim, desconectar"}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmando(null)}>Voltar</Btn>
            </>
          )}
        </span>
      </div>

      {/* Diz a variável pelo nome. "Falta configuração no servidor" foi exatamente a frase
          que, em 13/08/2026, não permitiu descobrir que faltava `MAISA_PUBLIC_URL`. */}
      {travado && (
        <span style={s("font-size:var(--t-label);color:var(--danger);line-height:1.5")}>
          O servidor não está pronto para conectar o WhatsApp. Falta:{" "}
          <b>{st.canalFaltando.join(", ")}</b>. Os botões estão travados de propósito — sem isso,
          desconectar seria definitivo.
        </span>
      )}

      {confirmando !== null && (
        <span style={s("font-size:var(--t-label);color:var(--danger);line-height:1.5")}>
          {confirmando === "trocar"
            ? "O número atual será desconectado e você terá que parear o novo lendo um QR."
            : "A MAISA para de responder no WhatsApp até você conectar de novo."}
        </span>
      )}

      {/* O QR é EFÊMERO: a Evolution troca o código a cada poucos segundos, e o polling do
          store o remove no instante em que conecta. Nunca guardamos isto em lugar nenhum. */}
      {st.qrcode && (
        <div style={s("display:flex;align-items:center;gap:16px;padding:12px;border-radius:12px;background:var(--surface)")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={st.qrcode}
            alt="QR code para conectar o WhatsApp"
            style={s("width:148px;height:148px;flex-shrink:0;border-radius:8px;background:#fff;image-rendering:pixelated")}
          />
          <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.6")}>
            Leia com o celular do <b>número do negócio</b>.<br />
            A tela avisa sozinha quando conectar.
          </span>
        </div>
      )}

      {st.canalErro && (
        <span style={s("font-size:var(--t-label);color:var(--danger);line-height:1.5")}>{st.canalErro}</span>
      )}
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
                style={s(`display:inline-flex;align-items:center;padding:9px 16px;border-radius:999px;font-size:var(--t-sm);font-weight:var(--w-title);cursor:pointer;text-transform:capitalize;border:1px solid ${on ? "var(--primary)" : "var(--border)"};background:${on ? "var(--primary-soft)" : "var(--surface)"};color:${on ? "var(--primary-dark)" : "var(--muted)"}`)}
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
          style={s("width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);line-height:1.55;color:var(--ink);outline:none;resize:vertical;min-height:88px")}
        />
      </label>
      {/* "Assistente ativa" saiu daqui: era cartão dentro de cartão e o interruptor
          mestre não pertence à seção de tom de voz. Agora é a FaixaAssistente. */}
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
          <span style={s(`font-size:var(--t-sm);font-weight:var(--w-title);width:96px;flex-shrink:0;color:${d.aberto ? "var(--ink)" : "var(--muted)"}`)}>{d.nome}</span>
          <Toggle on={d.aberto} onChange={() => st.alternarDia(d.nome)} rotulo={`${d.nome} — atende`} />
          {d.aberto ? (
            <div style={s("margin-left:auto;display:flex;align-items:center;gap:9px")}>
              <input
                type="time"
                value={d.de}
                onChange={(e) => st.setHorario(d.nome, "de", e.target.value)}
                aria-label={`${d.nome} — abre às`}
                className="m-focus"
                style={s("width:104px;height:38px;text-align:center;border-radius:11px;border:1px solid var(--border-field);background:var(--surface);font-variant-numeric:tabular-nums;font-size:var(--t-sm);font-weight:var(--w-data);color:var(--ink);outline:none")}
              />
              <span style={s("font-size:var(--t-sm);color:var(--muted)")}>às</span>
              <input
                type="time"
                value={d.ate}
                onChange={(e) => st.setHorario(d.nome, "ate", e.target.value)}
                aria-label={`${d.nome} — fecha às`}
                className="m-focus"
                style={s("width:104px;height:38px;text-align:center;border-radius:11px;border:1px solid var(--border-field);background:var(--surface);font-variant-numeric:tabular-nums;font-size:var(--t-sm);font-weight:var(--w-data);color:var(--ink);outline:none")}
              />
            </div>
          ) : (
            <span style={s("margin-left:auto;font-size:var(--t-sm);font-weight:var(--w-data);color:var(--muted)")}>Fechado</span>
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

/* Hora da bolha. No WhatsApp toda mensagem tem hora, e o preview copia a ESTRUTURA
   dele (não a fonte). Derivada do índice, nunca de Date.now(): assim o preview não
   muda a cada render nem difere entre servidor e cliente. */
function horaDaMsg(i: number) {
  const min = 9 * 60 + 12 + i; // uma conversa de manhã, um minuto entre falas
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

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
          <span style={s("width:36px;height:36px;flex-shrink:0;border-radius:50%;background:var(--nav-active);color:var(--warm);display:flex;align-items:center;justify-content:center;font-weight:var(--w-title);font-size:var(--t-body)")}>m</span>
          <span style={s("flex:1;min-width:0")}>
            <span style={s("display:block;font-size:var(--t-sm);font-weight:var(--w-title);color:var(--nav-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              {st.assistente.nome || "MAISA"}
            </span>
            <span style={s("display:flex;align-items:center;gap:5px;font-size:var(--t-micro);color:var(--nav-soft);margin-top:1px")}>
              <span style={s(`width:6px;height:6px;border-radius:50%;background:${st.assistente.ativa ? "var(--whatsapp-mark)" : "var(--nav-muted)"}`)} />
              {st.assistente.ativa ? "online" : "pausada"} · tom {st.assistente.tom}
            </span>
          </span>
        </div>

        <div style={s("flex:1;min-height:0;overflow-y:auto;padding:16px 13px;display:flex;flex-direction:column;gap:9px")}>
          <span style={s("align-self:center;font-size:var(--t-micro);font-weight:var(--w-title);color:var(--muted);background:var(--surface);padding:4px 12px;border-radius:999px")}>{pv.titulo}</span>
          {/* O cabeçalho apresenta a MAISA como o CONTATO, então quem olha esta tela é o
              cliente: as falas da MAISA vêm à esquerda em bolha clara, e as do cliente à
              direita. Estava invertido, e era justo aqui que o usuário aprende quem fala. */}
          {msgs.map((m, i) => {
            const bot = m.de === "bot";
            return (
              <div
                key={`${st.secAtiva}-${i}`}
                className="m-bubble"
                style={s(`max-width:84%;align-self:${bot ? "flex-start" : "flex-end"};padding:9px 13px 7px;font-size:var(--t-sm);line-height:1.5;border-radius:15px;background:${bot ? "var(--surface)" : "var(--primary-soft)"};color:${bot ? "var(--ink)" : "var(--primary-dark)"};border-bottom-${bot ? "left" : "right"}-radius:5px;box-shadow:0 1px 2px oklch(0.22 0.03 262 / 0.08)`)}
              >
                {m.txt}
                <span className="n" style={s("display:block;text-align:right;margin-top:3px;font-size:var(--t-micro);font-weight:var(--w-data);color:var(--muted)")}>
                  {horaDaMsg(i)}
                </span>
              </div>
            );
          })}
        </div>

        <div style={s("flex-shrink:0;display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface);border-top:1px solid var(--line)")}>
          <span style={s("flex:1;background:var(--bg);border-radius:999px;padding:8px 14px;font-size:var(--t-label);color:var(--muted)")}>Mensagem</span>
          <span style={s("width:34px;height:34px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--primary);color:var(--on-primary)")}>
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
    <div style={s(`background:var(--surface);border:1px solid ${aberta ? "var(--primary)" : "var(--border)"};border-radius:16px;overflow:hidden;box-shadow:${aberta ? "0 14px 34px oklch(0.22 0.03 262 / 0.12)" : "var(--shadow-card)"};transition:border-color var(--dur-slow) var(--ease-out),box-shadow var(--dur-slow) var(--ease-out)`)}>
      <button
        onClick={() => st.abrirSecao(sec.id)}
        aria-expanded={aberta}
        className="m-press m-focus"
        style={s("width:100%;display:flex;align-items:center;gap:13px;padding:16px 18px;background:transparent;border:none;cursor:pointer;text-align:left")}
      >
        <span style={s(`width:40px;height:40px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${aberta ? "var(--primary)" : "var(--primary-soft)"};color:${aberta ? "var(--on-primary)" : "var(--primary-dark)"};transition:var(--tr-ui)`)}>
          <Icon name={ICONE[sec.id]} size={20} sw={1.9} />
        </span>
        <span style={s("flex:1;min-width:0")}>
          <span style={s("display:block;font-size:var(--t-body);font-weight:var(--w-title)")}>{sec.titulo}</span>
          <span style={s("display:block;font-size:var(--t-label);color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
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
  const mobile = useIsMobile();

  // A faixa de rodapé com "Salvar alterações" saiu: cada ajuste já persiste sozinho,
  // então o botão não fazia nada — e ainda repetia, em azul, o "Salvar ajustes" dourado
  // da topbar. Duas cores para a mesma não-ação.

  const secoes = (
    <div style={s("display:flex;flex-direction:column;gap:12px")}>
      {D.SECOES_AJUSTE.map((sec) => <Secao key={sec.id} sec={sec} />)}
    </div>
  );

  if (mobile) {
    return (
      <div className="m-enter" style={s("flex:1;min-height:0;overflow-y:auto;padding:2px 16px 24px;display:flex;flex-direction:column;gap:14px")}>
        {/* No celular o preview vem logo depois da faixa e é curto: é a prova do que
            os ajustes abaixo fazem, então precisa estar visível sem rolar. */}
        <FaixaAssistente />
        <FaixaCanal />
        <div style={s("height:340px;display:flex")}><Preview /></div>
        {secoes}
      </div>
    );
  }

  return (
    <div className="m-enter" style={s("flex:1;min-height:0;height:100%;display:grid;grid-template-columns:minmax(0,1fr) 306px;gap:24px;padding:22px 26px;overflow:hidden")}>
      {/* A faixa fica fora da área que rola: o interruptor mestre não pode sumir de vista
          enquanto o usuário mexe nas seções. */}
      <div style={s("min-height:0;display:flex;flex-direction:column;gap:14px")}>
        <FaixaAssistente />
        <FaixaCanal />
        <div style={s("min-height:0;overflow-y:auto;padding:2px 2px 6px 0")}>
          {secoes}
        </div>
      </div>

      <div style={s("min-height:0;display:flex;flex-direction:column;gap:10px")}>
        <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);letter-spacing:var(--ls-caps);text-transform:uppercase;color:var(--muted)")}>No WhatsApp</span>
        <Preview />
        <span style={s("font-size:var(--t-label);line-height:1.5;color:var(--muted)")}>Muda conforme a seção aberta ao lado.</span>
      </div>
    </div>
  );
}
