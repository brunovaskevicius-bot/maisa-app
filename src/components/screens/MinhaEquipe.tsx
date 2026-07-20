"use client";
import React, { useState } from "react";
import {
  s,
  Icon,
  Card,
  Btn,
  Badge,
  Toggle,
  Monogram,
  Screen,
  toast,
  ConfirmDialog,
} from "@/lib/ui";
import { type Barbeiro } from "@/lib/mock";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";

export default function MinhaEquipe() {
  const { data, t } = useAdmin();
  const isMobile = useIsMobile();

  // estado local de disponibilidade por profissional (default = mock.ativo)
  const [disp, setDisp] = useState<Record<string, boolean>>(() =>
    data.equipe.reduce<Record<string, boolean>>((acc, b) => {
      acc[b.id] = b.ativo;
      return acc;
    }, {})
  );

  // profissional pendente de confirmação de pausa (desativar é a ação irreversível/impactante)
  const [aPausar, setAPausar] = useState<Barbeiro | null>(null);

  const toggle = (b: Barbeiro) => {
    if (disp[b.id]) {
      // vai PAUSAR: pede confirmação antes
      setAPausar(b);
    } else {
      // reativar não precisa de confirmação
      setDisp((prev) => ({ ...prev, [b.id]: true }));
      toast(`${b.nome} voltou a receber agendamentos`);
    }
  };

  const confirmarPausa = () => {
    if (!aPausar) return;
    const b = aPausar;
    setAPausar(null);
    setDisp((prev) => ({ ...prev, [b.id]: false }));
    toast(`${b.nome} pausado(a)`);
  };

  return (
    <Screen>
      {/* toolbar: só a ação, sem título de tela (já está na topbar) */}
      {isMobile ? (
        <div style={s("margin-bottom:18px")}>
          <Btn
            variant="primary"
            icon="plus"
            full
            style={s("min-height:50px;font-size:15px")}
            onClick={() => toast(`Cadastro de ${t.profissionalSing} em breve ✨`)}
          >
            {`Adicionar ${t.profissionalSing}`}
          </Btn>
        </div>
      ) : (
        <div
          style={s(
            "display:flex;justify-content:flex-end;align-items:center;margin-bottom:22px"
          )}
        >
          <Btn variant="primary" icon="plus" onClick={() => toast(`Cadastro de ${t.profissionalSing} em breve ✨`)}>
            {`Adicionar ${t.profissionalSing}`}
          </Btn>
        </div>
      )}

      {/* grade responsiva de profissionais */}
      <div
        style={s(
          isMobile
            ? "display:grid;gap:14px;grid-template-columns:1fr"
            : "display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))"
        )}
      >
        {data.equipe.map((b: Barbeiro, i: number) => {
          const disponivel = disp[b.id];
          const servicos = data.servicosDoProfissional(b.id);

          // MOBILE — card full-width, 1 coluna: avatar/nome grandes, serviços em
          // chips confortáveis e um controle de disponibilidade largo (alvo >= 44px)
          if (isMobile) {
            return (
              <Card
                key={b.id}
                hover
                pad={18}
                className={i < 8 ? "m-reveal" : ""}
                style={s(
                  `display:flex;flex-direction:column;gap:16px;transition:transform .18s var(--ease-out),box-shadow .18s var(--ease-out);animation-delay:${Math.min(i, 7) * 50}ms`
                )}
              >
                {/* conteúdo do profissional — esmaece quando pausado (o controle abaixo
                    permanece em opacidade cheia para a reativação ficar clara) */}
                <div
                  style={s(
                    `display:flex;flex-direction:column;gap:16px;opacity:${disponivel ? "1" : "0.6"};transition:opacity .18s var(--ease-out)`
                  )}
                >
                  {/* topo: monograma grande + nome/especialidade */}
                  <div style={s("display:flex;align-items:center;gap:14px")}>
                    <Monogram name={b.nome} id={b.id} size={60} radius={18} />
                    <div style={s("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                      <div
                        style={s(
                          "font-size:17px;font-weight:700;color:var(--ink);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                        )}
                      >
                        {b.nome}
                      </div>
                      <div style={s("font-size:13.5px;color:var(--muted);font-weight:500;line-height:1.35")}>
                        {b.especialidade}
                      </div>
                    </div>
                  </div>

                  <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
                    <Badge tone={disponivel ? "success" : "neutral"} dot>
                      {disponivel ? "Disponível" : "Indisponível"}
                    </Badge>
                    <span style={s("display:inline-flex;align-items:baseline;gap:5px")}>
                      <span
                        style={s(
                          "font-family:var(--font-mono);font-size:17px;font-weight:700;color:var(--ink);letter-spacing:-0.4px;line-height:1"
                        )}
                      >
                        {b.atendimentosMes}
                      </span>
                      <span style={s("font-size:12px;color:var(--muted);font-weight:500")}>
                        atend. no mês
                      </span>
                    </span>
                  </div>

                  {/* serviços que ele faz */}
                  <div style={s("display:flex;flex-direction:column;gap:9px")}>
                    <div
                      style={s(
                        "font-size:11.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:var(--muted)"
                      )}
                    >
                      Serviços
                    </div>
                    {servicos.length > 0 ? (
                      <div style={s("display:flex;flex-wrap:wrap;gap:8px")}>
                        {servicos.map((sv) => (
                          <span
                            key={sv.id}
                            style={s(
                              "display:inline-flex;align-items:center;padding:7px 13px;border-radius:999px;font-size:13px;font-weight:600;color:var(--primary-dark);background:var(--primary-soft);border:1px solid var(--border)"
                            )}
                          >
                            {sv.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={s("font-size:13.5px;color:var(--muted)")}>
                        Nenhum serviço vinculado
                      </div>
                    )}
                  </div>
                </div>

                {/* controle de disponibilidade — barra larga e tocável (>= 44px);
                    toca em qualquer ponto para ativar/pausar. O Toggle é o indicador
                    visual (sem captar toque) para não disparar duas vezes. */}
                <button
                  onClick={() => toggle(b)}
                  aria-label={`${disponivel ? "Pausar" : "Reativar"} ${b.nome}`}
                  className="m-press m-focus"
                  style={s(
                    `display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;padding:12px 16px;border-radius:14px;cursor:pointer;text-align:left;border:1px solid var(--border);background:${disponivel ? "var(--success-soft)" : "var(--surface-2)"}`
                  )}
                >
                  <span style={s("display:flex;flex-direction:column;gap:2px;min-width:0")}>
                    <span
                      style={s(
                        `display:inline-flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:${disponivel ? "var(--success)" : "var(--muted)"}`
                      )}
                    >
                      <Icon name="clock" size={16} />
                      {disponivel ? "Ativo" : "Pausado"}
                    </span>
                    <span style={s("font-size:12px;color:var(--muted);font-weight:500")}>
                      {disponivel ? "Recebendo agendamentos" : "Sem novos agendamentos"}
                    </span>
                  </span>
                  <span style={s("display:inline-flex;pointer-events:none")}>
                    <Toggle on={disponivel} />
                  </span>
                </button>
              </Card>
            );
          }

          return (
            <Card
              key={b.id}
              hover
              pad={20}
              className={i < 8 ? "m-reveal" : ""}
              style={s(
                `display:flex;flex-direction:column;gap:16px;opacity:${disponivel ? "1" : "0.62"};transition:opacity .18s var(--ease-out),transform .18s var(--ease-out),box-shadow .18s var(--ease-out);animation-delay:${Math.min(i, 7) * 50}ms`
              )}
            >
              {/* topo: monograma grande + nome/especialidade */}
              <div style={s("display:flex;align-items:center;gap:14px")}>
                <Monogram name={b.nome} id={b.id} size={54} radius={16} />
                <div style={s("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                  <div
                    style={s(
                      "font-size:16px;font-weight:700;color:var(--ink);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                    )}
                  >
                    {b.nome}
                  </div>
                  <div style={s("font-size:13px;color:var(--muted);font-weight:500")}>
                    {b.especialidade}
                  </div>
                </div>
              </div>

              <Badge tone={disponivel ? "success" : "neutral"} dot>
                {disponivel ? "Disponível" : "Indisponível"}
              </Badge>

              {/* serviços que ele faz */}
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <div
                  style={s(
                    "font-size:11.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:var(--muted)"
                  )}
                >
                  Serviços
                </div>
                {servicos.length > 0 ? (
                  <div style={s("display:flex;flex-wrap:wrap;gap:7px")}>
                    {servicos.map((sv) => (
                      <span
                        key={sv.id}
                        style={s(
                          "display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--primary-dark);background:var(--primary-soft);border:1px solid var(--border)"
                        )}
                      >
                        {sv.nome}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={s("font-size:13px;color:var(--muted)")}>
                    Nenhum serviço vinculado
                  </div>
                )}
              </div>

              {/* rodapé: atendimentos no mês + toggle de disponibilidade */}
              <div
                style={s(
                  "display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;border-top:1px solid var(--line)"
                )}
              >
                <div style={s("display:flex;flex-direction:column;gap:2px")}>
                  <span
                    style={s(
                      "font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-0.5px;line-height:1"
                    )}
                  >
                    {b.atendimentosMes}
                  </span>
                  <span style={s("font-size:11.5px;color:var(--muted);font-weight:500")}>
                    atend. no mês
                  </span>
                </div>
                <div style={s("display:flex;align-items:center;gap:9px")}>
                  <span
                    style={s(
                      `font-size:12.5px;font-weight:600;color:${disponivel ? "var(--success)" : "var(--muted)"}`
                    )}
                  >
                    <Icon
                      name="clock"
                      size={14}
                      style={s("vertical-align:-2px;margin-right:5px")}
                    />
                    {disponivel ? "Ativo" : "Pausado"}
                  </span>
                  <Toggle on={disponivel} onChange={() => toggle(b)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CONFIRMAÇÃO — pausar deixa o profissional sem novos agendamentos */}
      <ConfirmDialog
        open={!!aPausar}
        title={aPausar ? `Pausar ${aPausar.nome}?` : ""}
        message="Ele(a) deixará de receber novos agendamentos."
        confirmText="Pausar"
        cancelText="Cancelar"
        tone="danger"
        onConfirm={confirmarPausa}
        onCancel={() => setAPausar(null)}
      />
    </Screen>
  );
}
