import React from "react";
import type { Trecho } from "./dados";

/* ----------------------------------------------------------------------------
 * O wordmark "maisa" como palavra dentro da frase.
 *
 * Nesta LP a marca é lida como sujeito ("a maisa já confirmou o próximo"), não
 * como logo no topo. Então ela precisa viver no meio do texto sem quebrar a
 * linha de base: Jakarta 800 dourada com relevo, do mesmo jeito que aparece na
 * topbar do app — mesmo estando num escopo cuja fonte de corpo é outra.
 *
 * `escala` sobrevive só como compatibilidade das ~16 chamadas: ela existia para escolher entre dois
 * relevos, e o relevo saiu (ver abaixo). Não faz mais nada.
 *
 * A COR VEM DE TOKEN, e o token é do MARKETING (--mk-wordmark), não do produto.
 * Antes isto usava `var(--warm)` — token do app. Duas consequências, as duas ruins:
 * a LP ficava acoplada à paleta do produto (mexer no app mudava a marca na LP em silêncio,
 * que foi exatamente o que aconteceu), e sobre a faixa dourada do CTA final dava
 * ouro-sobre-ouro a 1,02:1 — o wordmark simplesmente desaparecia no momento de maior
 * intenção da página. `.lp-band` inverte --mk-wordmark para navy ali (9,80:1).
 * -------------------------------------------------------------------------- */

export function Maisa({ escala = "inline" }: { escala?: "inline" | "grande" }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-jakarta), system-ui, sans-serif",
        fontWeight: 800,
        color: "var(--mk-wordmark)",
        letterSpacing: "-0.01em",
        // SEM text-shadow. A tentativa anterior tokenizou só o relevo dourado e deixou a segunda
        // sombra (escura) hardcoded — sobre a faixa dourada ela virava um halo cinza-sujo em volta
        // de "maisa", visivelmente embaçado ao lado do texto nítido ao redor. Um bevel só existia
        // para imitar a topbar do app; num wordmark de 15px dentro de frase ele não acrescenta
        // profundidade, acrescenta borrão. A marca se distingue por família e peso, que bastam.
      }}
    >
      maisa
    </span>
  );
}

/** Renderiza uma frase com trechos marcados (ver `frase()` em dados.ts). */
export function Frase({ trechos, escala }: { trechos: Trecho[]; escala?: "inline" | "grande" }) {
  return (
    <>
      {trechos.map((p, i) => (p.marca ? <Maisa key={i} escala={escala} /> : <React.Fragment key={i}>{p.t}</React.Fragment>))}
    </>
  );
}
