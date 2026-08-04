/* ----------------------------------------------------------------------------
 * Configuração por ICP (público). Fonte única de rotas, rótulos, navegação e do
 * CTA de WhatsApp para as 6 landing pages. Módulo puro (sem "use client"): pode
 * ser importado por Server e Client Components.
 * -------------------------------------------------------------------------- */

export type ICP = "barbeiros" | "terapeutas";
export type Nivel = "topo" | "meio" | "base";

/* Número da MAISA no WhatsApp, em E.164 sem o "+". É o mesmo número da LP
 * oficial em lp/terapeutas/index.html — se trocar aqui, troque lá também: a LP
 * é HTML estático e não importa este módulo. */
export const WHATSAPP_NUMERO = "5511994294906";

/* E-mail de contato secundário (canal alternativo ao WhatsApp). Ponto único —
 * >>> TROCAR pelo endereço real antes de publicar <<< */
export const CONTATO_EMAIL = "contato@maisa.app";

/** Monta o link wa.me com mensagem pré-preenchida (já codificada). */
export function whatsappUrl(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

export interface NavItem {
  label: string;
  href: string;
  nivel?: Nivel;
}

export interface IcpConfig {
  id: ICP;
  /** classe do mundo (define os tokens OKLCH escopados em marketing.css) */
  mundoClass: string;
  /** rótulo curto que acompanha o wordmark ("para barbearias") */
  rotulo: string;
  /** o que a pessoa é ("barbearia", "terapeuta") — para copy reaproveitável */
  publico: string;
  home: string;
  rotas: Record<Nivel, string>;
  /** navegação topo → meio → base para a MarketingNav */
  nav: NavItem[];
  /** CTA principal (nav + heros): rótulo + mensagem de WhatsApp */
  ctaLabel: string;
  ctaMensagem: string;
  /** URL wa.me pronta do CTA principal */
  ctaUrl: string;
  /** rótulo do CTA secundário (avançar no funil) */
  ctaSecundarioLabel: string;
}

const barbeirosCta =
  "Oi! Tenho uma barbearia e quero deixar a MAISA cuidando da agenda e das confirmações no WhatsApp. Como começo?";
const terapeutasCta =
  "Olá! Sou terapeuta e quero organizar as notas fiscais e a agenda dos meus pacientes com a MAISA. Pode me explicar como funciona?";

export const ICPS: Record<ICP, IcpConfig> = {
  barbeiros: {
    id: "barbeiros",
    mundoClass: "mundo-barbeiros",
    rotulo: "para barbearias",
    publico: "barbearia",
    home: "/barbeiros",
    rotas: {
      topo: "/barbeiros",
      meio: "/barbeiros/como-funciona",
      base: "/barbeiros/comecar",
    },
    nav: [
      { label: "Como funciona", href: "/barbeiros/como-funciona", nivel: "meio" },
      { label: "Recursos", href: "/barbeiros/como-funciona#recursos" },
      { label: "Planos", href: "/barbeiros/comecar", nivel: "base" },
    ],
    ctaLabel: "Ativar minha agenda",
    ctaMensagem: barbeirosCta,
    ctaUrl: whatsappUrl(barbeirosCta),
    ctaSecundarioLabel: "Ver como funciona",
  },
  terapeutas: {
    id: "terapeutas",
    mundoClass: "mundo-terapeutas",
    rotulo: "para terapeutas",
    publico: "terapeuta",
    home: "/terapeutas",
    rotas: {
      topo: "/terapeutas",
      meio: "/terapeutas/como-funciona",
      base: "/terapeutas/comecar",
    },
    nav: [
      { label: "Como funciona", href: "/terapeutas/como-funciona", nivel: "meio" },
      { label: "Recursos", href: "/terapeutas/como-funciona#recursos" },
      { label: "Planos", href: "/terapeutas/comecar", nivel: "base" },
    ],
    ctaLabel: "Falar com a MAISA",
    ctaMensagem: terapeutasCta,
    ctaUrl: whatsappUrl(terapeutasCta),
    ctaSecundarioLabel: "Ver como funciona",
  },
};

/* ----------------------------------------------------------------------------
 * Nível de funil derivado do pathname — PONTO ÚNICO DE VERDADE.
 * A nav, a barra fixa do mobile e (opcionalmente) a faixa de CTA leem daqui, para
 * que o mesmo CTA forte de fundo-de-funil NÃO apareça no topo. Sem estado, sem
 * hooks: funções puras que recebem o pathname (via usePathname no cliente).
 * -------------------------------------------------------------------------- */

/** Primeiro segmento do path → ICP. Cai em "barbeiros" fora das rotas de marca. */
export function icpDoPath(pathname: string | null | undefined): ICP {
  const seg = (pathname ?? "").split("/").filter(Boolean)[0];
  return seg === "terapeutas" ? "terapeutas" : "barbeiros";
}

/** Segundo segmento do path → nível de funil (topo/meio/base). */
export function nivelDoPath(pathname: string | null | undefined): Nivel {
  const sub = (pathname ?? "").split("/").filter(Boolean)[1];
  if (sub === "comecar") return "base";
  if (sub === "como-funciona") return "meio";
  // Uma one-pager percorre o funil INTEIRO numa rolagem, então ela não é "topo": quem está nela já
  // pode ter lido tudo. Classificada como topo, a barra fixa do mobile (StickyMobileCta) servia o
  // CTA mais fraco — "Ver como funciona" — apontando para FORA da one-pager, para uma página cujo
  // conteúdo ela contém inteiro. Era o único CTA permanentemente visível no celular.
  if (sub === "completa") return "base";
  return "topo";
}

/** Peso visual do CTA por nível: leve (topo) < média (meio) < forte (base). */
export type CtaPeso = "leve" | "media" | "forte";

export interface NivelCta {
  label: string;
  href: string;
  /** abre em nova aba (só o CTA de base, que aponta pro WhatsApp) */
  external: boolean;
  icon: "whatsapp" | "arrow";
  peso: CtaPeso;
}

/**
 * CTA apropriado ao nível do funil:
 *   • topo → leve: "Ver como funciona" (→ MEIO), sem preço, baixa fricção.
 *   • meio → média: "Começar agora" (→ BASE).
 *   • base → forte: WhatsApp ("Ativar minha agenda" / "Falar com a MAISA").
 */
export function ctaDoNivel(icp: ICP, nivel: Nivel): NivelCta {
  const cfg = ICPS[icp];
  switch (nivel) {
    case "base":
      return { label: cfg.ctaLabel, href: cfg.ctaUrl, external: true, icon: "whatsapp", peso: "forte" };
    case "meio":
      return { label: "Começar agora", href: cfg.rotas.base, external: false, icon: "arrow", peso: "media" };
    case "topo":
    default:
      return { label: cfg.ctaSecundarioLabel, href: cfg.rotas.meio, external: false, icon: "arrow", peso: "leve" };
  }
}
