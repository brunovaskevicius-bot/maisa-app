/* ----------------------------------------------------------------------------
 * Biblioteca de SEÇÕES do funil TERAPEUTAS. As 3 páginas (topo/meio/base)
 * compõem subconjuntos destas seções e variam a ênfase pela prop `nivel`.
 * As páginas (Server Components) importam daqui:
 *   import { Hero, Problema, ComoFunciona, Recursos, AntesDepois,
 *            Depoimentos, Planos, FAQ } from "@/app/(marketing)/_lib/terapeutas";
 * Componentes globais (World, MarketingNav, Footer, CTASection, Section, Button,
 * imagens, ICPS…) continuam vindo de "@/app/(marketing)/_lib".
 * -------------------------------------------------------------------------- */
export { Hero, type HeroProps } from "./Hero";
export { Problema, type ProblemaProps, type DorItem } from "./Problema";
export { ComoFunciona, type ComoFuncionaProps, type Passo } from "./ComoFunciona";
export { Recursos, type RecursosProps, type Beneficio } from "./Recursos";
export { AntesDepois, type AntesDepoisProps } from "./AntesDepois";
export { Depoimentos, type DepoimentosProps, type Sinal } from "./Depoimentos";
export { Planos, type PlanosProps, type Plano } from "./Planos";
export { FAQ, type FAQProps, type QA } from "./FAQ";

/* Utilitários de seção reaproveitáveis pelas páginas, se precisarem compor à mão. */
export { TIcon, IconBadge, Pill, linkKind, type Tone, type SecaoBase } from "./_shared";
