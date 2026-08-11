import * as React from "react";
import { HREF_PLANOS } from "./dados";

/* ----------------------------------------------------------------------------
 * A CHAMADA — o botão que fecha cada seção e desce para os planos.
 *
 * POR QUE ELE EXISTE. Até 10/08/2026 a página tinha UM alvo clicável fora da
 * <Planos>: o vidro da dobra. Quem passasse dele lia as telas, lia o duelo e
 * chegava ao preço sem nunca ter tido o que clicar — três seções mudas no meio do
 * funil, que é exatamente onde a pessoa esquenta. Agora toda seção termina em um
 * pedido, e os quatro apontam para o mesmo lugar (ver `HREF_PLANOS` no dados.ts).
 *
 * ── A REFERÊNCIA, E AS QUATRO DIVERGÊNCIAS ────────────────────────────────
 * O desenho veio de um botão de registry (o "FlowButton"): pílula vazada que, no
 * hover, vira retângulo arredondado enquanto um círculo escuro cresce do centro e
 * preenche tudo, com uma seta entrando pela esquerda e outra saindo pela direita.
 * A MARCAÇÃO dele foi mantida — seta, texto, bolha, seta —, porque é dela que o
 * CSS depende. O que mudou, e por quê:
 *
 * 1. SEM TAILWIND E SEM `lucide-react`. Não existe nenhum dos dois neste repo (o
 *    mesmo motivo já está escrito no cabeçalho do GlassButton.tsx). As utilidades
 *    viraram regras em `v3.css`, e o ícone virou um <svg> inline com o traçado do
 *    `arrow-right` do lucide — uma dependência a menos por dois <path>.
 *
 * 2. A BORDA É AZUL CHEIA, NÃO CINZA A 40%. A origem usa `#333333` com alpha .4, e
 *    a regra desta casa é "branco/azul/amarelo puros, zero opacidade reduzida"
 *    (CLAUDE.md do projeto). Não é violação silenciosa, é a exceção escrita com
 *    limite: o aro é `--mk-brand` cheio e a tinta é `--mk-accent-ink` cheia, que é
 *    o MESMO par do `.lp3-p-cta`. O botão dos planos já fazia vazado→cheio no
 *    hover; este é esse gesto com movimento, e não um segundo vocabulário.
 *
 * 3. A BOLHA É PROPORCIONAL AO BOTÃO, e isto era um bug esperando rótulo em
 *    português. A origem cresce o círculo para 220px FIXOS, o que cobre "Modern
 *    Button" e não cobre "Quero isso no meu WhatsApp" (~300px com estes respiros):
 *    o hover terminaria com as pontas ainda vazadas. Aqui ela é um quadrado de
 *    120% da largura com `aspect-ratio: 1`, e 120% cobre a diagonal de qualquer
 *    caixa cuja altura não passe de 2/3 da largura — que é todo botão de texto.
 *    A conta está no v3.css, junto da regra.
 *
 * 4. ELE CRESCE POR `transform`, NÃO POR `width`/`height`. Animar as duas medidas
 *    faz o navegador refazer layout a cada quadro; `scale` fica na composição. É a
 *    mesma escolha que a <Orbita> faz ao lado, e numa seção que já tem canvas de
 *    partículas rodando não custa nada ser barato.
 *
 * ── É UM <a>, E É SERVIDOR. Ele NAVEGA: um <button> que navega perde o menu de
 * contexto, o abrir-em-nova-aba e o anúncio de "link" do leitor de tela. E como o
 * hover inteiro é CSS, não há "use client" — a página continua saindo pronta do
 * servidor, como as quatro seções dela. Sem JavaScript o botão funciona igual;
 * perde só a suavidade da rolagem, que é enfeite.
 * -------------------------------------------------------------------------- */

/** O `arrow-right` do lucide, inline. `currentColor` no traço é o que faz as duas
 *  setas acompanharem a virada de cor do texto sem uma segunda transição. */
function Seta({ classe }: { classe: string }) {
  return (
    <svg
      className={classe}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function Chamada({
  children,
  className,
}: {
  children: React.ReactNode;
  /** Só para o respiro de quem chama — a caixa do botão não muda de seção
   *  para seção, de propósito: é o mesmo pedido três vezes. */
  className?: string;
}) {
  return (
    <a
      className={["lp3-ch", className].filter(Boolean).join(" ")}
      href={HREF_PLANOS}
    >
      {/* A que ENTRA pela esquerda no hover. Fora da caixa no repouso. */}
      <Seta classe="lp3-ch-seta lp3-ch-seta--entra" />

      <span className="lp3-ch-txt">{children}</span>

      {/* A BOLHA vem depois do texto no documento e ANTES dele na pintura (z-index
          0 contra 1). Ela é `aria-hidden` e não tem texto: para o leitor de tela
          este link é só o rótulo. */}
      <span className="lp3-ch-bolha" aria-hidden="true" />

      {/* A que SAI pela direita. É a única visível no repouso — o botão parado
          parece um link comum, e o resto da coreografia é recompensa de hover. */}
      <Seta classe="lp3-ch-seta lp3-ch-seta--sai" />
    </a>
  );
}
