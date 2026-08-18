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

const COLS = "instancia, numero, status, conectado_em, telefone_dono";

/* ⚠️ AS COLUNAS SEM `telefone_dono`, PARA O CASO DE A 017 AINDA NÃO TER RODADO.
 *
 * Isto não é paranoia: código e migração são publicados por caminhos DIFERENTES. O push na
 * `main` sobe para a Vercel em segundos; o SQL é alguém abrindo o Supabase e colando.
 * Entre uma coisa e outra existe uma janela, e nela o PostgREST responde 42703 ("column
 * does not exist") para o SELECT inteiro — não devolve a linha sem a coluna, FALHA.
 *
 * O estrago dessa janela é máximo, e é o que obriga o fallback: `instanciaDoInquilino`
 * (`composicao.ts`) resolve a instância chamando este `ler`. Se ele lança, o agente não
 * descobre por qual WhatsApp responder — e a MAISA fica muda para TODO MUNDO até alguém
 * rodar o SQL. Um deploy que derruba o produto até a migração ser aplicada à mão é
 * exatamente o tipo de acoplamento que não se deve aceitar em troca de uma coluna nova.
 */
const COLS_SEM_DONO = "instancia, numero, status, conectado_em";

/** 42703 = undefined_column. É o único erro que este fallback deve engolir: qualquer outro
 *  (permissão, rede, tabela ausente) precisa continuar subindo com a mensagem original. */
const COLUNA_INEXISTENTE = "42703";

type Linha = {
  instancia: string;
  numero: string | null;
  status: string;
  conectado_em: string | null;
  telefone_dono: string | null;
};

const paraCanal = (l: Linha): Canal => ({
  instancia: l.instancia,
  numero: l.numero,
  status: l.status as StatusDoCanal,
  conectadoEm: l.conectado_em,
  /* `?? null` e não `l.telefone_dono` direto: enquanto a 017 não rodar no banco, o
   * PostgREST devolve a linha SEM a coluna, e `undefined` vazaria para o domínio como se
   * fosse um valor. `null` é o mesmo que "ninguém preenchido", que é a verdade nesse caso. */
  telefoneDono: l.telefone_dono ?? null,
});

export const canalSupabase: RepositorioCanal = {
  async ler(t: ContextoTenant): Promise<Canal | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .select(COLS)
      .eq("tenant_id", t.tenantId)
      .maybeSingle<Linha>();

    if (error) {
      /* Ver o bloco de `COLS_SEM_DONO`: a 017 ainda não rodou. Relê sem a coluna para o
       * canal continuar de pé, e AVISA ALTO — porque isto é um estado a consertar, não um
       * modo de operação. Sem o log, a única pista seria o campo "quem a MAISA chama"
       * aparecer vazio para sempre, e ninguém relacionaria isso a uma migração pendente. */
      if ((error as { code?: string }).code === COLUNA_INEXISTENTE) {
        console.warn(
          "[supabase/canal] `telefone_dono` não existe: rode supabase/017_dono_por_inquilino.sql. " +
          "Até lá a escalação não tem para quem ir.",
        );
        const r = await supabase
          .from("integracoes_whatsapp")
          .select(COLS_SEM_DONO)
          .eq("tenant_id", t.tenantId)
          .maybeSingle<Omit<Linha, "telefone_dono">>();

        if (r.error) throw new FalhaDoProvedor(`Não foi possível ler o canal: ${r.error.message}`);
        return r.data ? paraCanal({ ...r.data, telefone_dono: null }) : null;
      }
      throw new FalhaDoProvedor(`Não foi possível ler o canal: ${error.message}`);
    }
    return data ? paraCanal(data) : null;
  },

  async definirDono(t, telefone): Promise<void> {
    const supabase = clienteDoContexto(t);

    /* UPDATE e não upsert: definir para quem escalar num canal que não existe criaria uma
     * linha de integração sem instância — e `instanciaDoInquilino` passaria a achar uma
     * linha sem `instancia`, trocando "conecte seu WhatsApp" por um erro sem ação. */
    const { data, error } = await supabase
      .from("integracoes_whatsapp")
      .update({ telefone_dono: telefone, atualizado_em: new Date().toISOString() })
      .eq("tenant_id", t.tenantId)
      .select("tenant_id");

    if (error) throw new FalhaDoProvedor(`Não foi possível salvar o WhatsApp do dono: ${error.message}`);
    /* Zero linhas sem erro = recusa da RLS, ou canal inexistente. O silêncio é o modo de
     * falha do upsert barrado (ver o mesmo padrão em `contatos.ts`), e sem esta checagem a
     * tela diria "salvo" e o campo voltaria vazio no próximo reload. */
    if (!data?.length) {
      throw new FalhaDoProvedor(
        "Não há WhatsApp conectado neste negócio para definir quem recebe os avisos. Conecte o canal primeiro.",
      );
    }
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
      /* Mesma janela de deploy do `ler`: sem a 017, o `select` de volta falha e o
       * pareamento inteiro quebraria — o cliente clicaria em "Conectar WhatsApp" e receberia
       * erro com a instância JÁ criada do lado da Evolution. */
      if ((error as { code?: string }).code === COLUNA_INEXISTENTE) {
        const r = await supabase
          .from("integracoes_whatsapp")
          .select(COLS_SEM_DONO)
          .eq("tenant_id", t.tenantId)
          .maybeSingle<Omit<Linha, "telefone_dono">>();
        if (r.data) return paraCanal({ ...r.data, telefone_dono: null });
      }
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
