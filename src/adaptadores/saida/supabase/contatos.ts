/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — o caderno de nomes, no Postgres. ⚠️ SÓ SERVIDOR.
 *
 * Tabela `contatos` e a coluna `integracoes_whatsapp.modo` (DDL em `supabase/013_contatos.sql`
 * — o arquivo é a verdade, não esta prosa).
 *
 * ⚠️ `.eq("tenant_id", …)` EM TODA CONSULTA, E AQUI ELE É O CINTO ÚNICO.
 *
 * Quem lê isto no caminho quente é o AGENTE, e o webhook não tem cookie: `auth.uid()` é NULL,
 * nenhuma política de `authenticated` se aplica, e `clienteDoContexto(t)` devolve service
 * role. A RLS sai de cena exatamente no caminho que mais importa. Perder o filtro aqui não
 * vaza leitura — faz a MAISA calar para o cliente de um negócio porque o PAI do dono de outro
 * tem um número parecido.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RascunhoDeContato, RepositorioContatos } from "@/nucleo/portas/saida/repositorio-contatos";
import type { Contato, ModoDoNumero } from "@/nucleo/dominio/contatos";
import { ehModoDoNumero } from "@/nucleo/dominio/contatos";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { clienteDoContexto } from "./contexto-cliente";

const TABELA = "contatos";

type Linha = {
  telefone_chave: string;
  nome: string | null;
  telefone: string | null;
  cliente: boolean | null;
};

const paraContato = (l: Linha): Contato => ({
  chave: l.telefone_chave,
  nome: l.nome,
  cliente: l.cliente,
});

export const contatosSupabase: RepositorioContatos = {
  async ler(t: ContextoTenant, chave: string): Promise<Contato | null> {
    if (!chave) return null;
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from(TABELA)
      .select("telefone_chave, nome, telefone, cliente")
      .eq("tenant_id", t.tenantId)
      .eq("telefone_chave", chave)
      .maybeSingle<Linha>();

    /* Lança, e quem chama decide degradar. `criarAvaliarAtendimento` tem um `catch` que
     * responde "pode" — a decisão de falhar aberta é DELE, com o motivo escrito lá. Engolir
     * aqui esconderia a causa e faria os dois lugares decidirem a mesma coisa. */
    if (error) throw new Error(error.message);
    return data ? paraContato(data) : null;
  },

  async listar(t: ContextoTenant): Promise<Contato[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from(TABELA)
      .select("telefone_chave, nome, telefone, cliente")
      .eq("tenant_id", t.tenantId)
      /* Cliente marcado primeiro, e depois por nome: numa agenda de 374 pessoas, as poucas
       * que o dono marcou são as que ele volta para conferir. `nullsFirst: false` para quem
       * não tem nome não abrir a lista. */
      .order("cliente", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((l) => paraContato(l as Linha));
  },

  /**
   * ⚠️ O UPSERT NÃO TOCA EM `cliente`, e essa é a linha mais importante deste arquivo.
   *
   * O dono troca de celular, a agenda volta com 400 nomes, e a reimportação passa por cima
   * de tudo: se `cliente` entrasse no corpo do upsert, todas as marcações voltariam a `null`
   * e a MAISA passaria a calar para os clientes dele — silenciosamente, no modo pessoal.
   *
   * `ignoreDuplicates: false` com a lista de colunas restrita é o que dá "atualiza nome e
   * telefone, preserva a decisão". A alternativa (ler tudo, comparar, escrever a diferença)
   * seriam duas idas ao banco para o mesmo efeito.
   */
  async salvarLote(t: ContextoTenant, contatos: readonly RascunhoDeContato[]) {
    const supabase = clienteDoContexto(t);

    /* Quantos já existiam ANTES: é a única forma de responder "quantos são novos" sem uma
     * segunda consulta por linha. `head` + `count` não traz payload. */
    const { count: antes, error: erroConta } = await supabase
      .from(TABELA)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", t.tenantId);
    if (erroConta) throw new Error(erroConta.message);

    if (contatos.length === 0) return { novos: 0, total: antes ?? 0 };

    const { error } = await supabase
      .from(TABELA)
      .upsert(
        contatos.map((c) => ({
          tenant_id: t.tenantId,
          telefone_chave: c.chave,
          nome: c.nome,
          telefone: c.telefone,
          origem: "importado",
        })),
        { onConflict: "tenant_id,telefone_chave" },
      );
    if (error) throw new Error(error.message);

    const { count: depois, error: erroDepois } = await supabase
      .from(TABELA)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", t.tenantId);
    if (erroDepois) throw new Error(erroDepois.message);

    return { novos: Math.max(0, (depois ?? 0) - (antes ?? 0)), total: depois ?? 0 };
  },

  /**
   * Marca, criando a linha se não existir.
   *
   * ⚠️ `origem: "manual"` de propósito: quem foi tocado à mão fica distinguível do lote
   * importado. É o que permitirá, depois, uma reimportação saber que não deve mexer.
   *
   * Aqui `cliente` VAI no corpo — é exatamente o campo que este método existe para escrever.
   * O `coalesce` de nome/telefone é feito em JS porque o upsert do PostgREST substitui a
   * linha: mandar `nome: null` num contato que já tinha nome apagaria o nome. Só manda o que
   * chegou preenchido.
   */
  async marcar(t: ContextoTenant, p: { chave: string; nome?: string | null; telefone?: string | null; cliente: boolean | null }) {
    const supabase = clienteDoContexto(t);

    const atual = await this.ler(t, p.chave);
    const corpo: Record<string, unknown> = {
      tenant_id: t.tenantId,
      telefone_chave: p.chave,
      cliente: p.cliente,
      origem: "manual",
      nome: p.nome ?? atual?.nome ?? null,
    };
    if (p.telefone) corpo.telefone = p.telefone;

    const { data, error } = await supabase
      .from(TABELA)
      .upsert(corpo, { onConflict: "tenant_id,telefone_chave" })
      /* ⚠️ `.select("telefone_chave")` e zero linhas = recusado. Um upsert barrado por RLS
       * volta SEM erro e SEM linha — o silêncio é o modo de falha, e sem esta checagem a
       * tela diria "marcado" e reverteria no reload. É o padrão do `renomear`. */
      .select("telefone_chave");

    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("A gravação do contato foi recusada (RLS ou papel insuficiente).");
  },

  async modo(t: ContextoTenant): Promise<ModoDoNumero | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .select("modo")
      .eq("tenant_id", t.tenantId)
      .maybeSingle<{ modo: string }>();

    if (error) throw new Error(error.message);
    if (!data) return null;
    /* Valor fora do vocabulário volta `null`, e quem chama cai no `MODO_PADRAO` (`pessoal`).
     * O `check` da coluna já impede isso no banco; a guarda existe para o dia em que alguém
     * acrescentar um modo no SQL e esquecer do domínio — e aí o erro barato é calar. */
    return ehModoDoNumero(data.modo) ? data.modo : null;
  },

  async definirModo(t: ContextoTenant, modo: ModoDoNumero): Promise<void> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .update({ modo })
      .eq("tenant_id", t.tenantId)
      .select("tenant_id");

    if (error) throw new Error(error.message);
    /* Zero linhas aqui significa que não há canal — e não "deu certo". Sem WhatsApp pareado
     * não existe número de que decidir o modo, e a tela precisa dizer isso em vez de fingir
     * que salvou. */
    if (!data?.length) {
      throw new Error("Não há WhatsApp conectado neste negócio — conecte antes de escolher de quem é o número.");
    }
  },
};
