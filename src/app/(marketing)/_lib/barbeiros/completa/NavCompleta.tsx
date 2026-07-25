"use client";
import React, { useEffect, useState } from "react";
import { Button } from "../../primitives";
import { ICPS } from "../../icp";
import { Maisa } from "./Maisa";
import { SECOES } from "./dados";

/* ----------------------------------------------------------------------------
 * Nav da one-pager — espelhada de propósito: âncoras e CTA à esquerda, wordmark
 * à direita. Numa página única não há para onde "voltar" clicando no logo, então
 * ele deixa de ser o ponto de partida da leitura e vira assinatura.
 *
 * `data-scrolled` liga o fundo opaco de .mk-nav (marketing.css) depois do topo.
 * -------------------------------------------------------------------------- */

export function NavCompleta() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="mk-nav"
      data-scrolled={rolou}
      style={{ position: "sticky", top: 0, zIndex: 50 }}
    >
      <div
        style={{
          maxWidth: "var(--mk-maxw-wide)",
          marginInline: "auto",
          paddingInline: "var(--mk-gutter)",
          minHeight: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <nav aria-label="Seções da página" style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
          <ul className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: "1.8rem", listStyle: "none", margin: 0, padding: 0 }}>
            {SECOES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="mk-navlink mk-underline mk-focus"
                  style={{ font: "600 0.98rem/1 var(--mk-font-body)", paddingBlock: 6 }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <Button href={ICPS.barbeiros.rotas.base} variant="primary" size="sm">
            Ativar grátis
          </Button>
        </nav>

        <a
          href="/barbeiros"
          aria-label="MAISA para barbearias"
          className="mk-focus"
          style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", fontSize: "1.55rem", lineHeight: 1 }}
        >
          <Maisa escala="grande" />
        </a>
      </div>
    </header>
  );
}
