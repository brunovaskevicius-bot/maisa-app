/* Quem atende, e quando. */

import type { Profissional } from "@/nucleo/dominio/catalogo";
import type { Expediente } from "@/nucleo/dominio/expediente";
import { atendeNoDia, podeComecarEm } from "@/nucleo/dominio/expediente";

/* UM profissional só, e é de propósito.
 *
 * A agenda do Google do `pr1` é a fonte da verdade dos atendimentos (conectada em
 * 06/08/2026), e uma agenda real de UMA pessoa não convive com três colegas
 * fictícios: as outras colunas mostrariam atendimentos que não existem em lugar
 * nenhum. Quem quiser a equipe de volta traz junto uma conexão por pessoa.
 *
 * Os serviços de pr2/pr3/pr4 foram absorvidos no catálogo para nenhum serviço ficar
 * sem quem o faça. */
export const EQUIPE: Profissional[] = [
  { id: "pr1", nome: "Rafael Antunes", papel: "Atendimento geral", atendimentosMes: 168, avaliacao: 4.9, comissao: 50, desde: "jan/2024", servicoIds: ["sv1", "sv2", "sv3", "sv4", "sv5", "sv6", "sv7"], ativo: true, horario: "Seg–Sáb 09–19", folga: "domingo" },
];

/**
 * Profissionais que aparecem como coluna na grade da Agenda.
 *
 * ⚠️ É TAMBÉM a allowlist do servidor (`RepositorioNegocio.agendasPermitidas`): só ids
 * daqui podem conectar uma agenda, ler ou criar evento. A exceção é o DESCONECTAR, que
 * aceita qualquer `pr…` de propósito — senão uma conexão antiga em pr2/pr3 viraria uma
 * linha impossível de apagar, segurando um refresh token vivo e invisível. O RLS já
 * garante que ninguém apaga a linha de outro.
 */
export const COLUNAS_AGENDA = ["pr1"];

/** O expediente estruturado de cada um. Ver `dominio/expediente.ts` para o porquê. */
export const EXPEDIENTE: Record<string, Expediente> = {
  pr1: { folga: [6], de: 9, ate: 19 },     // Seg–Sáb 09–19 · folga domingo
};

/* Atalhos por id, para quem já está dentro do inquilino de demonstração (a UI).
   O núcleo NÃO usa estes: ele passa pelo repositório, que recebe o contexto do tenant. */
export const atende = (profissionalId: string, data: string) =>
  atendeNoDia(EXPEDIENTE[profissionalId], data);

export const podeComecar = (profissionalId: string, data: string, inicio: number) =>
  podeComecarEm(EXPEDIENTE[profissionalId], data, inicio);
