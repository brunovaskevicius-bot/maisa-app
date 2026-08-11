/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RepositorioNegocio` servido pelos fixtures.
 *
 * É o que faz os casos de uso rodarem hoje, sem banco. Ele IGNORA o `ContextoTenant`
 * que recebe, e isso é uma limitação declarada, não um esquecimento: existe um negócio
 * só. A assinatura já pede o contexto para que a troca por um repositório Supabase seja
 * um `new RepositorioSupabase()` em `src/composicao.ts` — e nada mais no app inteiro.
 *
 * O QUE MUDA QUANDO O BANCO ENTRAR (ver `supabase/` na raiz do repo):
 *   • tabelas `negocios`, `membros`, `profissionais`, `servicos`, `clientes`, com
 *     `tenant_id` em todas e RLS por membro do negócio;
 *   • `agendasPermitidas` vira `select id from profissionais where tenant_id = …`, e
 *     deixa de ser uma constante no código;
 *   • `clientePorTelefone` ganha índice — é a busca quente do agente de WhatsApp.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RepositorioNegocio } from "@/nucleo/portas/saida/repositorio-negocio";
import { soDigitos } from "@/nucleo/dominio/clientes";
import { NEGOCIO } from "./negocio";
import { COLUNAS_AGENDA, EQUIPE, EXPEDIENTE } from "./equipe";
import { SERVICOS } from "./catalogo";
import { CLIENTES } from "./clientes";

export const repositorioDemo: RepositorioNegocio = {
  async negocio() {
    return NEGOCIO;
  },

  async profissional(_t, id) {
    return EQUIPE.find((p) => p.id === id) ?? null;
  },

  async servico(_t, id) {
    return SERVICOS.find((s) => s.id === id) ?? null;
  },

  async cliente(_t, id) {
    return CLIENTES.find((c) => c.id === id) ?? null;
  },

  async expediente(_t, profissionalId) {
    return EXPEDIENTE[profissionalId] ?? null;
  },

  async agendasPermitidas() {
    return COLUNAS_AGENDA;
  },

  async clientePorTelefone(_t, telefone) {
    // Compara só dígitos: o fixture guarda "(11) 98123-4567" e o WhatsApp vai mandar
    // "5511981234567". Os 8 últimos bastam — DDI e o nono dígito são justamente o que
    // varia entre as duas grafias do mesmo número.
    const alvo = soDigitos(telefone).slice(-8);
    if (alvo.length < 8) return null;
    return CLIENTES.find((c) => soDigitos(c.telefone).slice(-8) === alvo) ?? null;
  },
};
