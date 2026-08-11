/* Quem é atendido, e o que já foi fechado no mês. */

import type { Cliente } from "@/nucleo/dominio/clientes";
import type { Nota } from "@/nucleo/dominio/fiscal";

export const CLIENTES: Cliente[] = [
  { id: "cl1", nome: "Mariana Alves", telefone: "(11) 98123-4567", email: "bruno.vaskevicius@polijunior.com.br", cpf: "312.456.789-01", canal: "Online", ativo: true, desde: "mar/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl2", nome: "Rafael Costa", telefone: "(11) 99876-1234", email: "bruno.vaskevicius@polijunior.com.br", cpf: "408.221.334-90", canal: "Presencial", ativo: true, desde: "jan/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl3", nome: "Beatriz Lima", telefone: "(11) 97654-3210", email: "bruno.vaskevicius@polijunior.com.br", cpf: "199.873.221-44", canal: "Online", ativo: true, desde: "set/2024", servicoId: "sv3", atendimentos: 10, valor: 1800 },
  { id: "cl4", nome: "Camila e Rodrigo", telefone: "(11) 99654-0099", email: "bruno.vaskevicius@polijunior.com.br", cpf: "221.667.880-12", canal: "Presencial", ativo: true, desde: "nov/2024", servicoId: "sv4", atendimentos: 5, valor: 750 },
  { id: "cl5", nome: "Lucas Martins", telefone: "(11) 98112-9087", email: "bruno.vaskevicius@polijunior.com.br", cpf: "389.220.115-67", canal: "Online", ativo: true, desde: "abr/2025", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl6", nome: "Fernanda Rocha", telefone: "(11) 99003-2211", email: "bruno.vaskevicius@polijunior.com.br", cpf: "470.118.226-05", canal: "Presencial", ativo: true, desde: "jun/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl7", nome: "Pedro Henrique", telefone: "(11) 98890-5544", email: "bruno.vaskevicius@polijunior.com.br", cpf: "612.334.778-21", canal: "Online", ativo: true, desde: "out/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl8", nome: "Juliana Dias", telefone: "(11) 97221-8866", email: "bruno.vaskevicius@polijunior.com.br", cpf: "298.554.110-78", canal: "Presencial", ativo: true, desde: "dez/2024", servicoId: "sv1", atendimentos: 8, valor: 800 },
  { id: "cl9", nome: "Gustavo Nunes", telefone: "(11) 99445-1100", email: "bruno.vaskevicius@polijunior.com.br", cpf: "334.876.220-09", canal: "Online", ativo: true, desde: "jun/2026", servicoId: "sv3", atendimentos: 8, valor: 1440 },
  { id: "cl10", nome: "Larissa Gomes", telefone: "(11) 98667-3322", email: "bruno.vaskevicius@polijunior.com.br", cpf: "145.998.667-30", canal: "Online", ativo: true, desde: "mai/2025", servicoId: "sv2", atendimentos: 8, valor: 480 },
  { id: "cl11", nome: "Thiago Barros", telefone: "(11) 99778-4455", email: "bruno.vaskevicius@polijunior.com.br", cpf: "502.117.889-64", canal: "Presencial", ativo: true, desde: "ago/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl12", nome: "Vinícius Carvalho", telefone: "(11) 98223-6677", email: "bruno.vaskevicius@polijunior.com.br", cpf: "677.443.221-18", canal: "Online", ativo: true, desde: "jan/2025", servicoId: "sv5", atendimentos: 8, valor: 640 },
  { id: "cl13", nome: "Anderson Reis", telefone: "(11) 99771-0342", email: "bruno.vaskevicius@polijunior.com.br", cpf: "556.221.998-73", canal: "Presencial", ativo: true, desde: "fev/2025", servicoId: "sv6", atendimentos: 7, valor: 490 },
  { id: "cl14", nome: "Sofia Ribeiro", telefone: "(11) 97334-9988", email: "bruno.vaskevicius@polijunior.com.br", cpf: "811.225.443-50", canal: "Online", ativo: false, desde: "mar/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
  { id: "cl15", nome: "Marcelo Tavares", telefone: "(11) 99110-2200", email: "bruno.vaskevicius@polijunior.com.br", cpf: "723.889.110-42", canal: "Presencial", ativo: false, desde: "jul/2023", servicoId: "sv2", atendimentos: 0, valor: 0 },
  { id: "cl16", nome: "Patrícia Mendes", telefone: "(11) 98556-7711", email: "bruno.vaskevicius@polijunior.com.br", cpf: "455.667.889-23", canal: "Online", ativo: false, desde: "fev/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
  // Tomador de teste da integração fiscal. CPF real e existente de propósito: a
  // prefeitura valida a existência do documento, e CPF inventado é rejeitado
  // antes de a integração ser exercitada. R$ 1,00 para o valor não importar.
  { id: "cl-teste", nome: "Bruno Vaskevicius", telefone: "(11) 99999-0000", email: "bruno.vaskevicius@polijunior.com.br", cpf: "545.739.088-89", canal: "Online", ativo: true, desde: "jul/2026", servicoId: "sv2", atendimentos: 1, valor: 1, teste: true },
];

/**
 * Quanto o store espera entre a autorização e o cancelamento automático da nota
 * de teste. Precisa ser curto (a nota real não deve viver) e longo o suficiente
 * para dar tempo de ver o número na tela e conferir na prefeitura.
 */
export const TESTE_CANCELA_APOS_MS = 25_000;

/** Notas já fechadas antes do app abrir — o resto começa em "pendente". */
export const NOTAS_INICIAIS: Record<string, Nota> = {
  cl1: { status: "emitida", numero: "2026/000112", data: "30/06/2026" },
  cl2: { status: "emitida", numero: "2026/000113", data: "30/06/2026" },
  cl3: { status: "emitida", numero: "2026/000114", data: "30/06/2026" },
  cl4: { status: "emitida", numero: "2026/000115", data: "30/06/2026" },
  cl8: { status: "emitida", numero: "2026/000116", data: "30/06/2026" },
};

/** Primeiro número que a emissão simulada usa (continua de onde as iniciais param). */
export const PROXIMO_NUMERO = 117;
