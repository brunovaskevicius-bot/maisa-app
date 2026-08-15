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

export const ehCategoria = (v: unknown): v is CategoriaServico =>
  typeof v === "string" && (CATEGORIAS as string[]).includes(v);

export const primeiroNome = (nome: string) => nome.split(" ")[0];

/* ─────────────────────────────────────────────────────────────────────────────
 * AS REGRAS DE ESCRITA — e por que elas moram aqui e não na rota.
 *
 * Até 15/08/2026 o catálogo era SÓ LEITURA no servidor. A tela de Serviços tinha
 * "adicionar" e "editar" que mexiam em `svcNovos`/`svcEdit` no `store.tsx` — estado do
 * navegador, e nada mais. O dono ajustava o preço do Corte, via a lista mudar, dava F5 e
 * o preço voltava. Não havia rota, não havia porta, não havia erro: a escrita
 * simplesmente não existia, e a tela não sabia disso.
 *
 * ── OS NÚMEROS SÃO OS DO BANCO, DE PROPÓSITO ──
 *
 * `002_multitenant.sql` já recusa nome fora de 1–120, duração fora de 5–480 e preço
 * negativo. Repetir os limites aqui NÃO é desconfiança do banco — é a diferença entre
 * "Diga quanto dura o atendimento" e um 500 com `check_violation` na tela. Quem escreve
 * os dois lados tem que mantê-los iguais; quem escreve só um lado entrega o erro cru.
 *
 * ⚠️ Se mudar um limite aqui, mude o `check` da coluna. O banco é quem manda — ele é a
 * última linha, e é a que vale quando alguém escrever por outro caminho.
 * ────────────────────────────────────────────────────────────────────────────── */

/** `servicos.nome`: `length(btrim(nome)) between 1 and 120`. */
export const NOME_SERVICO_MAX = 120;

/** `servicos.duracao`: `integer check (duracao between 5 and 480)`. São minutos.
 *  Menos de 5 min ou mais de 8 h é dado corrompido, não caso de uso — a mesma faixa de
 *  `duracaoValida` em `dominio/agenda.ts`. */
export const DURACAO_MIN = 5;
export const DURACAO_MAX = 480;

/**
 * Teto de preço, em reais.
 *
 * A coluna é `numeric(10,2)`, então o banco só recusa acima de 99.999.999,99 — um número
 * que nenhum serviço de barbearia ou terapia alcança, e que portanto não protege de nada.
 * O limite útil é o de TECLADO: quem digita 20000 querendo R$ 200,00 (centavos colados)
 * precisa ouvir isso na hora, não descobrir quando a MAISA anunciar o preço ao cliente.
 */
export const PRECO_MAX = 99_999.99;

/** `profissionais.nome`: `length(btrim(nome)) between 2 and 120`. */
export const NOME_PROFISSIONAL_MIN = 2;
export const NOME_PROFISSIONAL_MAX = 120;

/** `profissionais.papel` não tem `check` no banco — é texto livre com default
 *  'Atendimento geral'. O teto existe porque o campo aparece na tela de Equipe e num
 *  cartão, não porque o Postgres reclame. */
export const PAPEL_MAX = 60;
