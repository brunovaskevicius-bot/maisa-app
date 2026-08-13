/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — horário anunciado em memória.
 *
 * Irmão de `assistente-repo.ts`, com uma diferença que importa: aqui a escrita SUBSTITUI
 * a semana inteira, sem merge. É a semântica da porta, e o demo tem que respeitá-la —
 * um demo que fizesse merge deixaria passar uma tela que manda três dias em vez de sete.
 *
 * O padrão de partida é derivado de `DIAS_PADRAO`, a mesma fixture que a tela usava
 * quando o horário morava no `localStorage`. Continua sendo o desenho de demonstração; o
 * que mudou é que deixou de ser a resposta para todo inquilino real.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { SemanaAnunciada } from "@/nucleo/dominio/horarios";
import type { RepositorioHorarios } from "@/nucleo/portas/saida/repositorio-horarios";
import { DIAS_PADRAO } from "./assistente";

const porTenant = new Map<string, SemanaAnunciada>();

/** `DIAS_PADRAO` fala a língua da tela antiga (`nome`, `"—"`); aqui vira domínio. */
const partida = (): SemanaAnunciada =>
  DIAS_PADRAO.map((d, dow) => ({
    dow,
    aberto: d.aberto,
    de: d.aberto ? d.de : null,
    ate: d.aberto ? d.ate : null,
  }));

export const horariosDemo: RepositorioHorarios = {
  async ler(t: ContextoTenant): Promise<SemanaAnunciada | null> {
    return porTenant.get(t.tenantId) ?? partida();
  },

  async salvar(t: ContextoTenant, semana: SemanaAnunciada): Promise<SemanaAnunciada> {
    /* Cópia, e não a referência recebida: sem isto, quem chamou continuaria segurando um
     * ponteiro para o "banco" e poderia alterá-lo depois do salvamento. É mentira que o
     * Postgres não conta, e o demo existe para não ensinar mentira. */
    const nova = semana.map((d) => ({ ...d }));
    porTenant.set(t.tenantId, nova);
    return nova.map((d) => ({ ...d }));
  },
};
