import type { Metadata } from "next";
import { World } from "../../../_lib";
import { ICPS } from "../../../_lib/icp";
import { OFERTA } from "../../../_lib/barbeiros/completa-v2/dados";
import { Cadeira } from "../../../_lib/barbeiros/completa-v2/Cadeira";
import { Furos } from "../../../_lib/barbeiros/completa-v2/Furos";
import { Transcricao } from "../../../_lib/barbeiros/completa-v2/Transcricao";
import { Perguntas } from "../../../_lib/barbeiros/completa-v2/Perguntas";
import { Conta } from "../../../_lib/barbeiros/completa-v2/Conta";
import { Regua } from "../../../_lib/barbeiros/completa-v2/Regua";
import { Maisa } from "../../../_lib/barbeiros/completa/Maisa";
import "../../../_lib/barbeiros/completa-v2/v2.css";

/* ----------------------------------------------------------------------------
 * /barbeiros/completa/v2 — a reforma estrutural da one-pager.
 *
 * Existe LADO A LADO com a v1 de propósito: a v1 fica intacta em
 * /barbeiros/completa para comparação direta. Nada aqui edita nada de lá.
 *
 * POR QUE A REFORMA. A v1 tinha 8 seções porque alguém decidiu que uma one-pager
 * de SaaS tem 8 seções, e depois foi preencher os slots com o que sobrasse do
 * produto. Todo defeito era filho disso: "+38% agenda mais cheia" não tem fonte
 * (um grep por "38%" em todo o src/ acha só a linha que o criou); "Disruptiva /
 * Descontínua / Defensável" existe porque o grid pedia três cards, e "Defensável"
 * vendia lock-in numa oferta que diz SEM FIDELIDADE; a prova social reciclava as
 * fotos do herói e os nomes dos próprios barbeiros como se fossem clientes, sob a
 * afirmação factual "Atendido ontem". Retocar cor e rótulo não podia resolver:
 * enquanto houver oito slots, oito conteúdos serão inventados para caber neles.
 *
 * A TESE. A página para de DESCREVER a MAISA e passa a ser o registro do
 * comportamento dela. O bloco central é a conversa de WhatsApp em tamanho de
 * leitura — o melhor texto do projeto, que na v1 estava preso num mockup de 336px
 * a 13,5px, com 3 de 4 painéis em aria-hidden e opacity:0, ou seja ilegível em
 * qualquer instante.
 *
 * CINCO BLOCOS, não três: um preview de link precisa de mais de uma chance de
 * enganchar, e concentrar tudo num único objeto é ponto único de falha.
 *
 * NÃO TEM NAV. A v1 tinha uma barra com âncoras para as seções; sem seções, não há
 * o que ancorar. E a nav da v1 pedia 489px numa viewport de 390px, com o wordmark
 * cortado fora da tela.
 * -------------------------------------------------------------------------- */

const cfg = ICPS.barbeiros;

export const metadata: Metadata = {
  /* Message-match de anúncio: a manchete da página é a manchete do title. Quando a
     manchete encurtou de 40 para 19 palavras, isto teve de encurtar junto — title que
     promete uma frase e entrega outra é a mesma quebra de promessa de um anúncio que
     leva para a LP errada, só menos visível.
     O title da v1 ("Um cliente sai, outro já chega") não dizia nem a marca nem o
     negócio — quem visse o link colado no WhatsApp não sabia do que se tratava. */
  title: "Tocou o WhatsApp. Você estava cortando. · MAISA para barbearias",
  description:
    "A maisa responde, agenda e confirma sozinha, no WhatsApp que a barbearia já usa. A partir de R$ 97/mês, sem fidelidade.",
  alternates: { canonical: "/barbeiros/completa/v2" },
  openGraph: {
    title: "Tocou o WhatsApp. Você estava cortando.",
    description:
      "A maisa responde, agenda e confirma sozinha, no WhatsApp que a barbearia já usa.",
    url: "/barbeiros/completa/v2",
    type: "website",
  },
};

export default function LpBarbeirosCompletaV2() {
  return (
    <World icp="barbeiros" className="lp-v2">
      {/* A régua fica FORA do <main>: ela acompanha a rolagem inteira e não é
          conteúdo. Trilho fino no topo no desktop, barra do polegar no mobile —
          nos dois casos carregando preço + um CTA. Substitui a StickyMobileCta
          compartilhada, que nesta rota servia "Ver como funciona" apontando para
          FORA da one-pager. */}
      <Regua />

      <main id="conteudo" tabIndex={-1}>
        {/* 1 · A DOBRA — uma foto, a promessa, um botão, o preço. Quem não é o ICP
               sai aqui, e deve sair. */}
        <Cadeira />

        {/* 2 · A CONTA DO FURO — a alavanca de perda, que é a mais forte para quem
               perde dinheiro com cadeira vazia. Nunca subtrai a mensalidade: só
               mostra o buraco, e a justaposição acontece na cabeça de quem lê. */}
        <Furos />

        {/* 3 · O FIO — o funil inteiro num objeto só: mecanismo, prova, quebra de
               objeção e demonstração de limite. O CTA do meio vive no indent onde
               a fala do dono iria, no momento em que a MAISA o chama. */}
        <Transcricao />

        {/* 4 · AS TRÊS PERGUNTAS — as objeções reais que a v1 descartou, o rótulo
               de honestidade do fio, e a ausência de depoimento declarada em vez
               de prova social fabricada. */}
        <Perguntas />

        {/* 5 · A CONTA — a única superfície dourada da página. A garantia ganha o
               maior corpo; o preço fica em tamanho honesto. */}
        <Conta />
      </main>

      {/* Rodapé de três linhas. O da v1 tinha duas colunas e 8 saídas numa página
          de tráfego pago — inclusive para a LP de terapeutas — e suas âncoras
          apontavam para seções que aqui não existem mais. */}
      <footer
        style={{
          background: "var(--mk-footer-bg)",
          color: "var(--mk-footer-ink)",
          padding: "clamp(32px,4vw,48px) var(--mk-gutter)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--mk-maxw)",
            marginInline: "auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            <Maisa />
          </span>
          <p
            style={{
              margin: 0,
              flex: "1 1 22ch",
              minWidth: 0,
              font: "400 0.95rem/1.6 var(--mk-font-body)",
              color: "var(--mk-footer-muted)",
            }}
          >
            Atendimento e agenda no WhatsApp, no automático. {OFERTA.setup}.
          </p>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <a href={cfg.rotas.base} className="mk-footlink mk-focus" style={{ font: "400 0.95rem/1 var(--mk-font-body)" }}>
              Planos
            </a>
            <a href={cfg.rotas.topo} className="mk-footlink mk-focus" style={{ font: "400 0.95rem/1 var(--mk-font-body)" }}>
              MAISA para barbearias
            </a>
            {/* O LINK "Versão anterior desta página" SAIU.
                Ele existia para você comparar v1 e v2 lado a lado — e para isso basta
                digitar /barbeiros/completa na barra de endereço, que é trabalho de
                revisão, não conteúdo da página. O que ele fazia de fato era pior: numa
                LP de tráfego pago, um <a> indexável e followed mandando o leitor (e o
                rastreador) para a v1, que é justamente a versão com a prova social
                fabricada — seis clientes inventados reciclando as fotos do herói sob
                "Atendido ontem". Vazamento de conversão e de autoridade de uma vez, e
                apontando para o conteúdo que esta reforma existe para substituir.
                O rodapé volta às duas saídas que a intenção declarada acima pede. */}
          </span>
        </div>
      </footer>
    </World>
  );
}
