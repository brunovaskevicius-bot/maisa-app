/* ─────────────────────────────────────────────────────────────────────────────
 * 027 — DOIS ATENDIMENTOS NÃO OCUPAM O MESMO HORÁRIO. O banco passa a garantir.
 *
 * Por que agora: até o ADR-0009 quem impedia vender o mesmo horário duas vezes era o
 * Google Calendar — e para quem não conectava Google não havia proteção NENHUMA. Agora
 * que a tabela é a fonte da verdade, a garantia tem que morar nela.
 *
 * Por que EXCLUDE e não `select count(*)` antes de inserir: duas requisições simultâneas
 * passam as duas pela contagem e inserem as duas. É o defeito clássico, e é o que a
 * agenda do Smiller faz. Constraint não tem essa janela — o Postgres serializa.
 *
 * ⚠️ ESTA MIGRAÇÃO PODE FALHAR, e falhar é o comportamento certo: ela recusa se o banco
 * JÁ tiver atendimentos sobrepostos. **Foi o que aconteceu em 04/09/2026** contra o banco
 * de produção — havia semente sobreposta. Se der `23P01`, rode o
 * **`027a_desfazer_sobreposicoes.sql`** e volte aqui.
 *
 * Para só olhar o que existe, sem mexer:
 *
 *     select a.tenant_id, a.profissional_id,
 *            a.data_local, a.hora_inicio as hora_a, b.hora_inicio as hora_b,
 *            a.cliente_nome as cliente_a, b.cliente_nome as cliente_b
 *       from public.atendimentos a
 *       join public.atendimentos b
 *         on  b.tenant_id       = a.tenant_id
 *         and b.profissional_id = a.profissional_id
 *         and b.id             <> a.id
 *         and b.situacao        = 'marcado'
 *         and tstzrange(b.inicio, b.fim, '[)') && tstzrange(a.inicio, a.fim, '[)')
 *      where a.situacao = 'marcado'
 *      order by a.data_local, a.hora_inicio;
 *
 * Veio linha? O `027a` cancela o menos importante de cada par e se recusa a decidir quando
 * as duas pontas são atendimentos de verdade. A causa medida foi o `npm run semear`, que
 * sorteava hora em passos de 30 min ignorando a duração do serviço — corrigido em
 * `scripts/semear-demo.mjs` na mesma mudança, senão o próximo seed reabre o problema.
 * ────────────────────────────────────────────────────────────────────────────── */

/* `gist` sozinho não sabe indexar `uuid` — só os tipos de intervalo. `btree_gist` ensina,
 * e é o que permite misturar a igualdade de inquilino/profissional com a sobreposição de
 * tempo no MESMO índice. Sem ele o Postgres recusa a constraint inteira. */
create extension if not exists btree_gist;

do $$
begin
  alter table public.atendimentos
    add constraint atendimentos_sem_sobreposicao
    exclude using gist (
      tenant_id       with =,
      profissional_id with =,
      /* `[)` — fechado no início, ABERTO no fim. É o que faz um atendimento das 14h às 15h
       * conviver com outro das 15h às 16h: às 15h em ponto o primeiro já acabou. Com `[]`
       * eles colidiriam, e a agenda de quem atende de hora em hora aceitaria um horário
       * por dia. */
      tstzrange(inicio, fim, '[)') with &&
    )
    /* Cancelado não bloqueia nada — é o motivo de a coluna existir. Sem este `where`,
     * desmarcar as 14h e remarcar as 14h com outra pessoa seria recusado. */
    where (situacao = 'marcado');
exception
  when duplicate_object then null;   -- reexecução: a constraint já está lá
end $$;

/* ⚠️ O QUE ESTA CONSTRAINT *NÃO* COBRE, escrito para ninguém contar com o que não existe:
 *
 *   • Compromisso que só existe no Google do dono. Ele não tem linha aqui, então não
 *     entra no índice. Quem cruza as duas fontes é `oferecerHorarios`, em código.
 *   • Bloqueio de horário (almoço, folga). Ainda não é modelado — quando for, se vier
 *     como linha desta tabela com um `situacao` próprio, este `where` precisa incluí-lo.
 *   • Dois profissionais no mesmo horário. É o caso normal e correto: cada um tem agenda.
 */
