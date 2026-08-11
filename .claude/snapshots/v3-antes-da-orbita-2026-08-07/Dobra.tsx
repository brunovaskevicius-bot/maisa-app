import React from "react";
import { GlassButton } from "../../GlassButton";
import { ICPS } from "../../icp";
import { Maisa } from "../completa/Maisa";
import { Particulas } from "./Particulas";
import { Fileira } from "./Fileira";
import { CTA_ROTULO, FRASE_DOBRA, frase } from "./dados";

/* ----------------------------------------------------------------------------
 * A DOBRA DA v3 — um pôster: poeira atrás, a frase no meio, a fila no pé.
 *
 * ── O QUE MUDOU EM 07/08/2026, E POR QUÊ.
 * Ela era uma RODA de 64 rostos em dois anéis, ocupando a tela inteira, com o texto
 * no oco e um palco pinado de 200svh que desenrolava o anel numa barra conforme a
 * pessoa rolava. O veredito foi: "esteticamente está legal, mas está muito pesada
 * — só uma linha de pessoas + um fundo de partículas".
 *
 * O peso nunca foi o traçado de fundo, e vale registrar porque já se gastou uma
 * volta nisso: em 06/08 a mesma queixa ("pesando MUITO a hero") foi respondida
 * afinando a trilha de 28 fios para 6. Não resolveu, porque o peso eram os SESSENTA
 * E QUATRO CARTÕES DE ROSTO. Agora são catorze, em uma linha.
 *
 * ── A SIMPLIFICAÇÃO É MAIOR DO QUE PARECE, e ela não inventa um estado novo.
 * A barra de rostos no pé já existia: era o estado FINAL do desenrolar. E a página
 * estática já existia também, escrita inteira no bloco `prefers-reduced-motion` do
 * v3.css ("a pista encolhe, o palco para de grudar, a dobra volta a ser o pôster
 * que já era"). O que esta versão faz é PROMOVER esse estado a único. Some com
 * isso: `Roda.tsx`, `Morph.tsx`, `geometria.ts`, `trilha.ts`, o palco pinado, o
 * `--lp3-p` e a travessia.
 *
 * ── A TRAVESSIA MORREU, E ESTAVA PREVISTO POR ESCRITO.
 * Os últimos 16svh do palco passavam por cima do topo da <Telas>, e a barra pousava
 * dentro dela. Sem palco pinado não há o que atravessar — e o próprio v3.css já
 * dizia o que fazer nesse caso, no bloco de movimento reduzido: `margin-top: 0` e
 * o respiro de volta, senão a seção seguinte sobe 16svh por cima de uma dobra
 * parada, que é colisão e não gesto. É exatamente essa regra que subiu para o caso
 * geral.
 *
 * ── QUEM É SERVIDOR E QUEM É CLIENTE.
 * Este arquivo e a <Fileira> são Server Components: os catorze rostos e a frase
 * saem prontos do HTML, e a fita anda por keyframe de CSS. O único "use client" é
 * a <Particulas>, que possui um canvas e mais nada — nenhuma imagem e nenhum texto
 * atravessa a fronteira servidor→cliente como prop.
 *
 * Sem JavaScript a dobra continua inteira: pôster, fila andando, frase, botão. O
 * que falta é a poeira, que é fundo. Ressalva honesta que continua valendo: a
 * PÁGINA embarca a StickyMobileCta que o <World> monta de graça — escondida por
 * CSS, o que tira a barra da tela mas não tira o bundle.
 * -------------------------------------------------------------------------- */

export function Dobra() {
  const cfg = ICPS.barbeiros;

  return (
    <section className="lp3-dobra">
      {/* ANTES DE TUDO, e a ordem é a de pintura. A poeira e o resto vivem no mesmo
          contexto de empilhamento; em empate de z-index quem decide é a ordem do
          documento. Vindo primeiro, o campo fica sob os rostos e sob a frase, que é
          onde um fundo tem de estar. `position: absolute` no CSS também o tira do
          fluxo do grid — como item de grade ele viraria uma terceira linha e
          empurraria a fileira para fora do pé. */}
      <Particulas />

      {/* Importado de ../completa/Maisa — o mesmo wordmark das outras LPs, de
          propósito. Recriá-lo aqui seria mais uma grafia da marca no projeto, e a
          cor pararia de vir de --mk-wordmark — que é exatamente o token que esta
          página redefine para virar azul no tema claro (ver o topo do v3.css). Um
          wordmark com cor escrita à mão teria continuado dourado sobre branco. */}
      <p className="lp3-assinatura">
        <Maisa escala="grande" />
      </p>

      <div className="lp3-miolo">
        {/* <h1> porque é a única afirmação da página, e o que a fila ilustra.
            Blocos, não <br>: cada frase continua quebrando internamente se a
            viewport for estreita — o que muda é só que ela não invade a outra. */}
        <h1 className="lp3-frase">
          {FRASE_DOBRA.map((linha, l) => (
            <span key={l} style={{ display: "block" }}>
              {frase(linha).map((p, i) =>
                p.marca ? <Maisa key={i} escala="grande" /> : <React.Fragment key={i}>{p.t}</React.Fragment>,
              )}
            </span>
          ))}
        </h1>

        {/* UM primário, e sem seta: "Ativar" é ação, não navegação. O destino vem
            do icp.ts em vez de um wa.me digitado à mão — o número da MAISA existe
            em um lugar só no projeto.

            O <GlassButton> com `href` sai como <a>, que é o que este alvo precisa
            ser: ele NAVEGA. A escala não vem do `size` — vem do `font-size` que a
            classe `.lp3-cta` põe no wrap. É por isso que os respiros do vidro são
            em `em`. */}
        <GlassButton href={cfg.rotas.base} size="lg" className="lp3-cta">
          {CTA_ROTULO}
        </GlassButton>
      </div>

      {/* DEPOIS do miolo no documento, e no pé pelo grid. É ela que dá referente ao
          "esses" da frase — e é ela que faz a divisória com a seção seguinte, junto
          com o filete de 1px na borda de baixo da seção. */}
      <Fileira />
    </section>
  );
}
