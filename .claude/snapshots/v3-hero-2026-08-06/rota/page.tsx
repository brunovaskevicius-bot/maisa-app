import type { Metadata } from "next";
import { World } from "../../_lib";
import { Ato2 } from "../../_lib/barbeiros/v3/Ato2";
import { Dobra } from "../../_lib/barbeiros/v3/Dobra";
import { OFERTA } from "../../_lib/barbeiros/v3/dados";
import "../../_lib/barbeiros/v3/v3.css";

/* ----------------------------------------------------------------------------
 * /barbeiros/v3 — recomeço da LP de barbeiros.
 *
 * POR QUE UMA v3 EM VEZ DE UM CONSERTO DA v2. A v2 já era uma reforma (ela
 * desfez os 8 slots inventados da v1) e ainda assim a dobra não funcionou: o
 * herói empilhava manchete + subtítulo + botão + preço e depois espremia a
 * imagem numa faixa, o que só podia dar imagem espremida. Consertar aquilo
 * significaria mexer no arranjo, no conteúdo e na peça ao mesmo tempo — que é
 * escrever uma versão nova com o custo de fingir que não é. A v2 fica no disco,
 * intacta, em /barbeiros/completa/v2, e esta não importa nada de lá.
 *
 * ESCOPO DE AGORA: a dobra e o ato 2. A ordem é a certa e é o oposto do que a v1
 * fez (8 caixas primeiro, conteúdo depois): cada seção entra sabendo o que a
 * anterior já disse. A dobra afirma "você não quer perder eles"; o ato 2 é o que
 * acontece quando um deles escreve. As seguintes, quando existirem, entram pela
 * mesma regra.
 *
 * A DOBRA E O ATO 2 SÃO UMA PEÇA SÓ, não duas empilhadas: os últimos 16svh do
 * palco pinado atravessam por cima do topo do ato 2 (`margin-top: -16svh` no
 * v3.css), então a barra de rostos passa sobre a cabeça da figura enquanto ela
 * entra. Mexer na altura da pista sem olhar essa margem quebra a emenda.
 *
 * NÃO TEM NAV, e não é esquecimento: uma one-pager não navega para nada, e no
 * momento não há nem seção para ancorar. A da v1 pedia 489px numa viewport de
 * 390px, com o wordmark cortado fora da tela.
 *
 * A rota já está liberada: o middleware libera por prefixo `/barbeiros`.
 * -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  /* Message-match: quem clica num anúncio precisa reencontrar na página a frase
     que o trouxe. O title da v1 ("Um cliente sai, outro já chega") não dizia nem
     a marca nem o negócio — colado no WhatsApp, ninguém sabia do que se tratava. */
  title: "Todos esses foram marcados com a maisa · MAISA para barbearias",
  description: `A maisa responde, agenda e confirma sozinha, no WhatsApp que a barbearia já usa. A partir de ${OFERTA.precoDe}${OFERTA.precoPor}, ${OFERTA.fidelidade}.`,
  alternates: { canonical: "/barbeiros/v3" },
  openGraph: {
    title: "Todos esses foram marcados com a maisa.",
    description: "A maisa responde, agenda e confirma sozinha, no WhatsApp que a barbearia já usa.",
    url: "/barbeiros/v3",
    type: "website",
  },
};

export default function LpBarbeirosV3() {
  return (
    <World icp="barbeiros" className="lp-v3">
      <main id="conteudo" tabIndex={-1}>
        <Dobra />
        <Ato2 />
      </main>
    </World>
  );
}
