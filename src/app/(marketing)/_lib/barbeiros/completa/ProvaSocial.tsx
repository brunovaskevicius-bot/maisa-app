"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maisa } from "./Maisa";
import { PROVAS } from "./dados";

/* ----------------------------------------------------------------------------
 * Prova social — um cliente por vez, atrás da placa da marca.
 *
 * O carrossel é vertical e infinito: a foto de fundo desliza e o cartão central
 * fica parado, então o que muda é o rosto, não o layout. Roda em roda do mouse,
 * arrasto e autoplay, com snap para o item mais próximo.
 *
 * Implementação: um único requestAnimationFrame escreve `transform` direto nas
 * 3 camadas visíveis (anterior, atual, próxima). React só re-renderiza quando o
 * item centralizado MUDA — 60 re-renders por segundo aqui seria desperdício.
 *
 * Acessibilidade: o design de origem só permitia arrastar, o que deixa a seção
 * inalcançável por teclado e invisível para leitor de tela. Aqui há botões de
 * anterior/próximo (foco tabulável) e o cartão central é uma região com
 * aria-live, então a troca é anunciada.
 * -------------------------------------------------------------------------- */

const ALTURA_ITEM = 260;   // "passo" do carrossel, em px de gesto
const AUTOPLAY_MS = 4000;  // troca sozinho a cada 4s…
const PAUSA_APOS_GESTO = 2600; // …mas só depois de 2,6s sem interação

export function ProvaSocial() {
  const [centro, setCentro] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const raiz = useRef<HTMLElement>(null);

  // Toda a física vive num ref: mudar isso não deve re-renderizar.
  const f = useRef({
    y: 0,           // posição suavizada (a que desenha)
    alvo: 0,        // posição desejada
    arrastando: false,
    ponteiroAtivo: false,
    encaixando: false,
    encaixe: { t: 0, de: 0, para: 0 },
    ultimoGesto: 0,
    ultimoAutoplay: 0,
    inicioArrasto: { y: 0, alvo: 0, id: -1 },
    centro: 0,
    visivel: true,
  });

  const item = useCallback((i: number) => {
    const n = PROVAS.length;
    return PROVAS[((i % n) + n) % n];
  }, []);

  const irPara = useCallback((delta: number) => {
    const p = f.current;
    p.encaixando = false;
    p.ultimoGesto = Date.now();
    p.alvo -= delta * ALTURA_ITEM;
  }, []);

  /* ---- gestos ---- */
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const p = f.current;

    const onWheel = (e: WheelEvent) => {
      // preventDefault: sem isso a página rola junto e o carrossel "escapa".
      e.preventDefault();
      p.encaixando = false;
      p.ultimoGesto = Date.now();
      p.alvo -= Math.max(Math.min(e.deltaY * 0.6, 50), -50);
    };
    const onDown = (e: PointerEvent) => {
      p.ponteiroAtivo = true;
      p.encaixando = false;
      p.inicioArrasto = { y: e.clientY, alvo: p.alvo, id: e.pointerId };
      p.ultimoGesto = Date.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!p.ponteiroAtivo) return;
      const dy = e.clientY - p.inicioArrasto.y;
      if (!p.arrastando) {
        // Só assume o arrasto depois de 6px: cliques e toques curtos continuam
        // sendo cliques (e o scroll vertical da página segue funcionando).
        if (Math.abs(dy) < 6) return;
        p.arrastando = true;
        setArrastando(true);
        try { el.setPointerCapture(p.inicioArrasto.id); } catch { /* noop */ }
      }
      p.alvo = p.inicioArrasto.alvo + dy * 1.6;
      p.ultimoGesto = Date.now();
    };
    const onUp = (e: PointerEvent) => {
      p.ponteiroAtivo = false;
      if (p.arrastando) {
        p.arrastando = false;
        setArrastando(false);
        try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  /* ---- visibilidade: nada de rAF girando fora da tela ---- */
  useEffect(() => {
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => { f.current.visivel = e.isIntersecting; }, { rootMargin: "180px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ---- laço de animação ---- */
  useEffect(() => {
    let raf = 0;
    const reduzido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = f.current;
      const el = raiz.current;
      if (!el) return;
      const agora = Date.now();

      // Fora da tela só o AUTOPLAY para; o laço em si continua respondendo.
      // Antes o laço abortava inteiro quando invisível, e isso engolia também
      // clique de botão e roda do mouse — a entrada do usuário nunca deve
      // depender do observer ter acordado.
      const parado = !p.encaixando && !p.arrastando && !p.ponteiroAtivo
        && Math.abs(p.alvo - p.y) < 0.5 && Math.abs(p.alvo % ALTURA_ITEM) < 0.5;
      if (!p.visivel && parado) return;

      // autoplay só quando a pessoa não está mexendo
      if (p.visivel && !reduzido && !p.arrastando && !p.ponteiroAtivo && !p.encaixando
        && agora - p.ultimoGesto > PAUSA_APOS_GESTO && agora - p.ultimoAutoplay > AUTOPLAY_MS) {
        p.alvo -= ALTURA_ITEM;
        p.ultimoAutoplay = agora;
      }

      // encaixa no item mais próximo depois que o gesto para
      if (!p.encaixando && !p.arrastando && agora - p.ultimoGesto > 100) {
        const destino = -Math.round(-p.alvo / ALTURA_ITEM) * ALTURA_ITEM;
        if (Math.abs(p.alvo - destino) > 1) {
          p.encaixando = true;
          p.encaixe = { t: agora, de: p.alvo, para: destino };
        }
      }
      if (p.encaixando) {
        const prog = Math.min((agora - p.encaixe.t) / 450, 1);
        const eased = 1 - Math.pow(1 - prog, 3);
        p.alvo = p.encaixe.de + (p.encaixe.para - p.encaixe.de) * eased;
        if (prog >= 1) p.encaixando = false;
      }

      // suavização exponencial: o desenho persegue o alvo
      if (!p.arrastando) p.y += (p.alvo - p.y) * 0.08;
      else p.y = p.alvo;

      // escreve direto no DOM — sem passar pelo React
      const exato = -p.y / ALTURA_ITEM;
      const camadas = el.querySelectorAll<HTMLElement>("[data-camada]");
      camadas.forEach((c) => {
        const i = Number(c.dataset.camada);
        c.style.transform = `translateY(${(i - exato) * 100}%)`;
      });

      const novoCentro = Math.round(-p.alvo / ALTURA_ITEM);
      if (novoCentro !== p.centro) {
        p.centro = novoCentro;
        setCentro(novoCentro);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const atual = item(centro);
  const n = PROVAS.length;
  const numero = String((((centro % n) + n) % n) + 1).padStart(2, "0");
  const camadas = [centro - 1, centro, centro + 1];

  const botao: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid oklch(1 0 0 / 0.22)",
    background: "oklch(0.15 0.04 264 / 0.6)",
    color: "var(--mk-ink)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  };

  return (
    <section
      id="prova-social"
      ref={raiz}
      aria-label="Prova social"
      className="lp-carrossel"
      data-arrastando={arrastando}
      style={{
        position: "relative",
        height: "min(82vh, 720px)",
        minHeight: 480,
        overflow: "hidden",
        userSelect: "none",
        background: "var(--mk-bg-deep)",
      }}
    >
      <div style={{ position: "absolute", top: 24, left: 24, zIndex: 3, display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, background: "var(--mk-bg-deep)", boxShadow: "var(--mk-shadow-soft)" }}>
        <span style={{ font: "800 11px/1 var(--mk-font-body)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mk-accent)" }}>Prova social</span>
      </div>

      {/* as 3 fotos vizinhas — posicionadas pelo laço acima */}
      {camadas.map((i) => {
        const d = item(i);
        return (
          <div key={i} data-camada={i} className="lp-carrossel-camada" style={{ position: "absolute", inset: 0, transform: `translateY(${(i - centro) * 100}%)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.url} alt={d.alt} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" decoding="async" draggable={false} />
          </div>
        );
      })}

      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, oklch(0.15 0.04 264 / .22) 0%, oklch(0.15 0.04 264 / .12) 40%, oklch(0.15 0.04 264 / .58) 100%)", pointerEvents: "none" }} />

      {/* placa central — fica parada, só o conteúdo troca */}
      <div
        aria-live="polite"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(740px, 90vw)",
          height: "clamp(130px, 15vw, 158px)",
          background: "var(--mk-cta)",
          borderRadius: 20,
          boxShadow: "var(--mk-shadow)",
          display: "flex",
          alignItems: "center",
          padding: "0 clamp(18px,3vw,30px)",
          zIndex: 2,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--mk-font-body)", fontWeight: 800, fontSize: "clamp(13px,1.4vw,16px)", color: "var(--mk-cta-ink)", whiteSpace: "nowrap" }}>{numero}</span>
          <span style={{ fontFamily: "var(--mk-font-body)", fontWeight: 700, fontSize: "clamp(10px,1.1vw,12px)", letterSpacing: ".08em", textTransform: "uppercase", color: "color-mix(in oklch, var(--mk-cta-ink) 65%, transparent)", whiteSpace: "nowrap" }}>
            Atendido ontem
          </span>
        </div>

        <div style={{ position: "relative", flex: "0 0 auto", ["--badge" as string]: "clamp(120px,17vw,170px)", width: "var(--badge)", height: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "calc(var(--badge) + 34px)",
              height: "calc(var(--badge) + 34px)",
              transform: "translate(-50%,-50%)",
              borderRadius: 24,
              background: "#233E71",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 16px 36px oklch(0.10 0.04 264 / .5), 0 0 0 5px var(--mk-cta)",
              fontSize: "clamp(20px,2.6vw,30px)",
            }}
          >
            <Maisa escala="grande" />
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, textAlign: "right", minWidth: 0 }}>
          <span style={{ fontFamily: "var(--mk-font-display)", fontWeight: 800, fontSize: "clamp(16px,2vw,21px)", letterSpacing: "-0.01em", color: "var(--mk-cta-ink)", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
            {atual.nome}
          </span>
          <span style={{ fontFamily: "var(--mk-font-body)", fontWeight: 700, fontSize: "clamp(10px,1.1vw,12px)", letterSpacing: ".04em", color: "color-mix(in oklch, var(--mk-cta-ink) 65%, transparent)", whiteSpace: "nowrap" }}>
            marcado com a <Maisa />
          </span>
        </div>
      </div>

      {/* controles — o que torna a seção alcançável por teclado */}
      <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 3, display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => irPara(-1)} aria-label="Cliente anterior" className="mk-focus" style={botao}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
        </button>
        <button onClick={() => irPara(1)} aria-label="Próximo cliente" className="mk-focus" style={botao}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <div style={{ position: "absolute", left: "50%", bottom: "clamp(14px,2.5vh,24px)", transform: "translateX(-50%)", fontFamily: "var(--mk-font-body)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "oklch(0.97 0.012 250 / .6)", zIndex: 2, pointerEvents: "none", whiteSpace: "nowrap" }}>
        Arraste ou role para ver mais
      </div>
    </section>
  );
}
