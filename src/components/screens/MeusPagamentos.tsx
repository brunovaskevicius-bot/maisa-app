"use client";
import React from "react";
import {
  s, Icon, Card, Btn, IconBtn, Badge, Divider, Screen, fmt,
} from "@/lib/ui";
import { assinatura, faturasMaisa, metodoPagamento, empresaMaisa } from "@/lib/mock";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";

type PlanoOpt = { id: string; nome: string; valor: number; resumo: string };
const PLANOS: PlanoOpt[] = [
  { id: "essencial", nome: "Essencial", valor: 89.9, resumo: "Até 500 conversas/mês" },
  { id: "profissional", nome: "Profissional", valor: 149.9, resumo: "Conversas ilimitadas" },
  { id: "estudio", nome: "Estúdio", valor: 249.9, resumo: "Ilimitado + multi-unidade" },
];

export default function MeusPagamentos() {
  const { data } = useAdmin();
  const isMobile = useIsMobile();
  const atualId = PLANOS.find((p) => p.nome === assinatura.plano)?.id ?? "profissional";
  const [trocando, setTrocando] = React.useState(false);
  const [escolhido, setEscolhido] = React.useState(atualId);
  const [nota, setNota] = React.useState<string | null>(null);

  const flash = (txt: string) => {
    setNota(txt);
    window.setTimeout(() => setNota((n) => (n === txt ? null : n)), 2600);
  };

  return (
    <Screen style={isMobile ? s("padding:16px") : undefined}>
      {/* toast leve de confirmação */}
      {nota && (
        <div
          style={s(
            "position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;" +
              "background:var(--success-soft);color:var(--success);border:1px solid var(--success);" +
              "padding:10px 14px;border-radius:14px;font-size:13.5px;font-weight:600;margin-bottom:4px;box-shadow:var(--shadow-card)"
          )}
        >
          <Icon name="check" size={16} sw={2.4} />
          {nota}
        </div>
      )}

      {/* (A) Plano — card destaque */}
      <Card
        pad={0}
        hover
        className="m-reveal"
        style={s(
          "overflow:hidden;animation-delay:0ms;background:linear-gradient(135deg,var(--primary-soft),var(--surface) 78%);border:1px solid var(--border)"
        )}
      >
        <div style={s(isMobile ? "padding:20px" : "padding:22px 24px")}>
          <div style={s("display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap")}>
            <div style={s("display:flex;align-items:center;gap:12px")}>
              <div
                style={s(
                  "width:44px;height:44px;border-radius:14px;display:grid;place-items:center;" +
                    "background:var(--primary);color:#fff;box-shadow:var(--shadow-pop)"
                )}
              >
                <Icon name="sparkle" size={22} />
              </div>
              <div>
                <div style={s("font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.02em")}>
                  Sua assinatura MAISA
                </div>
                <div style={s("font-size:19px;font-weight:800;color:var(--ink)")}>
                  Plano {assinatura.plano}
                </div>
              </div>
            </div>
            <Badge tone="success" dot>
              {assinatura.status === "ativa" ? "Ativa" : assinatura.status}
            </Badge>
          </div>

          <div style={s("display:flex;align-items:baseline;gap:8px;margin-top:18px")}>
            <span style={s("font-family:var(--font-mono);font-size:34px;font-weight:700;color:var(--ink)")}>
              {fmt(assinatura.valor)}
            </span>
            <span style={s("font-size:14px;color:var(--muted);font-weight:600")}>/mês</span>
          </div>

          <div style={s(isMobile ? "display:flex;flex-direction:column;gap:14px;margin-top:18px" : "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:18px")}>
            <InfoLine icon="calendar-check" label="Próxima cobrança" value={assinatura.proximaCobranca} mono />
            <InfoLine icon="chat" label="Limite de conversas" value={assinatura.limiteConversas} />
          </div>

          <div style={s(isMobile ? "display:flex;flex-direction:column;gap:10px;margin-top:20px" : "display:flex;gap:10px;margin-top:20px;flex-wrap:wrap")}>
            <Btn variant="primary" icon="card" full={isMobile} onClick={() => flash("Abrindo o portal de gerenciamento do plano…")}>
              Gerenciar plano
            </Btn>
            <Btn variant="secondary" icon="refresh" full={isMobile} onClick={() => setTrocando((v) => !v)}>
              Mudar de plano
            </Btn>
          </div>
        </div>

        {/* seletor de planos (aparece ao clicar em "Mudar de plano") */}
        {trocando && (
          <div style={s((isMobile ? "padding:16px 20px 20px;" : "padding:18px 24px 22px;") + "border-top:1px solid var(--line);background:var(--surface)")}>
            <div style={s(isMobile ? "display:flex;flex-direction:column;gap:12px" : "display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px")}>
              {PLANOS.map((p) => {
                const sel = escolhido === p.id;
                const atual = atualId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setEscolhido(p.id)}
                    className="m-lift m-focus"
                    style={s(
                      "text-align:left;cursor:pointer;padding:14px 16px;border-radius:16px;" +
                        "transition:background-color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out);" +
                        "background:" + (sel ? "var(--primary-soft)" : "var(--surface-2)") + ";" +
                        "border:1.5px solid " + (sel ? "var(--primary)" : "var(--line)")
                    )}
                  >
                    <div style={s("display:flex;justify-content:space-between;align-items:center;gap:8px")}>
                      <span style={s("font-size:15px;font-weight:700;color:var(--ink)")}>{p.nome}</span>
                      {atual && <Badge tone="neutral">Atual</Badge>}
                      {sel && !atual && <Icon name="check" size={17} sw={2.6} style={s("color:var(--primary)")} />}
                    </div>
                    <div style={s("font-family:var(--font-mono);font-size:16px;font-weight:700;color:var(--ink);margin-top:8px")}>
                      {fmt(p.valor)}
                      <span style={s("font-family:inherit;font-size:11px;color:var(--muted);font-weight:600")}> /mês</span>
                    </div>
                    <div style={s("font-size:12.5px;color:var(--muted);margin-top:6px")}>{p.resumo}</div>
                  </button>
                );
              })}
            </div>
            <div style={s(isMobile ? "display:flex;flex-direction:column;gap:10px;margin-top:16px" : "display:flex;gap:10px;margin-top:16px;flex-wrap:wrap")}>
              <Btn
                variant="primary"
                icon="check"
                full={isMobile}
                onClick={() => {
                  const nome = PLANOS.find((p) => p.id === escolhido)?.nome ?? "";
                  setTrocando(false);
                  flash(
                    escolhido === atualId
                      ? "Você já está no plano " + nome + "."
                      : "Solicitação de troca para o plano " + nome + " registrada."
                  );
                }}
              >
                Confirmar plano
              </Btn>
              <Btn
                variant="ghost"
                full={isMobile}
                onClick={() => {
                  setTrocando(false);
                  setEscolhido(atualId);
                }}
              >
                Cancelar
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* (B) Forma de pagamento */}
      <Card hover className="m-reveal" style={s("margin-top:16px;animation-delay:60ms")}>
        <div style={s(isMobile ? "display:flex;flex-direction:column;align-items:stretch;gap:16px" : "display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap")}>
          <div style={s("display:flex;align-items:center;gap:14px")}>
            <div
              style={s(
                "width:56px;height:38px;border-radius:9px;display:grid;place-items:center;" +
                  "background:linear-gradient(135deg,#1a2a6c,#3b5bdb);color:#fff;font-weight:800;font-size:13px;letter-spacing:.04em;box-shadow:var(--shadow-card)"
              )}
            >
              VISA
            </div>
            <div>
              <div style={s("font-size:15px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px")}>
                {metodoPagamento.bandeira}
                <span style={s("font-family:var(--font-mono);color:var(--muted);font-weight:600")}>
                  •••• {metodoPagamento.final}
                </span>
              </div>
              <div style={s("font-size:12.5px;color:var(--muted);margin-top:3px")}>
                {data.shop.dono} · válido até {metodoPagamento.validade}
              </div>
            </div>
          </div>
          <Btn variant="secondary" icon="edit" full={isMobile} onClick={() => flash("Abrindo formulário para atualizar o cartão…")}>
            Atualizar cartão
          </Btn>
        </div>
      </Card>

      {/* (C) Faturas */}
      <Card style={s("margin-top:16px")} pad={0}>
        <div style={s("padding:16px 20px 8px;font-size:15px;font-weight:700;color:var(--ink)")}>Faturas</div>
        <div>
          {faturasMaisa.map((f, i) => {
            const naoUltima = i < faturasMaisa.length - 1;
            const statusBadge = (
              <Badge tone={f.status === "pago" ? "success" : "warn"}>
                {f.status === "pago" ? "Pago" : "Em aberto"}
              </Badge>
            );

            // Mobile: cada fatura vira um bloco empilhado e legível (nada de tabela apertada)
            if (isMobile) {
              return (
                <div
                  key={f.id}
                  style={s("padding:15px 18px;" + (naoUltima ? "border-bottom:1px solid var(--line)" : ""))}
                >
                  <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                    <span style={s("font-size:14px;font-weight:600;color:var(--ink);line-height:1.4")}>
                      {f.descricao}
                    </span>
                    <span style={s("font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--ink);white-space:nowrap")}>
                      {fmt(f.valor)}
                    </span>
                  </div>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px")}>
                    <div style={s("display:flex;align-items:center;gap:10px")}>
                      <span style={s("font-family:var(--font-mono);font-size:12.5px;color:var(--muted)")}>
                        {f.data}
                      </span>
                      {statusBadge}
                    </div>
                    <Btn
                      variant="secondary"
                      size="sm"
                      icon="download"
                      style={s("min-height:44px")}
                      onClick={() => flash("Recibo de " + f.data + " baixado.")}
                    >
                      Recibo
                    </Btn>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={f.id}
                style={s(
                  "display:flex;align-items:center;gap:14px;padding:13px 20px;" +
                    (naoUltima ? "border-bottom:1px solid var(--line)" : "")
                )}
              >
                <span style={s("font-family:var(--font-mono);font-size:12.5px;color:var(--muted);min-width:86px")}>
                  {f.data}
                </span>
                <span style={s("flex:1;font-size:13.5px;color:var(--ink);font-weight:500;min-width:120px")}>
                  {f.descricao}
                </span>
                <span style={s("font-family:var(--font-mono);font-size:13.5px;font-weight:700;color:var(--ink)")}>
                  {fmt(f.valor)}
                </span>
                {statusBadge}
                <IconBtn icon="download" title="Baixar recibo" onClick={() => flash("Recibo de " + f.data + " baixado.")} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* (D) rodapé — empresa MAISA */}
      <div
        style={s(
          "display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);text-align:center;" +
            (isMobile
              ? "flex-direction:column;gap:6px;margin:22px 4px 6px"
              : "gap:10px;flex-wrap:wrap;margin:22px 4px 6px")
        )}
      >
        <span style={s("font-weight:600;color:var(--ink)")}>{empresaMaisa.razao}</span>
        {!isMobile && <Divider vertical />}
        <span>CNPJ {empresaMaisa.cnpj}</span>
        {!isMobile && <Divider vertical />}
        <span>Suporte: {empresaMaisa.suporte}</span>
      </div>
    </Screen>
  );
}

function InfoLine({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div style={s("display:flex;align-items:center;gap:10px")}>
      <div style={s("width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--surface-2);color:var(--primary)")}>
        <Icon name={icon} size={17} />
      </div>
      <div>
        <div style={s("font-size:11.5px;color:var(--muted);font-weight:600")}>{label}</div>
        <div style={s((mono ? "font-family:var(--font-mono);" : "") + "font-size:14px;font-weight:700;color:var(--ink);margin-top:2px")}>
          {value}
        </div>
      </div>
    </div>
  );
}
