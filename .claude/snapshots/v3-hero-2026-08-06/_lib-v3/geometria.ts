/* ----------------------------------------------------------------------------
 * A GEOMETRIA DA RODA — fonte única, compartilhada pelo servidor e pelo cliente.
 *
 * POR QUE ESTE ARQUIVO EXISTE. Antes, `RAZAO_ANEL` e `LARGURA_CARTAO` viviam no
 * Roda.tsx com um comentário "ESPELHA o v3.css", e os mesmos números viviam no
 * v3.css com um comentário "ESPELHA o Roda.tsx". Dois donos, nenhuma verdade.
 * Agora o dono é este módulo: o servidor monta a marcação a partir dele e o
 * cliente calcula o movimento a partir dele. O v3.css só precisa saber de UM
 * número — `--o-r0`, o raio —, e o resto ele deriva por multiplicação.
 *
 * MÓDULO PURO, DE PROPÓSITO: sem "use client", sem tocar em `window` no escopo
 * do módulo. `medir()` recebe largura e altura em vez de lê-las, justamente para
 * poder rodar nos dois lados sem um `typeof window` espalhado.
 * -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;

/** Razão entre o raio do anel de fora e o de dentro. */
export const RAZAO_ANEL = 1.46;

/** Largura do cartão como fração de `--o-r0`. Proporção 4:5 com a altura, que é
 *  a do recorte `facearea` servido pelo Unsplash. */
export const LARGURA_CARTAO = 0.3;
export const ALTURA_CARTAO = 0.375;

/** Quanto de cada cartão fica à vista, em frações da própria largura. 1 = os
 *  cartões se tocam sem sobrepor. 0,80 telha o bastante para o olho ler "muita
 *  gente enfileirada" e ainda deixa cada rosto quase inteiro. */
const VISIVEL = 0.8;

/** Segundos por volta do anel de dentro. Lento de propósito: a ~247px de raio dá
 *  ~35px/s, um deslize que se percebe sem disputar a leitura da frase parada no
 *  meio. O anel de fora gira em RAZAO_ANEL vezes esse tempo, o que dá aos dois a
 *  mesma velocidade LINEAR na roda — e, quando a roda vira barra, deixa a fileira
 *  de trás 1,46× mais lenta que a da frente. O parallax da barra sai de graça
 *  dessa escolha; não há número novo para ele. */
export const VOLTA_S = 44;

/** Inclinação máxima de um cartão, em graus. */
const TILT_MAX = 4;

/** Quantos cartões em cada anel. A conta cai direto de VISIVEL:
 *      n = circunferência / passo = 2πr / (VISIVEL · largura)
 *  e como largura = LARGURA_CARTAO · r0 e r = {r0, RAZAO_ANEL·r0}, o raio se
 *  CANCELA — o número de cartões não depende do tamanho da roda, só da densidade.
 *  É por isso que a mesma marcação serve de 320px a 1920px sem recontar nada. */
export const N_ANEL = [
  Math.round(TAU / (VISIVEL * LARGURA_CARTAO)),
  Math.round((TAU * RAZAO_ANEL) / (VISIVEL * LARGURA_CARTAO)),
] as const;

/** Até onde a roda chega, em px, medindo da borda de fora do cartão mais externo.
 *
 *  É `R1 + meia-diagonal do cartão`, e a meia-DIAGONAL (não a meia-largura) é o
 *  que torna a conta imune ao `--t`: a circunferência circunscrita a um retângulo
 *  não muda quando ele roda, então o número vale em qualquer inclinação.
 *
 *  Sai em 1,700·r0 com as razões de hoje. O v3.css cita esse 1,700 na dedução do
 *  `--o-r0`, mas em prosa, dentro de um comentário; quem precisa DO NÚMERO em
 *  tempo de execução é a trilha, que usa esta extensão como raio mínimo para não
 *  cruzar a coroa. Uma terceira escrita à mão do mesmo 1,700 era exatamente a
 *  divergência silenciosa que este módulo existe para não ter. */
export function extensaoExterna(r0: number): number {
  return r0 * (RAZAO_ANEL + Math.hypot(LARGURA_CARTAO, ALTURA_CARTAO) / 2);
}

/* ─────────────────────────── os cartões ─────────────────────────── */

export type Cartao = {
  /** ângulo na circunferência, em RADIANOS, medido a partir das 6h no sentido
   *  horário. A escolha das 6h não é estética: é o ponto onde o anel encosta na
   *  reta quando desenrola (ver `posicao`), então é o único ângulo em que as duas
   *  formas coincidem exatamente. */
  a: number;
  /** 0 = anel de dentro, 1 = anel de fora */
  anel: 0 | 1;
  /** inclinação do cartão, em graus */
  tilt: number;
  /** índice do retrato em `rostosOrbita` */
  rosto: number;
};

/** PRNG com semente fixa (mulberry32). Determinístico DE PROPÓSITO: servidor e
 *  navegador precisam desenhar a mesma roda, e `Math.random()` daria divergência
 *  de hidratação. */
function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b);
}

/** Passo de distribuição dos retratos pela coroa.
 *
 *  Repartir com `i % total` põe a MESMA pessoa a cada `total` posições — e com os
 *  cartões telhados isso se enxerga. Um passo COPRIMO com `total` percorre a lista
 *  inteira antes de repetir e joga vizinhos para pontos distantes dela. A varredura
 *  existe porque o número de fotos muda quando alguém acrescenta uma, e um passo
 *  fixo (5, 7…) deixa de ser coprimo EM SILÊNCIO no dia em que o total vira
 *  múltiplo dele.
 *
 *  Medido com as 32 fotos de hoje (passo 13): o anel de dentro usa 26 cartões e 26
 *  rostos distintos — ninguém repete —, o de fora repete no máximo 2 vezes, e não
 *  existe um único par de vizinhos iguais. */
export function passoDe(total: number): number {
  for (let p = Math.max(2, Math.round(total * 0.42)); p < total; p++) {
    if (mdc(p, total) === 1) return p;
  }
  return 1;
}

export function montarCartoes(totalRostos: number): Cartao[] {
  const rnd = aleatorio(0x9e3779b1);
  const passo = passoDe(totalRostos);
  const out: Cartao[] = [];

  ([0, 1] as const).forEach((anel) => {
    const n = N_ANEL[anel];
    for (let i = 0; i < n; i++) {
      out.push({
        /* o deslocamento de 11° no anel de fora impede que os dois anéis nasçam
           alinhados, o que desenharia raios visíveis saindo do centro */
        a: (i / n) * TAU + anel * (11 * (Math.PI / 180)),
        anel,
        tilt: (rnd() * 2 - 1) * TILT_MAX,
        rosto: (i * passo + anel * 3) % totalRostos,
      });
    }
  });
  return out;
}

/** O ângulo, em GRAUS no referencial do CSS (`rotate(a) translateX(r)`, que põe
 *  0° às 3h), correspondente ao `a` em radianos-a-partir-das-6h.
 *
 *  Serve só ao fallback SEM JAVASCRIPT: a marcação do servidor sai com a roda já
 *  montada por CSS puro, e é este ângulo que o `transform` estático usa. Com JS
 *  ligado o cliente reescreve tudo e este valor deixa de ser lido.
 *  Dedução: a posição em (R·sen θ, R·cos θ) e a do CSS em (R·cos A, R·sen A)
 *  coincidem quando A = 90° − θ. */
export function grausCss(a: number): number {
  return 90 - (a * 180) / Math.PI;
}

/* ─────────────────────────── as medidas da tela ─────────────────────────── */

export type Medidas = {
  r0: number;
  /** raio de cada anel */
  R: readonly [number, number];
  larg: number;
  alt: number;
  /** comprimento da reta quando a roda desenrola por completo */
  L: number;
  /** fator de esticamento do arco por anel, para as duas fileiras terem o mesmo L */
  esticar: readonly [number, number];
  /** onde o centro de cada fileira pousa, em px a partir do centro da roda */
  yBarra: readonly [number, number];
};

/** Traduz o raio e o tamanho do palco na geometria inteira.
 *
 *  `r0` NÃO É CALCULADO AQUI — ele é LIDO do CSS pelo <Morph>, via
 *  `getComputedStyle(...).getPropertyValue("--o-r0")`. É por isso que o v3.css
 *  registra `--o-r0` como `<length>`: uma custom property não registrada devolve
 *  o token literal (`"clamp(180px, min(24vw, 27.5svh), 300px)"`), enquanto uma
 *  registrada devolve o valor já resolvido em px.
 *
 *  O ganho é apagar a duplicação: o `clamp` do raio, com o piso, o teto, a troca
 *  no celular e o `svh`, existe UMA vez, no CSS — que é onde ele precisa existir
 *  de qualquer jeito, porque é ele que desenha a roda quando o JavaScript não
 *  roda. Aqui só se deriva o resto dele. */
export function medir(r0: number, w: number, h: number): Medidas {
  const R = [r0, r0 * RAZAO_ANEL] as const;
  const larg = r0 * LARGURA_CARTAO;
  const alt = r0 * ALTURA_CARTAO;

  /* A RETA PRECISA SER MAIS LARGA QUE A TELA. A costura do carrossel fica nas
     duas pontas; se L <= largura da viewport, ela entra em quadro e o embrulho
     vira um buraco visível. O piso de 2π·R1 é o comprimento natural do anel de
     fora — abaixo dele a fileira de trás ficaria comprimida a ponto de virar
     textura em vez de rostos. */
  const L = Math.max(TAU * R[1], w * 1.14);
  const esticar = [L / (TAU * R[0]), L / (TAU * R[1])] as const;

  /* A fileira da frente encosta o pé no rodapé do palco: é ali que fica a costura
     com o ato 2. A de trás sobe 0,42 de uma altura de cartão e espia por cima —
     é o que dá profundidade à barra sem precisar de dois tamanhos de cartão. */
  const base = h / 2 - alt / 2;
  const yBarra = [base, base - alt * 0.42] as const;

  return { r0, R, larg, alt, L, esticar, yBarra };
}

/* ─────────────────────────── o movimento ─────────────────────────── */

/** Quantos pixels de abertura da costura são tolerados antes do cartão que a
 *  cruza sumir. Ver `posicao`. */
const LIMIAR_COSTURA = 8;

/** Quão longe da costura (em radianos) o apagamento começa. */
const JANELA_COSTURA = 16 * (Math.PI / 180);

/** O portão da costura, por anel — 0 = anel intacto, 1 = apagamento no máximo.
 *
 *  UM ANEL QUE VIRA RETA PRECISA ABRIR EM ALGUM PONTO, e quem cruzar a abertura
 *  teleporta de uma ponta à outra. O portão não está atrelado ao progresso e sim
 *  à ABERTURA REAL em pixels, que é a coisa que causa o salto — e que cresce 2,7×
 *  mais rápido no anel de fora, porque o raio é maior e o esticamento menor.
 *
 *  Medido no protótipo, varrendo p de 0 a 1 quadro a quadro: com o portão atrelado
 *  a p, o pior caso era um salto de 47px a 68% de opacidade em p≈0,05 — visível.
 *  Com o portão atrelado à abertura, o pior caso vira 4,8px a 47%, e todo salto
 *  grande acontece com opacidade <= 0,005. */
export function portaoCostura(p: number, m: Medidas): [number, number] {
  const g = ([0, 1] as const).map((anel) => {
    const R = m.R[anel];
    const k = (1 - p) / R;
    const s = R * Math.PI * (1 + p * (m.esticar[anel] - 1));
    const abre = 2 * Math.abs(k < 1e-7 ? s : Math.sin(k * s) / k);
    return Math.min(1, abre / LIMIAR_COSTURA);
  });
  return [g[0], g[1]];
}

/** `opacidade` aqui é SÓ O PORTÃO DA COSTURA (0..1), e não a opacidade final.
 *
 *  O recuo do anel de fora (62%) continua morando no GRUPO, no v3.css, e tem de
 *  continuar lá: como os cartões se sobrepõem ~20%, uma opacidade por cartão faz
 *  cada um deixar ver o de baixo através de si e a coroa externa vira um borrão
 *  translúcido. Multiplicar os dois aqui daria 0,62² = 0,38 e traria o defeito de
 *  volta pela porta dos fundos. */
export type Pose = { x: number; y: number; opacidade: number };

/** Onde um cartão está, dado o giro acumulado e o progresso do desenrolar.
 *
 *  O DESENROLAR É FÍSICO, não uma interpolação entre dois quadros-chave. A ideia:
 *  um arco de curvatura k e comprimento de arco s fica em
 *      X = sen(k·s)/k       Y = (1 − cos(k·s))/k
 *  e quando k → 0 isso tende a (s, 0) — a reta. Então basta levar a curvatura de
 *  1/R a 0 conservando o comprimento de arco, e o anel DESENROLA sobre a tangente
 *  que passa pelas 6h. Nos dois extremos a fórmula é exata: em p=0 dá o círculo
 *  ponto a ponto, em p=1 dá a reta. Nada de "quase".
 *
 *  Efeito colateral que vale conhecer: no meio do caminho a figura INCHA — a corda
 *  do arco chega a ~536px numa roda de 396px de diâmetro — e os braços saem de
 *  quadro antes de voltarem para a reta. Isso é o que um aro sendo desenrolado
 *  faz de verdade, e é o que dá o gesto. A alternativa testada (interpolar direto
 *  de círculo para reta) fica contida na tela mas lê como um colapso, não como um
 *  desenrolar. Ficou o desenrolar. */
export function posicao(c: Cartao, fase: number, p: number, m: Medidas, portao: [number, number]): Pose {
  const R = m.R[c.anel];
  /* o anel de fora gira mais devagar na mesma proporção do raio, o que dá aos
     dois a mesma velocidade linear enquanto são círculo */
  const escala = c.anel === 1 ? 1 / RAZAO_ANEL : 1;

  let th = c.a + fase * escala;
  th = ((th + Math.PI) % TAU + TAU) % TAU - Math.PI; // embrulha em (−π, π]

  const s = R * th * (1 + p * (m.esticar[c.anel] - 1));
  const k = (1 - p) / R;

  let X: number;
  let Y: number;
  if (k < 1e-7) {
    X = s;
    Y = 0;
  } else {
    X = Math.sin(k * s) / k;
    Y = (1 - Math.cos(k * s)) / k;
  }

  const perto = 1 - Math.min(1, (Math.PI - Math.abs(th)) / JANELA_COSTURA);

  return {
    x: X,
    y: R - Y + p * (m.yBarra[c.anel] - R),
    opacidade: 1 - portao[c.anel] * perto,
  };
}
