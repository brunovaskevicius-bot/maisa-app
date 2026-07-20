"use client";
import React, { useEffect, useState } from "react";
import {
  s,
  Icon,
  Card,
  Btn,
  IconBtn,
  Badge,
  Input,
  Monogram,
  Screen,
  toast,
} from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";

type Estado = "bot" | "humano" | "resolvido";
type Aba = "todas" | "bot" | "humano" | "resolvido";

const estadoMeta: Record<
  Estado,
  { label: string; tone: "primary" | "warn" | "success"; icon: string }
> = {
  bot: { label: "IA", tone: "primary", icon: "bot" },
  humano: { label: "Você", tone: "warn", icon: "user" },
  resolvido: { label: "Resolvida", tone: "success", icon: "check" },
};

const abas: { id: Aba; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "bot", label: "IA" },
  { id: "humano", label: "Você" },
  { id: "resolvido", label: "Resolvidas" },
];

export default function Atendimentos() {
  const { data } = useAdmin();
  const { conversas, mensagensExemplo } = data;
  const isMobile = useIsMobile();
  const [aba, setAba] = useState<Aba>("todas");
  const [busca, setBusca] = useState<string>("");
  const [selId, setSelId] = useState<string>("c2");
  const [resposta, setResposta] = useState<string>("");
  const [override, setOverride] = useState<Record<string, Estado>>({});
  // Mobile master-detail: no celular a lista some quando uma conversa abre (WhatsApp-like)
  const [detalheAberto, setDetalheAberto] = useState<boolean>(false);
  // Stagger só no primeiro mount da lista (nunca em filtro/re-render)
  const [primeiroMount, setPrimeiroMount] = useState<boolean>(true);
  useEffect(() => {
    const t = window.setTimeout(() => setPrimeiroMount(false), 700);
    return () => window.clearTimeout(t);
  }, []);
  const estadoDe = (c: { id: string; estado: string }): Estado => override[c.id] ?? (c.estado as Estado);

  const filtradas = conversas.filter((c) => {
    const okAba = aba === "todas" ? true : estadoDe(c) === aba;
    const q = busca.trim().toLowerCase();
    const okBusca =
      q === "" ||
      c.cliente.toLowerCase().includes(q) ||
      c.ultimaMsg.toLowerCase().includes(q);
    return okAba && okBusca;
  });

  const sel = conversas.find((c) => c.id === selId) ?? conversas[0];
  const selEstado = estadoDe(sel);
  const selMeta = estadoMeta[selEstado];
  const iaConduzindo = selEstado === "bot";

  /* ====================================================================
     MOBILE — master-detail estilo WhatsApp.
     A lista ocupa a tela inteira; ao tocar numa conversa, ela abre em
     tela cheia com um botão Voltar. Nunca as duas lado a lado.
     ==================================================================== */
  if (isMobile) {
    return (
      <Screen style={s("padding:16px")}>
        {!detalheAberto ? (
          /* ---------- MASTER: lista full-width ---------- */
          <Card
            radius={20}
            pad={0}
            style={s("display:flex;flex-direction:column;overflow:hidden")}
          >
            {/* Toolbar: busca + filtros */}
            <div style={s("padding:14px 14px 12px 14px")}>
              <div style={s("position:relative")}>
                <div style={s("position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;display:flex")}>
                  <Icon name="search" size={18} />
                </div>
                <Input
                  value={busca}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusca(e.target.value)}
                  placeholder="Buscar conversa…"
                  style={s("padding-left:42px;padding-top:12px;padding-bottom:12px;font-size:15px")}
                />
              </div>

              <div style={s("display:flex;gap:6px;margin-top:12px")}>
                {abas.map((a) => {
                  const on = aba === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAba(a.id)}
                      style={s(
                        `flex:1;border:none;cursor:pointer;padding:13px 4px;border-radius:12px;font-size:13px;font-weight:600;transition:background-color var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out);` +
                          (on
                            ? "background:var(--primary);color:#fff;box-shadow:var(--shadow-card)"
                            : "background:var(--surface-2);color:var(--muted)")
                      )}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de conversas — cada linha abre a conversa em tela cheia */}
            <div style={s("display:flex;flex-direction:column;gap:5px;padding:2px 8px 10px 8px")}>
              {filtradas.length === 0 ? (
                <div style={s("padding:44px 16px;text-align:center;color:var(--muted);font-size:14px")}>
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                filtradas.map((c, i) => {
                  const m = estadoMeta[estadoDe(c)];
                  const reveal = primeiroMount && i < 8;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelId(c.id); setDetalheAberto(true); }}
                      className={`m-hov-bg m-press${reveal ? " m-reveal" : ""}`}
                      style={s(
                        `text-align:left;border:none;cursor:pointer;width:100%;padding:14px 12px;border-radius:15px;display:flex;gap:12px;align-items:flex-start;background:transparent;transition:background .15s var(--ease-out);` +
                          (reveal ? `animation-delay:${Math.min(i, 7) * 50}ms;` : "")
                      )}
                    >
                      <Monogram name={c.cliente} id={c.id} size={48} />

                      <div style={s("flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-top:2px")}>
                        <span style={s("min-width:0;font-weight:700;font-size:15px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                          {c.cliente}
                        </span>
                        <span style={s("min-width:0;font-size:13px;color:var(--muted);line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                          {c.ultimaMsg}
                        </span>
                      </div>

                      <div style={s("flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:7px;padding-top:2px")}>
                        <Badge tone={m.tone}>{m.label}</Badge>
                        <div style={s("display:flex;align-items:center;gap:7px")}>
                          <span style={s("font-size:11px;color:var(--muted);font-family:var(--font-mono)")}>
                            {c.hora}
                          </span>
                          {c.naoLidas > 0 ? (
                            <span style={s("min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)")}>
                              {c.naoLidas}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        ) : (
          /* ---------- DETAIL: conversa em tela cheia ---------- */
          <Card
            radius={20}
            pad={0}
            className="m-enter"
            style={s("display:flex;flex-direction:column;overflow:hidden;height:calc(100dvh - 150px);min-height:420px")}
          >
            {/* Header com Voltar + ação assumir/reabrir */}
            <div style={s("padding:12px 14px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px")}>
              <div style={s("display:flex;align-items:center;gap:10px")}>
                <button
                  onClick={() => setDetalheAberto(false)}
                  aria-label="Voltar para a lista"
                  className="m-hov-bg m-press-icon m-focus"
                  style={s("flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:12px;background:var(--surface);cursor:pointer;color:var(--ink)")}
                >
                  <Icon name="chevron-left" size={22} sw={2} />
                </button>
                <Monogram name={sel.cliente} id={sel.id} size={44} />
                <div style={s("flex:1;min-width:0")}>
                  <div style={s("display:flex;align-items:center;gap:8px")}>
                    <span style={s("font-weight:700;font-size:15.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                      {sel.cliente}
                    </span>
                    <Badge tone={selMeta.tone} dot>
                      {selMeta.label}
                    </Badge>
                  </div>
                  <div style={s("display:flex;align-items:center;gap:5px;margin-top:2px;color:var(--muted);font-size:12.5px")}>
                    <Icon name="phone" size={13} />
                    <span style={s("font-family:var(--font-mono)")}>{sel.telefone}</span>
                  </div>
                </div>
              </div>

              {selEstado === "resolvido" ? (
                <Btn variant="secondary" icon="refresh" full onClick={() => { setOverride((p) => ({ ...p, [sel.id]: "bot" })); toast("Conversa reaberta para a MAISA"); }} style={s("min-height:46px")}>
                  Reabrir
                </Btn>
              ) : (
                <Btn variant="whats" icon="user" full onClick={() => { setOverride((p) => ({ ...p, [sel.id]: "humano" })); toast("Você assumiu a conversa"); }} style={s("min-height:46px")}>
                  Assumir conversa
                </Btn>
              )}
            </div>

            {/* Aviso: IA conduzindo */}
            {iaConduzindo ? (
              <div className="m-reveal" style={s("margin:12px 14px 0 14px;padding:10px 14px;border-radius:13px;background:var(--primary-soft);display:flex;align-items:center;gap:10px")}>
                <span style={s("display:flex;color:var(--primary-dark)")}>
                  <Icon name="sparkle" size={17} />
                </span>
                <span style={s("flex:1;font-size:12.5px;color:var(--primary-dark);line-height:1.4")}>
                  A <strong>MAISA</strong> está conduzindo este atendimento automaticamente.
                </span>
                <span style={s("flex-shrink:0")}>
                  <Badge tone="primary">automático</Badge>
                </span>
              </div>
            ) : null}

            {/* Balões */}
            <div style={s("flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px")}>
              <div style={s("text-align:center;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px")}>
                Hoje
              </div>
              {mensagensExemplo.map((msg, i) => {
                const bot = msg.de === "bot";
                return (
                  <div
                    key={i}
                    style={s(
                      `display:flex;flex-direction:column;max-width:82%;` +
                        (bot ? "align-self:flex-end;align-items:flex-end" : "align-self:flex-start;align-items:flex-start")
                    )}
                  >
                    {bot ? (
                      <div style={s("display:flex;align-items:center;gap:5px;margin-bottom:4px;color:var(--primary-dark)")}>
                        <Icon name="bot" size={13} />
                        <span style={s("font-size:11px;font-weight:700;letter-spacing:.02em")}>MAISA</span>
                      </div>
                    ) : null}
                    <div
                      style={s(
                        `padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.45;color:var(--ink);` +
                          (bot
                            ? "background:var(--primary-soft);border-bottom-right-radius:5px"
                            : "background:var(--surface-2);border-bottom-left-radius:5px")
                      )}
                    >
                      {msg.txt}
                    </div>
                    <span style={s("font-size:10.5px;color:var(--muted);margin-top:4px;font-family:var(--font-mono)")}>
                      {msg.hora}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rodapé: responder */}
            <div style={s("padding:12px 14px;border-top:1px solid var(--line);background:var(--surface)")}>
              {iaConduzindo ? (
                <div style={s("font-size:11.5px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:6px")}>
                  <Icon name="bot" size={13} />
                  Assuma a conversa para responder no lugar da MAISA.
                </div>
              ) : null}
              <div style={s("display:flex;align-items:center;gap:8px")}>
                <div style={s("flex:1")}>
                  <Input
                    value={resposta}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResposta(e.target.value)}
                    placeholder="Escreva uma mensagem…"
                    style={s("padding-top:12px;padding-bottom:12px;font-size:15px")}
                  />
                </div>
                <Btn variant="primary" icon="send" onClick={() => setResposta("")} style={s("min-height:48px;padding-left:16px;padding-right:16px")}>
                  Enviar
                </Btn>
              </div>
            </div>
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Inbox em duas colunas */}
      <div style={s("display:flex;gap:16px;align-items:stretch;flex-wrap:wrap")}>
        {/* ---------- ESQUERDA: lista ---------- */}
        <Card
          radius={20}
          pad={0}
          style={s("flex:1 1 320px;min-width:300px;max-width:360px;display:flex;flex-direction:column;overflow:hidden")}
        >
          {/* Toolbar: busca + filtros */}
          <div style={s("padding:16px 16px 12px 16px")}>
            <div style={s("position:relative")}>
              <div style={s("position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;display:flex")}>
                <Icon name="search" size={17} />
              </div>
              <Input
                value={busca}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusca(e.target.value)}
                placeholder="Buscar conversa…"
                style={s("padding-left:38px")}
              />
            </div>

            <div style={s("display:flex;gap:6px;margin-top:12px")}>
              {abas.map((a) => {
                const on = aba === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAba(a.id)}
                    style={s(
                      `flex:1;border:none;cursor:pointer;padding:7px 4px;border-radius:11px;font-size:12.5px;font-weight:600;transition:background-color var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out);` +
                        (on
                          ? "background:var(--primary);color:#fff;box-shadow:var(--shadow-card)"
                          : "background:var(--surface-2);color:var(--muted)")
                    )}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de conversas */}
          <div style={s("flex:1;overflow-y:auto;padding:4px 10px 10px 10px;display:flex;flex-direction:column;gap:5px")}>
            {filtradas.length === 0 ? (
              <div style={s("padding:40px 16px;text-align:center;color:var(--muted);font-size:13px")}>
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filtradas.map((c, i) => {
                const m = estadoMeta[estadoDe(c)];
                const on = c.id === selId;
                const reveal = primeiroMount && i < 8;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelId(c.id)}
                    className={`${on ? "" : "m-hov-bg m-lift"}${reveal ? " m-reveal" : ""}`}
                    style={s(
                      `text-align:left;border:none;cursor:pointer;width:100%;padding:14px 12px;border-radius:15px;display:flex;gap:12px;align-items:flex-start;transition:background .15s var(--ease-out),box-shadow .18s var(--ease-out);` +
                        (reveal ? `animation-delay:${Math.min(i, 7) * 50}ms;` : "") +
                        (on
                          ? "background:var(--primary-soft);box-shadow:inset 0 0 0 1.5px var(--primary)"
                          : "background:transparent")
                    )}
                  >
                    <Monogram name={c.cliente} id={c.id} size={46} />

                    {/* Coluna de texto — nome e prévia alinhados à esquerda */}
                    <div style={s("flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-top:1px")}>
                      <span style={s("min-width:0;font-weight:700;font-size:14.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                        {c.cliente}
                      </span>
                      <span style={s("min-width:0;font-size:12.5px;color:var(--muted);line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                        {c.ultimaMsg}
                      </span>
                    </div>

                    {/* Coluna à direita — estado + hora + não-lidas */}
                    <div style={s("flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:7px;padding-top:1px")}>
                      <Badge tone={m.tone}>{m.label}</Badge>
                      <div style={s("display:flex;align-items:center;gap:7px")}>
                        <span style={s("font-size:11px;color:var(--muted);font-family:var(--font-mono)")}>
                          {c.hora}
                        </span>
                        {c.naoLidas > 0 ? (
                          <span style={s("min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)")}>
                            {c.naoLidas}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* ---------- DIREITA: thread ---------- */}
        <Card
          radius={20}
          pad={0}
          style={s("flex:2 1 420px;min-width:320px;display:flex;flex-direction:column;overflow:hidden")}
        >
          {/* Header da conversa */}
          <div style={s("padding:16px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
            <Monogram name={sel.cliente} id={sel.id} size={46} />
            <div style={s("flex:1;min-width:0")}>
              <div style={s("display:flex;align-items:center;gap:8px")}>
                <span style={s("font-weight:700;font-size:15.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                  {sel.cliente}
                </span>
                <Badge tone={selMeta.tone} dot>
                  {selMeta.label}
                </Badge>
              </div>
              <div style={s("display:flex;align-items:center;gap:5px;margin-top:2px;color:var(--muted);font-size:12.5px")}>
                <Icon name="phone" size={13} />
                <span style={s("font-family:var(--font-mono)")}>{sel.telefone}</span>
              </div>
            </div>
            <div style={s("display:flex;align-items:center;gap:8px")}>
              {selEstado === "resolvido" ? (
                <Btn variant="secondary" icon="refresh" size="sm" onClick={() => { setOverride((p) => ({ ...p, [sel.id]: "bot" })); toast("Conversa reaberta para a MAISA"); }}>
                  Reabrir
                </Btn>
              ) : (
                <Btn variant="whats" icon="user" size="sm" onClick={() => { setOverride((p) => ({ ...p, [sel.id]: "humano" })); toast("Você assumiu a conversa"); }}>
                  Assumir conversa
                </Btn>
              )}
            </div>
          </div>

          {/* Aviso: IA conduzindo */}
          {iaConduzindo ? (
            <div className="m-reveal" style={s("margin:12px 18px 0 18px;padding:10px 14px;border-radius:13px;background:var(--primary-soft);display:flex;align-items:center;gap:10px")}>
              <span style={s("display:flex;color:var(--primary-dark)")}>
                <Icon name="sparkle" size={17} />
              </span>
              <span style={s("flex:1;font-size:12.5px;color:var(--primary-dark);line-height:1.4")}>
                A <strong>MAISA</strong> está conduzindo este atendimento automaticamente.
              </span>
              <span style={s("flex-shrink:0")}>
                <Badge tone="primary">automático</Badge>
              </span>
            </div>
          ) : null}

          {/* Balões */}
          <div style={s("flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;min-height:280px")}>
            <div style={s("text-align:center;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px")}>
              Hoje
            </div>
            {mensagensExemplo.map((msg, i) => {
              const bot = msg.de === "bot";
              return (
                <div
                  key={i}
                  style={s(
                    `display:flex;flex-direction:column;max-width:78%;` +
                      (bot ? "align-self:flex-end;align-items:flex-end" : "align-self:flex-start;align-items:flex-start")
                  )}
                >
                  {bot ? (
                    <div style={s("display:flex;align-items:center;gap:5px;margin-bottom:4px;color:var(--primary-dark)")}>
                      <Icon name="bot" size={13} />
                      <span style={s("font-size:11px;font-weight:700;letter-spacing:.02em")}>MAISA</span>
                    </div>
                  ) : null}
                  <div
                    style={s(
                      `padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.45;color:var(--ink);` +
                        (bot
                          ? "background:var(--primary-soft);border-bottom-right-radius:5px"
                          : "background:var(--surface-2);border-bottom-left-radius:5px")
                    )}
                  >
                    {msg.txt}
                  </div>
                  <span style={s("font-size:10.5px;color:var(--muted);margin-top:4px;font-family:var(--font-mono)")}>
                    {msg.hora}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rodapé: responder */}
          <div style={s("padding:14px 16px;border-top:1px solid var(--line);background:var(--surface)")}>
            {iaConduzindo ? (
              <div style={s("font-size:11.5px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:6px")}>
                <Icon name="bot" size={13} />
                Assuma a conversa para responder no lugar da MAISA.
              </div>
            ) : null}
            <div style={s("display:flex;align-items:center;gap:10px")}>
              <div style={s("flex:1")}>
                <Input
                  value={resposta}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResposta(e.target.value)}
                  placeholder="Escreva uma mensagem…"
                />
              </div>
              <Btn variant="primary" icon="send" onClick={() => setResposta("")}>
                Enviar
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
