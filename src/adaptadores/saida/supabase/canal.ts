/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `integracoes_whatsapp`.
 *
 * ⚠️ `.eq("tenant_id", …)` em toda consulta, e no upsert o `tenant_id` vai no corpo.
 * Mesma razão dos outros adaptadores: quando o ator é o agente, `clienteDoContexto`
 * devolve service role e a RLS sai de cena — o filtro no código passa a ser a única
 * fronteira. Aqui isso é mais grave que no resto: um erro nesta tabela não vaza leitura,
 * vaza CONVERSA — associaria a instância de um negócio ao inquilino de outro, e as
 * mensagens dos clientes de um apareceriam no painel do outro.
 *
 * A DDL protege o pior caso com `instancia text not null unique` (`002:740`): mesmo com
 * um bug aqui, dois inquilinos não conseguem reivindicar a mesma instância — o insert
 * falha em vez de sobrescrever em silêncio.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Canal, StatusDoCanal } from "@/nucleo/dominio/canal";
import type { RepositorioCanal } from "@/nucleo/portas/saida/repositorio-canal";
import { FalhaDoProvedor } from "@/nucleo/dominio/erros";
import { clienteDoContexto } from "./contexto-cliente";

const COLS = "instancia, numero, status, conectado_em";

type Linha = {
  instancia: string;
  numero: string | null;
  status: string;
  conectado_em: string | null;
};

const paraCanal = (l: Linha): Canal => ({
  instancia: l.instancia,
  numero: l.numero,
  status: l.status as StatusDoCanal,
  conectadoEm: l.conectado_em,
});

export const canalSupabase: RepositorioCanal = {
  async ler(t: ContextoTenant): Promise<Canal | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .select(COLS)
      .eq("tenant_id", t.tenantId)
      .maybeSingle<Linha>();

    if (error) throw new FalhaDoProvedor(`Não foi possível ler o canal: ${error.message}`);
    return data ? paraCanal(data) : null;
  },

  async salvar(t, p): Promise<Canal> {
    const agora = new Date().toISOString();
    const supabase = clienteDoContexto(t);

    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .upsert(
        {
          tenant_id: t.tenantId,
          instancia: p.instancia,
          status: p.status,
          numero: p.numero ?? null,
          /* Só carimba quando FICOU conectado. Manter o carimbo antigo numa queda seria
           * dizer que a conexão dura desde então, e essa data é o que responde "há quanto
           * tempo isso está no ar?" — a pergunta de todo suporte. */
          conectado_em: p.status === "conectado" ? agora : null,
          atualizado_em: agora,
        },
        { onConflict: "tenant_id" },
      )
      .select(COLS)
      .maybeSingle<Linha>();

    if (error) {
      /* 23505 = unique_violation, e aqui ela tem UM significado: o nome de instância já
       * pertence a outro inquilino. Vale uma frase própria porque a mensagem crua do
       * Postgres ("duplicate key value violates unique constraint") manda procurar bug de
       * banco quando o problema é de negócio. */
      if ((error as { code?: string }).code === "23505") {
        throw new FalhaDoProvedor(
          `A instância "${p.instancia}" já está vinculada a outro negócio.`,
        );
      }
      throw new FalhaDoProvedor(`Não foi possível salvar o canal: ${error.message}`);
    }
    if (!data) throw new FalhaDoProvedor("O canal foi salvo, mas o banco não devolveu a linha.");
    return paraCanal(data);
  },
};
