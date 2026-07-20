"use client";
import React, { useState } from "react";
import { s, Icon, Btn, Badge, Screen } from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";
import { useIsMobile } from "@/lib/useIsMobile";

type Chip = { icon: string; label: string };
const emBreve: Chip[] = [
  { icon: "tag", label: "Promoções" },
  { icon: "refresh", label: "Reativação" },
  { icon: "bell", label: "Lembretes" },
];

export default function Marketing() {
  const { t } = useAdmin();
  const isMobile = useIsMobile();
  const [avisado, setAvisado] = useState(false);

  return (
    <Screen>
      <div
        style={s(
          isMobile
            ? "min-height:calc(100vh - 150px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px 6px"
            : "min-height:calc(100vh - 200px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 24px"
        )}
      >
        {/* tile do ícone */}
        <div
          className="m-reveal"
          style={s(
            isMobile
              ? "position:relative;width:92px;height:92px;border-radius:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--primary-soft);color:var(--primary);box-shadow:var(--shadow-card)"
              : "position:relative;width:116px;height:116px;border-radius:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--primary-soft);color:var(--primary);box-shadow:var(--shadow-card)"
          )}
        >
          <Icon name="marketing" size={isMobile ? 44 : 54} sw={1.6} />
          <span
            style={s(
              isMobile
                ? "position:absolute;bottom:-7px;right:-7px;width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--warm-soft);color:var(--warm);border:3px solid var(--surface)"
                : "position:absolute;bottom:-8px;right:-8px;width:46px;height:46px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--warm-soft);color:var(--warm);border:3px solid var(--surface)"
            )}
          >
            <Icon name="sparkle" size={isMobile ? 18 : 22} sw={1.7} />
          </span>
        </div>

        {/* título */}
        <h2
          style={s(
            isMobile
              ? "margin:26px 0 0;font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--ink)"
              : "margin:30px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--ink)"
          )}
        >
          Estamos trabalhando nisso 🚧
        </h2>

        {/* subtítulo */}
        <p
          style={s(
            isMobile
              ? "margin:13px 0 0;max-width:400px;font-size:14.5px;line-height:1.6;color:var(--muted)"
              : "margin:14px 0 0;max-width:470px;font-size:15.5px;line-height:1.65;color:var(--muted)"
          )}
        >
          As campanhas de WhatsApp estão chegando pra deixar a MAISA ainda melhor —
          promoções, reativação de {t.clientePlur} sumidos e lembretes automáticos, tudo
          daqui de dentro.
        </p>

        {/* chips do que vem */}
        <div
          style={s(
            isMobile
              ? "display:flex;flex-wrap:wrap;gap:9px;justify-content:center;margin-top:24px"
              : "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:28px"
          )}
        >
          {emBreve.map((c) => (
            <span
              key={c.label}
              style={s(
                "display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-size:13.5px;font-weight:600;color:var(--ink)"
              )}
            >
              <span style={s("display:inline-flex;color:var(--primary)")}>
                <Icon name={c.icon} size={16} sw={1.7} />
              </span>
              {c.label}
            </span>
          ))}
        </div>

        {/* botão avise-me */}
        <div
          style={s(
            isMobile
              ? "margin-top:30px;width:100%;max-width:340px"
              : "margin-top:32px"
          )}
        >
          <Btn
            variant={avisado ? "primary" : "secondary"}
            icon={avisado ? "check" : "bell"}
            onClick={() => setAvisado(true)}
            full={isMobile}
            style={isMobile ? s("padding:14px 18px;font-size:15px") : undefined}
          >
            {avisado ? "Vamos te avisar ✓" : "Avise-me quando lançar"}
          </Btn>
        </div>

        {avisado && (
          <div style={s("margin-top:16px")}>
            <Badge tone="success" dot>
              Pronto! Te chamamos assim que estiver no ar
            </Badge>
          </div>
        )}
      </div>
    </Screen>
  );
}
