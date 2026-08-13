/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — criar negócio sem banco.
 *
 * Existe pela mesma razão que os outros adaptadores demo: o fluxo de cadastro é o que
 * mais precisa ser afinado por `curl`, e seria o único do app que não abre sem Supabase.
 *
 * Guarda os negócios criados em memória do processo. Some no restart, e isso é a
 * intenção — é demonstração, não persistência. O que ele reproduz fielmente é o formato
 * das RESPOSTAS, inclusive o teto: sem isso, `limite_de_negocios` seria um caminho que
 * ninguém nunca percorre até um cliente real bater nele em produção.
 * ────────────────────────────────────────────────────────────────────────────── */

import { randomUUID } from "crypto";
import type {
  IdentidadeDaSessao, NegocioCriado, PedidoDeNegocio, ProvisionadorDeNegocio,
} from "@/nucleo/portas/saida/provisionador-negocio";

/** Mesmo teto de `criar_negocio()` (`005_provisionar.sql:299`). */
const TETO_POR_PESSOA = 10;

const criados = new Map<string, string[]>();

export const provisionadorDemo: ProvisionadorDeNegocio = {
  faltando: () => [],

  async criar(sessao: IdentidadeDaSessao, p: PedidoDeNegocio): Promise<NegocioCriado> {
    const meus = criados.get(sessao.usuarioId) ?? [];
    if (meus.length >= TETO_POR_PESSOA) return { ok: false, motivo: "limite_de_negocios" };

    const tenantId = randomUUID();
    criados.set(sessao.usuarioId, [...meus, tenantId]);

    console.info(
      `[demo/provisionador] negócio "${p.nome}" (${p.vertical}) criado para ${sessao.usuarioId} → ${tenantId}`,
    );
    return { ok: true, tenantId };
  },
};
