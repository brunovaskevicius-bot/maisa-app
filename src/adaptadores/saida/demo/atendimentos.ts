/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `RegistroDeAtendimentos` em memória.
 *
 * O par de `saida/supabase/atendimentos.ts`, e ele existe pela mesma razão que os outros
 * fallbacks deste diretório: sem ele, um ambiente sem banco não exercitaria o caminho de
 * gravação do espelho. O `agendar-atendimento.ts` chamaria uma porta ausente, e a
 * diferença entre os dois modos deixaria de ser "onde o dado mora" para virar "quais
 * linhas de código rodam" — que é exatamente o tipo de divergência que faz um bug só
 * aparecer em produção.
 *
 * ⚠️ Não é banco: morre no fim do processo e não é compartilhado entre instâncias. Serve
 * a UMA coisa concreta — dar ao laboratório de conversa (`/laboratorio`) o que a MAISA
 * registrou, para se ver que o espelho foi escrito com o ator certo.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  RegistroDeAtendimentos, LinhaDeAtendimento, AtendimentoRegistrado,
} from "@/nucleo/portas/saida/registro-atendimentos";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Janela } from "@/nucleo/dominio/tempo";
import type { Ocupado } from "@/nucleo/dominio/vagas";
import { rotuloDoAtor } from "@/nucleo/dominio/tenant";
import { HorarioOcupado } from "@/nucleo/dominio/erros";

export type EspelhoEmMemoria = AtendimentoRegistrado & {
  tenantId: string;
  ator: string;
};

/**
 * Chaveado por `tenantId|maisaAg` — a mesma chave que o `unique` da tabela real usa, para
 * a idempotência se comportar igual nos dois modos.
 *
 * Objeto e não `Map` porque o `target` do `tsconfig` deste projeto não habilita iteração de
 * `Map` (TS2802), e `Object.values` resolve sem ligar `downlevelIteration` para o repo
 * inteiro por causa de um fixture.
 */
let LINHAS: Record<string, EspelhoEmMemoria> = {};

export const registroDemo: RegistroDeAtendimentos = {
  /**
   * O par de `saida/supabase/atendimentos.ts`. Filtra pela projeção civil pelos MESMOS
   * campos que o SQL usa (`dataLocal`, `horaInicio`, `duracaoMin`), porque o objetivo
   * deste arquivo é que o laboratório exercite as mesmas linhas de código que produção —
   * um filtro diferente aqui esconderia o bug em vez de revelá-lo.
   */
  async listarJanela(
    t: ContextoTenant,
    p: { agendaId: string; janela: Janela },
  ): Promise<Ocupado[]> {
    return Object.values(LINHAS)
      .filter(
        (l) =>
          l.tenantId === t.tenantId &&
          l.agendaId === p.agendaId &&
          l.situacao === "marcado" &&
          l.dataLocal >= p.janela.de &&
          l.dataLocal <= p.janela.ate,
      )
      .map((l) => ({
        data: l.dataLocal,
        inicio: l.horaInicio,
        fim: l.horaInicio + l.duracaoMin / 60,
      }));
  },

  async listar(
    t: ContextoTenant,
    p: { agendaId: string; janela: Janela },
  ): Promise<AtendimentoRegistrado[]> {
    return Object.values(LINHAS)
      .filter(
        (l) =>
          l.tenantId === t.tenantId &&
          l.agendaId === p.agendaId &&
          l.dataLocal >= p.janela.de &&
          l.dataLocal <= p.janela.ate,
      )
      .sort((a, b) => a.inicioISO.localeCompare(b.inicioISO));
  },

  async buscarPorAg(t: ContextoTenant, p: { maisaAg: string }): Promise<AtendimentoRegistrado | null> {
    return LINHAS[`${t.tenantId}|${p.maisaAg}`] ?? null;
  },

  async registrar(t: ContextoTenant, a: LinhaDeAtendimento): Promise<void> {
    const chave = `${t.tenantId}|${a.maisaAg}`;

    /* A constraint de exclusão da migração 027, em memória.
     *
     * Existe aqui pelo motivo declarado no cabeçalho deste arquivo: se o laboratório não
     * exercitar as mesmas linhas de código que produção, a diferença entre os modos deixa
     * de ser "onde o dado mora" e vira "quais bugs aparecem". Sem isto, marcar em cima de
     * outro atendimento passaria batido no `/laboratorio` e estouraria no cliente.
     *
     * Sobreposição por INTERVALO (`a.inicio < b.fim && a.fim > b.inicio`), não por
     * igualdade de horário: 14:30 em cima de um atendimento de 14:00 às 15:00 colide, e
     * comparar só o início não veria. Foi o defeito medido na agenda do Smiller. */
    const colide = Object.values(LINHAS).some(
      (l) =>
        l.tenantId === t.tenantId &&
        l.agendaId === a.agendaId &&
        l.situacao === "marcado" &&
        l.maisaAg !== a.maisaAg &&
        l.inicioISO < a.fimISO &&
        l.fimISO > a.inicioISO,
    );
    if (colide) throw new HorarioOcupado();

    LINHAS[chave] = {
      ...a,
      tenantId: t.tenantId,
      ator: rotuloDoAtor(t.ator),
      /* Regravar (a segunda chamada, que anexa o `evento_id`) não RESSUSCITA um
       * atendimento cancelado. O par no Postgres é o mesmo: o upsert não toca `situacao`,
       * porque a coluna não está no objeto enviado. */
      situacao: LINHAS[chave]?.situacao ?? "marcado",
    };
  },

  async cancelar(t: ContextoTenant, p: { maisaAg?: string; eventoId?: string }): Promise<void> {
    if (!p.maisaAg && !p.eventoId) return;

    Object.keys(LINHAS).forEach((chave) => {
      const linha = LINHAS[chave];
      if (linha.tenantId !== t.tenantId) return;
      const bate = p.maisaAg ? linha.maisaAg === p.maisaAg : linha.eventoId === p.eventoId;
      if (bate) LINHAS[chave] = { ...linha, situacao: "cancelado" };
    });
  },
};

/** O que a MAISA registrou neste processo. Só o laboratório lê. */
export const espelhoDemo = (tenantId: string): EspelhoEmMemoria[] =>
  Object.values(LINHAS)
    .filter((l) => l.tenantId === tenantId)
    .sort((a, b) => a.inicioISO.localeCompare(b.inicioISO));

/** O "Esquecer tudo" do laboratório. */
export const zerarEspelhoDemo = (): void => {
  LINHAS = {};
};
