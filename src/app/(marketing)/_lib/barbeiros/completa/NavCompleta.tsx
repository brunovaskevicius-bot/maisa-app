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
          // wrap como rede de segurança: mesmo com os links escondidos, logo + CTA + wordmark não
          // podem empurrar a linha além da viewport. `nowrap` em todos os níveis era o que fazia a
          // nav pedir 489px em 390px.
          flexWrap: "wrap",
        }}
      >
        <nav aria-label="Seções da página" style={{ display: "flex", alignItems: "center", gap: "1.75rem", flexWrap: "wrap", minWidth: 0 }}>
          {/* sem `display:flex` inline: quem manda é `.lp-completa .lp-nav-links` no completa.css,
              senão a media query de 760px que esconde os links nunca vence. */}
          <ul className="lp-nav-links">
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
          {/* TOPO DO FUNIL: quem acabou de chegar não vai "ativar" nada. O CTA persistente pede o
              menor compromisso possível — ver o preço — e é o único ponto que fala com alguém que
              ainda não leu a página. Antes dizia "Ativar grátis", idêntico aos outros três. */}
          <Button href={ICPS.barbeiros.rotas.base} variant="primary" size="sm">
            Ver planos
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
