/* ─────────────────────────────────────────────────────────────────────────────
 * 027a — LIMPA AS SOBREPOSIÇÕES QUE JÁ ESTÃO NO BANCO. Rode ANTES do 027.
 *
 * O 027 recusou entrar em 04/09/2026 com `23P01`: já havia atendimentos ocupando o mesmo
 * horário do mesmo profissional. A causa é o `npm run semear`, que sorteia hora em passos
 * de 30 min sem olhar a duração do serviço — uma sessão de 40 min às 14h e outra às 14:30
 * colidem, e nada nunca checou. (O gerador foi corrigido na mesma mudança; ver
 * `scripts/semear-demo.mjs`.)
 *
 * ⚠️ ESTE ARQUIVO CANCELA ATENDIMENTOS. Ele não apaga: `situacao = 'cancelado'` preserva a
 * linha, o histórico e o vínculo com recibo já emitido — e cancelado não entra na
 * constraint, que é o que destrava o 027.
 *
 * ⚠️ ELE SE RECUSA A DECIDIR POR VOCÊ. Se as duas pontas de um conflito forem atendimentos
 * DE VERDADE (não semente), ele aborta com a contagem e não toca em nada. Escolher qual
 * cliente perde o horário não é trabalho de script.
 *
 * ── Antes de rodar, olhe o que existe ──────────────────────────────────────────
 *
 *     select a.data_local, a.hora_inicio, a.duracao_min, a.cliente_nome,
 *            b.hora_inicio as conflita_com, b.cliente_nome as e_com,
 *            (a.ator_id = 'semente-demo') as a_e_semente,
 *            (b.ator_id = 'semente-demo') as b_e_semente
 *       from public.atendimentos a
 *       join public.atendimentos b
 *         on  b.tenant_id       = a.tenant_id
 *         and b.profissional_id = a.profissional_id
 *         and b.id             <> a.id
 *         and b.situacao        = 'marcado'
 *         and tstzrange(b.inicio, b.fim, '[)') && tstzrange(a.inicio, a.fim, '[)')
 *      where a.situacao = 'marcado'
 *      order by a.data_local, a.hora_inicio;
 * ────────────────────────────────────────────────────────────────────────────── */

do $$
declare
  reais    int;
  vitima   uuid;
  n        int := 0;
begin
  /* ── 0. conflito entre dois atendimentos de verdade: para tudo ── */
  select count(*) / 2 into reais
    from public.atendimentos a
    join public.atendimentos b
      on  b.tenant_id       = a.tenant_id
      and b.profissional_id = a.profissional_id
      and b.id             <> a.id
      and b.situacao        = 'marcado'
      and tstzrange(b.inicio, b.fim, '[)') && tstzrange(a.inicio, a.fim, '[)')
   where a.situacao = 'marcado'
     and coalesce(a.ator_id, '') <> 'semente-demo'
     and coalesce(b.ator_id, '') <> 'semente-demo';

  if reais > 0 then
    raise exception
      'Há % sobreposição(ões) entre atendimentos que NÃO são semente. Rode a query do cabeçalho e cancele à mão — qual cliente perde o horário não é decisão de script.',
      reais;
  end if;

  /* ── 1. cancela UM por volta, sempre o menos importante do par ──
   *
   * Um por volta, e não um `update` só, por causa das cadeias: com 14–15, 14:30–15:30 e
   * 15–16, cancelar de uma vez tudo que conflita com algo levaria os três. Resolvendo em
   * série, o do meio cai e as pontas sobrevivem — que é o certo, porque `[)` deixa 15h em
   * ponto conviver com o que terminou às 15h.
   *
   * A ordem de preferência (fica quem tem o `rank` maior):
   *   2 = não é semente        · atendimento de verdade nunca perde para dado de teste
   *   1 = já virou recibo      · desfazer isso deixaria um recibo sem atendimento
   *   empate → começa mais cedo, depois id menor (só para ser determinístico) */
  loop
    with rank_ as (
      select id, inicio, situacao, tenant_id, profissional_id, fim,
             (case when coalesce(ator_id, '') <> 'semente-demo' then 2 else 0 end)
           + (case when recibo_id is not null or lote_recibo_id is not null then 1 else 0 end) as r
        from public.atendimentos
       where situacao = 'marcado'
    )
    select b.id into vitima
      from rank_ a
      join rank_ b
        on  b.tenant_id       = a.tenant_id
        and b.profissional_id = a.profissional_id
        and b.id             <> a.id
        and tstzrange(b.inicio, b.fim, '[)') && tstzrange(a.inicio, a.fim, '[)')
       /* `a` é preferível a `b` — ordem total estrita, então de cada par sai exatamente
        * um vencedor e nenhum par se cancela mutuamente. */
       and (a.r > b.r
            or (a.r = b.r and a.inicio < b.inicio)
            or (a.r = b.r and a.inicio = b.inicio and a.id < b.id))
     /* O vencedor mais forte primeiro: é isso que impede a ponta de uma cadeia de cair
      * antes do meio. */
     order by a.r desc, a.inicio, a.id
     limit 1;

    exit when vitima is null;

    update public.atendimentos
       set situacao = 'cancelado', cancelado_em = now()
     where id = vitima;

    n := n + 1;
    vitima := null;

    if n > 500 then
      raise exception 'Passou de 500 cancelamentos — algo está errado, e não é sobreposição de agenda.';
    end if;
  end loop;

  raise notice '% atendimento(s) cancelado(s) por sobreposição. Agora rode o 027.', n;
end $$;
