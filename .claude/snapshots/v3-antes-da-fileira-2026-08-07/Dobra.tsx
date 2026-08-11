import React from "react";
import { GlassButton } from "../../GlassButton";
import { ICPS } from "../../icp";
import { Maisa } from "../completa/Maisa";
import { Morph } from "./Morph";
import { Roda } from "./Roda";
import { CTA_ROTULO, FRASE_RODA, frase } from "./dados";

/* ----------------------------------------------------------------------------
 * A DOBRA DA v3 — a roda É a dobra, e ao rolar ela vira a divisória.
 *
 * A DIFERENÇA PARA A TENTATIVA ANTERIOR está toda aqui, e é de arranjo, não de
 * asset. Lá havia manchete + subtítulo + botão + linha de preço empilhados em
 * cima, e a roda entrava numa faixa no rodapé da dobra — sobrava-lhe ~400px de
 * altura para um anel que precisava de ~800px, então o que se via era uma fatia
 * horizontal de círculo. Aqui a dobra tem UM objeto: a roda ocupa a tela inteira
 * e o texto mora no oco dela.
 *
 * O QUE SOBROU DE TEXTO, e por quê. Três elementos: a assinatura no canto, a
 * frase e um botão. Não há manchete separada da frase porque a frase JÁ é a
 * manchete — ela nomeia o que gira em volta ("todos esses"), o que é uma coisa
 * que só funciona neste arranjo. Não há linha de preço porque ela pede uma
 * quarta linha dentro de um oco que comporta três, e preço na dobra é
 * argumento de fechamento, não de abertura.
 *
 * ── QUEM É SERVIDOR E QUEM É CLIENTE.
 * Este arquivo continua sendo Server Component, e a <Roda> também: os 64 cartões
 * saem prontos do HTML. O único "use client" é o <Morph>, uma casca que possui o
 * ref da pista, lê o progresso do scroll e escreve `transform` na marcação que já
 * existe. Nenhum cartão atravessa a fronteira servidor→cliente como prop.
 *
 * Sem JavaScript a dobra continua inteira e girando (keyframe de CSS), só não
 * ganha o segundo ato. Ressalva honesta que continua valendo: a PÁGINA embarca a
 * StickyMobileCta que o <World> monta de graça — escondida por CSS, o que tira a
 * barra da tela mas não tira o bundle.
 * -------------------------------------------------------------------------- */

export function Dobra() {
  const cfg = ICPS.barbeiros;

  return (
    /* O <Morph> é quem emite a <section> da pista e o palco pinado dentro dela —
       a estrutura de rolagem é indissociável do que ele faz, então dividi-la
       entre dois arquivos só criaria a chance de alguém alterar a altura da pista
       sem alterar o offset que a lê. */
    <Morph>
      {/* Importado de ../completa/Maisa — o mesmo wordmark das outras LPs, de
          propósito. Recriá-lo aqui seria mais uma grafia da marca no projeto, e a
          cor pararia de vir de --mk-wordmark — que é exatamente o token que esta
          página redefine para virar azul no tema claro (ver o topo do v3.css). Um
          wordmark com cor escrita à mão teria continuado dourado sobre branco. */}
      <p className="lp3-assinatura">
        <Maisa escala="grande" />
      </p>

      <Roda>
        {/* <h1> porque é a única afirmação da página, e o que a roda ilustra.
            Blocos, não <br>: cada frase continua quebrando internamente se a
            viewport for estreita — o que muda é só que ela não invade a outra. */}
        <h1 className="lp3-frase">
          {FRASE_RODA.map((linha, l) => (
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
            classe `.lp3-cta` põe no wrap, derivado de `--o-r0` como todo o resto da
            dobra. É por isso que os respiros do vidro são em `em`. */}
        <GlassButton href={cfg.rotas.base} size="lg" className="lp3-cta">
          {CTA_ROTULO}
        </GlassButton>
      </Roda>
    </Morph>
  );
}
