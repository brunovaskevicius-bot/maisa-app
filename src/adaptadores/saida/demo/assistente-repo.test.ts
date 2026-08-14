/* ─────────────────────────────────────────────────────────────────────────────
 * O ADAPTADOR DE MENTIRA tem que se comportar como o de verdade.
 *
 * Ele existe para afinar a tela sem banco. Se a semântica divergir, todo ajuste feito
 * contra o demo é ajuste contra um comportamento que a produção não tem — e a diferença
 * só aparece no cliente. Por isso o merge parcial e o isolamento de inquilino são
 * testados aqui, e não só no caso de uso.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it } from "vitest";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { assistenteDemo } from "./assistente-repo";

const t: ContextoTenant = { tenantId: "t1", usuarioId: "u1", ator: { tipo: "usuario", id: "u1" } };

describe("assistenteDemo", () => {
  it("faz merge parcial e persiste entre chamadas", async () => {
    const d1 = await assistenteDemo.salvar(t, { cfg: { encaixe: true } });
    expect(d1.cfg.encaixe).toBe(true);
    expect(d1.cfg.confirmar).toBe(true);

    const d2 = await assistenteDemo.salvar(t, { assistente: { ativa: false } });
    expect(d2.assistente.ativa).toBe(false);
    expect(d2.cfg.encaixe).toBe(true);
  });

  /* ISOLAMENTO DE INQUILINO no adaptador de mentira também.
   *
   * Um demo que vazasse entre inquilinos faria o vazamento parecer normal para quem
   * desenvolve — e é assim que uma regra de isolamento morre: não por alguém decidir
   * removê-la, mas por ninguém nunca ter visto o comportamento correto. */
  it("outro inquilino não enxerga o ajuste do primeiro", async () => {
    await assistenteDemo.salvar(t, { cfg: { encaixe: true } });

    const outro = await assistenteDemo.ler({ ...t, tenantId: "t2" });

    expect(outro?.cfg.encaixe).toBe(false);
  });
});
