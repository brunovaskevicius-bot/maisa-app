/* ─────────────────────────────────────────────────────────────────────────────
 * CASO DE USO — oferecer horários.
 *
 * O buraco que o agente de WhatsApp escancarou. `agendarAtendimento` existia desde a
 * reorganização, mas ele responde "marque às 14h" — e ninguém sabia responder "que
 * horas você tem?". A tela não precisava: ela desenha a grade e o vago aparece como
 * espaço em branco. Um agente não vê espaço em branco.
 *
 * Cruza três fontes: expediente do profissional (quem trabalha quando), agenda
 * externa (o que já tem dono) e catálogo (quanto tempo o serviço leva). A conta em si
 * é pura e mora em `dominio/vagas.ts`; aqui é a orquestração — buscar, filtrar por
 * allowlist, cortar o teto.
 *
 * ⚠️ É a ferramenta MAIS CHAMADA pelo agente, e a única que fala com o Google em
 * caminho quente. Uma leitura por profissional cobrindo a janela inteira, nunca uma
 * por dia: sete dias × três profissionais seriam 21 chamadas para responder "tem
 * vaga essa semana?", e o cliente desistiria antes.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { OferecerHorarios } from "../portas/entrada/casos-de-uso";
import type { AgendaExterna } from "../portas/saida/agenda-externa";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import { DadoInvalido, NaoEncontrado } from "../dominio/erros";
import { ehDataCivil, somarDias } from "../dominio/tempo";
import { duracaoValida } from "../dominio/agenda";
import { espalhar, MAX_DIAS_VARRIDOS, vagasDoDia, type Ocupado, type VagasDoDia } from "../dominio/vagas";

export type Dependencias = {
  agenda: AgendaExterna;
  negocio: RepositorioNegocio;
  agora?: () => number;
};

/** Quantos dias COM VAGA devolver. Passou disso, para de varrer: a conversa não
 *  aproveita o oitavo dia, e cada dia extra é agenda lida de graça. */
const MAX_DIAS_COM_VAGA = 4;

export function criarOferecerHorarios({ agenda, negocio, agora = Date.now }: Dependencias): OferecerHorarios {
  return async (t, p) => {
    /* ── 1. o serviço existe? ──
     * Primeiro porque é ele que define a duração, e sem duração não há o que calcular.
     * O agente preenche `servicoId` com o que entendeu de uma frase; um id inventado
     * tem que morrer aqui, com um erro que o agente possa transformar em pergunta
     * ("qual serviço você quer?") em vez de virar lista vazia — lista vazia ele
     * traduziria para "não tenho vaga", que é mentira. */
    const servico = await negocio.servico(t, p.servicoId);
    if (!servico) throw new NaoEncontrado("Serviço");
    if (!servico.ativo) throw new DadoInvalido("Esse serviço não está sendo oferecido.", "servicoId");

    const duracaoMin = Number(servico.duracao);
    if (!duracaoValida(duracaoMin)) throw new DadoInvalido("Duração do serviço inválida.", "duracao");

    if (!ehDataCivil(p.de)) throw new DadoInvalido("Data inválida.", "de");

    const dias = Math.min(Math.max(Number(p.dias ?? 7), 1), MAX_DIAS_VARRIDOS);
    const porDia = Math.min(Math.max(Number(p.porDia ?? 3), 1), 8);

    /* ── 2. quais agendas podem ser consultadas ──
     * Interseção de DUAS listas, e as duas importam por motivos diferentes:
     *   • `agendasPermitidas` é segurança — o inquilino não lê agenda de outro;
     *   • `servico.profissionalIds` é verdade de negócio — nem todo mundo faz tudo.
     * Sem a segunda, o agente ofereceria com quem não sabe fazer o serviço e o
     * cliente descobriria isso na cadeira. */
    const permitidas = await negocio.agendasPermitidas(t);
    const fazemOServico = new Set(servico.profissionalIds);

    let candidatas = permitidas.filter((id) => fazemOServico.has(id));

    if (p.agendaId) {
      // Pediu alguém específico: recusa em vez de cair no silêncio de devolver todos.
      // "Quero com o Rafael" respondido com horários da Ana é pior que um erro.
      if (!permitidas.includes(p.agendaId)) {
        throw new DadoInvalido("Essa agenda não existe neste negócio.", "agendaId");
      }
      if (!fazemOServico.has(p.agendaId)) {
        throw new DadoInvalido("Esse profissional não faz esse serviço.", "agendaId");
      }
      candidatas = [p.agendaId];
    }

    if (candidatas.length === 0) throw new NaoEncontrado("Profissional para esse serviço");

    /* ── 3. uma leitura por agenda, cobrindo a janela inteira ──
     * `dias - 1` porque a janela é FECHADA nas duas pontas: de 06/08 por 7 dias vai
     * até 12/08, não 13. */
    const janela = { de: p.de, ate: somarDias(p.de, dias - 1) };

    const porAgenda = await Promise.all(
      candidatas.map(async (agendaId) => {
        const [eventos, expediente] = await Promise.all([
          agenda.listar({ tenant: t, agendaId }, janela),
          negocio.expediente(t, agendaId),
        ]);

        /* Todo evento conta como ocupado — inclusive o compromisso pessoal que não
         * nasceu na MAISA. É o ponto: a agenda do dono é a fonte da verdade, então
         * "almoço" bloqueia horário igual a um atendimento. Filtrar por `maisa`
         * presente faria a MAISA oferecer exatamente os horários que o dono reservou
         * para não ser incomodado. */
        const ocupados: Ocupado[] = eventos.map((e) => ({ data: e.data, inicio: e.inicio, fim: e.fim }));

        return { agendaId, expediente, ocupados };
      }),
    );

    /* ── 4. varrer dia a dia, parando quando já há resposta suficiente ── */
    const resultado: VagasDoDia[] = [];
    const instante = agora();

    for (let i = 0; i < dias && resultado.length < MAX_DIAS_COM_VAGA; i++) {
      const data = somarDias(p.de, i);

      for (const a of porAgenda) {
        const horarios = vagasDoDia({
          data,
          expediente: a.expediente ?? undefined,
          duracaoMin,
          ocupados: a.ocupados,
          agora: instante,
        });
        if (horarios.length === 0) continue;
        resultado.push({ data, agendaId: a.agendaId, horarios: espalhar(horarios, porDia) });
      }
    }

    return { duracaoMin, servicoNome: servico.nome, dias: resultado };
  };
}
