/* ─────────────────────────────────────────────────────────────────────────────
 * CATÁLOGO — quem atende e o que se vende.
 *
 * Regra de ouro: DADO, nunca apresentação. Nada de cor, label de badge ou texto de
 * UI aqui — quem decide isso é a tela. É isso que permite trocar a fonte do dado
 * (fixture → Supabase) sem mexer em componente nenhum.
 * ────────────────────────────────────────────────────────────────────────────── */

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
