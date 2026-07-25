"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { ICPS, ctaDoNivel, nivelDoPath, type ICP, type Nivel } from "./icp";
import { Button } from "./primitives";
import { Wordmark } from "./Wordmark";

/* ----------------------------------------------------------------------------
 * MarketingNav — cabeçalho fixo, uma variação por ICP (o clima vem dos tokens
 * do mundo; o conteúdo e as rotas vêm de ICPS). Navegação topo → meio → base.
 * O CTA é DERIVADO DO NÍVEL do funil (pathname → ctaDoNivel): leve no topo
 * ("Ver como funciona"), médio no meio ("Começar agora"), forte na base
 * (WhatsApp). Assim o CTA de fundo-de-funil não aparece no topo. Vira solidez ao
 * rolar. Menu mobile acessível (aria-expanded, Esc para fechar, fecha ao
 * navegar). Alvos de toque >= 44px.
 * -------------------------------------------------------------------------- */
export function MarketingNav({ icp, current }: { icp: ICP; current?: Nivel }) {
  const cfg = ICPS[icp];
  const pathname = usePathname();
  // pathname é a fonte de verdade do nível; `current` fica como fallback opcional.
  const nivel: Nivel = pathname ? nivelDoPath(pathname) : current ?? "topo";
  const cta = ctaDoNivel(icp, nivel);
  const navVariant = cta.peso === "leve" ? "secondary" : "primary";
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 860) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const solid = scrolled || open;
  const isActive = (item: { nivel?: Nivel }) => (item.nivel && item.nivel === nivel ? "page" : undefined);

  return (
    <header
      className="mk-nav"
      data-scrolled={solid}
      style={{ position: "sticky", top: 0, zIndex: 50 }}
    >
      <div
        style={{
          maxWidth: "var(--mk-maxw-wide)",
          marginInline: "auto",
          paddingInline: "var(--mk-gutter)",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Wordmark href={cfg.home} rotulo={cfg.rotulo} />

        <nav className="mk-nav-desktop" aria-label="Navegação principal" style={{ alignItems: "center", gap: "2rem" }}>
          <ul style={{ display: "flex", alignItems: "center", gap: "1.9rem", listStyle: "none", margin: 0, padding: 0 }}>
            {cfg.nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="mk-navlink mk-underline mk-focus"
                  aria-current={isActive(item)}
                  style={{ fontFamily: "var(--mk-font-body)", fontSize: "0.98rem", fontWeight: 600, paddingBlock: 6 }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <Button href={cta.href} external={cta.external} variant={navVariant} size="sm" icon={cta.icon}>
            {cta.label}
          </Button>
        </nav>

        <button
          type="button"
          className="mk-nav-burger mk-focus"
          aria-expanded={open}
          aria-controls="mk-mobile-menu"
          aria-label={open ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 46,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--mk-border)",
            borderRadius: 11,
            color: "var(--mk-ink)",
            cursor: "pointer",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* painel mobile — o conteúdo só é montado quando aberto: nada fica
          focável/oculto no tab order quando fechado (inclusive no desktop). */}
      <div id="mk-mobile-menu" className={`mk-mobile-panel${open ? " is-open" : ""}`}>
        <div>
          {open ? (
            <div
              style={{
                paddingInline: "var(--mk-gutter)",
                paddingTop: "0.35rem",
                paddingBottom: "1.4rem",
                borderTop: "1px solid var(--mk-line)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {cfg.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="mk-navlink mk-focus"
                  aria-current={isActive(item)}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "15px 4px",
                    fontFamily: "var(--mk-font-body)",
                    fontSize: "1.08rem",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--mk-line)",
                  }}
                >
                  {item.label}
                </a>
              ))}
              <div style={{ marginTop: "1.15rem" }}>
                <Button href={cta.href} external={cta.external} variant={navVariant} size="md" icon={cta.icon} full onClick={() => setOpen(false)}>
                  {cta.label}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
