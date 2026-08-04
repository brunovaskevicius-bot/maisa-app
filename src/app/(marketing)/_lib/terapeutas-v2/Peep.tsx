import type { PeepArt } from "./peeps.data";

/* ----------------------------------------------------------------------------
 * <Peep> — uma pessoa do Open Peeps, recolorida pelo DS (ver peeps.css).
 *
 * Sem "use client": é markup estático, então o SVG viaja como HTML e não entra
 * no bundle de JS. Quem anima é o <Multidao>, que envolve isto num motion.div.
 *
 * ALTURA — cada peep tem um viewBox de altura diferente (652 a 715), porque no
 * pack eles têm alturas de pessoa diferentes mesmo: cabelo, postura, idade.
 * Normalizar todos para a mesma altura acharia a multidão e mataria justamente
 * essa variação, então cada um recebe altura PROPORCIONAL ao peep mais alto do
 * conjunto. Com o contêiner alinhando pelo fim (align-items: flex-end), os pés
 * caem todos na mesma linha e as cabeças ficam desencontradas — como gente.
 * -------------------------------------------------------------------------- */

export type Tom = "a" | "b" | "c" | "d" | "e";

export function Peep({
  art,
  tom,
  alturaRelativa,
  atendida = false,
}: {
  art: PeepArt;
  tom: Tom;
  /** 0..1 — altura deste peep em relação ao mais alto do conjunto */
  alturaRelativa: number;
  atendida?: boolean;
}) {
  return (
    <svg
      className={`pp pp-tone-${tom}`}
      viewBox={`0 0 ${art.w} ${art.h}`}
      style={{ height: `${alturaRelativa * 100}%` }}
      data-atendida={atendida ? "true" : "false"}
      /* Ilustração decorativa: o sentido está no texto da seção, não aqui.
         Anunciar dez SVGs de pessoa não ajudaria ninguém no leitor de tela. */
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: art.art }}
    />
  );
}

/** Distribui os cinco tons sem repetir vizinho (2 e 5 são coprimos). */
export function tomPara(indice: number): Tom {
  return (["a", "b", "c", "d", "e"] as const)[(indice * 2) % 5];
}
