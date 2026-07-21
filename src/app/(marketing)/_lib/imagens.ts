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
}

/** Monta a URL do Unsplash no formato recomendado (auto-format, crop, qualidade 80). */
export function unsplash(id: string, w: number = 1600): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

/* --------------------------------- BARBEIROS ------------------------------- */
export const imagensBarbeiros = {
  /** herói — a craft em close, luz quente e baixa */
  hero: {
    url: unsplash("1503951914875-452162b0f3f1"),
    alt: "Barbeiro apara a barba de um cliente reclinado na cadeira, lâmina firme na mão, sob luz quente e baixa.",
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
