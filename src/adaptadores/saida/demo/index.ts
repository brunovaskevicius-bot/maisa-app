/* ─────────────────────────────────────────────────────────────────────────────
 * O DADO DO APP, num import só. É o antigo `src/lib/data.ts`, agora no lugar certo.
 *
 * A UI faz `import * as D from "@/adaptadores/saida/demo"` e continua escrevendo
 * `D.CLIENTES`, `D.HOJE`, `D.hhmm` como sempre. O caminho é longo de propósito: ele
 * DENUNCIA, em toda tela, que aquela tela ainda lê de um adaptador de fixtures em vez
 * de passar por um caso de uso. É a dívida conhecida da reorganização (ver
 * ARQUITETURA.md → "O que ficou faltando").
 *
 * O barrel reexporta o domínio inteiro junto: os fixtures são TIPADOS por ele, e
 * separar os dois em dois imports só faria toda tela importar duas coisas para usar
 * `D.Servico` e `D.SERVICOS` lado a lado.
 * ────────────────────────────────────────────────────────────────────────────── */

export * from "@/nucleo/dominio";

export * from "./negocio";
export * from "./equipe";
export * from "./catalogo";
export * from "./clientes";
export * from "./conversas";
export * from "./assistente";
export * from "./consultas";
export { repositorioDemo } from "./repositorio";
