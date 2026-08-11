import type { Metadata } from "next";
import { World } from "../../_lib";
import { Dobra } from "../../_lib/barbeiros/v3/Dobra";
import { Telas } from "../../_lib/barbeiros/v3/Telas";
import { Duelo } from "../../_lib/barbeiros/v3/Duelo";
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
 * ESCOPO DE AGORA: DOBRA + TELAS + DUELO. Em 06/08/2026 o ato 2 e o fecho saíram da página a
 * pedido — ela ia ser repensada inteira, e manter dois atos que já se sabia que iam
 * sair só faria a próxima decisão herdar restrições mortas. Os arquivos não se
 * perderam: estão em `.claude/snapshots/v3-antes-do-recomeco-2026-08-06/`, e o
 * snapshot existe porque a pasta v3 é untracked — o git não os protegia.
 *
 * Em 07/08/2026 entrou a <Telas>, que ocupa o lugar do ato 2 — e COM ela voltou a
 * TRAVESSIA, que era o que a remoção tinha arrastado junto: os últimos 16svh do
 * palco pinado passam POR CIMA do topo da seção seguinte (`margin-top: -16svh` no
 * v3.css) e a barra de rostos pousa dentro dela enquanto ela entra. As quatro
 * metades do gesto estão agora todas no lugar — o `z-index: 2` da pista, a ausência
 * de `background` nela, a margem negativa, e o `margin-top: 0` sem movimento.
 *
 * NÃO TEM NAV, e não é esquecimento: uma one-pager não navega para nada. A da v1
 * pedia 489px numa viewport de 390px, com o wordmark cortado fora da tela.
 *
 * Em 07/08/2026 entrou a <Duelo>, a terceira seção: o custo de contratar alguém
 * contra o custo da assinatura, no molde da seção "Humano vs. Inteligência
 * Artificial" da LP em produção. Ela reimagina a referência em quatro pontos, todos
 * escritos no Duelo.tsx — os cartões se separam, os dois ícones saem, o risco vira
 * fundo da seção e o destaque do card da maisa é luz em vez de tarja (a tarja é
 * justamente o recurso que o cliente reprovou nesta página em 06/08).
 *
 * ⚠️ O PREÇO ENTROU NA PÁGINA, E ISSO REVOGA METADE DA LACUNA DESCRITA ABAIXO.
 * Este bloco dizia "sem fechamento e sem preço", e a nota seguinte dizia que
 * preencher isso era decisão de quem escreve a oferta. A decisão foi tomada em
 * 07/08/2026: os R$ 97 aparecem no <Duelo>, porque um comparativo de custo sem
 * cifra dos dois lados não compara nada.
 *
 * ⚠️ O QUE CONTINUA FALTANDO É O CTA FINAL, e continua sendo lacuna de propósito:
 * a página termina no comparativo, e o único botão segue sendo o do oco da dobra. O
 * <Duelo> mostra o preço mas NÃO repete o botão — foi decidido assim para o fecho
 * ser escrito como fecho, e não herdado de uma seção que existe para comparar. A
 * regra desta LP continua valendo: perguntar antes de encher espaço vazio.
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
        <Telas />
        <Duelo />
      </main>
    </World>
  );
}
