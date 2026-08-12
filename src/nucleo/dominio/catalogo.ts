/* ─────────────────────────────────────────────────────────────────────────────
 * CATÁLOGO — quem atende e o que se vende.
 *
 * Regra de ouro: DADO, nunca apresentação. Nada de cor, label de badge ou texto de
 * UI aqui — quem decide isso é a tela. É isso que permite trocar a fonte do dado
 * (fixture → Supabase) sem mexer em componente nenhum.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { Expediente } from "./expediente";

export type Profissional = {
  id: string;
  nome: string;
  papel: string;
  atendimentosMes: number;
  avaliacao: number;
  comissao: number;
  desde: string;
  servicoIds: string[];
  ativo: boolean;
  /** Faixa da semana em que atende, já legível ("Seg–Sáb 09–19"). A tela Equipe se chama
   *  "Quem atende e quando" e não tinha UM horário — o "quando" simplesmente não existia no dado,
   *  então o gestor abria a tela para saber quem trabalha sábado e saía sem resposta. */
  horario: string;
  /** Folga fixa, em linguagem natural. */
  folga: string;
  /**
   * A MESMA informação de `horario`/`folga`, em número — e é esta que manda.
   *
   * As duas de cima são frase para o gestor ler; esta é a regra que a grade aplica. Elas
   * convivem porque servem a coisas diferentes, e o banco guarda as duas na mesma linha
   * (`profissionais.horario`, `.folga`, `.expediente_folga`, `.expediente_de`,
   * `.expediente_ate`). Quando divergirem, quem vale é esta.
   *
   * Estar AQUI, e não num `Record<string, Expediente>` à parte, é o conserto de um acoplamento
   * que quebrava calado: a tela lia o expediente de um mapa chaveado pelo id do profissional,
   * e um id que não estivesse no mapa devolvia `undefined` — que `atendeNoDia` degrada para
   * `false`. Resultado: toda fatia da agenda pintada como fora do expediente, todo dia
   * marcado como folga, e nenhum erro em lugar nenhum. Pendurar o expediente na pessoa torna
   * essa classe de erro impossível: quem tem o profissional tem o expediente dele.
   */
  expediente: Expediente;
};

export type CategoriaServico = "Recorrente" | "Pacote" | "Extra";

export type Servico = {
  id: string;
  nome: string;
  categoria: CategoriaServico;
  preco: number;
  /** Minutos. */
  duracao: number;
  profissionalIds: string[];
  ativo: boolean;
};

export const CATEGORIAS: CategoriaServico[] = ["Recorrente", "Pacote", "Extra"];

export const primeiroNome = (nome: string) => nome.split(" ")[0];
