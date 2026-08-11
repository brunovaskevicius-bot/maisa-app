/* O negócio de demonstração — um só, genérico, sem vertical. */

import type { Negocio, Prestador } from "@/nucleo/dominio/negocio";

export const NEGOCIO: Negocio = {
  nome: "Seu Negócio",
  plano: "Profissional",
  precoPlano: 149.9,
  proximaCobranca: "05/08/2026",
  cartao: "Cartão final 4417",
  conversasPlano: "Ilimitadas",
};

export const PRESTADOR: Prestador = {
  nome: "Seu Negócio — Atendimentos",
  doc: "CNPJ 47.227.217/0001-00",
};

/** Competência do fechamento que a tela de Faturamento mostra. */
export const PERIODO = "Junho de 2026";

export const NUMEROS_MES = {
  periodo: "Julho de 2026",
  resultado: [
    ["Faturamento", "R$ 18.240,00"],
    // 168 e não 407: 407 era a soma dos quatro profissionais, e a tela de Equipe
    // agora mostra 168. Dois números para a mesma coisa, discordando.
    ["Atendimentos", "168"],
    ["Ocupação média", "78%"],
    ["Novos clientes", "37"],
  ] as [string, string][],
  maisa: [
    ["Conversas atendidas", "1.284"],
    ["Resolvidas sem você", "87%"],
    ["Resposta média", "12s"],
  ] as [string, string][],
};

export const FATURAS = [
  ["jul/2026", "R$ 149,90 · paga"],
  ["jun/2026", "R$ 149,90 · paga"],
  ["mai/2026", "R$ 149,90 · paga"],
] as [string, string][];
