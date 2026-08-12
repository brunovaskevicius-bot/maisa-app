/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RegistroDeAtendimentos` no Supabase. ⚠️ SÓ SERVIDOR.
 *
 * O espelho do que a MAISA marcou. Leia o cabeçalho da porta
 * (`nucleo/portas/saida/registro-atendimentos.ts`) antes de mexer aqui — em especial a
 * invariante: **a verdade dos horários é o Google, não esta tabela.**
 *
 * ⚠️ NENHUM MÉTODO DESTE ARQUIVO LANÇA. É a regra mais importante daqui, e ela é o
 * oposto do que `saida/supabase/repositorio.ts` faz (lá, `exigirSemErro` transforma falha
 * de banco em `FalhaDoProvedor`, porque ler cadastro errado é pior que não ler).
 *
 * Aqui é o contrário, e o motivo é a ORDEM em que as coisas acontecem: quando este
 * arquivo roda, o evento JÁ EXISTE na agenda do dono. Lançar faria o caso de uso abortar
 * depois do efeito irreversível — o horário bloqueado no Google e o cliente ouvindo "não
 * deu certo" pelo WhatsApp. É o pior desfecho possível dos dois lados: o dono perde o
 * horário e o cliente vai procurar outro lugar.
 *
 * Então falha aqui é `console.error` e vida que segue. O custo aceito, escrito para
 * ninguém se surpreender: o espelho pode ficar com BURACO. Isso significa que a soma do
 * faturamento pode ficar menor que a realidade e que aquele atendimento não terá auditoria
 * de ator. A idempotência não sofre — quem ainda garante que não se marca duas vezes é a
 * varredura de agenda em `agendar-atendimento.ts`, que continua sendo a proteção primária.
 *
 * ⚠️ Com service role (o caminho do agente de WhatsApp) a RLS não se aplica, então o
 * `tenant_id` explícito em TODO comando aqui é a única fronteira entre inquilinos. Ver o
 * cabeçalho de `admin.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { RegistroDeAtendimentos, LinhaDeAtendimento } from "@/nucleo/portas/saida/registro-atendimentos";
import type { ContextoTenant, Ator } from "@/nucleo/dominio/tenant";
import { clienteDoContexto } from "./contexto-cliente";

/**
 * `Ator` → as três colunas de auditoria.
 *
 * `ator_id` é `text` no banco porque as três coisas cabem nele: o uuid de quem estava
 * logado, o canal do agente, o nome da rotina. É esta função que responde à pergunta
 * "quantos horários a MAISA marcou sozinha?" — sem ela, `ator_tipo` ficaria no default
 * `'usuario'` e todo agendamento pareceria feito à mão no painel.
 *
 * ⚠️ `conversa_id` PASSA POR `uuidOuNulo`, e isso custou uma gravação perdida contra o
 * banco real. A coluna é `uuid`; `Ator.conversaId` é `string` no domínio, e nada obriga
 * quem constrói o ator a passar um uuid — o laboratório passa literalmente `"laboratorio"`
 * (`atorAgente("laboratorio")`). Sem o filtro, o Postgres recusa a linha INTEIRA com
 * `22P02 invalid input syntax for type uuid`, e como este adaptador não lança de propósito,
 * o sintoma era o pior possível: o agendamento dava certo, a MAISA confirmava para o
 * cliente, e o espelho ficava vazio sem nada na tela dizer isso.
 *
 * Perder a referência da conversa é aceitável; perder a linha do atendimento não é.
 */
function auditoria(a: Ator): { ator_tipo: string; ator_id: string | null; conversa_id: string | null } {
  if (a.tipo === "agente") return { ator_tipo: "agente", ator_id: a.canal, conversa_id: uuidOuNulo(a.conversaId ?? null) };
  if (a.tipo === "sistema") return { ator_tipo: "sistema", ator_id: a.rotina, conversa_id: null };
  return { ator_tipo: "usuario", ator_id: a.id, conversa_id: null };
}

/**
 * `hora_inicio` tem `check (hora_inicio * 2 = round(hora_inicio * 2))` no banco: só
 * múltiplos de meia hora entram. A grade trabalha em blocos de 30 min, então o caminho
 * normal já obedece — mas `oferecer_horarios` calcula vaga a partir da duração do
 * serviço, e um serviço de 20 min produziria 14.333, que o Postgres RECUSA.
 *
 * Arredondar para o meio mais próximo é melhor que perder a linha: o instante exato está
 * em `inicio`/`fim` (timestamptz), que é a verdade e não é tocado aqui. `hora_inicio` é
 * projeção civil para a tela e para o fechamento do mês, e meia hora de granularidade é
 * o que essas duas coisas já usam.
 */
const meiaHora = (h: number): number => Math.round(h * 2) / 2;

/** `sv-novo-…`, `lead:…`, `cl-google-…` não são uuid, e as colunas são `uuid`. Mandar
 *  string fora do formato é `22P02` do Postgres, não linha rejeitada silenciosamente. */
const PARECE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOuNulo = (v: string | null): string | null => (v && PARECE_UUID.test(v) ? v : null);

export const registroSupabase: RegistroDeAtendimentos = {
  async registrar(t: ContextoTenant, a: LinhaDeAtendimento): Promise<void> {
    try {
      const supabase = clienteDoContexto(t);
      const { error } = await supabase.from("atendimentos").upsert(
        {
          tenant_id: t.tenantId,
          maisa_ag: a.maisaAg,
          profissional_id: a.agendaId,

          cliente_id: uuidOuNulo(a.clienteId),
          cliente_nome: a.clienteNome,
          cliente_tel: a.clienteTel || null,
          servico_id: uuidOuNulo(a.servicoId),
          servico_nome: a.servicoNome,
          servico_valor: a.servicoValor,

          inicio: a.inicioISO,
          fim: a.fimISO,
          duracao_min: a.duracaoMin,
          data_local: a.dataLocal,
          hora_inicio: meiaHora(a.horaInicio),

          evento_id: a.eventoId,
          meet_link: a.meetLink,
          html_link: a.htmlLink,

          ...auditoria(t.ator),
        },
        {
          /* O `unique (tenant_id, maisa_ag)` da tabela é o que faz a retentativa do modelo
           * reconhecer a própria linha em vez de criar uma segunda. `upsert` e não
           * `insert` justamente por isso: o caso de uso pode chegar aqui duas vezes com a
           * mesma chave quando a resposta do Google se perdeu na volta. */
          onConflict: "tenant_id,maisa_ag",
          /* Não devolve a linha: ninguém lê o retorno, e pedir `select` de volta custa
           * uma serialização por agendamento no caminho quente do WhatsApp. */
          ignoreDuplicates: false,
        },
      );

      if (error) {
        console.error(
          `[supabase/atendimentos] o evento ${a.eventoId ?? "?"} foi criado na agenda mas NÃO entrou no espelho ` +
            `(inquilino ${t.tenantId}, maisa_ag ${a.maisaAg}): ${error.message}`,
        );
      }
    } catch (e) {
      /* `clienteDoContexto` lança `NaoConfigurado` quando falta a service role key — e é
       * o caso REAL que este catch existe para cobrir, porque ele acontece exatamente no
       * caminho do agente. Sem o catch, a exceção subiria e derrubaria o agendamento. */
      console.error(`[supabase/atendimentos] falha ao gravar o espelho do inquilino ${t.tenantId}`, e);
    }
  },

  async cancelar(t: ContextoTenant, p: { eventoId: string }): Promise<void> {
    try {
      const supabase = clienteDoContexto(t);
      /* `update` e não `delete`: o histórico de quem desmarca é informação do negócio —
       * é a decisão escrita em `supabase/LEIA-ME.md` §3.1 e no check da coluna. */
      const { error } = await supabase
        .from("atendimentos")
        .update({ situacao: "cancelado", cancelado_em: new Date().toISOString() })
        .eq("tenant_id", t.tenantId)
        .eq("evento_id", p.eventoId);

      if (error) {
        console.error(
          `[supabase/atendimentos] evento ${p.eventoId} cancelado na agenda mas o espelho do inquilino ` +
            `${t.tenantId} continua 'marcado': ${error.message}`,
        );
      }
    } catch (e) {
      console.error(`[supabase/atendimentos] falha ao cancelar no espelho do inquilino ${t.tenantId}`, e);
    }
  },
};
