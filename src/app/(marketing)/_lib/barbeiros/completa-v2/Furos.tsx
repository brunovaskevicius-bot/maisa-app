"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "../../primitives";
import { ICPS } from "../../icp";
import { clientesBarbeiros } from "../../imagens";
import { Maisa } from "../completa/Maisa";
import { FUROS_PADRAO, FUROS_SEMANA, TICKET_PADRAO, TICKETS } from "./dados";

/* ----------------------------------------------------------------------------
 * A conta do furo — o 2º dos 5 blocos da v2.
 *
 * A ideia é AS PESSOAS QUE NÃO VIERAM: de 1 a 4 retratos dividindo SEMPRE a mesma
 * área da tela. Um rosto = um cliente que não sentou na cadeira naquela semana, e
 * cada rosto carrega o preço do corte que ele não fez. Quem escolhe os dois
 * números é o barbeiro, em dois <select> nativos dentro de uma frase corrida.
 *
 * (A versão anterior desenhava `furos × 4` retângulos ocos com a foto de uma
 * cadeira vazia por dentro. A conta é a mesma; o que mudou é quem aparece na
 * imagem — cadeira vazia é objeto, cliente que não veio é gente.)
 *
 * QUATRO DECISÕES QUE NÃO SÃO REDISCUTÍVEIS AQUI:
 *
 * (a) O MOSAICO MOSTRA A SEMANA, NÃO O MÊS. São no máximo 4 rostos porque o
 *     seletor vai até 4 furos POR SEMANA; o ×4 das semanas continua vivendo no
 *     texto ("São 16 cadeiras vazias no mês: 4 por semana, quatro semanas") e no
 *     total. Desenhar 16 rostos seria honesto e ilegível; desenhar 4 e chamar de
 *     mês seria legível e mentira. A legenda diz qual dos dois está na tela.
 *
 * (b) ESTE BLOCO NUNCA SUBTRAI O PREÇO DA MAISA. Não existe "a maisa custa X,
 *     sobram Y". Essa aritmética é de deck de ROI: é alegação de eficácia mais
 *     frágil que o "+38%" inventado que a v2 está matando, e desqualifica o
 *     melhor cliente (1 cadeira · R$ 30 · 1 furo = R$ 120/mês, perto da
 *     mensalidade). O bloco só mostra o buraco; o preço vive em outro bloco. A
 *     justaposição acontece na cabeça de quem lê, e aí ela não é nossa alegação.
 *     O lead diz isso na cara: "a maisa não entra nesta conta."
 *
 * (c) OS ROSTOS SÃO ILUSTRATIVOS, E ISSO ESTÁ ESCRITO. Sem nome, sem depoimento,
 *     sem "atendido ontem". A v1 desta página fabricou seis clientes reciclando
 *     as fotos do herói sob os nomes dos próprios barbeiros, e foi o achado mais
 *     grave da crítica. Aqui o retrato é figura de linguagem — "alguém não veio" —
 *     e a legenda declara isso em texto normal, não em miúdo de rodapé. Por isso
 *     também: alt="" e aria-hidden no mosaico. Ler "Retrato de um homem de barba
 *     curta" quatro vezes não acrescenta nada ao que o texto já afirmou, e
 *     nomear as pessoas pelo alt as aproximaria de "clientes reais".
 *
 * (d) NADA SE MEXE. Todo número que participa de uma linha de texto vive num slot
 *     de largura FIXA (reservada pelo maior valor possível, com tabular-nums), os
 *     dois <select> são dimensionados por um "fantasma" invisível com o rótulo
 *     mais largo do conjunto, e até o "s" de "furos" continua ocupando o lugar
 *     dele quando o número é 1. Além disso os DOIS alvos de toque e o CTA ficam
 *     ACIMA do mosaico — e o mosaico tem tamanho FIXO (aspect-ratio), então nem
 *     quando ele se reorganiza existe algo abaixo para ser empurrado. Em 390px o
 *     dedo já está na tela quando o número muda.
 *
 * Renderiza completo sem uma única interação e sem JS: TICKET_PADRAO/FUROS_PADRAO
 * já contam uma história verdadeira (R$ 50 · 1 furo = 4 cadeiras vazias,
 * R$ 200/mês) e o HTML do servidor já traz o primeiro retrato inteiro e o total —
 * só a troca de valor e a contagem automática deixam de funcionar. O padrão (200)
 * também não tem separador de milhar, então não há divergência de ICU entre
 * servidor e cliente na primeira pintura.
 * -------------------------------------------------------------------------- */

/** As quatro semanas do mês — é o ×4 da conta, e agora só isso (não é mais o
 *  número de colunas de nada). */
const SEMANAS = 4;

/** Teto de retratos. É o mesmo teto de FUROS_SEMANA, e tem que ser: o número
 *  escolhido no select É a quantidade de gente desenhada. */
const MAX_ROSTOS = 4;

/* Ritmo da contagem automática. O primeiro rosto extra espera meio segundo depois
   de a seção entrar (senão a animação começa antes de o olho chegar) e cada passo
   seguinte sai a 720ms — folga suficiente para a entrada de 760ms do rosto
   anterior quase terminar antes de a próxima começar. Total: ~1,9s de 1 até 4. */
const ATRASO_ENTRADA = 460;
const PASSO_CONTAGEM = 720;

/* Quanto do mosaico precisa estar na tela para a contagem começar. 45% e não 100%:
   num celular alto o mosaico ocupa boa parte da viewport e esperar por ele inteiro
   atrasaria o início até depois de o leitor já ter passado. */
const VISIVEL_PARA_CONTAR = 0.45;

/* Tipografia dos dois campos. Compartilhada entre o <select> e o fantasma que o
   dimensiona — se as duas divergirem, a largura reservada mente. */
const CAMPO: React.CSSProperties = {
  fontFamily: "var(--mk-font-body)",
  fontSize: "clamp(1.02rem, 2.2vw, 1.2rem)",
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  fontVariantNumeric: "tabular-nums",
};
/* Respiro do campo. paddingRight abre espaço para o chevron. */
const CAMPO_PAD: React.CSSProperties = { paddingLeft: 14, paddingRight: 34 };

/* Fundo do campo: dourado só como TINTA sobre o painel, não como fundo claro.
   Precisa ser opaco (e não um color-mix com transparent) porque o Chrome usa o
   background do <select> na lista suspensa: com fundo transparente + texto
   dourado a lista virava dourado-sobre-branco. Medido: texto --mk-accent-ink
   sobre este fundo dá >= 7,3:1; --mk-ink sobre ele, >= 10,6:1. */
const CAMPO_BG = "color-mix(in oklch, var(--mk-accent) 14%, var(--mk-panel-2))";

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Rótulo mais largo de cada lista — o fantasma que reserva a largura do campo.
 *  Derivado dos DADOS, então mexer em TICKETS/FUROS_SEMANA não quebra o slot. */
const FANTASMA_TICKET = `R$ ${fmt(Math.max(...TICKETS))}`;
const FANTASMA_FUROS = fmt(Math.max(...FUROS_SEMANA));

/* ─────────────────────── a geometria do mosaico ───────────────────────────
 * Quatro arranjos conhecidos de antemão, e a ÁREA TOTAL é a mesma nos quatro: o
 * que muda é a divisão. Tudo em % de flex-basis, porque todo passo daqui é um
 * número virando outro número — e é isso que faz o rearranjo ser contínuo em vez
 * de um salto de layout. O porquê longo (e a comparação com grid e FLIP) está no
 * v2.css, junto das regras.
 *
 *   1 rosto     2 rostos     3 rostos     4 rostos
 *   ┌───────┐   ┌───┬───┐    ┌───┬───┐    ┌───┬───┐
 *   │   0   │   │ 0 │ 1 │    │   │ 1 │    │ 0 │ 1 │
 *   │       │   │   │   │    │ 0 ├───┤    ├───┼───┤
 *   └───────┘   └───┴───┘    │   │ 2 │    │ 3 │ 2 │
 *                            └───┴───┘    └───┴───┘
 *
 * A ordem 0→1→2→3 é a ordem de CHEGADA: o rosto grande à esquerda, depois o alto
 * à direita, o baixo à direita, e por último a esquerda se parte em dois. Nenhum
 * rosto troca de coluna no caminho, que é a razão de 3→4 não piscar. */
type Quantidade = 1 | 2 | 3 | 4;
type Geometria = {
  /** largura das duas colunas, em % */
  colunas: [number, number];
  /** altura dos rostos da coluna esquerda (ordem 0 e ordem 3), em % */
  esquerda: [number, number];
  /** altura dos rostos da coluna direita (ordem 1 e ordem 2), em % */
  direita: [number, number];
  /** há argamassa entre as colunas? e dentro de cada uma? */
  vaoX: boolean;
  vaoEsq: boolean;
  vaoDir: boolean;
};

const GEOMETRIA: Record<Quantidade, Geometria> = {
  1: { colunas: [100, 0], esquerda: [100, 0], direita: [0, 0], vaoX: false, vaoEsq: false, vaoDir: false },
  2: { colunas: [50, 50], esquerda: [100, 0], direita: [100, 0], vaoX: true, vaoEsq: false, vaoDir: false },
  3: { colunas: [50, 50], esquerda: [100, 0], direita: [50, 50], vaoX: true, vaoEsq: false, vaoDir: true },
  4: { colunas: [50, 50], esquerda: [50, 50], direita: [50, 50], vaoX: true, vaoEsq: true, vaoDir: true },
};

/** Trava o valor na faixa desenhada. O estado só recebe valores de FUROS_SEMANA,
 *  mas a tabela acima é a única fonte de verdade do layout e não pode receber uma
 *  chave que não existe. */
const quantos = (n: number): Quantidade => (n <= 1 ? 1 : n >= MAX_ROSTOS ? 4 : ((n | 0) as Quantidade));

/** A argamassa (o vão) como valor CSS, para o gap poder TRANSICIONAR de 0 até ela.
 *  A espessura em si vive no v2.css, na mesma variável que a moldura usa. */
const vao = (aberto: boolean) => (aberto ? "var(--lp2-argamassa)" : "0px");

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--mk-accent)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Um <select> NATIVO vestido — sem dropdown custom (afordância padrão não se
 *  reinventa). O fantasma invisível (`visibility:hidden` ainda ocupa espaço) é
 *  quem define a largura: trocar de valor NUNCA muda o tamanho do alvo. */
function Campo({
  id,
  valor,
  opcoes,
  fantasma,
  formata,
  onChange,
}: {
  id: string;
  valor: number;
  opcoes: readonly number[];
  fantasma: string;
  formata: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "middle",
        marginInline: 3,
        borderRadius: 8,
        background: CAMPO_BG,
        borderBottom: "2px solid var(--mk-accent)",
      }}
    >
      {/* fantasma: reserva a largura do MAIOR rótulo e garante alvo >= 44px */}
      <span aria-hidden="true" style={{ ...CAMPO, ...CAMPO_PAD, visibility: "hidden", display: "inline-flex", alignItems: "center", minHeight: 46 }}>
        {fantasma}
      </span>
      <select
        id={id}
        className="mk-focus"
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          ...CAMPO,
          ...CAMPO_PAD,
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          appearance: "none",
          WebkitAppearance: "none",
          border: "none",
          borderRadius: 8,
          background: CAMPO_BG,
          color: "var(--mk-accent-ink)",
          cursor: "pointer",
        }}
      >
        {opcoes.map((n) => (
          /* cor E fundo juntos: setar só a cor deixaria texto claro sobre o
             branco padrão do sistema em quem honra um e ignora o outro. */
          <option key={n} value={n} style={{ backgroundColor: "var(--mk-panel-2)", color: "var(--mk-ink)" }}>
            {formata(n)}
          </option>
        ))}
      </select>
      <Chevron />
    </span>
  );
}

/** Slot numérico de largura fixa dentro de uma frase: reserva o pior caso em
 *  `ch` e usa tabular-nums, então a frase nunca reflui ao trocar de valor.
 *  Serve para os números CURTOS (1–2 dígitos), onde a conta em `ch` é confiável. */
function Slot({ ch, children, centro }: { ch: number; children: React.ReactNode; centro?: boolean }) {
  return (
    <span style={{ display: "inline-block", minWidth: `${ch}ch`, fontVariantNumeric: "tabular-nums", textAlign: centro ? "center" : "left" }}>
      {children}
    </span>
  );
}

/** O slot do TOTAL, que o `Slot` acima não dá conta de reservar.
 *
 *  O rótulo do CTA usava `Slot ch={6.4}`, e 6,4 era número chutado: medido, 1ch =
 *  9,68px e "R$ 1.920" (o pior caso real, 120 × 4 × 4) mede 68,3px — precisaria de
 *  7,06ch. O botão então MUDAVA de largura a partir de ~1024px, 6,4px de salto,
 *  contra o que a decisão (d) do arquivo promete em letras maiúsculas ("NADA SE
 *  MEXE") e contra o comentário que fica logo acima do próprio botão.
 *
 *  Aqui a largura vem do GLIFO e não de um número: um fantasma `visibility:hidden`
 *  com o pior total possível define a caixa, e o valor real fica sobreposto. É a
 *  mesma técnica de `Campo` (o fantasma que dimensiona os selects) e de `Plural`
 *  (o "s" invisível), e é a única forma que não apodrece quando alguém mexer em
 *  TICKETS ou em FUROS_SEMANA — o pior caso é derivado deles. */
const PIOR_TOTAL = `R$ ${fmt(Math.max(...TICKETS) * MAX_ROSTOS * SEMANAS)}`;

function SlotTotal({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline-block", fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true" style={{ visibility: "hidden" }}>
        {PIOR_TOTAL}
      </span>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </span>
    </span>
  );
}

/** Plural que não reflui. Com o padrão em 1 furo, "1 furos" apareceria na
 *  primeira pintura de todo mundo; mas trocar "furos" por "furo" mexe na largura
 *  da linha e pode mudar onde o parágrafo quebra. Então o "s" nunca sai da linha:
 *  no singular ele fica invisível, ocupando exatamente o lugar dele. Mesma
 *  técnica do fantasma que dimensiona os campos — a largura vem do glifo real,
 *  não de um número mágico. */
function Plural({ quando }: { quando: boolean }) {
  if (quando) return <>s</>;
  return (
    <span aria-hidden="true" style={{ visibility: "hidden" }}>
      s
    </span>
  );
}

/** Um retrato do mosaico. `ordem` é ao mesmo tempo o índice da foto e a posição
 *  na fila de chegada: o slot está ocupado quando `furos` já passou dele. */
function Rosto({ ordem, visivel, altura, preco }: { ordem: number; visivel: boolean; altura: number; preco: string }) {
  const foto = clientesBarbeiros[ordem % clientesBarbeiros.length];
  return (
    <div className="lp2-furo-slot" data-visivel={visivel ? "true" : "false"} style={{ flexBasis: `${altura}%` }}>
      {/* SEM loading="lazy" de propósito, e é contra-intuitivo: os slots vazios
          têm 0×0px, e uma imagem de 0×0 nunca "entra na viewport" — com lazy, o
          2º rosto só começaria a baixar no instante em que o vão abre, e a
          animação de chegada, que é o ponto desta seção, mostraria uma caixa
          preta. São quatro retratos abaixo da dobra: o custo cabe.

          COM srcset, e é aqui que estava um defeito de qualidade: os quatro IDs
          vinham de `unsplash(id, 480)` e o estado PADRÃO da seção é UM rosto só,
          numa caixa de 548 CSS px — 2,28× de ampliação num celular ou notebook
          retina, no primeiro rosto que a pessoa vê. O `sizes` abaixo descreve o
          maior tamanho que o slot pode ter (o estado de 1 rosto), então o browser
          escolhe 1100w em DPR 2 e 548w em DPR 1; no estado 2×2, onde cada rosto
          cai para 270px, ele reaproveita o arquivo que já baixou.
          `clientesBarbeiros` é consumido só por este arquivo (grep confirma), então
          mexer na largura aqui não toca as outras 5 LPs. */}
      <img
        className="lp2-furo-foto"
        src={foto.url}
        srcSet={`${foto.url} 480w, ${foto.url.replace("w=480", "w=1100")} 1100w`}
        sizes="(min-width: 700px) 548px, 92vw"
        alt=""
        decoding="async"
        draggable={false}
      />
      <span className="lp2-furo-preco">{preco}</span>
    </div>
  );
}

export function Furos() {
  const [ticket, setTicket] = useState<number>(TICKET_PADRAO);
  const [furos, setFuros] = useState<number>(FUROS_PADRAO);
  /** a contagem automática está rolando? só serve para calar o aria-live. */
  const [contando, setContando] = useState(false);

  const idTicket = useId();
  const idFuros = useId();
  const idTitulo = useId();

  /** O barbeiro já pôs a mão nos controles? A partir daí a contagem automática
   *  não fala mais nada — nem começa, nem termina o que começou. É ref e não
   *  state porque só o efeito lê, e marcar isso não deve repintar nada. Vale
   *  para os DOIS campos: mexer no ticket também é mão no controle, e animar um
   *  número debaixo do dedo de quem está escolhendo o outro é grosseria. */
  const tocado = useRef(false);
  const timers = useRef<number[]>([]);
  const mosaicoRef = useRef<HTMLDivElement | null>(null);

  const pararContagem = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setContando(false);
  }, []);

  const escolherTicket = useCallback(
    (n: number) => {
      tocado.current = true;
      pararContagem();
      setTicket(n);
    },
    [pararContagem],
  );
  const escolherFuros = useCallback(
    (n: number) => {
      tocado.current = true;
      pararContagem();
      setFuros(n);
    },
    [pararContagem],
  );

  /* A contagem de 1 até 4 ao rolar. É um evento da PRIMEIRA LEITURA, não um
     comportamento da seção: acontece uma vez e nunca se repete.

     "Uma vez" agora quer dizer uma vez VISTA, e não uma vez disparada — a diferença
     custou um defeito. A versão anterior desconectava o observer no primeiro
     cruzamento e largava a cadeia de timers correndo. A cadeia leva 1,9 s de ponta a
     ponta (460ms para o primeiro rosto + 2 x 720ms + 400ms para soltar o aria-live),
     e ninguém garante 1,9 s de mosaico na tela: num flick de polegar a seção passa em
     menos de 300ms. O que acontecia então era o pior dos dois mundos — a animação
     rodava fora de vista, o observer já estava desconectado, e quem voltasse encontrava
     4 rostos e R$ 800 sem ter visto nada aparecer. A seção existe para MOSTRAR o furo
     crescendo; entregar o resultado final sem o crescimento é entregar um número
     grande, que é exatamente o vício que a v2 foi feita para matar.

     Então: começa quando o mosaico está pelo menos 45% visível, CANCELA e volta ao
     padrão se ele sair inteiro da tela antes de terminar, e só desconecta quando a
     contagem chega ao fim de verdade. O reset é invisível porque só roda com o mosaico
     fora da viewport — e é por isso que o gatilho de cancelamento é `isIntersecting`
     falso (razão 0) e não o cruzamento dos 45%: a 44% de visibilidade o mosaico ainda
     está na cara do leitor, e resetar 3 para 1 ali seria um salto visível.

     O alvo observado é o MOSAICO e não a seção: em telas baixas a seção inteira é
     mais alta que a viewport e um threshold nela poderia nunca ser atingido. O
     mosaico tem altura conhecida (aspect-ratio) e é o que precisa estar sendo
     olhado para a animação valer alguma coisa.

     prefers-reduced-motion desliga a contagem e vai direto ao estado final (4).
     O CSS já resolve o resto sozinho: o bloco global do marketing.css zera
     duração de animação e transição sob .mkt-scope, e todas as animações do
     mosaico terminam no estado de repouso — as fotos simplesmente aparecem
     prontas. Só a contagem precisa de JS, porque ela é conteúdo mudando, não
     movimento. */
  useEffect(() => {
    const alvo = mosaicoRef.current;
    if (!alvo || typeof IntersectionObserver === "undefined") return;

    /* Lido na HORA de disparar, e não na montagem: quem liga "reduzir movimento"
       no meio da sessão (ou usa um modo de foco que liga sozinho) tem a
       preferência respeitada sem precisar recarregar. */
    const semMovimento = () =>
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Local ao efeito, não um ref: só este observer lê e escreve, e a vida do
       sinalizador é exatamente a vida do efeito. */
    let rodando = false;
    const cancelar = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      rodando = false;
    };

    const obs = new IntersectionObserver(
      (entradas) => {
        // a escolha dele vale mais que a nossa animação, e vale para sempre
        if (tocado.current) {
          obs.disconnect();
          return;
        }

        /* Saiu INTEIRO da tela com a contagem no meio: desfaz e continua armado, para
           que a história possa acontecer de novo quando ele realmente estiver olhando. */
        if (entradas.every((e) => !e.isIntersecting)) {
          if (rodando) {
            cancelar();
            setContando(false);
            setFuros(FUROS_PADRAO);
          }
          return;
        }

        if (rodando || !entradas.some((e) => e.intersectionRatio >= VISIVEL_PARA_CONTAR)) return;

        /* MOVIMENTO REDUZIDO: fica no padrão, não salta para 4.
           A versão anterior fazia `setFuros(MAX_ROSTOS)` aqui, e isso errava duas
           vezes. Primeiro porque a contagem É o movimento: com as transições zeradas
           não há nada para mostrar, então o salto é só o número trocando sozinho —
           conteúdo mudando sem pedido, que é o oposto do que a preferência pede.
           Segundo porque o `aria-live` continuava "polite" neste ramo (o setContando
           só é ligado no ramo animado logo abaixo), então quem usa leitor de tela
           ouvia "R$ 800" anunciado do nada — exatamente o anúncio que o outro ramo
           gasta quinze linhas para calar. O padrão de dados.ts (1 furo · R$ 50 =
           R$ 200/mês) já é uma história verdadeira, e os dois selects continuam ali
           para quem quiser contar a própria. */
        if (semMovimento()) return;

        rodando = true;
        setContando(true);
        for (let n = FUROS_PADRAO + 1; n <= MAX_ROSTOS; n += 1) {
          const atraso = ATRASO_ENTRADA + (n - FUROS_PADRAO - 1) * PASSO_CONTAGEM;
          timers.current.push(
            window.setTimeout(() => {
              if (tocado.current) return;
              setFuros(n);
            }, atraso),
          );
        }
        /* Solta o aria-live só DEPOIS que a contagem assentou, e num commit
           separado: assim o leitor de tela não ouve "R$ 400… R$ 600… R$ 800" em
           sequência (quatro anúncios de um número que ninguém pediu para mudar),
           e toda troca manual daí em diante volta a ser anunciada. */
        const fim = ATRASO_ENTRADA + (MAX_ROSTOS - FUROS_PADRAO - 1) * PASSO_CONTAGEM + 400;
        timers.current.push(
          window.setTimeout(() => {
            setContando(false);
            /* AQUI é o "uma vez só": a contagem chegou ao fim com o mosaico na tela,
               então o evento aconteceu e o observer não tem mais função. Desconectar
               antes disso era o defeito. */
            rodando = false;
            obs.disconnect();
          }, fim),
        );
      },
      /* Os dois limiares fazem trabalhos diferentes: 0 é o "saiu inteiro" que cancela,
         VISIVEL_PARA_CONTAR é o "está sendo olhado" que dispara. Sem o 0 na lista, a
         saída completa da viewport nunca geraria callback e o cancelamento seria letra
         morta. */
      { threshold: [0, VISIVEL_PARA_CONTAR] },
    );

    obs.observe(alvo);
    return () => {
      obs.disconnect();
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const vazios = furos * SEMANAS; // furos por semana × 4 semanas
  const total = ticket * vazios;
  const g = GEOMETRIA[quantos(furos)];

  const precoDoCorte = `R$ ${fmt(ticket)}`;

  // `.lp2-r-compacto` e não `--mk-section-y`. O v2.css declara um sistema de ritmo por
  // bloco (compacto/denso/estreito/largo) que existe justamente porque a v1 usava o
  // MESMO --mk-section-y em cinco seções seguidas — "a mesma seção, seis vezes", uma
  // das causas diretas da cara de template. Esta seção estava no token uniforme: o
  // sistema foi construído e duas das cinco seções não chegaram a consumi-lo (esta e a
  // Conta). Compacto é o certo aqui — são um número e dois selects, e alongar seria
  // enfeitar.
  return (
    <section id="a-conta-do-furo" aria-labelledby={idTitulo} className="lp2-r-compacto">
      <div style={{ maxWidth: "var(--mk-maxw)", marginInline: "auto" }}>
        <div
          style={{
            display: "grid",
            /* auto-fit em vez de media query: uma coluna no celular (o mosaico
               embaixo dos controles), duas a partir de ~700px. */
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "clamp(1.75rem, 4vw, 3rem)",
            alignItems: "start",
          }}
        >
          {/* ── coluna 1: a frase, o total e o CTA. TODOS os alvos de toque ── */}
          <div>
            {/* SEM eyebrow em caixa alta: a v1 tinha seis, e era o tell mais
                forte da página. O h2 abre sozinho. */}
            <h2
              id={idTitulo}
              className="mk-balance"
              style={{ fontFamily: "var(--mk-font-display)", fontSize: "clamp(1.85rem, 4.4vw, 3rem)", lineHeight: 1.03, letterSpacing: "-0.03em", margin: 0 }}
            >
              Quanto custa a cadeira vazia.
            </h2>

            <p
              className="mk-pretty"
              style={{ marginTop: "clamp(0.85rem, 2vw, 1.15rem)", maxWidth: "42ch", fontFamily: "var(--mk-font-body)", fontSize: "clamp(1.02rem, 1.5vw, 1.15rem)", lineHeight: 1.6, color: "var(--mk-ink-soft)" }}
            >
              Só dois números são seus. O resto é multiplicação — e a <Maisa /> não entra nesta conta.
            </p>

            {/* A frase corrida com os dois campos. O <label> ENVOLVE o select, e o
                texto visível é o nome acessível ("Minha barbearia cobra … por
                corte") — sem rótulo escondido duplicando a frase. Custo aceito:
                clicar no texto do rótulo abre a lista. */}
            <p
              style={{
                marginTop: "clamp(1.5rem, 3.5vw, 2.25rem)",
                maxWidth: "34ch",
                fontFamily: "var(--mk-font-body)",
                fontSize: "clamp(1.02rem, 2.2vw, 1.2rem)",
                fontWeight: 600,
                lineHeight: 2.15,
                color: "var(--mk-ink)",
              }}
            >
              <label htmlFor={idTicket}>
                Minha barbearia cobra
                <Campo id={idTicket} valor={ticket} opcoes={TICKETS} fantasma={FANTASMA_TICKET} formata={(n) => `R$ ${fmt(n)}`} onChange={escolherTicket} />
                por corte
              </label>{" "}
              <label htmlFor={idFuros}>
                e leva
                <Campo id={idFuros} valor={furos} opcoes={FUROS_SEMANA} fantasma={FANTASMA_FUROS} formata={fmt} onChange={escolherFuros} />
                furo
                <Plural quando={furos > 1} /> por semana.
              </label>
            </p>

            {/* O total. O número mora numa LINHA PRÓPRIA: assim ele pode crescer
                de "R$ 120" a "R$ 1.920" sem nunca mudar onde a frase quebra —
                e sem empurrar o CTA. aria-live avisa quem usa leitor de tela,
                menos durante a contagem automática (ver o efeito acima). */}
            <div aria-live={contando ? "off" : "polite"} style={{ marginTop: "clamp(1.75rem, 4vw, 2.5rem)" }}>
              <strong
                style={{
                  display: "block",
                  fontFamily: "var(--mk-font-display)",
                  fontSize: "clamp(2.4rem, 8vw, 4rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.035em",
                  color: "var(--mk-accent)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                R$ {fmt(total)}
              </strong>
              <p style={{ marginTop: "0.55rem", fontFamily: "var(--mk-font-body)", fontSize: "clamp(1.02rem, 1.6vw, 1.2rem)", fontWeight: 700, lineHeight: 1.4, color: "var(--mk-ink)" }}>
                por mês em cortes que ninguém fez.
              </p>
              <p style={{ marginTop: "0.5rem", fontFamily: "var(--mk-font-body)", fontSize: "0.95rem", lineHeight: 1.55, color: "var(--mk-muted)" }}>
                São <Slot ch={2}>{vazios}</Slot> cadeiras vazias no mês: <Slot ch={1}>{furos}</Slot> por semana, quatro semanas.
              </p>
            </div>

            <div style={{ marginTop: "clamp(1.5rem, 3.5vw, 2rem)" }}>
              {/* A perda vai no RÓTULO, num slot dimensionado pelo PIOR total (ver
                  SlotTotal): o botão não muda de tamanho ao trocar o ticket.
                  whiteSpace:normal desarma o nowrap do Button — em 360px o rótulo
                  quebra em duas linhas em vez de estourar a largura da tela. */}
              <Button href={ICPS.barbeiros.rotas.base} variant="primary" size="lg" icon="arrow" iconRight style={{ whiteSpace: "normal", textAlign: "center", lineHeight: 1.25, paddingBlock: 12 }}>
                Quero fechar esse buraco de{" "}
                <SlotTotal>R$ {fmt(total)}</SlotTotal>
              </Button>
            </div>
          </div>

          {/* ── coluna 2: o mosaico de quem não veio ─────────────────────── */}
          <div>
            <div
              /* aria-hidden de propósito: o equivalente textual já foi dito
                 acima ("4 cadeiras vazias no mês… R$ 800"), e anunciar quatro
                 retratos de banco de imagem só acrescentaria ruído — e a
                 sugestão de que são clientes de verdade, que é justamente o que
                 esta página não faz. Por isso as fotos entram com alt="". */
              aria-hidden="true"
              ref={mosaicoRef}
              className="lp2-furo-moldura"
              style={{ columnGap: vao(g.vaoX) }}
            >
              {/* Coluna esquerda: o rosto que sempre está lá (ordem 0) e o
                  último a chegar (ordem 3), que só existe com 4 furos. */}
              <div className="lp2-furo-coluna" style={{ flexBasis: `${g.colunas[0]}%`, rowGap: vao(g.vaoEsq) }}>
                <Rosto ordem={0} visivel={furos > 0} altura={g.esquerda[0]} preco={precoDoCorte} />
                <Rosto ordem={3} visivel={furos > 3} altura={g.esquerda[1]} preco={precoDoCorte} />
              </div>
              {/* Coluna direita: o 2º e o 3º a chegar. */}
              <div className="lp2-furo-coluna" style={{ flexBasis: `${g.colunas[1]}%`, rowGap: vao(g.vaoDir) }}>
                <Rosto ordem={1} visivel={furos > 1} altura={g.direita[0]} preco={precoDoCorte} />
                <Rosto ordem={2} visivel={furos > 2} altura={g.direita[1]} preco={precoDoCorte} />
              </div>
            </div>

            {/* Legenda sem números: assim ela nunca reflui quando os selects mudam.
                Faz dois trabalhos — dizer que o mosaico é a SEMANA (e não o mês), e
                creditar os rostos como ilustração.

                O SEGUNDO TRABALHO MUDOU DE REGISTRO. A frase era "Os rostos são
                ilustrativos: não são clientes nossos", e essa segunda metade é o
                mesmo defeito que fez a linha "não temos depoimento ainda" sair do
                bloco de Perguntas: declarar uma ausência não é honestidade extra, é
                autodepreciação, e ela custa credibilidade exatamente onde a pessoa
                está decidindo. "Rostos ilustrativos" já é o crédito completo — diz
                que a imagem é figura de linguagem sem anunciar que ninguém usou o
                produto. O que a honestidade exige é NÃO AFIRMAR prova falsa (sem
                nome, sem depoimento, sem "atendido ontem"), e isso continua valendo
                em toda parte. */}
            <p
              className="mk-pretty"
              style={{ marginTop: "clamp(0.85rem, 2vw, 1.1rem)", maxWidth: "44ch", fontFamily: "var(--mk-font-body)", fontSize: "0.95rem", lineHeight: 1.55, color: "var(--mk-muted)" }}
            >
              Cada rosto é um cliente que não sentou na cadeira em uma semana — e o mês tem quatro. Rostos ilustrativos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
