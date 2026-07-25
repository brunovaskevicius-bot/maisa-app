"use client";
/* MAISA — as cinco telas de grade: Clientes, Faturamento, Equipe, Serviços, Mais.
 *
 * Estão juntas de propósito: são variações do MESMO padrão (hero opcional →
 * filtros opcionais → grade de cartões curtos → gaveta). Manter lado a lado
 * deixa a repetição visível — se uma divergir, dá para ver na hora.
 *
 * Nenhuma delas tem estado próprio: tudo que muda vem do store. */

import React from "react";
import { s, Icon, fmt, fmtK, Filtros, EmptyState } from "@/lib/ui";
import * as D from "@/lib/data";
import { useStore } from "@/lib/store";
import { Cartao, GradeCartoes, Hero, TelaGrade, type TomTag } from "@/components/Cartao";

/* Estado da nota → como o cartão se apresenta. Um lugar só, para as duas telas
   que mostram nota (Faturamento e a ficha do cliente) contarem a mesma coisa. */
const TAG_NOTA: Record<D.StatusNota, { label: string; tom: TomTag }> = {
  pendente: { label: "a emitir", tom: "warn" },
  processando: { label: "processando", tom: "primary" },
  emitida: { label: "emitida", tom: "success" },
  cancelada: { label: "cancelada", tom: "neutral" },
  erro: { label: "com erro", tom: "danger" },
};

/* ═══════════════════════════════ CLIENTES ═══════════════════════════════ */

export function Clientes() {
  const st = useStore();

  const ativos = D.CLIENTES.filter((c) => st.cliAtivo(c.id));
  const lista = D.CLIENTES.filter((c) => {
    const on = st.cliAtivo(c.id);
    return st.filtroCli === "Todos" || (st.filtroCli === "Ativos" ? on : !on);
  });

  return (
    <TelaGrade>
      <Hero
        rotulo="Em atendimento"
        valor={String(ativos.length)}
        sub={`de ${D.CLIENTES.length} cadastrados`}
        marcos={[
          { n: ativos.reduce((a, c) => a + c.atendimentos, 0), label: `atendimentos em ${D.PERIODO.split(" de ")[0].toLowerCase()}`, tom: "primary" },
          { n: fmtK(ativos.reduce((a, c) => a + c.valor, 0)), label: "fechado no mês", tom: "success" },
          { n: D.CLIENTES.length - ativos.length, label: "inativos", tom: "neutral" },
        ]}
      />
      <Filtros opcoes={["Ativos", "Inativos", "Todos"]} ativo={st.filtroCli} onChange={st.setFiltroCli} />
      {lista.length === 0 ? (
        <EmptyState icon="clientes" title="Nenhum cliente aqui" sub="Troque o filtro acima para ver os outros." />
      ) : (
        <GradeCartoes>
          {lista.map((c) => {
            const on = st.cliAtivo(c.id);
            return (
              <Cartao
                key={c.id}
                seed={c.id}
                titulo={c.nome}
                sub={`${D.nomeServico(c.servicoId)} · ${c.canal}`}
                tag={on ? { label: "ativo", tom: "success" } : { label: "inativo", tom: "neutral" }}
                atenuado={!on}
                onClick={() => st.abrir(c.id)}
                resumo={on && c.atendimentos > 0
                  ? `${c.atendimentos} atendimentos em ${D.PERIODO} · ${fmt(c.valor)} · cliente desde ${c.desde}`
                  : `Sem atendimentos em ${D.PERIODO} · cliente desde ${c.desde}`}
                chips={[c.telefone, c.canal, ...(on ? [] : ["fora do faturamento"])]}
              />
            );
          })}
        </GradeCartoes>
      )}
    </TelaGrade>
  );
}

/* ═══════════════════════════════ FATURAMENTO ═══════════════════════════════ */

export function Faturamento() {
  const st = useStore();
  const base = st.fechamento;

  const por = (sts: D.StatusNota[]) => base.filter((c) => sts.includes(st.notaDe(c.id).status));
  const emitidas = por(["emitida"]);
  const processando = por(["processando"]);
  const pendentes = por(["pendente", "erro", "cancelada"]);
  // O lote não inclui o tomador de teste (ver store.emitirPendentes), então o
  // rótulo do botão conta o que ele realmente vai emitir.
  const noLote = pendentes.filter((c) => !c.teste);
  const total = base.reduce((a, c) => a + c.valor, 0);

  return (
    <TelaGrade>
      <Hero
        rotulo={D.PERIODO}
        valor={fmt(total)}
        sub={`em ${base.length} clientes`}
        marcos={[
          { n: emitidas.length, label: "emitidas", tom: "success" },
          { n: processando.length, label: "processando", tom: "primary" },
          { n: pendentes.length, label: "a emitir", tom: "warn" },
        ]}
        acao={noLote.length > 0
          ? {
            label: noLote.length === 1 ? "Emitir a nota pendente" : `Emitir as ${noLote.length} pendentes`,
            icon: "receipt",
            onClick: st.emitirPendentes,
          }
          : undefined}
        pronto={pendentes.length === 0 && processando.length === 0 ? "Mês fechado" : undefined}
      />

      {base.length === 0 ? (
        <EmptyState icon="receipt" title="Nada a faturar" sub="Nenhum cliente ativo com valor fechado nesta competência." />
      ) : (
        <GradeCartoes>
          {base.map((c) => {
            const nota = st.notaDe(c.id);
            const tag = TAG_NOTA[nota.status];
            const resumo =
              nota.status === "emitida" ? `Nota ${nota.numero} emitida em ${nota.data}${nota.simulada ? " (modo simulado)" : ""}`
                : nota.status === "processando" ? "Enviada à prefeitura — o número sai em alguns minutos."
                  : nota.status === "cancelada" ? "Nota cancelada. O valor do mês continua fechado."
                    : nota.status === "erro" ? (nota.erro ?? "A emissão falhou.")
                      : "Valor do mês fechado. Falta emitir a nota.";
            return (
              <Cartao
                key={c.id}
                dot={tag.tom}
                titulo={c.nome}
                sub={`${c.atendimentos} atendimentos · ${D.nomeServico(c.servicoId)}`}
                meta={fmt(c.valor)}
                tag={tag}
                onClick={() => st.abrir(`nf-${c.id}`)}
                resumo={c.teste ? `Tomador de teste — a nota se cancela sozinha depois de emitir. ${resumo}` : resumo}
                chips={[...(c.teste ? ["teste fiscal"] : []), `CPF ${c.cpf}`, c.canal]}
              />
            );
          })}
        </GradeCartoes>
      )}
    </TelaGrade>
  );
}

/* ═══════════════════════════════ EQUIPE ═══════════════════════════════ */

export function Equipe() {
  const st = useStore();
  const ativos = D.EQUIPE.filter((p) => st.profAtivo(p.id));

  return (
    <TelaGrade>
      <Hero
        rotulo="Equipe"
        valor={String(ativos.length)}
        sub={`de ${D.EQUIPE.length} recebendo agendamentos`}
        marcos={[
          { n: D.EQUIPE.reduce((a, p) => a + p.atendimentosMes, 0), label: "atendimentos no mês", tom: "primary" },
          { n: D.EQUIPE.length - ativos.length, label: "pausados", tom: "neutral" },
        ]}
      />
      <GradeCartoes>
        {D.EQUIPE.map((p) => {
          const on = st.profAtivo(p.id);
          return (
            <Cartao
              key={p.id}
              seed={p.id}
              titulo={p.nome}
              sub={p.papel}
              tag={on ? { label: "ativo", tom: "success" } : { label: "pausado", tom: "neutral" }}
              atenuado={!on}
              onClick={() => st.abrir(p.id)}
              resumo={`${p.atendimentosMes} atendimentos no mês · nota ${p.avaliacao.toFixed(1)} · comissão ${p.comissao}%`}
              chips={p.servicoIds.slice(0, 2).map((sid) => D.nomeServico(sid))
                .concat(p.servicoIds.length > 2 ? [`+${p.servicoIds.length - 2}`] : [])}
            />
          );
        })}
      </GradeCartoes>
    </TelaGrade>
  );
}

/* ═══════════════════════════════ SERVIÇOS ═══════════════════════════════ */

export function Servicos() {
  const st = useStore();
  const lista = D.SERVICOS.filter((sv) => st.filtroSvc === "Todos" || sv.categoria === st.filtroSvc);
  const ativos = D.SERVICOS.filter((sv) => st.svcAtivo(sv.id));

  return (
    <TelaGrade>
      <Hero
        rotulo="No catálogo"
        valor={String(ativos.length)}
        sub={`de ${D.SERVICOS.length} serviços`}
        marcos={[
          { n: fmt(Math.round(ativos.reduce((a, sv) => a + sv.preco, 0) / Math.max(ativos.length, 1))), label: "ticket médio", tom: "primary" },
          { n: D.SERVICOS.length - ativos.length, label: "fora do catálogo", tom: "neutral" },
        ]}
      />
      <Filtros opcoes={["Todos", ...D.CATEGORIAS]} ativo={st.filtroSvc} onChange={st.setFiltroSvc} />
      <GradeCartoes>
        {lista.map((sv) => {
          const on = st.svcAtivo(sv.id);
          return (
            <Cartao
              key={sv.id}
              dot={on ? "primary" : "neutral"}
              titulo={sv.nome}
              sub={`${sv.duracao} min · ${sv.profissionalIds.length} atendendo`}
              meta={`R$ ${sv.preco}`}
              tag={on ? undefined : { label: "pausado", tom: "neutral" }}
              atenuado={!on}
              onClick={() => st.abrir(sv.id)}
              resumo={`${sv.categoria} · ${fmt(sv.preco)} · ${sv.duracao} min`}
              chips={sv.profissionalIds.map((pid) => D.primeiroNome(D.nomeProfissional(pid)))}
            />
          );
        })}
      </GradeCartoes>
    </TelaGrade>
  );
}

/* ═══════════════════════════════ MAIS ═══════════════════════════════
 * Onde vive o que não é do dia a dia. Dois tipos de cartão: os que NAVEGAM para
 * uma tela (ponto azul) e os que abrem na gaveta (ponto neutro). */

export function Mais() {
  const st = useStore();

  const itens: {
    id: string; titulo: string; sub: string; resumo: string; chips: string[];
    navega?: boolean; onClick: () => void;
  }[] = [
    {
      id: "irFaturamento", titulo: "Faturamento", sub: `${D.PERIODO} · notas do mês`, navega: true,
      resumo: "As notas fiscais da competência, cliente por cliente.",
      chips: [fmtK(st.fechamento.reduce((a, c) => a + c.valor, 0)), "abrir tela"],
      onClick: () => st.irPara("faturamento"),
    },
    {
      id: "irEquipe", titulo: "Equipe", sub: "Quem atende e quando", navega: true,
      resumo: "Profissionais, disponibilidade e comissão.",
      chips: [`${D.EQUIPE.length} profissionais`, "abrir tela"],
      onClick: () => st.irPara("equipe"),
    },
    {
      id: "irServicos", titulo: "Serviços", sub: "O que você oferece e por quanto", navega: true,
      resumo: "O catálogo que a MAISA usa para oferecer e agendar.",
      chips: [`${D.SERVICOS.length} serviços`, "abrir tela"],
      onClick: () => st.irPara("servicos"),
    },
    {
      id: "faq", titulo: "Perguntas frequentes", sub: `${D.FAQS.length} respostas no ar`,
      resumo: "As respostas prontas que a MAISA usa sem te consultar.",
      chips: [`${D.FAQS.length} no ar`, `${D.FAQS.reduce((a, f) => a + f.usos, 0).toLocaleString("pt-BR")} usos`],
      onClick: () => st.abrir("faq"),
    },
    {
      id: "plano", titulo: "Meu plano", sub: `${D.NEGOCIO.plano} · em dia`,
      resumo: "Sua assinatura, forma de pagamento e faturas.",
      chips: [D.NEGOCIO.plano, `${fmt(D.NEGOCIO.precoPlano)}/mês`, "em dia"],
      onClick: () => st.abrir("plano"),
    },
    {
      id: "numeros", titulo: "Números do mês", sub: "Faturamento e ocupação",
      resumo: "Faturamento, ocupação e o que a MAISA resolveu no mês.",
      chips: ["R$ 18,2k", "78% ocupação", "87% resolvidas"],
      onClick: () => st.abrir("numeros"),
    },
  ];

  return (
    <TelaGrade>
      <GradeCartoes>
        {itens.map((i) => (
          <Cartao
            key={i.id}
            dot={i.navega ? "primary" : "neutral"}
            titulo={i.titulo}
            sub={i.sub}
            resumo={i.resumo}
            chips={i.chips}
            onClick={i.onClick}
          />
        ))}
      </GradeCartoes>

      {/* Contato do suporte — rodapé, não cartão: não é algo que se "abre". */}
      <div style={s("display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:16px;background:var(--surface);border:1px solid var(--line);flex-wrap:wrap")}>
        <span style={s("width:38px;height:38px;flex-shrink:0;border-radius:12px;background:var(--primary-soft);color:var(--primary-dark);display:flex;align-items:center;justify-content:center")}>
          <Icon name="chat" size={19} />
        </span>
        <span style={s("flex:1;min-width:180px")}>
          <span style={s("display:block;font-size:14px;font-weight:700")}>Precisa de ajuda?</span>
          <span style={s("display:block;font-size:12.5px;color:var(--muted);margin-top:2px")}>Fale com o suporte da MAISA pelo WhatsApp — respondemos em minutos.</span>
        </span>
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="m-hov-bright m-press m-focus"
          style={s("height:42px;padding:0 18px;border-radius:12px;background:var(--whatsapp);color:#fff;font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:8px;text-decoration:none")}
        >
          <Icon name="whatsapp" size={17} sw={1.9} />
          Falar com o suporte
        </a>
      </div>
    </TelaGrade>
  );
}
