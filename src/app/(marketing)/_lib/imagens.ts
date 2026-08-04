/* ----------------------------------------------------------------------------
 * Curadoria de imagens reais (Unsplash) — TODAS as URLs foram verificadas
 * (HTTP 200 em w=1600) antes de entrar aqui. IDs chutados dão 404; estes não.
 * Alt text em pt-BR descreve a CENA (faz parte da voz), não "foto de barbeiro".
 * Módulo puro — importável por Server e Client Components.
 * -------------------------------------------------------------------------- */

export interface MktImagem {
  /** URL final pronta para <img src>. */
  url: string;
  /** alt em pt-BR descrevendo a cena. */
  alt: string;
  /** Candidatos em `Xw` para `<img srcSet>`. Só onde a imagem é grande e responsiva
   *  de verdade — servir 1600px numa miniatura é desperdício, e servir 1600px num
   *  celular retina de 390px é 1,3× de ampliação com 4× de bytes. */
  srcSet?: string;
}

/** Monta a URL do Unsplash no formato recomendado (auto-format, crop, qualidade 80). */
export function unsplash(id: string, w: number = 1600): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

/** Monta a URL do Pexels na largura pedida.
 *
 *  POR QUE EXISTE UMA SEGUNDA FONTE, num arquivo cuja primeira linha diz "Unsplash".
 *  A regra de fonte única é boa e continua valendo para tudo abaixo; a exceção é a
 *  foto da dobra dos barbeiros, e a alternativa seria pior — publicar uma foto que
 *  não é a escolhida. Ela é de uma barbearia BRASILEIRA de verdade, com DUAS cadeiras
 *  ocupadas no mesmo instante, que é literalmente o argumento da página. O acervo de
 *  barbearia do Unsplash é close de lâmina e vitrine vazia: nenhuma foto de lá mostra
 *  a casa cheia. As duas licenças são equivalentes para este uso (comercial livre,
 *  atribuição não exigida).
 *
 *  `cs=tinysrgb` não é enfeite: fixa o espaço de cor em sRGB. Sem ele, a mesma foto
 *  pode chegar em Display-P3, e aí a medição de contraste feita por rasterização não
 *  bate com o que o navegador pinta — que é justamente a conta que este projeto usa
 *  para decidir se texto sobre foto é legível. */
export function pexels(id: string, w: number = 1600): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

/** Monta o `srcset` de uma imagem responsiva a partir do construtor de URL da fonte.
 *
 *  Existe porque o jeito anterior era `url.replace("w=480", "w=1100")` no meio do JSX
 *  (Furos.tsx): funciona enquanto ninguém troca a largura base, e quebra em silêncio
 *  quando alguém troca — o replace não casa, o srcset serve dois candidatos idênticos
 *  e o navegador passa a baixar a versão pequena em tela retina sem avisar. Aqui a
 *  largura é PARÂMETRO, então não há string para casar. */
export function srcSetDe(construtor: (w: number) => string, larguras: number[]): string {
  return larguras.map((w) => `${construtor(w)} ${w}w`).join(", ");
}

/* --------------------------------- BARBEIROS ------------------------------- */
export const imagensBarbeiros = {
  /** herói — a craft em close, luz quente e baixa */
  hero: {
    url: unsplash("1503951914875-452162b0f3f1"),
    alt: "Barbeiro apara a barba de um cliente reclinado na cadeira, lâmina firme na mão, sob luz quente e baixa.",
  },
  /** a dobra da v2 — a casa CHEIA, e é essa a diferença. Única foto do arquivo em
   *  que duas cadeiras estão ocupadas no mesmo instante: o estado que a página vende,
   *  fotografado, em vez de afirmado. Cor de verdade também — vermelho, terracota,
   *  branco de piso —, ao contrário do resto do acervo, que é todo penumbra âmbar. */
  salaoCheio: {
    url: pexels("1813272"),
    /* É o elemento de LCP da v2 e ocupa 100vw, então a escada vai até 2000: a faixa
       tem 1440 CSS px num notebook, o que dá 2880 device px em DPR 2 — sem candidato
       grande o navegador amplia o 1600 em 1,8×. O piso é 640 porque abaixo disso
       nenhuma viewport pede a foto (a menor é 320 CSS px, 640 em DPR 2). */
    srcSet: srcSetDe((w) => pexels("1813272", w), [640, 960, 1280, 1600, 2000]),
    alt: "Duas cadeiras ocupadas ao mesmo tempo numa barbearia: dois barbeiros de avental terracota trabalhando, um deles passando a máquina, e uma cabine telefônica vermelha na borda esquerda do quadro.",
  },
  /** corte em andamento, preto e branco, atmosférico */
  corte: {
    url: unsplash("1546664278-c0a27e0cdc88"),
    alt: "Barbeiro em pé finaliza um corte sob um varal de luzes acesas, em preto e branco.",
  },
  /** a cadeira de couro vazia — objeto-símbolo */
  cadeira: {
    url: unsplash("1580087433295-ab2600c1030e"),
    alt: "Cadeira de barbeiro de couro preto, vazia, ao lado de uma prateleira de produtos e uma lâmpada de filamento.",
  },
  /** rua urbana à noite iluminada por neon */
  ruaNeon: {
    url: unsplash("1615557898671-a9f36f9df5e6"),
    alt: "Calçada de rua à noite iluminada pelo letreiro de neon vermelho e azul de uma barbearia.",
  },
  /** fachada acesa à noite, com poste de barbeiro */
  fachada: {
    url: unsplash("1675624965646-31252239a8a1"),
    alt: "Fachada de barbearia acesa à noite, com poste giratório e vitrine iluminada.",
  },
  /** interior aconchegante com letreiro */
  interior: {
    url: unsplash("1678356164573-9a534fe43958"),
    alt: "Interior aconchegante de barbearia, com o letreiro BARBERSHOP iluminado ao fundo.",
  },
} satisfies Record<string, MktImagem>;

/** Retratos de clientes — usados no bloco "quanto custa a cadeira vazia" da v2, onde
 *  cada rosto representa UM cliente que não apareceu.
 *
 *  São ilustrativos e ANÔNIMOS de propósito: sem nome, sem depoimento, sem afirmação
 *  de que são clientes reais. É a linha que separa ilustração de prova social
 *  fabricada — e a v1 cruzou essa linha ao pôr nomes e "Atendido ontem" em cima de
 *  fotos de banco de imagem.
 *
 *  Os quatro IDs foram ABERTOS e conferidos visualmente, não apenas testados por
 *  HTTP: o comentário em completa/dados.ts:53 documenta por que isso é necessário —
 *  ID errado devolve 200 alegremente e serve a foto de outra coisa. */
export const clientesBarbeiros: MktImagem[] = [
  {
    url: unsplash("1507003211169-0a1dd7228f2d", 480),
    alt: "Retrato de um homem de cabelo curto escuro e camiseta branca, sorrindo.",
  },
  {
    url: unsplash("1506794778202-cad84cf45f1d", 480),
    alt: "Retrato de um homem de barba curta e suéter de tricô, sobre fundo escuro.",
  },
  {
    url: unsplash("1534528741775-53994a69daeb", 480),
    alt: "Retrato de uma mulher de cabelo curto escuro, sob luz azulada.",
  },
  {
    url: unsplash("1500648767791-00dcc994a43e", 480),
    alt: "Retrato de um homem de cabelo escuro e suéter cinza, sobre fundo neutro.",
  },
];

/* -------------------------------- TERAPEUTAS ------------------------------- */
export const imagensTerapeutas = {
  /** herói — poltronas, caderno e luz do fim da tarde */
  hero: {
    url: unsplash("1667341275219-27e262569633"),
    alt: "Poltronas e um caderno aberto sobre a mesa de um consultório, banhados pela luz do fim da tarde.",
  },
  /** espaço claro e arejado, ordem e respiro */
  espacoArejado: {
    url: unsplash("1519710164239-da123dc03ef4"),
    alt: "Canto claro e arejado com poltrona de madeira, luminária de arco, plantas e um tapete redondo.",
  },
  /** anotando à mão — CRM/jornada do paciente */
  anotando: {
    url: unsplash("1616740795271-abd6ce1a5a5a"),
    alt: "Pessoa sentada anotando à mão em um caderno, vista de cima, sobre piso de madeira.",
  },
  /** sala acolhedora com luz suave da tarde */
  salaAcolhedora: {
    url: unsplash("1502672260266-1c1ef2d93688"),
    alt: "Sala acolhedora com sofá cinza, plantas e a luz suave da tarde entrando pela janela.",
  },
  /** ordem e plantas — ambiente organizado */
  plantasOrdem: {
    url: unsplash("1541533260371-b8fc9b596d84"),
    alt: "Canto de trabalho arejado com cadeira, muitas plantas e parede de tijolo pintada de branco.",
  },
  /** detalhe calmo — relógio, luminária e planta */
  detalheCalmo: {
    url: unsplash("1533090161767-e6ffed986c88"),
    alt: "Parede branca minimalista com relógio de madeira, luminária e um pequeno vaso de planta.",
  },
  /** conversa tranquila junto à janela */
  conversa: {
    url: unsplash("1573497491208-6b1acb260507"),
    alt: "Duas pessoas conversam sentadas junto a uma janela, em um encontro tranquilo.",
  },
} satisfies Record<string, MktImagem>;

/** Acesso por ICP quando o público vem como variável. */
export const imagensPorIcp = {
  barbeiros: imagensBarbeiros,
  terapeutas: imagensTerapeutas,
} as const;
