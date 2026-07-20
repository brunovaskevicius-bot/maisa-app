"use client";
import React from "react";
import { s, Screen, Icon, Card, Badge, Input, Toggle, IconBtn, EmptyState, Btn, toast } from "@/lib/ui";
import type { FAQ } from "@/lib/mock";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";

const CATEGORIAS = ["Todas", "Geral", "Agendamento", "Pagamento", "Serviços"];

const catTone = (c: string): "primary" | "success" | "warm" | "neutral" => {
  if (c === "Pagamento") return "success";
  if (c === "Agendamento") return "primary";
  if (c === "Serviços") return "warm";
  return "neutral";
};

export default function PerguntasFrequentes() {
  const isMobile = useIsMobile();
  const { data } = useAdmin();
  const { faqs, faqsSugeridos } = data;
  const [busca, setBusca] = React.useState("");
  const [cat, setCat] = React.useState("Todas");
  const [aberta, setAberta] = React.useState<string | null>(faqs[0]?.id ?? null);
  const [ativos, setAtivos] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(faqs.map((f) => [f.id, f.ativo]))
  );
  const [rascunho, setRascunho] = React.useState<string | null>(null);

  const filtradas = faqs.filter((f) => {
    const okCat = cat === "Todas" || f.categoria === cat;
    const q = busca.trim().toLowerCase();
    const okBusca =
      q === "" ||
      f.pergunta.toLowerCase().includes(q) ||
      f.resposta.toLowerCase().includes(q);
    return okCat && okBusca;
  });

  /* =======================================================================
     MOBILE — repensado: 1 coluna, fluxo natural (o shell já rola o main).
     Banner + sugeridos empilhados rolam embora; a BUSCA fica sticky no topo
     e a lista vira accordion com área de toque grande.
     ======================================================================= */
  if (isMobile) {
    return (
      <Screen style={s("padding:16px")}>
        {/* banner curto — informativo, rola embora */}
        <div style={s("display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:16px;background:var(--primary-soft);color:var(--primary-dark);margin-bottom:20px")}>
          <span style={s("width:36px;height:36px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--primary-dark)")}>
            <Icon name="bot" size={20} />
          </span>
          <span style={s("font-size:13.5px;font-weight:700;line-height:1.4")}>
            A MAISA responde essas sozinha no WhatsApp — você só ajusta o que ela sabe.
          </span>
        </div>

        {/* FAQs sugeridos — EMPILHAM: uma linha tocável por sugestão */}
        <div style={s("margin-bottom:20px")}>
          <div style={s("font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:11px;display:flex;align-items:center;gap:7px")}>
            <Icon name="sparkle" size={15} /> FAQs sugeridos
          </div>
          <div style={s("display:flex;flex-direction:column;gap:9px")}>
            {faqsSugeridos.map((q) => {
              const on = rascunho === q;
              return (
                <button
                  key={q}
                  onClick={() => setRascunho(on ? null : q)}
                  className="m-hov-bg m-press"
                  style={s(`display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:56px;padding:13px 15px;border-radius:15px;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);border:1px dashed ${on ? "var(--primary)" : "var(--border)"};background:${on ? "var(--primary-soft)" : "var(--surface)"};color:${on ? "var(--primary-dark)" : "var(--ink)"}`)}
                >
                  <span style={s(`width:30px;height:30px;flex-shrink:0;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${on ? "var(--surface)" : "var(--surface-2)"};color:${on ? "var(--primary-dark)" : "var(--muted)"}`)}>
                    <Icon name={on ? "check" : "plus"} size={16} sw={2.2} />
                  </span>
                  <span style={s("flex:1;min-width:0;line-height:1.35")}>{q}</span>
                </button>
              );
            })}
          </div>
          {rascunho && (
            <div style={s("display:flex;align-items:flex-start;gap:10px;margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--surface-2);border:1px solid var(--border);font-size:13px;color:var(--muted)")}>
              <span style={s("flex-shrink:0;color:var(--muted);margin-top:1px")}><Icon name="edit" size={16} /></span>
              <span style={s("flex:1;min-width:0;line-height:1.45")}>
                <span style={s("color:var(--ink);font-weight:700")}>Nova FAQ: </span>
                “{rascunho}” — pronta pra você escrever a resposta.
              </span>
              <IconBtn icon="x" title="Descartar" onClick={() => setRascunho(null)} />
            </div>
          )}
        </div>

        {/* criar manualmente — ação primária de largura cheia, alcançável pelo polegar */}
        <div style={s("margin-bottom:6px")}>
          <Btn icon="plus" full onClick={() => toast("Nova pergunta em breve ✨")}>Nova pergunta</Btn>
        </div>

        {/* BUSCA — sticky no topo do scroll do main; busca full-width + filtros */}
        <div style={s("position:sticky;top:0;z-index:5;background:var(--bg);padding-top:14px")}>
          <div style={s("position:relative")}>
            <span style={s("position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;display:flex")}>
              <Icon name="search" size={19} />
            </span>
            <Input
              placeholder="Buscar em perguntas e respostas…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={s("padding:13px 14px 13px 44px;font-size:15px;border-radius:13px")}
            />
          </div>
          {/* filtros em faixa rolável horizontal — nada de grade espremida */}
          <div style={{ ...s("display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:2px"), scrollbarWidth: "none" }}>
            {CATEGORIAS.map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={on ? "m-press" : "m-hov-bg m-press"}
                  style={s(`display:inline-flex;align-items:center;gap:6px;flex-shrink:0;padding:9px 16px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);${on ? "border:1px solid var(--primary);background:var(--primary);color:#fff" : "border:1px solid var(--border);background:var(--surface);color:var(--muted)"}`)}
                >
                  {c === "Todas" && <Icon name="filter" size={14} sw={2} />}
                  {c}
                </button>
              );
            })}
          </div>
          {/* fade sutil pra mascarar a lista ao passar por baixo da busca */}
          <div style={s("height:14px;background:linear-gradient(var(--bg),transparent)")} />
        </div>

        {/* LISTA — accordion, cards de largura cheia com toque generoso */}
        <div style={s("display:flex;flex-direction:column;gap:12px;padding-bottom:8px")}>
          {filtradas.length === 0 ? (
            <EmptyState
              icon="faq"
              title="Nenhuma FAQ encontrada"
              sub="Tente outra busca ou categoria — ou crie uma a partir dos sugeridos acima."
            />
          ) : (
            filtradas.map((f: FAQ) => {
              const isOpen = aberta === f.id;
              const on = ativos[f.id];
              return (
                <Card
                  key={f.id}
                  pad={0}
                  radius={18}
                  className={"m-lift" + (isOpen ? " is-open" : "")}
                  style={{
                    ...s("overflow:hidden"),
                    ...(on ? {} : { opacity: 0.6 }),
                  }}
                >
                  {/* cabeçalho tocável — pergunta + chevron; toggle isolado à direita */}
                  <div
                    onClick={() => setAberta(isOpen ? null : f.id)}
                    style={s("display:flex;align-items:flex-start;gap:12px;padding:16px 15px;cursor:pointer;min-height:60px")}
                  >
                    <span
                      style={{
                        ...s("width:32px;height:32px;flex-shrink:0;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);color:var(--muted);transition:transform .2s var(--ease-out);margin-top:1px"),
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      <Icon name="chevron-down" size={18} sw={2.2} />
                    </span>

                    <div style={s("flex:1;min-width:0")}>
                      <p style={s("font-size:15px;font-weight:700;color:var(--ink);line-height:1.4")}>{f.pergunta}</p>
                      <div style={s("display:flex;align-items:center;gap:9px;margin-top:8px;flex-wrap:wrap")}>
                        <Badge tone={catTone(f.categoria)}>{f.categoria}</Badge>
                        <span style={s("font-size:12px;color:var(--muted)")}>
                          respondida{" "}
                          <span style={s("font-family:var(--font-mono);font-weight:700;color:var(--ink)")}>
                            {f.usos.toLocaleString("pt-BR")}
                          </span>
                          ×
                        </span>
                        {!on && <Badge tone="neutral" dot>pausada</Badge>}
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} style={s("flex-shrink:0;margin-top:2px")}>
                      <Toggle on={on} onChange={(v) => setAtivos((prev) => ({ ...prev, [f.id]: v }))} />
                    </div>
                  </div>

                  {/* corpo expandido — reveal via accordion (grid-template-rows) */}
                  <div className={"m-acc" + (isOpen ? " is-open" : "")}>
                    <div>
                      <div style={s("padding:0 15px 16px")}>
                        <div style={s("padding:13px 15px;border-radius:12px;background:var(--surface-2);font-size:13.5px;line-height:1.6;color:var(--ink)")}>
                          {f.resposta}
                        </div>
                        <div style={s("display:flex;align-items:center;gap:10px;margin-top:13px")}>
                          <IconBtn icon="edit" tone="primary" title="Editar resposta" onClick={() => setRascunho(f.pergunta)} />
                          <IconBtn icon="trash" tone="danger" title="Remover FAQ" onClick={() => setAberta(null)} />
                          <span style={s("font-size:11.5px;color:var(--muted);line-height:1.4;flex:1;min-width:0")}>
                            A MAISA usa este texto como base — ela adapta o tom na conversa.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen style={s("height:100vh;box-sizing:border-box;display:flex;flex-direction:column")}>
      {/* ---------- TOPO ESTÁTICO (sticky — não some ao rolar) ---------- */}
      <div style={s("position:sticky;top:0;z-index:5;background:var(--bg);flex-shrink:0")}>
        {/* banner curto */}
        <div style={s("display:flex;align-items:center;gap:11px;padding:11px 15px;border-radius:14px;background:var(--primary-soft);color:var(--primary-dark);margin-bottom:18px")}>
          <span style={s("width:32px;height:32px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--primary-dark)")}>
            <Icon name="bot" size={19} />
          </span>
          <span style={s("font-size:13.5px;font-weight:700;line-height:1.35")}>
            A MAISA responde essas sozinha no WhatsApp — você só ajusta o que ela sabe.
          </span>
        </div>

        {/* (1) FAQs sugeridos */}
        <div style={s("margin-bottom:16px")}>
          <div style={s("font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:9px;display:flex;align-items:center;gap:7px")}>
            <Icon name="sparkle" size={15} /> FAQs sugeridos
          </div>
          <div style={s("display:flex;flex-wrap:wrap;gap:9px")}>
            {faqsSugeridos.map((q) => {
              const on = rascunho === q;
              return (
                <button
                  key={q}
                  onClick={() => setRascunho(on ? null : q)}
                  className="m-hov-bg"
                  style={s(`display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);border:1px dashed ${on ? "var(--primary)" : "var(--border)"};background:${on ? "var(--primary-soft)" : "var(--surface)"};color:${on ? "var(--primary-dark)" : "var(--ink)"}`)}
                >
                  <Icon name={on ? "check" : "plus"} size={14} sw={2.2} />
                  {q}
                </button>
              );
            })}
          </div>
          {rascunho && (
            <div style={s("display:flex;align-items:center;gap:9px;margin-top:11px;padding:9px 13px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border);font-size:12.5px;color:var(--muted)")}>
              <Icon name="edit" size={15} />
              <span style={s("color:var(--ink);font-weight:700")}>Nova FAQ:</span>
              <span style={s("flex:1;min-width:0")}>“{rascunho}” — pronta pra você escrever a resposta.</span>
              <IconBtn icon="x" title="Descartar" onClick={() => setRascunho(null)} />
            </div>
          )}
        </div>

        {/* (2) Buscar FAQ */}
        <div style={s("margin-bottom:10px")}>
          <div style={s("display:flex;gap:10px;margin-bottom:11px")}>
            <div style={s("position:relative;flex:1")}>
              <span style={s("position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;display:flex")}>
                <Icon name="search" size={18} />
              </span>
              <Input
                placeholder="Buscar em perguntas e respostas…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={s("padding-left:40px")}
              />
            </div>
            <Btn icon="plus" onClick={() => toast("Nova pergunta em breve ✨")}>Nova pergunta</Btn>
          </div>
          <div style={s("display:flex;flex-wrap:wrap;gap:8px")}>
            {CATEGORIAS.map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={on ? "" : "m-hov-bg"}
                  style={s(`display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);${on ? "border:1px solid var(--primary);background:var(--primary);color:#fff" : "border:1px solid var(--border);background:var(--surface);color:var(--muted)"}`)}
                >
                  {c === "Todas" && <Icon name="filter" size={13} sw={2} />}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* fade sutil pra separar o topo estático da lista que rola */}
        <div style={s("height:14px;background:linear-gradient(var(--bg),transparent)")} />
      </div>

      {/* ---------- (3) LISTA — SÓ ELA ROLA ---------- */}
      <div style={s("flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-bottom:8px")}>
        {filtradas.length === 0 ? (
          <EmptyState
            icon="faq"
            title="Nenhuma FAQ encontrada"
            sub="Tente outra busca ou categoria — ou crie uma a partir dos sugeridos acima."
          />
        ) : (
          filtradas.map((f: FAQ) => {
            const isOpen = aberta === f.id;
            const on = ativos[f.id];
            return (
              <Card
                key={f.id}
                pad={0}
                radius={18}
                className={"m-lift" + (isOpen ? " is-open" : "")}
                style={{
                  ...s("overflow:hidden"),
                  ...(on ? {} : { opacity: 0.6 }),
                }}
              >
                {/* cabeçalho do acordeão */}
                <div
                  onClick={() => setAberta(isOpen ? null : f.id)}
                  style={s("display:flex;align-items:center;gap:13px;padding:15px 18px;cursor:pointer")}
                >
                  <span
                    style={{
                      ...s("width:30px;height:30px;flex-shrink:0;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);color:var(--muted);transition:transform .2s var(--ease-out)"),
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <Icon name="chevron-down" size={17} sw={2.2} />
                  </span>

                  <div style={s("flex:1;min-width:0")}>
                    <p style={s("font-size:14.5px;font-weight:700;color:var(--ink);line-height:1.35")}>{f.pergunta}</p>
                    <div style={s("display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap")}>
                      <Badge tone={catTone(f.categoria)}>{f.categoria}</Badge>
                      <span style={s("font-size:12px;color:var(--muted)")}>
                        respondida{" "}
                        <span style={s("font-family:var(--font-mono);font-weight:700;color:var(--ink)")}>
                          {f.usos.toLocaleString("pt-BR")}
                        </span>
                        ×
                      </span>
                      {!on && <Badge tone="neutral" dot>pausada</Badge>}
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()} style={s("flex-shrink:0")}>
                    <Toggle on={on} onChange={(v) => setAtivos((prev) => ({ ...prev, [f.id]: v }))} />
                  </div>
                </div>

                {/* corpo expandido — reveal via accordion (grid-template-rows) */}
                <div className={"m-acc" + (isOpen ? " is-open" : "")}>
                  <div>
                    <div style={s("padding:0 18px 16px 61px")}>
                      <div style={s("padding:13px 15px;border-radius:12px;background:var(--surface-2);font-size:13.5px;line-height:1.6;color:var(--ink)")}>
                        {f.resposta}
                      </div>
                      <div style={s("display:flex;align-items:center;gap:9px;margin-top:12px")}>
                        <IconBtn icon="edit" tone="primary" title="Editar resposta" onClick={() => setRascunho(f.pergunta)} />
                        <IconBtn icon="trash" tone="danger" title="Remover FAQ" onClick={() => setAberta(null)} />
                        <span style={s("font-size:11.5px;color:var(--muted);margin-left:2px")}>
                          A MAISA usa este texto como base — ela adapta o tom na conversa.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Screen>
  );
}
