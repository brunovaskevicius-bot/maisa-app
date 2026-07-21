/* ----------------------------------------------------------------------------
 * Configuração por ICP (público). Fonte única de rotas, rótulos, navegação e do
 * CTA de WhatsApp para as 6 landing pages. Módulo puro (sem "use client"): pode
 * ser importado por Server e Client Components.
 * -------------------------------------------------------------------------- */

export type ICP = "barbeiros" | "terapeutas";
export type Nivel = "topo" | "meio" | "base";

/* Número placeholder da MAISA no WhatsApp. Formato E.164 sem o "+"
 * (ex.: 5511999999999). >>> TROCAR pelo número real antes de publicar <<< */
export const WHATSAPP_NUMERO = "5500000000000";

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
