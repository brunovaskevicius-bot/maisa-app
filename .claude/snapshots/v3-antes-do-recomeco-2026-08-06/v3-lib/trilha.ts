import { extensaoExterna } from "./geometria";

/* ----------------------------------------------------------------------------
 * A TRILHA — um traçado longo varrendo o vazio em volta da roda.
 *
 * Adaptado do "Ribbon Trails" (Originkit), que o Bruno mandou como referência. A
 * física é a de lá e está preservada de propósito, porque é ela que dá o gesto:
 * uma corrente de nós em que cada um é puxado pelo anterior por uma mola que
 * ENFRAQUECE ao longo da corrente (`TENSAO` multiplicando a mola a cada elo), com
 * atrito e um empurrão de amortecimento herdado da velocidade do nó de cima. O que
 * mudou foram três coisas, e todas por pedido:
 *
 *   1. NÃO HÁ CURSOR. O original persegue o mouse e não desenha nada até o
 *      primeiro `mousemove` — numa landing page isso é uma tela que só ganha vida
 *      se a pessoa mexer o mouse, e no celular nunca. Aqui o alvo é uma função do
 *      TEMPO (ver `alvo`), então a peça está viva no primeiro quadro.
 *   2. NÃO TEM rAF PRÓPRIO. Quem chama `quadro()` é o laço do <Morph>, que já roda
 *      uma vez por quadro nesta mesma dobra. Dois `requestAnimationFrame`
 *      concorrendo pelo mesmo orçamento — um escrevendo 64 transforms, o outro
 *      desenhando 12 curvas — é o jeito mais fácil de transformar duas coisas
 *      lisas numa engasgada. E de graça sai o gate: o <Morph> já sabe o progresso
 *      do desenrolar, então a trilha some enquanto a roda vira barra, que é
 *      justamente o quadro mais caro da página.
 *   3. AS CORES SÃO TOKENS, lidas do CSS. O original recebe hex por prop.
 *
 * ── O ALVO NÃO É ALEATÓRIO DE VERDADE, e é melhor assim.
 * `Math.random()` num passeio dá tremor, não trajetória: para o traçado varrer a
 * tela com calma seria preciso filtrar o ruído até sobrar... uma senoide. Então o
 * alvo é uma soma de senos de frequências sem razão simples entre si (0,5 · 0,29
 * · 0,127 · 0,37 rad/s). Quase-periódico: o desenho nunca fecha o mesmo laço duas vezes,
 * mas cada laço é liso. Lê como aleatório e é reproduzível — dá para tirar dois
 * prints do mesmo instante e comparar.
 *
 * ── POR QUE POLAR, E NÃO UM PASSEIO PELA TELA INTEIRA.
 * O pedido era "percorrer os espaços em branco". Em coordenadas polares em volta do
 * centro da roda, com os semieixos limitados por baixo pela extensão da coroa, o
 * vazio é o domínio natural do ALVO: ele não tem como entrar no oco onde mora a
 * frase, porque essa região não existe no espaço em que ele é definido. Por cima o
 * raio é livre — a órbita sai de quadro pelos quatro cantos, que é o que faz um
 * traçado parecer maior que a tela.
 *
 * ── DUAS FITAS, E UMA ÓRBITA QUE NÃO É ELIPSE. As duas coisas vieram do mesmo
 * pedido ("o fio nos DOIS lados, preenchendo o vazio que os dois lados têm") e as
 * duas foram decididas medindo, não olhando: uma réplica desta física rodando 90s
 * fora do rAF, jogando cada nó numa grade de 44×28 sobre o palco de 1430×900.
 *
 *   · UMA elipse deixava vazios OS QUATRO CANTOS — 8,9% da área fora da roda nunca
 *     recebia um nó em 90s. É geometria, não parâmetro: uma elipse inscrita num
 *     retângulo não alcança os cantos dele por definição. A órbita virou uma
 *     SUPERELIPSE (|x/rX|^4 + |y/rY|^4 = 1), que é a mesma curva empurrada em
 *     direção ao retângulo. Vazio caiu para ~2%, e o que sobra é a ponta dos
 *     cantos.
 *   · A SEGUNDA FITA é antípoda (θ + π) e existe por UM motivo só: com uma fita, os
 *     dois lados têm traço ao mesmo tempo em 76% dos quadros; com duas, em 100%. É
 *     presença, não densidade — o pedido era o fio nos dois lados, e um traçado
 *     único deixa um dos lados nu um quarto do tempo.
 *
 *     (Houve uma versão em que a segunda fita se justificava por DENSIDADE, com 28
 *     fios por fita empilhando alpha. Essa versão pesou demais na dobra e foi
 *     desfeita — ver ALFA. O argumento da densidade morreu junto; ficou o da
 *     presença, que é o que o pedido original dizia.)
 *
 * A antípoda partilha o balanço angular, então as duas estão SEMPRE em lados
 * opostos; o que não partilham é a fase da respiração do semieixo (2,3rad de
 * defasagem), senão uma seria a imagem da outra girada de meia volta, e simetria
 * exata é a única coisa que denuncia que aquilo é um laço.
 *
 * ── E DEPOIS ELA FICOU LEVE, que foi o pedido seguinte: a versão acima estava
 * "pesando MUITO a hero" e devia ser "só mais um elemento, fluido e aleatório".
 * Isso são DOIS problemas, e tratá-los como um só foi o que me custou uma volta:
 *
 *   TINTA — a fita empilhava 28 fios a 0,075 de alpha, o que fecha o miolo em 0,89.
 *   Medido na tela: 60% da tinta acima de 0,30 de opacidade. Resolvido em ALFA,
 *   AMPLITUDE e no número de fios (28 → 6): 0,265 no miolo, e de quebra 2.464 nós
 *   por quadro viraram 528.
 *
 *   FLUIDEZ — os nós ficavam até 316px FORA da curva-alvo, porque molas frouxas
 *   atrasam e corrente atrasada corta caminho em linha reta. Resolvido apertando a
 *   faixa de molas e desacelerando a órbita (ver MOLA_MIN e OMEGA): 17px de desvio
 *   médio.
 *
 * ⚠️ E AÍ APARECEU O TERCEIRO, que é filho dos outros dois: um traço FINO seguindo
 * FIELMENTE uma curva lisa desenha essa curva — a peça virou o contorno de um
 * retângulo arredondado, parado. Era pior que o problema original, porque agora
 * havia uma FIGURA geométrica na dobra. É para isso que existe a ONDULACAO, e é
 * por isso que ela não é enfeite: sem ela, "leve" e "fluido" se anulam.
 *
 * O ALVO, PORÉM, NÃO É A FITA. A corrente vai atrasada e corta caminho, e com este
 * comprimento de rastro o atalho passava por dentro da roda — dá para ver na página,
 * não é hipótese. Por isso existe UM caso particular, e é o único do arquivo: a
 * projeção de cada nó para fora da coroa, em `Fio.avancar`. O domínio garante o
 * alvo; a projeção garante o traço.
 *
 * ── PASSO FIXO, e isto não é preciosismo.
 * O original integra uma vez por quadro, o que embute "1 quadro = 1/60 s". Num Mac
 * com ProMotion o dt cai pela metade, a corrente encurta e endurece: a MESMA
 * página desenha um traçado visivelmente diferente a 120 Hz. Aqui o tempo avança
 * em passos de 1/60 s acumulados, então o desenho é o mesmo em qualquer taxa.
 * -------------------------------------------------------------------------- */

/* ── a física, herdada da referência ── */
const ATRITO = 0.5;
const AMORTECIMENTO = 0.1;
/** quanto a mola enfraquece a cada elo — é o que faz a corrente virar cauda */
const TENSAO = 0.95;
/** A FAIXA DE MOLAS entre o primeiro e o último fio — e ela é estreita de novo,
 *  depois de uma temporada em 0,20–0,40 que foi um erro meu.
 *
 *  O fio mais frouxo é o que mais atrasa, e uma corrente muito atrasada não desenha
 *  a curva: ela CORTA CAMINHO, ligando dois pontos distantes do arco por algo quase
 *  reto. Medido, com o desvio de cada nó até a curva-alvo mais próxima:
 *      molas 0,20–0,40  →  48px de desvio médio, 316px no pior nó
 *      molas 0,30–0,42  →  33px de desvio médio                    ← aqui
 *  316px de desvio num palco de 900px de altura não é uma fita fluida, é um risco
 *  reto atravessando a composição — que foi exatamente a reclamação. */
const MOLA_MIN = 0.3;
const MOLA_MAX = 0.42;

/** nós por fio, e é ele que decide o COMPRIMENTO do traçado — a coisa que o pedido
 *  chamou de "bem grande".
 *
 *  Medido na página, varrendo 40s de física e somando os elos de um fio:
 *      22 nós, molas 0,30–0,52  →   564px   (um cometa curto num canto)
 *      34 nós, molas 0,30–0,52  →  1286px
 *      44 nós, molas 0,30–0,42  →  2048px   ← aqui
 *  A órbita tem ~4000px de perímetro, então o rastro é ~metade de uma volta POR
 *  FITA, e as duas somadas fecham o perímetro inteiro: não sobra ponto da órbita
 *  sem tinta em nenhum instante. Com 564px ele era uma risca solta numa esquina,
 *  e os outros três quadrantes ficavam vazios.
 *
 *  Chegou a dar 4256px com molas mais frouxas, e ERA PIOR: o comprimento vinha de
 *  atraso, e atraso vira corte de caminho. Comprimento de rastro não é a métrica —
 *  quem manda é o desvio até a curva (ver MOLA_MIN). */
const NOS = 44;

/* ── o alvo ── */
/** rad/s da varredura. Uma volta em ~12,6s — era 0,8 (uma volta em 8s).
 *
 *  DESACELERAR FOI O QUE MAIS FEZ A FITA PARECER FLUIDA, e o motivo é o mesmo das
 *  molas: o atraso da corrente é em TEMPO, então quanto mais rápido o alvo anda,
 *  maior o arco que a cauda tem de atravessar em linha reta. Com 0,5 o desvio médio
 *  até a curva cai de 33px para 17px e o pior nó de 313px para 220px.
 *
 *  Custa comprimento: o rastro do fio mais frouxo vai de 3018px para 2048px. Como o
 *  perímetro é ~4000px, cada fita ainda cobre metade da órbita e as duas somadas
 *  cobrem tudo — o que se perde é excesso, não presença. E um elemento de fundo que
 *  dá uma volta a cada 12s é bem menos insistente que um que dá a cada 8. */
const OMEGA = 0.5;
/** amplitude do balanço angular: acelera nas retas e alivia nas pontas, que é o que
 *  impede a órbita de parecer um relógio */
const BALANCO = 0.62;

/** Expoente da superelipse |x/rX|^n + |y/rY|^n = 1, na forma em que a
 *  parametrização o usa: `2/n`. Com n = 2 (expoente 1) é a elipse de antes; quanto
 *  MAIOR o n, mais a curva se aproxima do retângulo e mais ela entra nos cantos.
 *
 *  Varrido na página, medindo a área fora da roda que nunca recebe um nó em 90s:
 *      n = 2 (elipse)  →  8,9% de vazio, e o vazio são os QUATRO CANTOS
 *      n = 4           →  0,0%   ← aqui
 *      n = 6           →  0,0%
 *  Em n = 4 o ponto a 45° sai a 0,84 do semieixo em vez de 0,71 (a elipse), que
 *  basta para alcançar os cantos.
 *
 *  ESTEVE EM 6 e voltou para 4 quando a fita ficou fina: quanto maior o expoente,
 *  mais a curva tem cara de retângulo, e um traço fino desenhando um retângulo é
 *  um retângulo. Com a ONDULACAO fazendo o trabalho de chegar longe, o expoente
 *  pode ser o menor que ainda cobre — e menor aqui quer dizer mais redondo. */
const EXPOENTE = 2 / 4;

/** Quanto o semieixo HORIZONTAL respira, num ciclo de ~49s. Em 0,26 o semieixo vai
 *  de 80% a 101% da meia-largura — a órbita encosta na borda da tela no auge e
 *  recua um quinto no vale. */
const RESPIRO_X = 0.26;

/** ── A ONDULAÇÃO, e ela é o que separa "traçado fluido" de "contorno desenhado".
 *
 *  SEM ELA A PEÇA VIRA UM RETÂNGULO ARREDONDADO, e isso não é impressão: medindo o
 *  raio da órbita por direção ao longo de 160s, a variação no ângulo mais travado
 *  era de 0,4%. Ou seja, no topo e na base a curva passava SEMPRE no mesmo lugar.
 *  Uma linha fina repetindo o mesmo caminho não lê como gesto, lê como borda — e a
 *  fita tinha acabado de ficar fina justamente para pesar menos. As duas coisas
 *  brigavam, e esta é a que resolve.
 *
 *  Por que o raio não variava sozinho: entre a roda (extensão 421px) e a borda da
 *  tela (450px de meia-altura) sobram 29px. Na vertical não existe folga radial
 *  para variar — então a variação tem de vir de FORA da tela. É por isso que a
 *  ondulação vertical é grande e o traçado sai de quadro por cima e por baixo: uma
 *  linha que atravessa a borda não é lida como contorno fechado.
 *
 *  As ordens dos harmônicos são NÃO INTEIRAS (2,3 e 3,7). Com ordem inteira, r(θ)
 *  seria periódica em 2π e toda volta desenharia a MESMA lóbulo — trocaria um
 *  retângulo por uma flor, e continuaria sendo uma figura. Com ordem irracional a
 *  curva nunca fecha igual: cada passagem é um caminho novo.
 *
 *  Normalizada para [0,1], nunca negativa: a ondulação só empurra para FORA. É o
 *  que preserva a folga de 6% sobre a coroa sem precisar de mais nenhuma guarda. */
const ONDULACAO_X = 0.32;
const ONDULACAO_Y = 0.22;

/** AS DUAS FITAS. `fase` entra direto em θ: π faz a segunda ser ANTÍPODA da
 *  primeira em qualquer instante, que é o que garante os dois lados ao mesmo tempo
 *  por construção, e não por sorte de parâmetro. `respiro` defasa só a respiração
 *  do semieixo, para que uma não seja a outra girada de meia volta. */
const FITAS: ReadonlyArray<{ fase: number; respiro: number }> = [
  { fase: 0, respiro: 0 },
  { fase: Math.PI, respiro: 2.3 },
];

/** A LARGURA DA FITA, em px para cada lado do eixo.
 *
 *  Cada fio recebe um alvo deslocado na NORMAL da trajetória, de −AMP a +AMP, e a
 *  largura respira num ciclo de 17s. Em 46px lia como uma névoa azul; em 24, como
 *  uma FITA — e "fita" era demais: com 28 fios abertos em 48px de largura o que
 *  aparecia era uma faixa escovada, um objeto com corpo próprio disputando atenção
 *  com a roda. Em 7px os 6 fios quase se sobrepõem e o conjunto lê como UM traço
 *  com espessura viva, que é o que "só mais um elemento" pede. */
const AMPLITUDE = 7;

/* ── a pintura ── */
const ESPESSURA = 1.1;
/** alpha POR FIO, e o número que decide se a peça é fundo ou figura.
 *
 *  Com F fios sobrepostos o miolo fecha em 1−(1−α)^F. Era 28 fios a 0,075, ou seja
 *  0,89 — azul praticamente sólido, medido na tela: 60% da tinta acima de 0,30 de
 *  opacidade e picos em 0,886. Isso não é um elemento a mais numa composição, é o
 *  elemento mais forte dela, competindo com a manchete.
 *
 *  Agora são 6 fios a 0,05 → 1−0,95⁶ = 0,265. Um traço que se lê como papel
 *  marcado, não como tinta. Se um dia parecer apagado demais, o ajuste é AQUI e não
 *  no número de fios: mais fios engrossam a fita, este número muda o tom.
 *
 *  A conta é sobre 6 e não sobre 12: as duas fitas são ANTÍPODAS e não partilham
 *  região a não ser de passagem. Se alguém aproximar as fases, o miolo chapa. */
const ALFA = 0.05;
/** o traçado morre nos primeiros 55% do desenrolar: a partir daí a dobra está
 *  virando divisória e uma fita orbitando um centro que não existe mais é fantasma
 *  da forma anterior — o mesmo motivo pelo qual o halo do v3.css também morre. */
const MORTE = 1.8;

/** Fallback do `--mk-accent` claro (blue-500 #3B82F6) para o caso de o navegador
 *  não parsear `oklch()` no canvas. A página inteira já depende de `oklch` no CSS,
 *  então isto é cinto de segurança para um navegador que suporte a cor no estilo e
 *  não no canvas — Safari já esteve nesse estado. */
const COR_RESERVA = "#3b82f6";

type No = { x: number; y: number; vx: number; vy: number };

class Fio {
  private readonly nos: No[] = [];

  /** `lado` vai de −1 a +1 e é o lugar deste fio na largura da fita. */
  constructor(
    private readonly mola: number,
    readonly lado: number,
    x: number,
    y: number,
  ) {
    for (let i = 0; i < NOS; i++) this.nos.push({ x, y, vx: 0, vy: 0 });
  }

  avancar(alvoX: number, alvoY: number, cx: number, cy: number, rProibido: number) {
    let mola = this.mola;
    const nos = this.nos;

    nos[0].vx += (alvoX - nos[0].x) * mola;
    nos[0].vy += (alvoY - nos[0].y) * mola;

    for (let i = 0; i < nos.length; i++) {
      const no = nos[i];
      if (i > 0) {
        const ant = nos[i - 1];
        no.vx += (ant.x - no.x) * mola + ant.vx * AMORTECIMENTO;
        no.vy += (ant.y - no.y) * mola + ant.vy * AMORTECIMENTO;
      }
      no.vx *= ATRITO;
      no.vy *= ATRITO;
      no.x += no.vx;
      no.y += no.vy;
      mola *= TENSAO;

      /* ── A RODA É INTOCÁVEL, E O ALVO SOZINHO NÃO GARANTE ISSO.
         Manter o ALVO fora da roda não mantém a FITA fora: a corrente vai atrasada,
         e uma corrente atrasada corta caminho — ela liga dois pontos do arco por
         algo mais reto que o arco. Com ~2000px de rastro num perímetro de ~4000px o
         atalho é enorme, e o que se via era o traçado passando por dentro da roda e
         atrás da frase (medido: o arco cruzava a caixa de texto pelo topo). Uma
         linha em movimento atrás da manchete é exatamente o "véu atrás do texto" que
         o v3.css diz ter arruinado a dobra anterior.
         A projeção no círculo resolve por construção e custa uma raiz por nó: quem
         entra é empurrado de volta para a borda, deslizando por ela. O efeito
         colateral é bonito e de graça — a fita ENCOSTA na coroa e a contorna, em vez
         de atravessá-la. Só a posição é corrigida, não a velocidade: refletir aqui
         faria o nó quicar, e um quique é uma dobra visível no traçado. */
      const dx = no.x - cx;
      const dy = no.y - cy;
      /* `Math.sqrt(dx*dx + dy*dy)` E NÃO `Math.hypot`, que é o que estava aqui e é o
         que qualquer um escreveria. `hypot` faz escalonamento para não estourar o
         expoente do double, e isso custa: medido nesta página, com o JIT quente,
         são 0,335ms contra 0,142ms por quadro — 58% da física, gastos para proteger
         contra um overflow que exigiria coordenadas acima de 1e154. Este é o único
         laço do arquivo que roda 2.464 vezes por quadro; nos outros `hypot` fica. */
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < rProibido) {
        const k = rProibido / (d || 1);
        no.x = cx + dx * k;
        no.y = cy + dy * k;
      }
    }
  }

  /** Curva suave por PONTOS MÉDIOS: cada nó vira o ponto de controle de uma
   *  quadrática que vai do meio do elo anterior ao meio do seguinte. É o traçado
   *  da referência, e o motivo de ele existir é que ligar os nós por segmentos
   *  deixa cada dobra visível quando a corrente chicoteia. */
  desenhar(ctx: CanvasRenderingContext2D) {
    const nos = this.nos;
    ctx.beginPath();
    ctx.moveTo(nos[0].x, nos[0].y);
    for (let i = 1; i < nos.length - 2; i++) {
      const a = nos[i];
      const b = nos[i + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    const p = nos[nos.length - 2];
    const u = nos[nos.length - 1];
    ctx.quadraticCurveTo(p.x, p.y, u.x, u.y);
    ctx.stroke();
  }
}

type Campo = {
  cx: number;
  cy: number;
  /** semieixo VERTICAL: a borda de fora da coroa, com 6% de folga. É o número que
   *  garante que a trilha nunca entre na roda nem no oco onde mora a frase. */
  rY: number;
  /** semieixo HORIZONTAL. Numa tela deitada a roda quase encosta em cima e embaixo,
   *  e todo o vazio está à esquerda e à direita — então a órbita é DEITADA, não
   *  redonda. Nunca menor que `rY`: no celular, onde a roda já é mais larga que a
   *  tela, ela volta a ser equilátera sozinha (e aí o vazio que sobra é em cima e
   *  embaixo, que é justamente onde as duas fitas antípodas caem). */
  rX: number;
  /** o raio proibido: nenhum nó entra aqui. É a borda EXTERNA da coroa — a fita
   *  contorna a multidão por fora e nunca entra nela.
   *
   *  Chegou a ser a borda INTERNA (deixando a fita passar por trás dos rostos, o que
   *  é bonito nos vãos entre cartões), e foi olhando a tela que isso caiu: o rastro
   *  ficava prensado contra o oco, aparecendo como um fio azul rente à frase, a 11px
   *  da caixa de texto. Um traço encostado no texto contradiz o motivo de a peça
   *  existir — o pedido era percorrer os ESPAÇOS EM BRANCO. Por fora ele também nunca
   *  fica escondido atrás de um cartão, que é o que faz o desenho ler inteiro. */
  rProibido: number;
  larg: number;
  alt: number;
};

/** Uma fita montada: a fase que a distingue e os fios que a desenham. */
type Fita = { fase: number; respiro: number; fios: Fio[] };

export class Trilha {
  private readonly ctx: CanvasRenderingContext2D | null;
  private fitas: Fita[] = [];
  private campo: Campo | null = null;
  private cor = COR_RESERVA;
  private tempo = 0;
  private sobra = 0;
  private limpa = true;

  constructor(private readonly tela: HTMLCanvasElement) {
    /* `alpha: true` é o padrão e é obrigatório aqui: o canvas fica POR BAIXO do
       halo e dos cartões, e um canvas opaco pintaria um retângulo branco por cima
       do gradiente da roda. */
    this.ctx = tela.getContext("2d");
  }

  /** Chamado no mount e a cada resize. `r0` vem do CSS, já resolvido em px, pelo
   *  mesmo caminho que o <Morph> usa — a regra do raio continua existindo num
   *  lugar só. */
  medir(larg: number, alt: number, r0: number) {
    const ctx = this.ctx;
    if (!ctx || larg <= 0 || alt <= 0) return;

    /* DPR CAPADO EM 2. O custo por quadro aqui é traçar 28 caminhos, que independe
       de resolução; o que escala com o pixel é o `clearRect`, que é um memset e o
       navegador faz na GPU. Acima de 2 não se ganha nada visível numa linha de
       1,6px com 4,5% de alpha. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.tela.width = Math.round(larg * dpr);
    this.tela.height = Math.round(alt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rY = extensaoExterna(r0) * 1.06;
    this.campo = {
      cx: larg / 2,
      cy: alt / 2,
      rY,
      rX: Math.max(rY, larg * 0.4),
      rProibido: extensaoExterna(r0) * 0.99,
      larg,
      alt,
    };

    this.cor = this.lerCor();

    /* Menos fios em tela estreita: o vazio ali é uma faixa fina em cima e embaixo,
       então a fita não tem onde se abrir. É POR FITA — no celular são 2×4, no
       desktop 2×6.

       ERA 28 (e 16). Vinte e oito fios existiam para empilhar alpha até o miolo
       fechar; com o traço leve de agora eles só custariam bateria: 2.464 nós por
       quadro viraram 528, e 56 caminhos traçados viraram 12. */
    const n = larg < 760 ? 4 : 6;
    this.fitas = FITAS.map(({ fase, respiro }) => {
      const alvo = this.alvo(0, fase, respiro);
      return {
        fase,
        respiro,
        fios: Array.from({ length: n }, (_, i) => {
          const f = i / Math.max(1, n - 1); // 0..1
          return new Fio(MOLA_MIN + (MOLA_MAX - MOLA_MIN) * f, f * 2 - 1, alvo.x, alvo.y);
        }),
      };
    });

    /* AQUECIMENTO. Todos os nós nascem no mesmo ponto; sem isto o primeiro quadro
       visível é um ponto que só depois estica, e no resize a fita colapsaria de
       novo à vista. 200 passos = 3,3s de física adiantada, o bastante para a cauda
       estar no comprimento de regime. Custa ~0,1M operações, uma vez. */
    for (let i = 0; i < 200; i++) this.passo();
  }

  /** Um passo de 1/60 s. Mora aqui, e não repetido no aquecimento e no laço, porque
   *  é a deformação da fita que os dois precisam aplicar igual — foi escrito duas
   *  vezes por um instante e a versão do aquecimento já tinha esquecido a normal. */
  private passo() {
    this.tempo += 1 / 60;
    const c = this.campo;
    if (!c) return;
    /* a fita respira: ciclo de ~17s entre estar de chapa e estar de perfil. É o
       MESMO para as duas de propósito: elas estão em lados opostos da tela, e
       largura é a única coisa que se lê como "espessura do gesto" — dessincronizar
       isso faria parecer que são dois traçados de peças diferentes. */
    const meia = AMPLITUDE * (0.45 + 0.55 * Math.sin(0.37 * this.tempo));
    for (const fita of this.fitas) {
      const a = this.alvo(this.tempo, fita.fase, fita.respiro);
      const n = this.normal(this.tempo, fita.fase, fita.respiro);
      for (const fio of fita.fios) {
        fio.avancar(a.x + n.x * fio.lado * meia, a.y + n.y * fio.lado * meia, c.cx, c.cy, c.rProibido);
      }
    }
  }

  /** Um quadro. `dtMs` e `p` vêm do laço do <Morph>. */
  quadro(dtMs: number, p: number) {
    const ctx = this.ctx;
    const campo = this.campo;
    if (!ctx || !campo) return;

    const vida = 1 - Math.min(1, p * MORTE);
    if (vida <= 0) {
      /* Some, e para de trabalhar — mas limpa UMA vez, senão o último quadro
         desenhado fica congelado na tela enquanto a barra se forma. */
      if (!this.limpa) {
        ctx.clearRect(0, 0, campo.larg, campo.alt);
        this.limpa = true;
      }
      return;
    }

    /* Mesmo teto de 50ms do <Morph>: quando a aba volta do segundo plano o delta
       acumulado é enorme, e aqui ele viraria uma corrida de centenas de passos
       fixos num quadro só. */
    this.sobra += Math.min(dtMs, 50);
    let passos = 0;
    while (this.sobra >= 1000 / 60 && passos < 3) {
      this.sobra -= 1000 / 60;
      this.passo();
      passos++;
    }
    /* Se estourou o teto de passos, DESISTE do atraso em vez de guardá-lo: manter a
       sobra faria o próximo quadro tentar 3 passos de novo, e a página nunca mais
       alcançaria o tempo real (a espiral clássica do passo fixo). */
    if (passos === 3) this.sobra = 0;

    ctx.clearRect(0, 0, campo.larg, campo.alt);
    ctx.globalAlpha = ALFA * vida;
    ctx.strokeStyle = this.cor;
    ctx.lineWidth = ESPESSURA;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const fita of this.fitas) for (const fio of fita.fios) fio.desenhar(ctx);
    this.limpa = false;
  }

  /** Onde a fita de fase `fase` quer estar no instante `t` (em segundos).
   *
   *  θ avança sempre para o mesmo lado (a órbita nunca volta atrás) mas com um
   *  balanço somado, então a velocidade angular oscila entre ~0,62 e ~0,98 rad/s:
   *  ela acelera atravessando o vazio e alivia ao contornar. O semieixo horizontal
   *  respira num ciclo de ~49s, MUITO mais lento que a volta (~8s), o que faz a
   *  órbita mudar de tamanho a cada volta em vez de repetir o mesmo laço.
   *
   *  ── A CURVA É UMA SUPERELIPSE, e é só isto que a distingue de uma elipse:
   *  `|cos θ|^(2/4)` no lugar de `cos θ`. Elevar o cosseno a uma potência MENOR que
   *  1 empurra o ponto para longe do centro em toda direção que não seja um eixo —
   *  a 45° ele sai a 0,84 do semieixo em vez de 0,71 — e o efeito líquido é uma
   *  curva com cara de retângulo de cantos redondos, que é a forma da tela. O
   *  `Math.sign` existe porque `(-0,5)^0,5` é NaN em JavaScript (potência
   *  fracionária de base negativa): o sinal sai fora e volta depois. */
  private alvo(t: number, fase: number, respiro: number) {
    const c = this.campo;
    if (!c) return { x: 0, y: 0 };
    const th = OMEGA * t + BALANCO * Math.sin(0.29 * t + 0.4) + fase;
    const kx = 0.5 + 0.5 * Math.sin(0.127 * t + 2.6 + respiro);
    /* a ondulação: ordens não inteiras em θ, com a fase escorrendo no tempo, para
       que a curva nunca repita o mesmo caminho. Ver ONDULACAO_X. */
    const w =
      (0.55 * Math.sin(2.3 * th + 0.19 * t) + 0.45 * Math.sin(3.7 * th - 0.11 * t + 1.7) + 1) / 2;
    const cs = Math.cos(th);
    const sn = Math.sin(th);
    return {
      x: c.cx + Math.sign(cs) * Math.abs(cs) ** EXPOENTE * c.rX * (1 + RESPIRO_X * kx) * (1 + ONDULACAO_X * w),
      y: c.cy + Math.sign(sn) * Math.abs(sn) ** EXPOENTE * c.rY * (1 + ONDULACAO_Y * w),
    };
  }

  /** Vetor unitário perpendicular à trajetória, por diferença finita de ±0,05s.
   *  É a direção em que a fita tem largura. Derivar analiticamente daria o mesmo
   *  com três vezes mais álgebra e um lugar a mais para errar quando o `alvo`
   *  mudar — e depois da superelipse a derivada analítica passaria a ter um termo
   *  `|cos|^(2/6 − 1)`, que estoura nos eixos. A diferença finita não liga. */
  private normal(t: number, fase: number, respiro: number) {
    const a = this.alvo(t - 0.05, fase, respiro);
    const b = this.alvo(t + 0.05, fase, respiro);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    return { x: -dy / L, y: dx / L };
  }

  /** `--mk-accent` do CSS, convertido para uma cor que o canvas aceita.
   *
   *  A sentinela existe porque um `strokeStyle` que o navegador não consegue
   *  parsear é IGNORADO EM SILÊNCIO — o canvas seguiria desenhando com o preto
   *  padrão, e o defeito apareceria como "a trilha ficou cinza" sem nada no
   *  console. Escrevendo uma cor conhecida antes e relendo o getter, dá para saber
   *  se a atribuição pegou. */
  private lerCor(): string {
    const ctx = this.ctx;
    if (!ctx) return COR_RESERVA;
    const token = getComputedStyle(this.tela).getPropertyValue("--mk-accent").trim();
    if (!token) return COR_RESERVA;
    const sentinela = "#010203";
    const antes = ctx.strokeStyle;
    ctx.strokeStyle = sentinela;
    ctx.strokeStyle = token;
    const ok = ctx.strokeStyle !== sentinela;
    ctx.strokeStyle = antes;
    return ok ? token : COR_RESERVA;
  }
}
