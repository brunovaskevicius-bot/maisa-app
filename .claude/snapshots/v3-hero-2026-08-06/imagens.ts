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

/**
 * Retrato 4:5 recortado NO ROSTO pelo próprio Unsplash (`fit=facearea`, do imgix).
 *
 * POR QUE NÃO É O `unsplash()` DE CIMA. Aquele devolve o quadro inteiro e deixa o
 * recorte para o `object-fit: cover` do CSS, que corta pelo CENTRO GEOMÉTRICO. Em
 * retrato vertical o rosto vive no terço de cima, então um cartão 4:5 cortado ao
 * centro entrega testa cortada e muito peito — e num cartão de 80px isso não é
 * "enquadramento discutível", é a foto não ter mais assunto. `facearea` detecta o
 * rosto e centra nele; `facepad=3.2` é o quanto de folga entra em volta (1 = só o
 * rosto, colado; acima de ~4 vira retrato de corpo). 3,2 dá cabeça + ombros.
 *
 * O CUIDADO QUE ISSO EXIGE, e ele NÃO é o que este comentário dizia antes: quando
 * o detector não acha rosto, a URL responde **200** e cai calada num corte central.
 * Medido com quatro fotos sem uma única pessoa (quarto vazio, parede com relógio,
 * canto com plantas, sofá) — todas 200. Ou seja, o status HTTP não é teste de rosto;
 * ele só pega ID inexistente (que é de onde vêm os 404 de verdade: IDs de
 * `premium_photo-`/`flagged/`, que não existem sob `/photo-`).
 * Então aqui vale a mesma regra do resto do arquivo, e com mais força: ID entra
 * depois de OLHADO no navegador **já neste recorte**, não depois de um 200.
 */
export function unsplashRosto(id: string, w: number = 240, facepad = 3.2, razao = 1.25): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=${facepad}&w=${w}&h=${Math.round(w * razao)}&q=80`;
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
  /** O ato 2 da v3 — o cliente que saiu da fila.
   *
   *  ⚠️ TROCADA DUAS VEZES, E OS DOIS MOTIVOS IMPORTAM PARA QUEM FOR TROCAR DE NOVO.
   *
   *  1. O FUNDO TEM DE SER BRANCO, e isso é o requisito nº 1 — acima do assunto. A
   *  figura é servida com `mix-blend-mode: multiply` sobre o fundo claro da seção, e
   *  `multiply(fundo, 1) = fundo` é identidade algébrica: um estúdio de fundo BRANCO
   *  devolve o fundo exato, sem uma linha de calibragem e sem PNG recortado. Fundo
   *  cinza, bege, parede visível ou vinheta devolve um retângulo sujo flutuando.
   *  (A foto anterior tinha fundo PRETO, que era o requisito quando a página era
   *  escura e usava `screen`. Trocar o tema sem trocar a foto inverte o efeito.)
   *  Medido: os quatro cantos desta são exatamente (255,255,255).
   *
   *  2. TEM DE TER CABELO À MOSTRA. A anterior usava boné, o que numa página de
   *  barbearia é a única coisa que não pode estar na cabeça do cliente.
   *
   *  RECORTE PELO ROSTO, e aqui `unsplashRosto` é o certo (a versão anterior desta
   *  nota dizia o contrário, porque a foto anterior era enquadrada em meio corpo e o
   *  `facearea` jogava fora o gesto dos braços). O acervo do Unsplash quase não tem
   *  busto masculino em fundo branco puro: o que existe é corpo inteiro isolado —
   *  esta é uma delas —, e num corpo inteiro a cabeça sai do tamanho de uma moeda.
   *  `facepad=5` devolve cabeça + ombros + torso, que é o enquadramento da seção.
   *  Vale integralmente o aviso do `unsplashRosto`: quando o detector não acha rosto
   *  a URL responde 200 e cai calada num corte central, então este recorte foi
   *  OLHADO, não testado por status.
   *
   *  Conferida com o olho no recorte que vai ao ar: sem marca d'água, sem texto, sem
   *  logo de terceiro, e a sombra do piso do estúdio fica FORA do corte (ela existe
   *  no quadro inteiro e, sob `multiply`, viraria uma mancha cinza). */
  figuraAto2: {
    url: unsplashRosto("1666358086975-a98c4c908603", 900, 5, 4 / 3),
    alt: "Rapaz jovem de cabelo curto degradê e barba aparada, camiseta escura, olhando para fora do quadro sobre fundo branco.",
    srcSet: srcSetDe((w) => unsplashRosto("1666358086975-a98c4c908603", w, 5, 4 / 3), [420, 640, 900, 1200]),
  },
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

/** Os rostos da RODA da dobra (v3 de barbeiros; a v2 usava os mesmos doze
 *  primeiros). São rapazes na faixa que a barbearia atende todo dia, em close, e
 *  é isso que a peça precisa: a 70px de largura, plano aberto não tem rosto, tem
 *  mancha.
 *
 *  TRINTA E DOIS, e o número tem uma razão de desenho: a roda desenha 64 cartões,
 *  então 32 fotos é o ponto em que cada rosto aparece DUAS vezes na peça inteira e
 *  o anel de dentro (26 cartões) não repete ninguém. Com doze — como era na v2 —
 *  cada pessoa aparecia cinco vezes e a coroa lia como padrão de estampa em vez de
 *  multidão. Acrescentar mais reduz a repetição na mesma proporção.
 *
 *  TODOS FORAM ABERTOS E OLHADOS, um por um, JÁ NO RECORTE `facearea` em que
 *  aparecem na tela — não no quadro original. É a diferença que importa: o crop do
 *  rosto é outro enquadramento, e candidatos ótimos no quadro cheio viram olho e
 *  boca sem cabeça no facepad usado. Também saem os preto-e-branco (a roda fica
 *  manchada de cinza no meio da cor), os de perfil extremo, e os de 28+ anos, que
 *  puxam a peça para "homem de negócios" em vez de "quem senta na cadeira".
 *
 *  ⚠️ CORREÇÃO DE UMA ARMADILHA QUE ESTAVA DOCUMENTADA ERRADA AQUI. A versão
 *  anterior deste comentário dizia que `fit=facearea` responde 404 quando não
 *  detecta rosto, e que por isso o status HTTP servia de filtro. É FALSO, e foi
 *  medido: quarto vazio, parede com relógio e canto com plantas — quatro fotos sem
 *  uma única pessoa — respondem 200 nessa URL. O imgix cai calado num corte
 *  central. O 404 real vem de outra coisa: IDs de `plus.unsplash.com/premium_photo-`
 *  e de `images.unsplash.com/flagged/photo-`, que simplesmente não existem sob
 *  `/photo-` (é o que acontece quando se monta a lista a partir de qualquer
 *  `urls.raw` da busca, sem filtrar o prefixo).
 *  Consequência prática: **200 não é prova de rosto**. Só o olho é. O status serve
 *  para pegar ID inexistente, e nada mais.
 *
 *  ANÔNIMOS, e aqui isso é mais do que boa prática: veja o cabeçalho do
 *  v3/dados.ts sobre a frase que fica no centro da roda. */
export const rostosOrbita: MktImagem[] = [
  { url: unsplashRosto("1681097561932-36d0df02b379"), alt: "Rapaz asiático de camiseta branca, cabelo curto, sobre fundo amarelo." },
  { url: unsplashRosto("1604494747044-2e080876c5f1"), alt: "Rapaz de cabelo cacheado volumoso olhando para o lado, prédios ao fundo." },
  { url: unsplashRosto("1747373354116-671ba01db71b"), alt: "Rapaz de bigode fino e suéter cinza, olhar direto para a câmera." },
  { url: unsplashRosto("1536548665027-b96d34a005ae"), alt: "Rapaz sorrindo de camiseta azul escrita Brasil, ao ar livre." },
  { url: unsplashRosto("1596478454926-473e1a88a639"), alt: "Rapaz negro de camiseta clara, com um mapa antigo na parede atrás." },
  { url: unsplashRosto("1761358531581-06e457ed7744"), alt: "Rapaz de camisa de futebol branca fotografado de baixo, contra o céu azul." },
  { url: unsplashRosto("1783305785910-20d54c918bff"), alt: "Rapaz loiro de perfil, brinco na orelha e camiseta preta." },
  { url: unsplashRosto("1521817760127-e15c26f67fd2"), alt: "Rapaz de cabelo black power e regata verde, olhando para a câmera." },
  { url: unsplashRosto("1616651630258-e3b5b01f416d"), alt: "Rapaz de jaqueta escura sob luz baixa, corte alto e degradê nas laterais." },
  { url: unsplashRosto("1779497056467-d21bd2203946"), alt: "Rapaz de cabelo cacheado e camisa rosa, com o sol batendo de trás." },
  { url: unsplashRosto("1610637403807-2418ebb6c337"), alt: "Rapaz com a mão no queixo, camisa verde-clara, luz quente e fundo desfocado." },
  { url: unsplashRosto("1518809595274-1471d16319b7"), alt: "Rapaz negro de gola alta escura, retrato fechado sobre fundo preto." },
  { url: unsplashRosto("1776111848018-1f0c49e2864b"), alt: "Rapaz de polo cor de pêssego agachado contra fundo branco, olhando direto para a câmera." },
  { url: unsplashRosto("1783379793595-e2790e191285"), alt: "Jovem negro de brinco e jaqueta estampada escura, mão perto do queixo, sob luz lateral." },
  { url: unsplashRosto("1633112639964-f8c9d360dc75"), alt: "Rapaz de cachos volumosos, brinco e camiseta cinza-escura, com sorriso leve em fundo claro." },
  { url: unsplashRosto("1726140871959-89036cd0d6a3"), alt: "Rapaz de cabelo cacheado castanho-claro e camiseta preta, encostado numa parede de concreto." },
  { url: unsplashRosto("1780362697057-4c0ad1603cdc"), alt: "Rapaz de óculos redondos de metal e camiseta preta, com luzes da cidade desfocadas ao entardecer." },
  { url: unsplashRosto("1764532140242-9be85f61a417"), alt: "Rapaz de jaqueta escura sobre camiseta branca de gola com botões, em fundo cinza-claro." },
  { url: unsplashRosto("1653055645127-54ec96add7b5"), alt: "Rapaz de cabelo escuro penteado para trás e camisa florida, com folhagem desfocada atrás." },
  { url: unsplashRosto("1570003179394-40b59f9b4a5a"), alt: "Rapaz asiático de óculos redondos e camiseta branca, com um prédio amarelo ao fundo." },
  { url: unsplashRosto("1653324502559-ae8d4aa4dd57"), alt: "Rapaz negro de camisa esportiva amarela, posando numa rua com fundo desfocado." },
  { url: unsplashRosto("1642929548399-4056fa2ec086"), alt: "Rapaz negro de dreads sob gorro preto e camiseta preta, sorrindo em fundo cinza de estúdio." },
  { url: unsplashRosto("1578537434069-61a689064b4d"), alt: "Rapaz asiático de jaqueta escura junto a uma janela, com a cidade desfocada ao fundo." },
  { url: unsplashRosto("1784816836381-10ced6608354"), alt: "Rapaz negro de jaqueta jeans sobre camiseta branca, sentado em banco branco com fundo bege." },
  { url: unsplashRosto("1782069327238-c154984f06ac"), alt: "Rapaz indiano de barba rala e polo azul-marinho, retrato em fundo preto." },
  { url: unsplashRosto("1735317146081-f8671e25855c"), alt: "Rapaz negro sorrindo largo, de camisa escura, sobre fundo azul vibrante." },
  { url: unsplashRosto("1754639627042-5fdc896d7242"), alt: "Rapaz de cabelo black power e suéter branco de gola alta, em fundo azul-acinzentado." },
  { url: unsplashRosto("1779760129536-538dac0e0891"), alt: "Rapaz de camisa social azul-clara ao ar livre, com vegetação desfocada atrás." },
  { url: unsplashRosto("1599418175586-9355fef5c483"), alt: "Rapaz de camisa xadrez vermelha e preta, de pé perto de árvores verdes." },
  { url: unsplashRosto("1690543364186-973ade5dd0c1"), alt: "Rapaz sorrindo aberto, de camiseta azul-esverdeada com alça de mochila no ombro." },
  { url: unsplashRosto("1758214872926-7806dbb81e69"), alt: "Rapaz negro de dreads curtos com miçangas roxas e camiseta azul viva." },
  { url: unsplashRosto("1773236237553-0950d3c31d20"), alt: "Rapaz negro de cabelo black power e óculos de grau, com jaqueta jeans clara ao ar livre." },
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
