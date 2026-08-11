/* ─────────────────────────────────────────────────────────────────────────────
 * VAGAS — quais horários estão livres, em dado puro.
 *
 * Esta é a pergunta que o cliente faz PRIMEIRO ("tem horário amanhã?"), e até agora
 * o app não sabia respondê-la. Ele sabia DESENHÁ-LA: a grade da Agenda calcula o
 * vago posicionando blocos na tela (`ui/telas/Agenda.tsx`), o que serve para quem
 * tem olho e não serve para quem tem WhatsApp.
 *
 * A conta mora aqui, pura, porque ela tem TRÊS consumidores com nada em comum: a
 * grade, o agente de IA e (amanhã) o lembrete automático. Se ela vivesse no
 * componente, o agente teria que reimplementá-la — e duas implementações da mesma
 * regra divergem no primeiro feriado.
 *
 * Zero import de framework. Recebe expediente e ocupados como argumento: não sabe
 * se vieram do Google, do banco ou de um fixture.
 * ────────────────────────────────────────────────────────────────────────────── */

import { podeComecarEm, type Expediente } from "./expediente";
import { instanteISO } from "./tempo";

/** Um pedaço do dia que já tem dono — atendimento, bloqueio, compromisso pessoal.
 *  Hora decimal, igual ao resto do app: 14.5 = 14:30. */
export type Ocupado = { data: string; inicio: number; fim: number };

/** Os horários livres de um dia, na agenda de um profissional. */
export type VagasDoDia = { data: string; agendaId: string; horarios: number[] };

/**
 * De quanto em quanto tempo um atendimento pode começar. Meia hora, igual à grade —
 * e igual a `horaValida()` em `agenda.ts`, que recusa qualquer coisa fora do passo.
 * Oferecer 14:10 seria oferecer um horário que o próprio agendamento recusa depois.
 */
export const PASSO_MIN = 30;

/**
 * Antecedência mínima. Não se oferece "hoje às 14h" às 13h58: o cliente ainda tem
 * que se deslocar, e o dono ainda tem que ver que entrou. Sem isso o agente
 * ofereceria o horário que está começando agora, que é pior que não ter vaga.
 */
export const ANTECEDENCIA_MIN = 30;

/** Teto de dias varridos numa pergunta. "Tem vaga em algum momento?" não pode
 *  virar uma varredura de dois anos de agenda por causa de um argumento solto. */
export const MAX_DIAS_VARRIDOS = 21;

const sobrepoe = (aIni: number, aFim: number, b: Ocupado) => aIni < b.fim && b.inicio < aFim;

/**
 * Os horários em que um atendimento de `duracaoMin` PODE COMEÇAR neste dia.
 *
 * Três filtros, nesta ordem (do mais barato ao mais caro):
 *   1. o profissional trabalha nesse dia e nessa hora (expediente);
 *   2. o atendimento TERMINA dentro do expediente — oferecer 18:45 para um serviço
 *      de 40 min num expediente que fecha 19h é marcar 5 min de hora extra sem
 *      avisar ninguém;
 *   3. não colide com nada já marcado, e não está no passado.
 */
export function vagasDoDia(p: {
  data: string;
  expediente: Expediente | undefined;
  duracaoMin: number;
  /** Tudo que já tem dono. Pode conter outros dias — filtramos aqui. */
  ocupados: Ocupado[];
  /** Instante de referência, em ms. Parâmetro para o teste poder congelar o tempo. */
  agora: number;
}): number[] {
  const { data, expediente: e, duracaoMin, ocupados, agora } = p;
  if (!e) return [];

  const passo = PASSO_MIN / 60;
  const duracao = duracaoMin / 60;
  const doDia = ocupados.filter((o) => o.data === data);
  const livres: number[] = [];

  // `h + duracao <= e.ate`: o fim tem que caber, não só o começo.
  for (let h = e.de; h + duracao <= e.ate; h += passo) {
    if (!podeComecarEm(e, data, h)) continue;
    if (doDia.some((o) => sobrepoe(h, h + duracao, o))) continue;
    // Passado (e o quase-passado). `instanteISO` já resolve o fuso de São Paulo.
    if (Date.parse(instanteISO(data, h)) - agora < ANTECEDENCIA_MIN * 60_000) continue;
    livres.push(h);
  }

  return livres;
}

/**
 * Afina a lista para uma CONVERSA.
 *
 * Um dia de expediente 09–19 tem ~18 vagas de meia hora. Mandar 18 horários no
 * WhatsApp não é ser prestativo, é empurrar a decisão inteira para o cliente — ele
 * responde "sei lá" e a conversa volta à estaca zero. Duas ou três opções bem
 * espalhadas fecham agendamento; uma lista não.
 *
 * Espalha em vez de cortar os primeiros: pegar `slice(0, 3)` daria 09:00, 09:30 e
 * 10:00 — três variações do mesmo "de manhã cedo", e nenhuma opção para quem só
 * pode à tarde.
 */
export function espalhar(horarios: number[], quantos = 3): number[] {
  if (horarios.length <= quantos) return horarios;
  const passo = (horarios.length - 1) / (quantos - 1);
  return Array.from({ length: quantos }, (_, i) => horarios[Math.round(i * passo)]);
}
