"use client";
/* SUPER ADM — painel do dono (centerpiece).
 * Consome a infra modular via useAdmin(): troca de PROFISSÃO (reskin ao vivo) +
 * TOGGLES de features (liga/desliga sidebar + dashboard). superadm é fixo (não aparece). */

import React from "react";
import { s, Icon, Card, Badge, Toggle, Screen, SectionTitle, Monogram, fmt } from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import {
  FEATURE_REGISTRY,
  GRUPOS_ORDEM,
  PROFISSOES,
  PROFISSOES_ORDEM,
  PROFISSAO_LABELS,
  type Grupo,
} from "@/lib/profiles";

// grupos que expõem toggles (ADMIN = superadm fixo, não entra)
const GRUPOS_TOGGLE: Grupo[] = GRUPOS_ORDEM.filter((g) => g !== "ADMIN");

// emoji da profissão, com fallback neutro (genérico não tem emoji temático)
function ProfMark({ emoji, size = 30 }: { emoji: string; size?: number }) {
  if (emoji) return <span style={s(`font-size:${size}px;line-height:1`)}>{emoji}</span>;
  return (
    <span style={s(`width:${size + 6}px;height:${size + 6}px;border-radius:11px;display:grid;place-items:center;background:var(--surface-2);color:var(--muted)`)}>
      <Icon name="user" size={Math.round(size * 0.62)} />
    </span>
  );
}

export default function SuperAdm() {
  const { profissao, setProfissao, isOn, toggle, t, data } = useAdmin();

  // telas ativas (para a mini-lista de efeito) — label dinâmico p/ serviços
  const telasAtivas = FEATURE_REGISTRY.filter((f) => isOn(f.id)).map((f) => ({
    ...f,
    labelResolvido: f.id === "servicos" ? t.catalogoLabel : f.label,
    iconResolvido: f.id === "servicos" ? t.servicoIcon : f.icon,
  }));

  return (
    <Screen>
      {/* ─── A) SELETOR DE PROFISSÃO ─── */}
      <SectionTitle
        title="Profissão do negócio"
        sub="Troca o vocabulário e os exemplos em todo o app — na hora"
        action={<Badge tone="primary" dot>Reskin ao vivo</Badge>}
      />

      <div style={s("display:grid;grid-template-columns:1.35fr 1fr;gap:16px;align-items:start")}>
        {/* cards de profissão (radio) */}
        <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px")}>
          {PROFISSOES_ORDEM.map((p, i) => {
            const sel = profissao === p;
            const spec = PROFISSOES[p];
            return (
              <button
                key={p}
                onClick={() => setProfissao(p)}
                className="m-lift m-focus m-reveal"
                style={s(
                  `text-align:left;cursor:pointer;padding:16px;border-radius:16px;animation-delay:${i * 45}ms;` +
                    "transition:background-color var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out);" +
                    "background:" + (sel ? "var(--primary-soft)" : "var(--surface)") + ";" +
                    "border:1.5px solid " + (sel ? "var(--primary)" : "var(--border)")
                )}
              >
                <div style={s("display:flex;align-items:center;justify-content:space-between;gap:8px")}>
                  <ProfMark emoji={spec.terms.emoji} size={26} />
                  {sel && <Icon name="check" size={18} sw={2.6} style={s("color:var(--primary)")} />}
                </div>
                <div style={s("font-size:15px;font-weight:800;color:var(--ink);margin-top:12px")}>
                  {PROFISSAO_LABELS[p]}
                </div>
                <div style={s("font-size:12.5px;color:var(--muted);margin-top:3px")}>
                  {spec.terms.negocioNome}
                </div>
              </button>
            );
          })}
        </div>

        {/* preview ao vivo (lê o estado atual via t/data) */}
        <Card className="m-reveal" style={s("animation-delay:120ms;display:flex;flex-direction:column;gap:16px")}>
          <div style={s("display:flex;align-items:center;gap:12px")}>
            <div style={s("width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--surface-2)")}>
              <ProfMark emoji={t.emoji} size={26} />
            </div>
            <div style={s("min-width:0")}>
              <div style={s("font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:.02em")}>PREVIEW</div>
              <div style={s("font-size:16px;font-weight:800;color:var(--ink)")}>{t.negocioNome}</div>
            </div>
          </div>

          {/* balãozinho da saudação (estilo bolha do WhatsApp) */}
          <div style={s("display:flex")}>
            <div
              className="m-reveal"
              style={s(
                "max-width:100%;background:var(--surface-2);border:1px solid var(--line);" +
                  "border-radius:14px 14px 14px 4px;padding:10px 13px;font-size:13px;line-height:1.5;color:var(--ink);animation-delay:180ms"
              )}
            >
              {t.saudacao}
            </div>
          </div>

          {/* vocabulário resolvido */}
          <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:8px 12px")}>
            <TermRow k="cliente" v={t.clienteSing} />
            <TermRow k="clientes" v={t.clientePlur} />
            <TermRow k="profissional" v={t.profissionalSing} />
            <TermRow k="profissionais" v={t.profissionalPlur} />
            <TermRow k="local" v={t.localAtendimento} />
            <TermRow k="catálogo" v={t.catalogoLabel} />
          </div>

          {/* amostra do catálogo */}
          <div>
            <div style={s("font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:8px")}>
              {t.catalogoLabel}
            </div>
            <div style={s("display:flex;flex-direction:column;gap:6px")}>
              {data.servicos.slice(0, 3).map((sv) => (
                <div key={sv.id} style={s("display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px")}>
                  <span style={s("color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{sv.nome}</span>
                  <span style={s("font-family:var(--font-mono);color:var(--muted);font-weight:700;flex-shrink:0")}>{fmt(sv.preco)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ─── B) MÓDULOS / FEATURES ─── */}
      <div style={s("margin-top:26px")}>
        <SectionTitle
          title="Módulos do app"
          sub="Ligar/desligar aqui muda a sidebar e o dashboard — na hora"
        />

        {/* aviso */}
        <Card
          pad={14}
          className="m-reveal"
          style={s("animation-delay:0ms;background:var(--primary-soft);border:1px solid var(--primary);display:flex;align-items:flex-start;gap:12px")}
        >
          <span style={s("width:34px;height:34px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;background:var(--primary);color:#fff")}>
            <Icon name="sparkle" size={18} />
          </span>
          <div style={s("font-size:13px;line-height:1.55;color:var(--ink)")}>
            Cada chave liga ou desliga uma tela na <strong>sidebar</strong> e o widget no <strong>dashboard</strong>, imediatamente.
            {" "}O <strong>Super Adm</strong> fica sempre visível. O <strong>Psico Manager</strong> é o módulo <strong>clínico</strong> (app original da Carla).
          </div>
        </Card>

        {/* grupos de toggles */}
        <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:16px")}>
          {GRUPOS_TOGGLE.map((g, gi) => {
            const itens = FEATURE_REGISTRY.filter((f) => f.grupo === g && !f.fixo);
            if (itens.length === 0) return null;
            return (
              <Card key={g} className="m-reveal" pad={0} style={s(`animation-delay:${60 + gi * 60}ms;overflow:hidden`)}>
                <div style={s("padding:13px 18px;border-bottom:1px solid var(--line);font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--muted)")}>
                  {g}
                </div>
                <div>
                  {itens.map((f, i) => {
                    const on = isOn(f.id);
                    return (
                      <div
                        key={f.id}
                        style={s(
                          "display:flex;align-items:center;gap:12px;padding:13px 18px;" +
                            (i < itens.length - 1 ? "border-bottom:1px solid var(--line)" : "")
                        )}
                      >
                        <span
                          style={s(
                            `width:36px;height:36px;border-radius:11px;flex-shrink:0;display:grid;place-items:center;` +
                              (on ? "background:var(--primary-soft);color:var(--primary-dark)" : "background:var(--surface-2);color:var(--muted)")
                          )}
                        >
                          <Icon name={f.id === "servicos" ? t.servicoIcon : f.icon} size={18} />
                        </span>
                        <div style={s("flex:1;min-width:0")}>
                          <div style={s("display:flex;align-items:center;gap:8px")}>
                            <span style={s("font-size:14px;font-weight:700;color:var(--ink)")}>
                              {f.id === "servicos" ? t.catalogoLabel : f.label}
                            </span>
                            {f.modulo === "clinico" && <Badge tone="primary">clínico</Badge>}
                          </div>
                          <div style={s("font-size:12px;color:var(--muted);margin-top:2px")}>
                            {on ? "Visível na sidebar" : "Oculto"}
                          </div>
                        </div>
                        <Toggle on={on} onChange={() => toggle(f.id)} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── C) EFEITO: mini-lista das telas ativas ─── */}
      <div style={s("margin-top:26px")}>
        <SectionTitle
          title="No app agora"
          sub={`${telasAtivas.length} telas visíveis na sidebar`}
        />
        <Card className="m-reveal" style={s("animation-delay:0ms;display:flex;flex-direction:column;gap:14px")}>
          <div style={s("display:flex;flex-wrap:wrap;gap:8px")}>
            {telasAtivas.map((f) => (
              <span
                key={f.id}
                style={s(
                  "display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:20px;" +
                    "background:var(--surface-2);border:1px solid var(--line);font-size:12.5px;font-weight:700;color:var(--ink)"
                )}
              >
                <Icon name={f.iconResolvido} size={15} style={s("color:var(--primary)")} />
                {f.labelResolvido}
                {f.fixo && <Icon name="pin" size={13} style={s("color:var(--muted)")} />}
              </span>
            ))}
          </div>
          <div style={s("display:flex;align-items:center;gap:10px;padding-top:12px;border-top:1px solid var(--line)")}>
            <Monogram name={data.shop.nome} id={data.shop.nome} size={38} />
            <div style={s("min-width:0")}>
              <div style={s("font-size:13.5px;font-weight:700;color:var(--ink)")}>{data.shop.nome}</div>
              <div style={s("font-size:12px;color:var(--muted)")}>
                As mudanças valem só para este dispositivo (salvas localmente) e refletem no app na hora.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

function TermRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={s("display:flex;align-items:baseline;gap:6px;font-size:12.5px;min-width:0")}>
      <span style={s("color:var(--muted);flex-shrink:0")}>{k}</span>
      <span style={s("color:var(--line)")}>→</span>
      <span style={s("color:var(--ink);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{v}</span>
    </div>
  );
}
