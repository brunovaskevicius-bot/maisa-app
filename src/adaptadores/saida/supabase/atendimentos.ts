/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RegistroDeAtendimentos` no Supabase. ⚠️ SÓ SERVIDOR.
 *
 * A agenda do produto. Leia o cabeçalho da porta
 * (`nucleo/portas/saida/registro-atendimentos.ts`) antes de mexer aqui.
 *
 * ⚠️ ESTE CABEÇALHO DIZIA O CONTRÁRIO DA PORTA, e ficou assim tempo demais: "a verdade dos
 * horários é o Google, não esta tabela". Não é mais (ADR-0009). Esta tabela É a fonte da
 * verdade; o Google entra como camada aditiva, dentro de `try`, somando zero quando não
 * existe. A regra antiga sobreviveu num comentário depois de o código já ter mudado — é o
 * modo de falha que o `SEMPRE` do CLAUDE.md sobre documentação existe para impedir.
 *
 * ⚠️ QUASE NENHUM MÉTODO DESTE ARQUIVO LANÇA — e o "quase" tem três nomes: `listarJanela`,
 * `listar` e `buscarPorAg`. É o oposto do que `saida/supabase/repositorio.ts` faz (lá,
 * `exigirSemErro` transforma toda falha em `FalhaDoProvedor`).
 *
 * A ESCRITA não lança porque abortar depois do efeito é pior que perder o registro dele.
 * A LEITURA lança porque o silêncio dela mente: lista vazia por falha de banco significa
 * "o dia inteiro está livre" para quem calcula vaga, e "não tem nada marcado" para quem
 * desenha a grade. Nos dois casos alguém acredita e age.
 *
 * Então falha de escrita é `console.error` e vida que segue. O custo aceito, escrito para
 * ninguém se surpreender: a soma do faturamento pode ficar menor que a realidade e aquele
 * atendimento não terá auditoria de ator. A idempotência NÃO sofre — quem garante que não
 * se marca duas vezes é o `unique (tenant_id, maisa_ag)` desta tabela, e não mais uma
 * varredura de agenda no provedor.
 *
 * A única escrita que lança é o CONFLITO DE HORÁRIO (`23P01`) — ver `registrar`.
 *
 * ⚠️ Com service role (o caminho do agente de WhatsApp) a RLS não se aplica, então o
 * `tenant_id` explícito em TODO comando aqui é a única fronteira entre inquilinos. Ver o
 * cabeçalho de `admin.ts`.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  RegistroDeAtendimentos, LinhaDeAtendimento, AtendimentoRegistrado,
} from "@/nucleo/portas/saida/registro-atendimentos";
import type { ContextoTenant, Ator } from "@/nucleo/dominio/tenant";
import type { Janela } from "@/nucleo/dominio/tempo";
import type { Ocupado } from "@/nucleo/dominio/vagas";
import { FalhaDoProvedor, HorarioOcupado } from "@/nucleo/dominio/erros";
import { clienteDoContexto } from "./contexto-cliente";

/**
 * As colunas de uma linha inteira. Uma constante só, para `listar` e `buscarPorAg` não
 * poderem divergir — quando cada leitura mantém a própria lista, uma esquece a coluna que
 * a outra ganhou e o bug aparece só numa das telas.
 */
const COLUNAS =
  "maisa_ag, profissional_id, cliente_id, cliente_nome, cliente_tel, servico_id, " +
  "servico_nome, servico_valor, inicio, fim, duracao_min, data_local, hora_inicio, " +
  "evento_id, meet_link, html_link, situacao";

/**
 * Uma linha crua do `select` acima.
 *
 * ⚠️ As duas leituras convertem com `as unknown as LinhaCrua`, e o motivo é chato mas
 * real: o supabase-js infere o tipo do retorno LENDO a string do `select` em tempo de
 * compilação, e só consegue quando ela é literal. `COLUNAS` é uma constante concatenada,
 * então ele desiste e devolve `GenericStringError`. A alternativa era repetir as dezessete
 * colunas em duas strings literais — e aí as duas divergem no primeiro campo novo, que é
 * exatamente o que `COLUNAS` existe para impedir. Trocamos checagem que não funcionava por
 * uma conversão explícita e `paraRegistrado`, que valida campo a campo.
 */
type LinhaCrua = Record<string, unknown>;

/** Banco → domínio. O par de `registrar`, e o motivo de `COLUNAS` existir. */
function paraRegistrado(l: LinhaCrua): AtendimentoRegistrado {
  return {
    maisaAg: String(l.maisa_ag),
    agendaId: String(l.profissional_id),
    clienteId: (l.cliente_id as string | null) ?? null,
    clienteNome: String(l.cliente_nome ?? ""),
    clienteTel: String(l.cliente_tel ?? ""),
    servicoId: (l.servico_id as string | null) ?? null,
    servicoNome: String(l.servico_nome ?? ""),
    servicoValor: Number(l.servico_valor ?? 0),
    inicioISO: String(l.inicio),
    fimISO: String(l.fim),
    duracaoMin: Number(l.duracao_min ?? 0),
    dataLocal: String(l.data_local),
    horaInicio: Number(l.hora_inicio ?? 0),
    eventoId: (l.evento_id as string | null) ?? null,
    meetLink: (l.meet_link as string | null) ?? null,
    htmlLink: (l.html_link as string | null) ?? null,
    situacao: l.situacao === "cancelado" ? "cancelado" : "marcado",
  };
}

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
  /**
   * ⚠️ LANÇA — como as outras duas leituras deste arquivo, e ao contrário das escritas.
   *
   * As escritas engolem falha porque abortar depois do efeito é pior que perder o
   * registro dele. Aqui é o contrário: esta leitura é a fonte primária de ocupação, e
   * devolver `[]` numa falha de banco significa "o dia inteiro está livre". A MAISA
   * ofereceria horários já vendidos, e o cliente descobriria na cadeira. Mesmo raciocínio
   * do Passo B do Ludi, onde falha ao ler `appointments` é 500.
   *
   * ⚠️ Lê `data_local`/`hora_inicio`, a PROJEÇÃO CIVIL, e não `inicio`/`fim`. Os
   * timestamps são a verdade do instante, mas `vagasDoDia` pensa em dia civil e hora
   * decimal — reconverter o fuso aqui abriria a chance de a leitura discordar da escrita.
   * O preço: `hora_inicio` é múltiplo de meia hora (ver `meiaHora`), então um serviço de
   * 20 min gravado às 14:20 bloqueia a partir de 14:30. Como a oferta também só anda de
   * meia em meia hora (`PASSO_MIN`), a granularidade é a mesma dos dois lados.
   */
  async listarJanela(
    t: ContextoTenant,
    p: { agendaId: string; janela: Janela },
  ): Promise<Ocupado[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("atendimentos")
      .select("data_local, hora_inicio, duracao_min")
      .eq("tenant_id", t.tenantId)
      .eq("profissional_id", p.agendaId)
      /* Cancelado não bloqueia horário — é o que a coluna existe para permitir. */
      .eq("situacao", "marcado")
      /* Janela FECHADA nas duas pontas, igual à de `oferecerHorarios`. */
      .gte("data_local", p.janela.de)
      .lte("data_local", p.janela.ate);

    if (error) {
      throw new FalhaDoProvedor(`Não foi possível ler os atendimentos: ${error.message}`);
    }

    return (data ?? []).map((l) => {
      const inicio = Number(l.hora_inicio);
      return {
        data: l.data_local as string,
        inicio,
        fim: inicio + Number(l.duracao_min) / 60,
      };
    });
  },

  /**
   * A grade do painel. Traz cancelado junto — ver a porta.
   *
   * Ordena por `inicio` (o instante), e não por `data_local`/`hora_inicio`: a projeção
   * civil é arredondada para meia hora (`meiaHora`), então dois atendimentos às 14:10 e
   * 14:20 empatariam e a ordem viraria a do banco, que não tem ordem.
   */
  async listar(
    t: ContextoTenant,
    p: { agendaId: string; janela: Janela },
  ): Promise<AtendimentoRegistrado[]> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("atendimentos")
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .eq("profissional_id", p.agendaId)
      .gte("data_local", p.janela.de)
      .lte("data_local", p.janela.ate)
      .order("inicio", { ascending: true });

    if (error) {
      throw new FalhaDoProvedor(`Não foi possível ler a agenda: ${error.message}`);
    }
    return (data ?? []).map((l) => paraRegistrado(l as unknown as LinhaCrua));
  },

  /**
   * ⚠️ NÃO filtra por `situacao`, e é de propósito. Quem chama quer saber se esta chave de
   * idempotência já foi usada — e ela foi, mesmo que o atendimento tenha sido cancelado
   * depois. Filtrar por `marcado` faria a retentativa de um agendamento cancelado criar uma
   * linha nova com a mesma chave, que o `unique` recusaria: erro na cara do usuário para
   * uma situação que o código já sabia resolver.
   */
  async buscarPorAg(
    t: ContextoTenant,
    p: { maisaAg: string },
  ): Promise<AtendimentoRegistrado | null> {
    const supabase = clienteDoContexto(t);
    const { data, error } = await supabase
      .from("atendimentos")
      .select(COLUNAS)
      .eq("tenant_id", t.tenantId)
      .eq("maisa_ag", p.maisaAg)
      .maybeSingle();

    if (error) {
      throw new FalhaDoProvedor(`Não foi possível verificar o atendimento: ${error.message}`);
    }
    return data ? paraRegistrado(data as unknown as LinhaCrua) : null;
  },

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
        /* ⚠️ O ÚNICO ERRO DE ESCRITA QUE SOBE. `23P01` é a constraint de exclusão da
         * migração 027: alguém já tem este horário com este profissional. Engolir aqui
         * seria confirmar duas pessoas para as 14h e descobrir na cadeira.
         *
         * Um `if` pelo código, não um `catch` genérico nem um `includes("conflito")` na
         * mensagem: o texto do Postgres muda com o locale, o código não. */
        if (error.code === "23P01") throw new HorarioOcupado();

        console.error(
          `[supabase/atendimentos] o atendimento NÃO foi gravado ` +
            `(inquilino ${t.tenantId}, maisa_ag ${a.maisaAg}): ${error.message}`,
        );
      }
    } catch (e) {
      /* O conflito atravessa: ele é o motivo de o caso de uso abortar, e engoli-lo aqui
       * anularia o `throw` de três linhas acima. */
      if (e instanceof HorarioOcupado) throw e;
      /* `clienteDoContexto` lança `NaoConfigurado` quando falta a service role key — e é
       * o caso REAL que este catch existe para cobrir, porque ele acontece exatamente no
       * caminho do agente. Sem o catch, a exceção subiria e derrubaria o agendamento. */
      console.error(`[supabase/atendimentos] falha ao gravar o atendimento do inquilino ${t.tenantId}`, e);
    }
  },

  async cancelar(t: ContextoTenant, p: { maisaAg?: string; eventoId?: string }): Promise<void> {
    try {
      /* Sem chave nenhuma o `update` abaixo pegaria TODOS os atendimentos do inquilino.
       * O filtro por `tenant_id` sozinho não salva ninguém aqui. */
      if (!p.maisaAg && !p.eventoId) {
        console.error(`[supabase/atendimentos] cancelar sem chave (inquilino ${t.tenantId}) — ignorado`);
        return;
      }

      const supabase = clienteDoContexto(t);
      /* `update` e não `delete`: o histórico de quem desmarca é informação do negócio —
       * é a decisão escrita em `supabase/LEIA-ME.md` §3.1 e no check da coluna. */
      let q = supabase
        .from("atendimentos")
        .update({ situacao: "cancelado", cancelado_em: new Date().toISOString() })
        .eq("tenant_id", t.tenantId);

      /* `maisaAg` primeiro: é a chave que TODO atendimento tem. `evento_id` só existe
       * quando houve provedor, e desde o ADR-0009 isso é a minoria. */
      q = p.maisaAg ? q.eq("maisa_ag", p.maisaAg) : q.eq("evento_id", p.eventoId as string);

      const { error } = await q;

      if (error) {
        console.error(
          `[supabase/atendimentos] o atendimento ${p.maisaAg ?? p.eventoId} do inquilino ` +
            `${t.tenantId} continua 'marcado': ${error.message}`,
        );
      }
    } catch (e) {
      console.error(`[supabase/atendimentos] falha ao cancelar no inquilino ${t.tenantId}`, e);
    }
  },
};
