/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RegistroDeAtendimentos` em memória.
 *
 * O par de `saida/supabase/atendimentos.ts`, e ele existe pela mesma razão que os outros
 * fallbacks deste diretório: sem ele, um ambiente sem banco não exercitaria o caminho de
 * gravação do espelho. O `agendar-atendimento.ts` chamaria uma porta ausente, e a
 * diferença entre os dois modos deixaria de ser "onde o dado mora" para virar "quais
 * linhas de código rodam" — que é exatamente o tipo de divergência que faz um bug só
 * aparecer em produção.
 *
 * ⚠️ Não é banco: morre no fim do processo e não é compartilhado entre instâncias. Serve
 * a UMA coisa concreta — dar ao laboratório de conversa (`/laboratorio`) o que a MAISA
 * registrou, para se ver que o espelho foi escrito com o ator certo.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RegistroDeAtendimentos, LinhaDeAtendimento } from "@/nucleo/portas/saida/registro-atendimentos";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { rotuloDoAtor } from "@/nucleo/dominio/tenant";

export type EspelhoEmMemoria = LinhaDeAtendimento & {
  tenantId: string;
  ator: string;
  situacao: "marcado" | "cancelado";
};

/**
 * Chaveado por `tenantId|maisaAg` — a mesma chave que o `unique` da tabela real usa, para
 * a idempotência se comportar igual nos dois modos.
 *
 * Objeto e não `Map` porque o `target` do `tsconfig` deste projeto não habilita iteração de
 * `Map` (TS2802), e `Object.values` resolve sem ligar `downlevelIteration` para o repo
 * inteiro por causa de um fixture.
 */
let LINHAS: Record<string, EspelhoEmMemoria> = {};

export const registroDemo: RegistroDeAtendimentos = {
  async registrar(t: ContextoTenant, a: LinhaDeAtendimento): Promise<void> {
    LINHAS[`${t.tenantId}|${a.maisaAg}`] = {
      ...a,
      tenantId: t.tenantId,
      ator: rotuloDoAtor(t.ator),
      situacao: "marcado",
    };
  },

  async cancelar(t: ContextoTenant, p: { eventoId: string }): Promise<void> {
    Object.keys(LINHAS).forEach((chave) => {
      const linha = LINHAS[chave];
      if (linha.tenantId === t.tenantId && linha.eventoId === p.eventoId) {
        LINHAS[chave] = { ...linha, situacao: "cancelado" };
      }
    });
  },
};

/** O que a MAISA registrou neste processo. Só o laboratório lê. */
export const espelhoDemo = (tenantId: string): EspelhoEmMemoria[] =>
  Object.values(LINHAS)
    .filter((l) => l.tenantId === tenantId)
    .sort((a, b) => a.inicioISO.localeCompare(b.inicioISO));

/** O "Esquecer tudo" do laboratório. */
export const zerarEspelhoDemo = (): void => {
  LINHAS = {};
};
