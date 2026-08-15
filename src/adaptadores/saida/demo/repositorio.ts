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
import type { Cliente } from "@/nucleo/dominio/clientes";
import { soDigitos } from "@/nucleo/dominio/clientes";
import { NEGOCIO } from "./negocio";
import { COLUNAS_AGENDA, EQUIPE, EXPEDIENTE } from "./equipe";
import { SERVICOS } from "./catalogo";
import { CLIENTES } from "./clientes";

/* O nome do negócio de demonstração, editável.
 *
 * O fixture `NEGOCIO` é uma constante compartilhada — mutá-lo faria a mudança vazar para
 * todo módulo que o importa (a persona do agente, a saudação padrão do store), o que num
 * adaptador de demonstração é confusão pura: o dono renomeia numa aba e outra tela muda
 * sozinha. Guardar o nome AQUI mantém a mutação dentro deste adaptador, que é o único
 * que tem estado. Reinicia no processo, como todo o resto do demo. */
let nomeDemo = NEGOCIO.nome;

export const repositorioDemo: RepositorioNegocio = {
  async negocio() {
    return { ...NEGOCIO, nome: nomeDemo };
  },

  /* Sem checagem de permissão: no demo existe um negócio e um usuário, e todo mundo é
   * dono. Quem prova a regra de "só dono ou gestor" é a RLS, e ela vive no Postgres —
   * imitá-la aqui daria uma segunda cópia da autorização, que é exatamente o que a
   * arquitetura deste repo não quer. */
  async renomear(_t, nome) {
    nomeDemo = nome;
    return { ...NEGOCIO, nome: nomeDemo };
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

  /* As listas. Cópias rasas, não os arrays em si: devolver a referência do fixture deixa
   * quem consome mutar o "banco" — e um `.sort()` numa tela reordenaria o catálogo para o
   * processo inteiro, inclusive para o agente de WhatsApp. Barato aqui, e é o
   * comportamento que o adaptador real tem de graça (cada consulta traz linhas novas). */

  async profissionais() {
    return [...EQUIPE];
  },

  async servicos() {
    return [...SERVICOS];
  },

  async clientes() {
    return [...CLIENTES];
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

  /**
   * Acha ou cria — e aqui "criar" é MUTAR O FIXTURE, que é o único jeito de o modo
   * demonstração exercitar o caminho de verdade.
   *
   * ⚠️ Contradiz de propósito a nota das listas acima ("cópias rasas, para quem consome
   * não mutar o banco"). Lá o `[...]` protege o fixture de uma tela que faz `.sort()`;
   * aqui o fixture É o banco, e escrever nele é o comportamento correto. Sem isto, o
   * caminho "cliente novo marca pelo WhatsApp" não existiria no laboratório — e ele é
   * justamente o que decide a primeira impressão do produto.
   *
   * O preço: o cliente criado morre no fim do processo, como todo o resto do modo demo.
   * O "Esquecer tudo" do laboratório não o remove — quem quiser voltar ao estado limpo
   * reinicia o `next dev`.
   */
  async garantirCliente(t, p) {
    const existente = await repositorioDemo.clientePorTelefone(t, p.telefone);
    if (existente) return existente;
    if (soDigitos(p.telefone).length < 8) return null;

    const novo: Cliente = {
      id: `cl-demo-${soDigitos(p.telefone).slice(-8)}`,
      nome: p.nome.trim().slice(0, 120) || "Cliente",
      telefone: p.telefone,
      email: "",
      cpf: "",
      canal: "Online",
      ativo: true,
      desde: MES_ATUAL,
      servicoId: "",
      atendimentos: 0,
      valor: 0,
    };
    CLIENTES.push(novo);
    return novo;
  },
};

/** `mar/2026` — o formato que `Cliente.desde` usa na tela (ver o adaptador Supabase). */
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const agora = new Date();
const MES_ATUAL = `${MESES_CURTOS[agora.getMonth()]}/${agora.getFullYear()}`;
