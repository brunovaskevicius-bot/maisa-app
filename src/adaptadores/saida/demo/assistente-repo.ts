/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — ajustes da assistente em memória.
 *
 * Guarda um estado por inquilino no processo. Some no restart, e é a intenção.
 *
 * O que ele preserva com fidelidade é a SEMÂNTICA DO PATCH PARCIAL: mandar
 * `{ cfg: { pix: true } }` mexe em `pix` e em nada mais. Sem isto, o merge parcial só
 * seria exercitado contra o Postgres — e é justamente a parte que, quando erra, erra
 * apagando configuração que o cliente escreveu.
 *
 * Note que ele parte de `ASSISTENTE_PADRAO`/`CFG_PADRAO`, os mesmos valores que a fixture
 * servia ao agente antes deste passo. Aqui eles continuam sendo padrão de demonstração —
 * o que mudou é que deixaram de ser a resposta para todo inquilino real.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type {
  AjustesDaAssistente, AjustesParciais, RepositorioAssistente,
} from "@/nucleo/portas/saida/repositorio-assistente";
import { ASSISTENTE_PADRAO, CFG_PADRAO } from "./assistente";

const porTenant = new Map<string, AjustesDaAssistente>();

const partida = (): AjustesDaAssistente => ({
  assistente: { ...ASSISTENTE_PADRAO },
  cfg: { ...CFG_PADRAO },
});

export const assistenteDemo: RepositorioAssistente = {
  async ler(t: ContextoTenant): Promise<AjustesDaAssistente | null> {
    return porTenant.get(t.tenantId) ?? partida();
  },

  async salvar(t: ContextoTenant, p: AjustesParciais): Promise<AjustesDaAssistente> {
    const atual = porTenant.get(t.tenantId) ?? partida();

    const novo: AjustesDaAssistente = {
      assistente: { ...atual.assistente, ...(p.assistente ?? {}) },
      cfg: { ...atual.cfg, ...(p.cfg ?? {}) },
    };

    porTenant.set(t.tenantId, novo);
    return novo;
  },
};
