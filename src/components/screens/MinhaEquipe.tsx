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

export default function MinhaEquipe() {
  const { data, t } = useAdmin();

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
      <div
        style={s(
          "display:flex;justify-content:flex-end;align-items:center;margin-bottom:22px"
        )}
      >
        <Btn variant="primary" icon="plus" onClick={() => toast(`Cadastro de ${t.profissionalSing} em breve ✨`)}>
          {`Adicionar ${t.profissionalSing}`}
        </Btn>
      </div>

      {/* grade responsiva de profissionais */}
      <div
        style={s(
          "display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))"
        )}
      >
        {data.equipe.map((b: Barbeiro, i: number) => {
          const disponivel = disp[b.id];
          const servicos = data.servicosDoProfissional(b.id);
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
