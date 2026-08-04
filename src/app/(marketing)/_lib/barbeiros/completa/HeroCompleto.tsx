"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button, Display, Eyebrow, Lead } from "../../primitives";
import { ICPS } from "../../icp";
import { Maisa } from "./Maisa";
import { ANEL } from "./dados";

/* ----------------------------------------------------------------------------
 * Herói — a promessa em uma frase, sobre um anel de fotos girando em perspectiva.
 *
 * O anel é CSS puro (keyframe lpAnel + delays negativos): 8 cartões atravessam
 * a cena passando pelo fundo, o que dá volume sem nenhum JS por quadro. O único
 * trabalho de JS aqui é PAUSAR quando o herói sai da tela — 8 elementos em 3D
 * animando atrás de outra seção é bateria jogada fora.
 *
 * O vinheta radial no centro existe para o texto ganhar contraste sobre as fotos
 * sem escurecer as bordas da cena.
 * -------------------------------------------------------------------------- */

export function HeroCompleto() {
  const secao = useRef<HTMLElement>(null);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const el = secao.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([e]) => setPausado(!e.isIntersecting),
      { rootMargin: "180px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={secao}
      aria-label="Um cliente sai, outro já chega"
      style={{
        position: "relative",
        minHeight: "min(100vh, 940px)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "var(--mk-bg-deep)",
      }}
    >
      {/* brilho de ambiente: dourado em cima, azul embaixo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 50% at 50% 6%, oklch(0.8 0.14 82 / 0.16), transparent 58%), radial-gradient(70% 60% at 50% 100%, oklch(0.63 0.13 256 / 0.14), transparent 60%)",
        }}
      />

      {/* o anel */}
      <div
        aria-hidden="true"
        className="lp-anel"
        data-pausado={pausado}
        style={{ position: "absolute", inset: 0, zIndex: 1, perspective: 1700, perspectiveOrigin: "50% 50%", overflow: "hidden", pointerEvents: "none" }}
      >
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
          {ANEL.map((img, i) => (
            <div
              // índice, não url: o anel repete fotos para preencher as 8 posições
              key={i}
              className="lp-anel-card"
              style={{
                // Delay negativo escalonado: os 8 cartões dividem o mesmo ciclo
                // de 30s, então já nascem distribuídos ao longo do trajeto.
                animationDelay: `${-(i * 30) / ANEL.length}s`,
                background: "oklch(0.3 0.03 262)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>

      {/* vinheta central — dá contraste ao texto sem apagar a cena */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(340px 260px at 50% 50%, var(--mk-bg-deep) 0%, color-mix(in oklch, var(--mk-bg-deep) 55%, transparent) 55%, transparent 78%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 5, maxWidth: 680, padding: "0 clamp(24px,4vw,52px)" }}>
        <div className="mk-reveal" style={{ animationDelay: "60ms" }}>
          <Eyebrow>Agenda que não para</Eyebrow>
        </div>
        <div className="mk-reveal" style={{ animationDelay: "120ms", marginTop: 16 }}>
          <Display as="h1" size="2xl">
            Um cliente sai, outro já <em style={{ fontStyle: "normal", color: "var(--mk-accent)" }}>chega</em>.
          </Display>
        </div>
        <div className="mk-reveal" style={{ animationDelay: "200ms", marginTop: 22 }}>
          <Lead style={{ marginInline: "auto" }}>
            Enquanto você termina um corte, a <Maisa escala="grande" /> já confirmou o próximo no WhatsApp. Sua cadeira não fica vazia.
          </Lead>
        </div>
        <div className="mk-reveal" style={{ animationDelay: "280ms", marginTop: 30, display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {/* UM primário só. Antes eram dois botões sólidos `lg` lado a lado — dourado e verde — e
              dois primários é zero primário: a decisão se divide e o olho não sabe onde cair.
              O rótulo saiu de "Ativar grátis", que era FALSO (não existe plano grátis; o destino é
              uma página de R$ 97/mês), para o que o próprio `icp.ts` já declarava em `ctaLabel` e
              esta página ignorava. Sem seta: "Ativar" é ação, não navegação — o ícone contradizia
              o verbo. */}
          <Button href={ICPS.barbeiros.rotas.base} variant="primary" size="lg">
            {ICPS.barbeiros.ctaLabel}
          </Button>
          <Button href={ICPS.barbeiros.ctaUrl} external variant="secondary" size="lg" icon="whatsapp">
            Falar no WhatsApp
          </Button>
        </div>
        <p
          className="mk-reveal"
          style={{
            animationDelay: "360ms",
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "var(--mk-muted)",
            font: "600 15px/1.4 var(--mk-font-body)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mk-accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m20 6-11 11-5-5" />
          </svg>
          {/* A PROVA DE REVERSIBILIDADE, que já existia escrita em /barbeiros/comecar e não
              aparecia perto de nenhum botão desta página. É o que substitui a palavra "grátis":
              o risco não se remove mentindo sobre o preço, se remove dizendo o preço e a saída. */}
          A partir de R$ 97/mês · garantia de 1 mês · sem fidelidade
        </p>
      </div>
    </section>
  );
}
