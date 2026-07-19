"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  s,
  Icon,
  Card,
  Btn,
  IconBtn,
  Badge,
  Monogram,
  EmptyState,
  Screen,
  fmt,
  toast,
} from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import type { Servico, Barbeiro } from "@/lib/mock";

/* matcher local categoria -> aparência do tile (tokens da paleta aveludada) */
type CatLook = { icon: string; tint: string; ink: string };
function catLook(categoria: string, fallbackIcon: string): CatLook {
  switch (categoria) {
    case "Corte":
      return { icon: "scissors", tint: "var(--primary-soft)", ink: "var(--primary-dark)" };
    case "Barba":
      return { icon: "user", tint: "var(--warm-soft)", ink: "var(--warn)" }; // âmbar só como fill
    case "Combo":
      return { icon: "sparkle", tint: "var(--success-soft)", ink: "var(--success)" };
    case "Tratamento":
      return { icon: "star", tint: "var(--danger-soft)", ink: "var(--danger)" };
    default: {
      // outras profissões: ícone da profissão + variedade neutra (nunca tesoura)
      const tones: [string, string, string][] = [
        ["var(--primary-soft)", "var(--primary-dark)", fallbackIcon],
        ["var(--warm-soft)", "var(--warn)", "tag"],
        ["var(--success-soft)", "var(--success)", "sparkle"],
        ["var(--danger-soft)", "var(--danger)", "star"],
      ];
      let h = 0;
      for (const ch of categoria) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const [tint, ink, icon] = tones[h % tones.length];
      return { icon, tint, ink };
    }
  }
}

export default function MeusServicos() {
  const { data, t } = useAdmin();
  const [lista, setLista] = useState<Servico[]>(data.servicos);
  const [filtro, setFiltro] = useState<string>("Todos");
  const [atrelando, setAtrelando] = useState<string | null>(null);
  const [novoAviso, setNovoAviso] = useState(false);

  /* stagger só no primeiro mount (não em re-render por filtro) — ref não interrompe a animação */
  const firstMount = useRef(true);
  useEffect(() => {
    firstMount.current = false;
  }, []);
  const revealMount = firstMount.current;

  const categorias = useMemo(
    () => ["Todos", ...Array.from(new Set(data.servicos.map((x) => x.categoria)))],
    [data.servicos]
  );

  const visiveis =
    filtro === "Todos" ? lista : lista.filter((x) => x.categoria === filtro);

  const atrelar = (sid: string, bid: string) =>
    setLista((prev) =>
      prev.map((x) =>
        x.id === sid && !x.barbeiroIds.includes(bid)
          ? { ...x, barbeiroIds: [...x.barbeiroIds, bid] }
          : x
      )
    );

  const disponiveis = (sv: Servico): Barbeiro[] =>
    data.equipe.filter((b) => b.ativo && !sv.barbeiroIds.includes(b.id));

  return (
    <Screen>
      {/* toolbar — sem título redundante */}
      <div
        style={s(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;margin-bottom:18px"
        )}
      >
        <div style={s("display:flex;gap:8px;flex-wrap:wrap")}>
          {categorias.map((c) => {
            const on = c === filtro;
            return (
              <button
                key={c}
                onClick={() => setFiltro(c)}
                className={on ? "" : "m-hov-bg"}
                style={s(
                  `font-size:13px;font-weight:700;padding:8px 15px;border-radius:99px;cursor:pointer;white-space:nowrap;transition:background-color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out);${
                    on
                      ? "border:1px solid var(--primary);background:var(--primary);color:#fff"
                      : "border:1px solid var(--border);background:var(--surface);color:var(--muted)"
                  }`
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setNovoAviso((v) => !v)}>
          Novo serviço
        </Btn>
      </div>

      {/* aviso "novo serviço" — reveal via accordion (grid-template-rows) */}
      <div className={"m-acc" + (novoAviso ? " is-open" : "")}>
        <div>
          <Card
            pad={14}
            radius={14}
            style={s(
              "display:flex;align-items:center;gap:12px;margin-bottom:16px;background:var(--primary-soft);border-color:transparent"
            )}
          >
            <Icon name="sparkle" size={18} stroke="var(--primary-dark)" />
            <span style={s("flex:1;font-size:13px;color:var(--primary-dark);font-weight:600")}>
              Em breve você poderá cadastrar novos serviços do catálogo por aqui.
            </span>
            <IconBtn icon="x" title="Fechar" onClick={() => setNovoAviso(false)} />
          </Card>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          icon={t.servicoIcon}
          title="Nenhum serviço nessa categoria"
          sub="Ajuste o filtro acima ou cadastre um novo serviço no catálogo."
        />
      ) : (
        <div
          style={s(
            "display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(290px,1fr))"
          )}
        >
          {visiveis.map((sv, i) => {
            const look = catLook(sv.categoria, t.servicoIcon);
            const profissionais = data.profissionaisDoServico(sv.id);
            const livres = disponiveis(sv);
            const aberto = atrelando === sv.id;
            const showReveal = revealMount && i < 8; // teto 8; demais entram no estado final
            return (
              <Card
                key={sv.id}
                hover
                radius={20}
                className={"m-card-hov" + (showReveal ? " m-reveal" : "")}
                style={s(
                  `display:flex;flex-direction:column;gap:15px;opacity:${
                    sv.ativo ? "1" : "0.6"
                  };transition:opacity var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)${
                    showReveal ? `;animation-delay:${i * 50}ms` : ""
                  }`
                )}
              >
                {/* topo: tile + nome/categoria + badge */}
                <div style={s("display:flex;gap:13px;align-items:flex-start")}>
                  <div
                    style={s(
                      `width:46px;height:46px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${look.tint};color:${look.ink}`
                    )}
                  >
                    <Icon name={look.icon} size={22} />
                  </div>
                  <div style={s("flex:1;min-width:0")}>
                    <div
                      style={s(
                        "display:flex;align-items:center;gap:8px;justify-content:space-between"
                      )}
                    >
                      <span
                        style={s(
                          "font-weight:700;font-size:15.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                        )}
                      >
                        {sv.nome}
                      </span>
                      <Badge tone={sv.ativo ? "success" : "neutral"} dot>
                        {sv.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div style={s("display:flex;align-items:center;gap:12px;margin-top:5px")}>
                      <span style={s("font-size:12.5px;color:var(--muted)")}>
                        {sv.categoria}
                      </span>
                      <span
                        style={s(
                          "display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--muted)"
                        )}
                      >
                        <Icon name="clock" size={14} />
                        {sv.duracao} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* quem faz: pilha de monogramas + atrelar */}
                <div
                  style={s(
                    "display:flex;flex-direction:column;gap:9px;padding:12px 13px;border-radius:14px;background:var(--surface-2)"
                  )}
                >
                  <div
                    style={s(
                      "display:flex;align-items:center;justify-content:space-between;gap:8px"
                    )}
                  >
                    <span
                      style={s(
                        "font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em"
                      )}
                    >
                      Quem faz
                    </span>
                    <button
                      title={`Atrelar ${t.profissionalSing}`}
                      onClick={() => setAtrelando(aberto ? null : sv.id)}
                      className="m-hov-bg m-press-icon m-focus"
                      style={s(
                        "width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:9px;background:var(--surface);cursor:pointer;color:var(--primary)"
                      )}
                    >
                      <span
                        style={{
                          ...s(
                            "display:flex;transition:transform var(--dur-base) var(--ease-out)"
                          ),
                          transform: aberto ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        <Icon name="plus" size={16} sw={2} />
                      </span>
                    </button>
                  </div>

                  {profissionais.length === 0 ? (
                    <span style={s("font-size:12.5px;color:var(--muted)")}>
                      Ninguém atrelado ainda
                    </span>
                  ) : (
                    <div style={s("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                      {profissionais.map((b) => (
                        <div
                          key={b.id}
                          title={b.nome}
                          style={s("display:flex;align-items:center;gap:6px")}
                        >
                          <Monogram name={b.nome} id={b.id} size={26} radius={9} />
                          <span
                            style={s(
                              "font-size:12px;color:var(--ink);white-space:nowrap"
                            )}
                          >
                            {b.nome.split(" ")[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* seletor de barbeiros disponíveis — reveal via accordion (grid-template-rows) */}
                  <div className={"m-acc" + (aberto ? " is-open" : "")}>
                    <div>
                      <div
                        style={s(
                          "display:flex;flex-wrap:wrap;gap:7px;padding-top:9px;border-top:1px solid var(--line)"
                        )}
                      >
                        {livres.length === 0 ? (
                          <span style={s("font-size:12px;color:var(--muted)")}>
                            Todos os {t.profissionalPlur} ativos já fazem este serviço.
                          </span>
                        ) : (
                          livres.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => atrelar(sv.id, b.id)}
                              className="m-hov-bg"
                              style={s(
                                "display:inline-flex;align-items:center;gap:7px;padding:4px 10px 4px 4px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600;color:var(--ink)"
                              )}
                            >
                              <Monogram name={b.nome} id={b.id} size={22} radius={8} />
                              {b.nome.split(" ")[0]}
                              <Icon name="plus" size={13} sw={2.2} stroke="var(--primary)" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* rodapé: preço + editar */}
                <div
                  style={s(
                    "display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding-top:3px"
                  )}
                >
                  <div style={s("display:flex;flex-direction:column;gap:1px")}>
                    <span style={s("font-size:11px;color:var(--muted)")}>Preço</span>
                    <span
                      style={s(
                        "font-family:var(--font-mono);font-weight:800;font-size:23px;letter-spacing:-.02em;color:var(--ink);line-height:1"
                      )}
                    >
                      {fmt(sv.preco)}
                    </span>
                  </div>
                  <IconBtn icon="edit" title="Editar serviço" onClick={() => toast(`Editar "${sv.nome}" em breve ✨`)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
