/* ----------------------------------------------------------------------------
 * Biblioteca de SEÇÕES do ICP barbeiros/cabeleireiros. As 3 páginas do funil
 * (topo `/barbeiros`, meio `/barbeiros/como-funciona`, base `/barbeiros/comecar`)
 * COMPÕEM um subconjunto destas seções e variam a ênfase por props (variant/nivel).
 *
 * Cada seção já renderiza o seu próprio <section> com ritmo vertical do mundo —
 * as páginas NÃO precisam envolver em <Section>. Basta importar daqui:
 *
 *   import {
 *     HeroBarbeiros, ProblemaBarbeiros, ComoFuncionaBarbeiros, RecursosBarbeiros,
 *     AntesDepoisBarbeiros, DepoimentosBarbeiros, PlanosBarbeiros, FaqBarbeiros,
 *   } from "@/app/(marketing)/_lib/barbeiros";
 *
 * Todas leem os tokens --mk-* do <World icp="barbeiros"> que envolve a página.
 * -------------------------------------------------------------------------- */
export { HeroBarbeiros, type HeroBarbeirosProps } from "./HeroBarbeiros";
export { ProblemaBarbeiros, type ProblemaBarbeirosProps } from "./ProblemaBarbeiros";
export { ComoFuncionaBarbeiros, type ComoFuncionaBarbeirosProps } from "./ComoFuncionaBarbeiros";
export { RecursosBarbeiros, type RecursosBarbeirosProps } from "./RecursosBarbeiros";
export { AntesDepoisBarbeiros, type AntesDepoisBarbeirosProps } from "./AntesDepoisBarbeiros";
export { DepoimentosBarbeiros, type DepoimentosBarbeirosProps } from "./DepoimentosBarbeiros";
export { PlanosBarbeiros, type PlanosBarbeirosProps } from "./PlanosBarbeiros";
export { FaqBarbeiros, type FaqBarbeirosProps } from "./FaqBarbeiros";
