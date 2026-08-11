import React from "react";
import type { Conversa } from "./dados";

/* ----------------------------------------------------------------------------
 * <Zap> — a conversa do WhatsApp desenhada em DOM, dentro do aparelho da <Telas>.
 *
 * ── POR QUE DOM E NÃO IMAGEM ──────────────────────────────────────────────
 * Isto aqui já foi um <img> apontando para `public/telas/*.png`. A troca não é
 * estética: o conteúdo é TEXTO, e texto em imagem é a pior forma de entregar texto.
 * Em DOM ele fica nítido em qualquer densidade de tela, é lido por leitor de tela,
 * é encontrável pelo Ctrl+F, é traduzível, e — o que mais pesa no dia a dia —
 * corrigir uma vírgula é editar o `dados.ts`, não reabrir um editor de imagem e
 * reexportar. O preço é este arquivo mais o bloco de CSS; é barato pelo que compra.
 *
 * ── A ESCALA, QUE É A ÚNICA PARTE NÃO ÓBVIA ───────────────────────────────
 * O celular na página tem largura variável (`--t-cel-l`, que sai de `--t-cel-a`,
 * que é svh). Um WhatsApp desenhado em px fixo ficaria certo numa viewport e errado
 * em todas as outras. Então TUDO aqui é escrito em múltiplos de `--u`, definido no
 * v3.css como "a largura real da tela ÷ 390" — 390 sendo a largura lógica do
 * iPhone que a captura antiga usava. Na prática: `calc(15 * var(--u))` significa
 * "15px na régua do aparelho", e o desenho inteiro encolhe junto com o celular
 * mantendo as proporções exatas.
 *
 * NÃO SE USA `em` PARA ISSO, e a razão é chata mas real: `em` compõe. No momento em
 * que um balão define o próprio `font-size`, o `em` do horário dentro dele passa a
 * medir a partir do balão e não da régua — e o erro só aparece nos elementos
 * aninhados, que é onde ninguém procura. `--u` é absoluto: nunca compõe.
 *
 * NÃO SE USA `transform: scale()` TAMBÉM: ele escalaria as bordas de 1px e o texto
 * junto, o que dá hairline borrada e antialiasing sujo. Com `--u` cada medida é
 * calculada no tamanho final e o navegador rasteriza tudo uma vez só.
 *
 * ── QUEM FALA DE QUE LADO ─────────────────────────────────────────────────
 * O aparelho desenhado é o do CLIENTE, não o do barbeiro. Por isso as mensagens
 * DELE saem verdes, à direita, com o tique duplo — e as da maisa saem cinzas, à
 * esquerda. Inverter isso desenharia um WhatsApp que não existe, e qualquer pessoa
 * que já usou o app veria o erro em meio segundo, mesmo sem saber nomear.
 *
 * ── ACESSIBILIDADE ────────────────────────────────────────────────────────
 * "Cinza é a maisa, verde é o cliente" é informação PURAMENTE VISUAL: um leitor de
 * tela ouviria seis frases seguidas sem saber quem disse o quê. Por isso cada balão
 * carrega o nome de quem fala num <b> escondido do olho e visível para a AT, e o
 * fio inteiro é um <ol> — conversa é sequência, e a ordem é o sentido.
 *
 * Toda a moldura do sistema (barra de status, ícones do topo, caixa de digitar) é
 * `aria-hidden`: é cenário. Nada ali é conteúdo, e narrar "ícone de câmera" no meio
 * de uma conversa só atrapalha quem está ouvindo.
 * -------------------------------------------------------------------------- */

/** A marca no lugar da foto de perfil. Círculo navy com o "m" dourado — o wordmark
 *  inteiro ("maisa") viraria um borrão num avatar de 40px, então sobra a inicial,
 *  que é o que o próprio app já usa na topbar. As cores são as do `public/icon.svg`
 *  escritas à mão de propósito: são a MARCA, não a paleta da página, e não devem
 *  seguir `--mk-*` no dia em que a LP trocar de tema. */
function Avatar() {
  return (
    <span className="lp3-z-avatar" aria-hidden="true">
      m
    </span>
  );
}

/** O tique duplo. Só aparece nas mensagens do cliente: são as que o aparelho dele
 *  enviou, e portanto as únicas que teriam recibo de entrega. */
function Tique() {
  return (
    <svg className="lp3-z-tique" viewBox="0 0 16 11" fill="none" aria-hidden="true" focusable="false">
      <path d="M1 5.8 3.7 8.5 9.2 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 5.8 9.1 8.5 14.6 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* O papel de parede. NÃO é o doodle do WhatsApp: aquele é asset deles, e copiá-lo
   num material de venda é problema que não vale o ganho. Estes seis glifos são da
   casa — tesoura, relógio, calendário, balão, navalha, estrela — e por acaso dizem
   do que a página trata, o que o doodle genérico não fazia. Ficam a 4% de tinta:
   presença de textura sem virar segundo assunto atrás do texto. */
function Papel() {
  return (
    /* O `viewBox` casa com a régua lógica do fio (390 de largura pelos 682 que sobram
       entre o topo e a caixa de digitar), então uma unidade do padrão vale 1px de
       aparelho e o doodle encolhe junto com o celular. Sem ele, o padrão sairia
       sempre com 88px DE TELA e ficaria proporcionalmente enorme no celular pequeno.
       `slice` é a rede de segurança para o dia em que alguém mexer nas alturas: o
       padrão continua na escala da largura em vez de espremer. */
    <svg
      className="lp3-z-papel"
      viewBox="0 0 390 682"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="lp3-z-doodle" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* relógio */}
            <circle cx="16" cy="16" r="8" />
            <path d="M16 11.5V16l3 2" />
            {/* calendário */}
            <rect x="52" y="9" width="16" height="15" rx="2.5" />
            <path d="M56 6.5v5M64 6.5v5M52 15h16" />
            {/* balão */}
            <path d="M8 48h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-8l-4 4v-4H8a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z" />
            {/* tesoura */}
            <path d="M54 46l12 14M66 46 54 60" />
            <circle cx="52.5" cy="62" r="3" />
            <circle cx="67.5" cy="62" r="3" />
            {/* estrela */}
            <path d="M30 74l2.2 4.5 5 .7-3.6 3.5.85 5-4.45-2.35L25.55 87.7l.85-5-3.6-3.5 5-.7Z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lp3-z-doodle)" />
    </svg>
  );
}

export function Zap({ conversa, rotulo }: { conversa: Conversa; rotulo: string }) {
  return (
    <div className="lp3-z">
      {/* ── A BARRA DE STATUS ──
          O relógio vem do `dados.ts` e vale o horário da ÚLTIMA mensagem. Um
          aparelho marcando 9h13 embaixo de uma conversa que termina 10h33 é o tipo
          de furo que ninguém sabe nomear mas todo mundo sente como "montado". */}
      <div className="lp3-z-status" aria-hidden="true">
        <span className="lp3-z-relogio">{conversa.relogio}</span>
        <span className="lp3-z-sinais">
          <svg viewBox="0 0 18 12" fill="currentColor" focusable="false">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="9" y="3" width="3" height="9" rx="1" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.45" />
          </svg>
          <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" focusable="false">
            <path d="M1 4.2a11 11 0 0 1 14 0" />
            <path d="M3.6 7a7.2 7.2 0 0 1 8.8 0" />
            <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
          </svg>
          <svg viewBox="0 0 24 12" fill="none" focusable="false">
            <rect x="0.75" y="0.75" width="20" height="10.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2.75" y="2.75" width="13" height="6.5" rx="1.5" fill="currentColor" />
            <path d="M22.5 4.2v3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      {/* ── O TOPO DA CONVERSA ──
          O nome é "maisa" em caixa baixa, que é como a marca se escreve em todo o
          projeto. Sem badge de número não lido: a referência tinha 13, mas ali era
          o WhatsApp de uma pessoa real com 13 conversas em aberto — aqui um 13 no
          canto só levantaria a pergunta "13 do quê?" no meio de uma peça de venda. */}
      <div className="lp3-z-topo">
        <svg className="lp3-z-volta" viewBox="0 0 12 20" fill="none" aria-hidden="true" focusable="false">
          <path d="M10 2 2 10l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Avatar />
        <span className="lp3-z-quem-topo">
          <b>maisa</b>
          <i>online</i>
        </span>
        <span className="lp3-z-acoes" aria-hidden="true">
          <svg viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" focusable="false">
            <rect x="0.85" y="0.85" width="14" height="12.3" rx="3" />
            <path d="M15.85 5.2 21.15 2v10l-5.3-3.2Z" />
          </svg>
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" focusable="false">
            <path d="M5.4 1.6 7.6 5 5.5 7.2a11 11 0 0 0 5.3 5.3L13 10.4l3.4 2.2v3.2a1.2 1.2 0 0 1-1.35 1.2C7.4 16.2 1.8 10.6 1.05 3.05A1.2 1.2 0 0 1 2.25 1.7Z" />
          </svg>
        </span>
      </div>

      {/* ── O FIO ──
          `justify-content: flex-end` no CSS empurra os balões para BAIXO, que é como
          o WhatsApp de verdade se comporta: a conversa cresce do rodapé para cima e
          o espaço sobrando fica no topo. De quebra isso resolve o overflow de graça
          — um fio com mais balões do que cabe é cortado em cima, exatamente como uma
          conversa rolada até o fim. Nada de barra de rolagem, nada de scroll. */}
      <ol className="lp3-z-fio" aria-label={`Conversa de exemplo no WhatsApp — ${rotulo}`}>
        <Papel />
        <li className="lp3-z-dia" aria-hidden="true">
          <span>{conversa.dia}</span>
        </li>
        {conversa.baloes.map((balao, i) => (
          <li className="lp3-z-b" data-de={balao.de} key={i}>
            <b className="lp3-z-nome">{balao.de === "ela" ? "maisa:" : "cliente:"}</b>
            <span className="lp3-z-txt">{balao.txt}</span>
            <span className="lp3-z-meta" aria-hidden="true">
              <span className="lp3-z-hora">{balao.hora}</span>
              {balao.de === "ele" && <Tique />}
            </span>
          </li>
        ))}
      </ol>

      {/* ── A CAIXA DE DIGITAR ──
          Vazia, e de propósito: com texto dentro ela viraria uma sétima fala na
          conversa, e a última palavra da peça tem de ser a da maisa. */}
      <div className="lp3-z-caixa" aria-hidden="true">
        <svg className="lp3-z-mais" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" focusable="false">
          <path d="M9 2v14M2 9h14" />
        </svg>
        <span className="lp3-z-campo">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false">
            <path d="M14.5 8A6.5 6.5 0 1 1 8 1.5c3.6 0 6.5 2.9 6.5 6.5Z" />
            <path d="M8.6 14.4c0-3.2 2.6-5.8 5.8-5.8" />
          </svg>
        </span>
        <svg className="lp3-z-cam" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" focusable="false">
          <path d="M1 5a2 2 0 0 1 2-2h1.8l1.2-2h6l1.2 2H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2Z" />
          <circle cx="10" cy="9" r="3.4" />
        </svg>
        <svg className="lp3-z-mic" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" focusable="false">
          <rect x="4.2" y="1" width="5.6" height="10" rx="2.8" />
          <path d="M1.2 8.4a5.8 5.8 0 0 0 11.6 0M7 14.2V17" />
        </svg>
      </div>
    </div>
  );
}
