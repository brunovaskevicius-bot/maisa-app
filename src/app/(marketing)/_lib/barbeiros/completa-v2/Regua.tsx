"use client";

import { useEffect, useState } from "react";
import { ICPS } from "../../icp";
import { Button } from "../../primitives";
import { OFERTA } from "./dados";

/* ----------------------------------------------------------------------------
 * Régua de preço — o único elemento que acompanha a rolagem inteira da v2.
 *
 * POR QUE ELA EXISTE: uma tese anterior propôs "zero botões na página" mais uma
 * barra só no mobile. Dois juízes mataram, e pelo mesmo motivo: no desktop a
 * pessoa atravessava ~230 palavras sem um alvo de clique e sem o preço em tela.
 * Era regra de estética cobrando pedágio em dinheiro. A régua devolve as duas
 * coisas que não podem sair da tela — quanto custa e por onde se ativa — sem
 * trazer de volta a barra de navegação que a v2 removeu de propósito.
 *
 * ESTE ARQUIVO É SÓ COMPORTAMENTO E CONTEÚDO. Os dois formatos (trilho fino no
 * topo >= 900px, barra do polegar < 900px), o `position: fixed`, o z-index 60, o
 * blur, o `env(safe-area-inset-bottom)`, a reserva de `padding-bottom` entre 561
 * e 899px e a transição de entrada (com `prefers-reduced-motion`) vivem todos em
 * `v2.css`, sob `.lp2-regua`. Nada disso é reimplementado em estilo inline aqui:
 * estilo inline vence folha de estilo, e a v1 já queimou uma media query inteira
 * assim (a nav que nunca escondia os links — ver `completa.css`, `.lp-nav-links`).
 *
 * É também o ÚNICO client component da página fora do `Furos.tsx` — a v1 tinha 5.
 * -------------------------------------------------------------------------- */

/* Espaço INSEPARÁVEL. A régua é um contêiner apertado: num aparelho de 320px o
 * bloco do preço encolhe até ~80px de largura e o texto quebra em mais de uma
 * linha. Quebrar é aceitável (é o que impede o estouro de texto, que é banido);
 * deixar "R$" órfão no fim de uma linha, com o número na seguinte, não é. */
const NBSP = " ";

/* O preço montado da fonte única (`OFERTA`) — o número nunca é digitado aqui. */
const PRECO_VISUAL = `a partir de ${OFERTA.precoDe.replace(/\s/g, NBSP)}${OFERTA.precoPor}`;

/* A mesma frase para leitor de tela. "/mês" é um glifo de composição: o VoiceOver
 * em pt-BR lê "barra mês". O NÚMERO continua vindo de `OFERTA` — o que se escreve
 * à mão é só a leitura da barra, que não muda quando o preço mudar. */
const PRECO_FALADO = `a partir de ${OFERTA.precoDe} por mês`;

export function Regua() {
  const [visivel, setVisivel] = useState(false);

  /* COMO A SAÍDA DA DOBRA É DETECTADA
   *
   * IntersectionObserver, e não um listener de `scroll`: são zero callbacks
   * enquanto a pessoa rola dentro da dobra e zero leituras de layout — o gatilho é
   * o compositor do navegador, não um cálculo por quadro.
   *
   * O ALVO É A PRÓPRIA DOBRA, `#dobra` (Cadeira.tsx). Antes era um <div> sentinela
   * de 1px que este componente renderizava no próprio fragmento, com o argumento de
   * que observar outro arquivo por seletor "quebraria em silêncio". O sentinela
   * quebrou em silêncio primeiro, e pior: como a página monta <Regua /> ANTES do
   * <main>, o sentinela nascia no topo do documento, e o `marginTop: -1` o deixava
   * com o retângulo entre y = -1 e y = 0. Dali ele nunca voltava a cruzar o limiar,
   * então o observer disparava uma vez na montagem e nunca mais. Medido no browser:
   * a régua ficava invisível em 0, 2, 10, 60, 400, 900 e 1200px de rolagem — ou
   * seja o elemento que existe para manter preço e CTA em tela estava morto na
   * página inteira. O acoplamento por id é greppável e está documentado dos dois
   * lados; o sentinela dependia de onde alguém montou o componente, o que é a forma
   * pior do mesmo acoplamento.
   *
   * `isIntersecting` sozinho não serve: ele é falso nos DOIS lados da viewport,
   * então diria "mostre a régua" também no topo da página, antes de a dobra ter
   * sido lida. O sinal certo é o par (não intersecta) + (`top < 0`), ou seja: a
   * borda de baixo da dobra já subiu além do topo da tela. Isso é literalmente
   * "a dobra saiu de vista", e não uma fração arbitrária de viewport.
   *
   * O IO entrega um registro inicial ao observar, então quem recarrega a página
   * no meio da rolagem (ou volta por âncora) já nasce com o estado certo. */
  useEffect(() => {
    const alvo = document.getElementById("dobra");

    /* Sem IO (navegador muito antigo) OU sem a dobra (alguém renomeou o id):
       mostrar é mais seguro do que esconder — um preço visível cedo demais é
       melhor que preço nenhum, que é exatamente o defeito que isto conserta. */
    if (!alvo || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        setVisivel(!entrada.isIntersecting && entrada.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <>
      {/* `<aside>`: é conteúdo complementar que acompanha a página toda, não a
          navegação dela. Enquanto `data-visivel` não é "true", o v2.css a mantém
          em `visibility: hidden` — o que a tira da ordem de tabulação E da árvore
          de acessibilidade, em vez de deixar um link invisível mas focalizável no
          meio do caminho do teclado. */}
      <aside className="lp2-regua" data-visivel={visivel} aria-label="Preço e ativação">
        {/* `.lp2-preco` põe "a partir de" no MESMO corpo do número, de propósito:
            existe plano de R$ 197 no catálogo, então a ressalva não pode ser
            miúda — seria o número grande com a condição em letra pequena. */}
        <p className="lp2-preco">
          <span aria-hidden="true">{PRECO_VISUAL}</span>
          <span className="sr-only">{PRECO_FALADO}</span>
        </p>

        {/* EXATAMENTE UM alvo de clique de conversão em toda a régua.
            Rótulo e destino vêm do `icp.ts` (fonte única das 6 LPs), não daqui.

            `size="sm"` = 44px de altura: é o mínimo de alvo de toque no mobile e
            ao mesmo tempo o que mantém o trilho do desktop discreto — um só
            tamanho serve aos dois formatos, sem ramificar por viewport.

            Sem ícone: a seta custaria ~28px de largura, e é justamente isso que
            empurraria o preço para uma terceira linha num aparelho estreito,
            estourando a reserva de 76px que o v2.css calculou para a barra.

            `flexShrink: 0` faz o preço absorver TODO o aperto horizontal. O
            rótulo do botão é `white-space: nowrap` (vem do primitivo), então se
            ele encolhesse o texto vazaria do contêiner em vez de quebrar. */}
        <Button
          href={ICPS.barbeiros.rotas.base}
          variant="primary"
          size="sm"
          style={{ flexShrink: 0 }}
        >
          {ICPS.barbeiros.ctaLabel}
        </Button>
      </aside>
    </>
  );
}
