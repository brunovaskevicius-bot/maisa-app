/* MAISA — dataset único do app (negócio genérico).
 *
 * Substitui mock.ts + clinicoMock.ts + profiles.ts. Um negócio só, sem verticais
 * (ver docs/BACKLOG-multiperfil.md para o que saiu e como voltar).
 *
 * Regra de ouro deste arquivo: DADO, nunca apresentação. Nada de cor, label de
 * badge ou texto de UI aqui — quem decide isso é a tela. Assim trocar o dataset
 * por Supabase mais tarde não mexe em nenhum componente.
 *
 * IDs têm prefixo por entidade (pr/sv/cl/ag/cv) de propósito: a Gaveta resolve o
 * detalhe a partir de um id só, e prefixo distinto evita que um cliente e um
 * agendamento com o mesmo número colidam. */

/* ───────────────────────────── negócio ───────────────────────────── */

export const NEGOCIO = {
  nome: "Seu Negócio",
  plano: "Profissional",
  precoPlano: 149.9,
  proximaCobranca: "05/08/2026",
  cartao: "Cartão final 4417",
  conversasPlano: "Ilimitadas",
};

/** Dados fiscais do prestador — cabeçalho do recibo de NFS-e. */
export const PRESTADOR = {
  nome: "Seu Negócio — Atendimentos",
  doc: "CNPJ 47.227.217/0001-00",
};

/** Competência do fechamento que a tela de Faturamento mostra. */
export const PERIODO = "Junho de 2026";

/** "Hoje" do protótipo — o dia que o Fluxo e a Agenda exibem. */
export const HOJE = { label: "Sexta, 17 de julho", dow: "SEX", num: 17, data: "17/07/2026" };

/* A antiga const SEMANA (seg 13 … sáb 18, escrita à mão) saiu: a semana agora é DERIVADA do dia
   visível por semanaDoDia(), lá embaixo, junto com o resto do calendário. Duas verdades sobre
   qual semana é essa era uma a mais. */

/** Janela da grade da Agenda: 09:00 → 19:00, linha de 1h. */
export const AGENDA_INICIO = 9;
export const AGENDA_HORAS = 10;

/* ───────────────────────────── equipe ───────────────────────────── */

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

export const EQUIPE: Profissional[] = [
  { id: "pr1", nome: "Rafael Antunes", papel: "Atendimento geral", atendimentosMes: 168, avaliacao: 4.9, comissao: 50, desde: "jan/2024", servicoIds: ["sv1", "sv2", "sv3", "sv7"], ativo: true, horario: "Seg–Sáb 09–19", folga: "domingo" },
  { id: "pr2", nome: "Diego Moraes", papel: "Especialista sênior", atendimentosMes: 142, avaliacao: 4.8, comissao: 45, desde: "mar/2024", servicoIds: ["sv1", "sv3", "sv4", "sv6"], ativo: true, horario: "Ter–Sáb 10–20", folga: "domingo e segunda" },
  { id: "pr3", nome: "Léo Barbosa", papel: "Atendimento especializado", atendimentosMes: 97, avaliacao: 4.7, comissao: 45, desde: "jun/2024", servicoIds: ["sv1", "sv2", "sv5"], ativo: true, horario: "Seg–Sex 08–17", folga: "sábado e domingo" },
  { id: "pr4", nome: "Caio Ferraz", papel: "Atendimento júnior", atendimentosMes: 0, avaliacao: 4.6, comissao: 40, desde: "fev/2025", servicoIds: ["sv6"], ativo: false, horario: "Qui–Sáb 13–19", folga: "segunda a quarta" },
];

/** Atendimento sendo marcado na Agenda, antes de virar agendamento de verdade.
 *  Nasce com horário e profissional (vieram do clique no vago); cliente e serviço faltam. */
export type RascunhoAgendamento = {
  id: string;
  /** Dia do mês em que o clique caiu — com Semana e Mês na tela, o vago já não é sempre hoje. */
  dia: number;
  profissionalId: string;
  inicio: number;
  clienteId: string;
  servicoId: string;
};

/** Profissionais que aparecem como coluna na grade da Agenda. */
export const COLUNAS_AGENDA = ["pr1", "pr2", "pr3"];

/* ───────────────────────────── catálogo ───────────────────────────── */

export type CategoriaServico = "Recorrente" | "Pacote" | "Extra";

export type Servico = {
  id: string;
  nome: string;
  categoria: CategoriaServico;
  preco: number;
  duracao: number;
  profissionalIds: string[];
  ativo: boolean;
};

export const SERVICOS: Servico[] = [
  { id: "sv1", nome: "Atendimento padrão", categoria: "Recorrente", preco: 100, duracao: 40, profissionalIds: ["pr1", "pr2", "pr3"], ativo: true },
  { id: "sv2", nome: "Atendimento rápido", categoria: "Recorrente", preco: 60, duracao: 30, profissionalIds: ["pr1", "pr3"], ativo: true },
  { id: "sv3", nome: "Pacote completo", categoria: "Pacote", preco: 180, duracao: 60, profissionalIds: ["pr1", "pr2"], ativo: true },
  { id: "sv4", nome: "Atendimento premium", categoria: "Pacote", preco: 150, duracao: 45, profissionalIds: ["pr2"], ativo: true },
  { id: "sv5", nome: "Serviço adicional", categoria: "Extra", preco: 80, duracao: 40, profissionalIds: ["pr3"], ativo: true },
  { id: "sv6", nome: "Atendimento avulso", categoria: "Extra", preco: 70, duracao: 30, profissionalIds: ["pr2", "pr4"], ativo: true },
  { id: "sv7", nome: "Consulta inicial", categoria: "Extra", preco: 90, duracao: 30, profissionalIds: ["pr1"], ativo: false },
];

export const CATEGORIAS: CategoriaServico[] = ["Recorrente", "Pacote", "Extra"];

/* ───────────────────────────── clientes ───────────────────────────── */

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  canal: "Online" | "Presencial";
  ativo: boolean;
  desde: string;
  servicoId: string;
  /** Atendimentos fechados na competência de PERIODO. */
  atendimentos: number;
  /** Valor fechado na competência — base da nota fiscal. */
  valor: number;
  /**
   * Cliente que existe só para validar a integração fiscal em produção.
   * A NFS-e só autoriza de verdade em produção, então testar exige emitir uma
   * nota real — e uma nota real de teste não pode ficar de pé. Marcar `teste`
   * faz o store cancelar automaticamente logo após a autorização
   * (ver TESTE_CANCELA_APOS_MS), de forma que nunca sobra nota órfã.
   */
  teste?: boolean;
};

export const CLIENTES: Cliente[] = [
  { id: "cl1", nome: "Mariana Alves", telefone: "(11) 98123-4567", email: "mariana.alves@email.com", cpf: "312.456.789-01", canal: "Online", ativo: true, desde: "mar/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl2", nome: "Rafael Costa", telefone: "(11) 99876-1234", email: "rafael.costa@email.com", cpf: "408.221.334-90", canal: "Presencial", ativo: true, desde: "jan/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl3", nome: "Beatriz Lima", telefone: "(11) 97654-3210", email: "bia.lima@email.com", cpf: "199.873.221-44", canal: "Online", ativo: true, desde: "set/2024", servicoId: "sv3", atendimentos: 10, valor: 1800 },
  { id: "cl4", nome: "Camila e Rodrigo", telefone: "(11) 99654-0099", email: "camila.rodrigo@email.com", cpf: "221.667.880-12", canal: "Presencial", ativo: true, desde: "nov/2024", servicoId: "sv4", atendimentos: 5, valor: 750 },
  { id: "cl5", nome: "Lucas Martins", telefone: "(11) 98112-9087", email: "lucas.martins@email.com", cpf: "389.220.115-67", canal: "Online", ativo: true, desde: "abr/2025", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl6", nome: "Fernanda Rocha", telefone: "(11) 99003-2211", email: "fe.rocha@email.com", cpf: "470.118.226-05", canal: "Presencial", ativo: true, desde: "jun/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl7", nome: "Pedro Henrique", telefone: "(11) 98890-5544", email: "pedro.h@email.com", cpf: "612.334.778-21", canal: "Online", ativo: true, desde: "out/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl8", nome: "Juliana Dias", telefone: "(11) 97221-8866", email: "juliana.dias@email.com", cpf: "298.554.110-78", canal: "Presencial", ativo: true, desde: "dez/2024", servicoId: "sv1", atendimentos: 8, valor: 800 },
  { id: "cl9", nome: "Gustavo Nunes", telefone: "(11) 99445-1100", email: "gustavo.nunes@email.com", cpf: "334.876.220-09", canal: "Online", ativo: true, desde: "jun/2026", servicoId: "sv3", atendimentos: 8, valor: 1440 },
  { id: "cl10", nome: "Larissa Gomes", telefone: "(11) 98667-3322", email: "larissa.gomes@email.com", cpf: "145.998.667-30", canal: "Online", ativo: true, desde: "mai/2025", servicoId: "sv2", atendimentos: 8, valor: 480 },
  { id: "cl11", nome: "Thiago Barros", telefone: "(11) 99778-4455", email: "thiago.barros@email.com", cpf: "502.117.889-64", canal: "Presencial", ativo: true, desde: "ago/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl12", nome: "Vinícius Carvalho", telefone: "(11) 98223-6677", email: "vinicius.c@email.com", cpf: "677.443.221-18", canal: "Online", ativo: true, desde: "jan/2025", servicoId: "sv5", atendimentos: 8, valor: 640 },
  { id: "cl13", nome: "Anderson Reis", telefone: "(11) 99771-0342", email: "anderson.reis@email.com", cpf: "556.221.998-73", canal: "Presencial", ativo: true, desde: "fev/2025", servicoId: "sv6", atendimentos: 7, valor: 490 },
  { id: "cl14", nome: "Sofia Ribeiro", telefone: "(11) 97334-9988", email: "sofia.r@email.com", cpf: "811.225.443-50", canal: "Online", ativo: false, desde: "mar/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
  { id: "cl15", nome: "Marcelo Tavares", telefone: "(11) 99110-2200", email: "marcelo.t@email.com", cpf: "723.889.110-42", canal: "Presencial", ativo: false, desde: "jul/2023", servicoId: "sv2", atendimentos: 0, valor: 0 },
  { id: "cl16", nome: "Patrícia Mendes", telefone: "(11) 98556-7711", email: "patricia.m@email.com", cpf: "455.667.889-23", canal: "Online", ativo: false, desde: "fev/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
  // Tomador de teste da integração fiscal. CPF real e existente de propósito: a
  // prefeitura valida a existência do documento, e CPF inventado é rejeitado
  // antes de a integração ser exercitada. R$ 1,00 para o valor não importar.
  { id: "cl-teste", nome: "Bruno Vaskevicius", telefone: "(11) 99999-0000", email: "bruno.vaskevicius@polijunior.com.br", cpf: "545.739.088-89", canal: "Online", ativo: true, desde: "jul/2026", servicoId: "sv2", atendimentos: 1, valor: 1, teste: true },
];

/**
 * Quanto o store espera entre a autorização e o cancelamento automático da nota
 * de teste. Precisa ser curto (a nota real não deve viver) e longo o suficiente
 * para dar tempo de ver o número na tela e conferir na prefeitura.
 */
export const TESTE_CANCELA_APOS_MS = 25_000;

/* ───────────────────────────── nota fiscal ─────────────────────────────
 * Estados espelham a Focus NFe (ver src/lib/nf/focus.ts → normalizarStatus):
 *   pendente     — fechado no mês, nota ainda não enviada
 *   processando  — enviada à prefeitura, aguardando número (assíncrono)
 *   emitida      — autorizada; tem número, e pdf quando a emissão foi real
 *   cancelada    — autorizada e depois cancelada
 *   erro         — a prefeitura ou a Focus rejeitou; `erro` traz o motivo
 * `ref` é a chave da Focus, necessária para consultar status e cancelar.
 * `simulada` marca nota que saiu sem token da Focus (número gerado localmente). */

export type StatusNota = "pendente" | "processando" | "emitida" | "cancelada" | "erro";

export type Nota = {
  status: StatusNota;
  numero?: string;
  data?: string;
  ref?: string;
  pdf?: string;
  erro?: string;
  simulada?: boolean;
};

/** Notas já fechadas antes do app abrir — o resto começa em "pendente". */
export const NOTAS_INICIAIS: Record<string, Nota> = {
  cl1: { status: "emitida", numero: "2026/000112", data: "30/06/2026" },
  cl2: { status: "emitida", numero: "2026/000113", data: "30/06/2026" },
  cl3: { status: "emitida", numero: "2026/000114", data: "30/06/2026" },
  cl4: { status: "emitida", numero: "2026/000115", data: "30/06/2026" },
  cl8: { status: "emitida", numero: "2026/000116", data: "30/06/2026" },
};

/** Primeiro número que a emissão simulada usa (continua de onde as iniciais param). */
export const PROXIMO_NUMERO = 117;

/* ───────────────────────────── agendamentos de hoje ─────────────────────────────
 * UMA lista só alimenta o Fluxo de hoje (kanban) E a Agenda (grade). No design
 * original eram dois mocks com pessoas diferentes, o que fazia arrastar num lugar
 * não aparecer no outro. Aqui a etapa do kanban e a posição na grade são estados
 * do MESMO agendamento, então as duas telas contam a mesma história. */

/** Etapa do dia — as três colunas do kanban. */
export type Etapa = "chegando" | "atendendo" | "feito";

export const ETAPAS: Etapa[] = ["chegando", "atendendo", "feito"];

export type Agendamento = {
  id: string;
  /** Dia do mês em MES_AGENDA. Ausente ⇒ HOJE, o dia de partida do protótipo. */
  dia?: number;
  /** Início em hora decimal: 9.5 = 09:30. */
  inicio: number;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  /** Confirmou pelo WhatsApp? false ⇒ a MAISA ainda está cobrando. */
  confirmado: boolean;
  etapaInicial: Etapa;
};

export const AGENDAMENTOS: Agendamento[] = [
  { id: "ag1", inicio: 9, profissionalId: "pr1", servicoId: "sv1", clienteId: "cl6", confirmado: true, etapaInicial: "feito" },
  { id: "ag2", inicio: 9.5, profissionalId: "pr3", servicoId: "sv2", clienteId: "cl2", confirmado: true, etapaInicial: "feito" },
  { id: "ag3", inicio: 10, profissionalId: "pr2", servicoId: "sv3", clienteId: "cl9", confirmado: true, etapaInicial: "atendendo" },
  { id: "ag4", inicio: 11.5, profissionalId: "pr2", servicoId: "sv4", clienteId: "cl4", confirmado: true, etapaInicial: "chegando" },
  { id: "ag5", inicio: 13.5, profissionalId: "pr3", servicoId: "sv1", clienteId: "cl11", confirmado: false, etapaInicial: "chegando" },
  { id: "ag6", inicio: 14, profissionalId: "pr1", servicoId: "sv2", clienteId: "cl7", confirmado: true, etapaInicial: "chegando" },
  { id: "ag7", inicio: 15.5, profissionalId: "pr1", servicoId: "sv3", clienteId: "cl3", confirmado: true, etapaInicial: "chegando" },
  { id: "ag8", inicio: 17, profissionalId: "pr2", servicoId: "sv6", clienteId: "cl13", confirmado: false, etapaInicial: "chegando" },
  // 16:00 e não 17:30: o Léo atende até as 17 (EQUIPE[2].horario, e agora EXPEDIENTE.pr3), então
  // às 17:30 este atendimento caía na faixa que a grade desenha como "fora do expediente" — a
  // própria tela de Equipe desmentia a própria Agenda.
  { id: "ag9", inicio: 16, profissionalId: "pr3", servicoId: "sv5", clienteId: "cl12", confirmado: true, etapaInicial: "chegando" },
];

/* ───────────────────────────── o mês da agenda ─────────────────────────────
 * A Agenda passou a ter visão de Semana e de Mês, e essas duas visões não têm o
 * que mostrar com um dia só de dado. A tela anterior contornava isso dizendo a
 * verdade — todo dia que não fosse 17 virava estado vazio —, e isso estava certo
 * enquanto só existia a visão de Dia. Numa grade de mês, porém, trinta células
 * vazias não são honestas: são a tela quebrada.
 *
 * Então o resto do mês é GERADO, e gerado de forma DETERMINÍSTICA: nada de
 * Math.random nem de Date.now, porque o calendário mudaria a cada render e
 * arrastar um bloco embaralharia a tela inteira. O mesmo dia sempre produz os
 * mesmos atendimentos.
 *
 * O dia 17 fica FORA do gerador de propósito: ele continua sendo exatamente os
 * nove agendamentos acima, que são o que o Fluxo de hoje mostra. Mexer neles
 * mudaria o kanban, e o kanban não é assunto desta tela. */

/** Mês que a Agenda exibe. 1/7/2026 caiu numa quarta ⇒ primeiroDow = 2. */
export const MES_AGENDA = { nome: "julho", ano: 2026, dias: 31, primeiroDow: 2 };

/** Semana começando na segunda — convenção pt-BR. Domingo é a última coluna. */
export const DOW_CURTO = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
export const DOW_LONGO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

/** Dia do mês → índice do dia da semana (0 = segunda … 6 = domingo). */
export const dowDoDia = (dia: number) => (MES_AGENDA.primeiroDow + dia - 1) % 7;

/** Domingo a casa não abre. A coluna existe só para o mês ter sete colunas. */
export const fechado = (dia: number) => dowDoDia(dia) === 6;

/** Os seis dias úteis (seg–sáb) da semana de um dia, sem transbordar o mês. */
export function semanaDoDia(dia: number): number[] {
  const segunda = dia - dowDoDia(dia);
  return Array.from({ length: 6 }, (_, i) => segunda + i).filter((d) => d >= 1 && d <= MES_AGENDA.dias);
}

/** Célula da grade de mês. `dia: null` é o preenchimento antes do dia 1 / depois do 31. */
export type CelulaMes = { chave: string; dia: number | null };

/** A grade inteira, em múltiplos de 7 — 35 células em julho de 2026. */
export function celulasDoMes(): CelulaMes[] {
  const antes = MES_AGENDA.primeiroDow;
  const total = Math.ceil((antes + MES_AGENDA.dias) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = i - antes + 1;
    return { chave: `c${i}`, dia: d >= 1 && d <= MES_AGENDA.dias ? d : null };
  });
}

/** Horários que a casa costuma encher, na ordem. Cada par (hora, profissional) é único. */
const PAUTA: { inicio: number; servicoId: string; profissionalId: string }[] = [
  { inicio: 9, servicoId: "sv1", profissionalId: "pr1" },
  { inicio: 9.5, servicoId: "sv2", profissionalId: "pr3" },
  { inicio: 10, servicoId: "sv3", profissionalId: "pr2" },
  { inicio: 11, servicoId: "sv2", profissionalId: "pr1" },
  { inicio: 11.5, servicoId: "sv4", profissionalId: "pr2" },
  { inicio: 13.5, servicoId: "sv1", profissionalId: "pr3" },
  { inicio: 14, servicoId: "sv2", profissionalId: "pr1" },
  { inicio: 15, servicoId: "sv5", profissionalId: "pr3" },
  { inicio: 15.5, servicoId: "sv3", profissionalId: "pr1" },
  { inicio: 17, servicoId: "sv6", profissionalId: "pr2" },
  { inicio: 17.5, servicoId: "sv5", profissionalId: "pr3" },
];

/** Quando cada profissional atende, em dado ESTRUTURADO.
 *  EQUIPE[].horario e EQUIPE[].folga são frases para o dono ler ("Seg–Sex 08–17", "folga sábado
 *  e domingo"); o calendário precisa do número. Sem isto a Agenda marcava o Léo num sábado e às
 *  17:30 — e a tela de Equipe, na mesma sessão, dizia que ele folga sábado e sai às 17.
 *  Se os dois divergirem, é ESTE que a Agenda obedece: mantenha o par junto. */
export const EXPEDIENTE: Record<string, { folga: number[]; de: number; ate: number }> = {
  pr1: { folga: [6], de: 9, ate: 19 },     // Seg–Sáb 09–19 · folga domingo
  pr2: { folga: [6, 0], de: 10, ate: 20 }, // Ter–Sáb 10–20 · folga domingo e segunda
  pr3: { folga: [5, 6], de: 8, ate: 17 },  // Seg–Sex 08–17 · folga sábado e domingo
};

/** Esse profissional trabalha nesse dia? */
export const atende = (profissionalId: string, dia: number) => {
  const e = EXPEDIENTE[profissionalId];
  return !!e && !e.folga.includes(dowDoDia(dia));
};

/** Esse profissional pode começar um atendimento aí — dia de trabalho e hora dentro do expediente. */
export const podeComecar = (profissionalId: string, dia: number, inicio: number) => {
  const e = EXPEDIENTE[profissionalId];
  return !!e && atende(profissionalId, dia) && inicio >= e.de && inicio < e.ate;
};

/** …e o atendimento inteiro cabe antes de ele ir embora. */
export const cabeNoExpediente = (profissionalId: string, dia: number, inicio: number, duracaoMin: number) => {
  const e = EXPEDIENTE[profissionalId];
  return !!e && podeComecar(profissionalId, dia, inicio) && inicio + duracaoMin / 60 <= e.ate;
};

const CLI_AGENDA = ["cl1", "cl2", "cl3", "cl4", "cl5", "cl6", "cl7", "cl8", "cl9", "cl10", "cl11", "cl12", "cl13"];

/** O resto do mês. Ver o bloco acima para por que isto existe e por que é determinístico. */
export const AGENDA_MES: Agendamento[] = (() => {
  const out: Agendamento[] = [];
  for (let dia = 1; dia <= MES_AGENDA.dias; dia++) {
    if (fechado(dia) || dia === HOJE.num) continue;
    // Só os horários que cabem no expediente de quem atende — folga E hora de saída.
    // SERVICOS.find e não o helper servico(): ele é declarado lá embaixo, e esta IIFE roda na
    // avaliação do módulo — chamá-lo aqui cairia na temporal dead zone.
    const livres = PAUTA.filter((p) => cabeNoExpediente(p.profissionalId, dia, p.inicio, SERVICOS.find((s) => s.id === p.servicoId)!.duracao));
    const qtd = Math.min(4 + ((dia * 3) % 4), livres.length);
    const salto = (dia * 3) % livres.length;
    for (let i = 0; i < qtd; i++) {
      const slot = livres[(salto + i) % livres.length];
      const passado = dia < HOJE.num;
      out.push({
        id: `ag-${dia}-${i}`,
        dia,
        inicio: slot.inicio,
        profissionalId: slot.profissionalId,
        servicoId: slot.servicoId,
        clienteId: CLI_AGENDA[(dia * 7 + i * 3) % CLI_AGENDA.length],
        // dia que já passou está fechado; à frente, um em cada seis ainda não respondeu
        confirmado: passado || (dia + i) % 6 !== 0,
        etapaInicial: passado ? "feito" : "chegando",
      });
    }
  }
  return out;
})();

/* ───────────────────────────── conversas ─────────────────────────────
 * `estado` é a situação de origem; assumir/devolver no app sobrepõe isso.
 *   maisa  — a MAISA está conduzindo sozinha
 *   espera — precisa de decisão sua (encaixe, exceção)
 *   voce   — você assumiu
 *   ok     — resolvida */

export type EstadoConversa = "maisa" | "espera" | "voce" | "ok";

export type Conversa = {
  id: string;
  clienteId?: string;
  /** Nome exibido — pode não ser um cliente cadastrado ainda (lead, acompanhante). */
  nome: string;
  telefone: string;
  hora: string;
  estado: EstadoConversa;
};

export type Msg = { de: "cliente" | "bot" | "voce"; txt: string };

export const CONVERSAS: Conversa[] = [
  { id: "cv1", clienteId: "cl11", nome: "Thiago Barros", telefone: "(11) 99778-4455", hora: "10:31", estado: "espera" },
  { id: "cv2", nome: "Larissa (mãe do Gustavo)", telefone: "(11) 99640-2210", hora: "10:15", estado: "espera" },
  { id: "cv3", clienteId: "cl13", nome: "Anderson Reis", telefone: "(11) 99771-0342", hora: "11:02", estado: "maisa" },
  { id: "cv4", clienteId: "cl12", nome: "Vinícius Carvalho", telefone: "(11) 98223-6677", hora: "10:48", estado: "maisa" },
  { id: "cv5", clienteId: "cl6", nome: "Fernanda Rocha", telefone: "(11) 99003-2211", hora: "08:42", estado: "ok" },
  { id: "cv6", clienteId: "cl2", nome: "Rafael Costa", telefone: "(11) 99876-1234", hora: "11:20", estado: "ok" },
];

export const THREADS: Record<string, Msg[]> = {
  cv1: [
    { de: "cliente", txt: "Oi! Marquei pra hoje 13:30, mas surgiu uma reunião" },
    { de: "bot", txt: "Sem problema! Quer que eu veja outro horário?" },
    { de: "cliente", txt: "Quero remarcar pra quinta, dá?" },
  ],
  cv2: [
    { de: "cliente", txt: "Oi, boa tarde!" },
    { de: "bot", txt: "Olá! Aqui é a MAISA. Como posso ajudar?" },
    { de: "cliente", txt: "Consegue encaixar o Gustavo hoje à tarde?" },
  ],
  cv3: [
    { de: "cliente", txt: "Vocês abrem no feriado?" },
    { de: "bot", txt: "Abrimos sim, das 9h às 14h. Quer marcar um horário?" },
  ],
  cv4: [
    { de: "cliente", txt: "Quanto tá o pacote completo?" },
    { de: "bot", txt: "O Pacote completo está R$ 180 e leva 60 min. Quer que eu já reserve?" },
  ],
  cv5: [
    { de: "bot", txt: "Seu horário é hoje às 09:00 com o Rafael 👍" },
    { de: "cliente", txt: "Fechou, confirmo às 9h então 👍" },
  ],
  cv6: [
    { de: "bot", txt: "Tudo certo por aqui! Precisando é só chamar." },
    { de: "cliente", txt: "Obrigado, MAISA! Até mais 🙏" },
  ],
};

/** Respostas que a MAISA sugere para você, por conversa. */
export const SUGESTOES: Record<string, string[]> = {
  cv1: ["Ver quinta às 10h", "Oferecer 14h", "Manter 13:30"],
  cv2: ["Oferecer 16:30", "Sem vaga hoje"],
  cv3: ["Mandar horários", "Agendar agora"],
  cv4: ["Mandar tabela", "Reservar horário"],
  cv5: ["Confirmar", "Agradecer"],
  cv6: ["Agradecer", "Pedir avaliação"],
};

/* ───────────────────────────── fila "Precisa de você" ─────────────────────────────
 * O que o dia tem de decisão pendente. `alvo` é o id que a Gaveta abre — pode ser
 * uma conversa (cv…) ou um agendamento (ag…). */

export type ItemFila = { id: string; alvo: string; titulo: string; tag: string; msg: string };

export const FILA: ItemFila[] = [
  { id: "fl1", alvo: "cv2", titulo: "Larissa (mãe do Gustavo)", tag: "encaixe", msg: "Consegue encaixar o Gustavo hoje à tarde? A agenda do Diego não tem vaga." },
  { id: "fl2", alvo: "cv1", titulo: "Thiago Barros", tag: "remarcar", msg: "Quer trocar as 13:30 de hoje por quinta às 10h." },
  { id: "fl3", alvo: "ag5", titulo: "Thiago Barros", tag: "confirmar", msg: "13:30 ainda não confirmado — a MAISA já cobrou duas vezes." },
  { id: "fl4", alvo: "ag8", titulo: "Anderson Reis", tag: "confirmar", msg: "17:00 sem confirmação desde ontem." },
];

/* ───────────────────────────── ajustes da MAISA ───────────────────────────── */

export type SecaoAjuste = { id: string; titulo: string; sub: string };

export const SECOES_AJUSTE: SecaoAjuste[] = [
  { id: "personalidade", titulo: "Personalidade", sub: "Como a MAISA fala e se apresenta" },
  { id: "horarios", titulo: "Horário de atendimento", sub: "Quando ela pode marcar" },
  { id: "agendamentos", titulo: "Agendamentos", sub: "O que ela faz com os horários" },
  { id: "comportamento", titulo: "Comportamento", sub: "Até onde ela vai sozinha" },
];

export const TONS = ["amigável", "profissional", "descontraído"] as const;
export type Tom = (typeof TONS)[number];

export type Dia = { nome: string; aberto: boolean; de: string; ate: string };

export const DIAS_PADRAO: Dia[] = [
  { nome: "Segunda", aberto: true, de: "08:00", ate: "20:00" },
  { nome: "Terça", aberto: true, de: "08:00", ate: "20:00" },
  { nome: "Quarta", aberto: true, de: "08:00", ate: "20:00" },
  { nome: "Quinta", aberto: true, de: "08:00", ate: "20:00" },
  { nome: "Sexta", aberto: true, de: "08:00", ate: "21:00" },
  { nome: "Sábado", aberto: true, de: "09:00", ate: "13:00" },
  { nome: "Domingo", aberto: false, de: "—", ate: "—" },
];

/** Chaves dos toggles de comportamento — o store guarda um booleano por chave. */
export type ChaveCfg =
  | "confirmar" | "lembrete" | "remarcar"
  | "encaminhar" | "precoCatalogo" | "pix" | "encaixe";

export const CFG_PADRAO: Record<ChaveCfg, boolean> = {
  confirmar: true,
  lembrete: true,
  remarcar: true,
  encaminhar: true,
  precoCatalogo: true,
  pix: false,
  encaixe: false,
};

export const TOGGLES_AGENDAMENTO: { chave: ChaveCfg; titulo: string; desc: string }[] = [
  { chave: "confirmar", titulo: "Confirmar no WhatsApp", desc: "Envia a confirmação assim que o cliente marca" },
  { chave: "lembrete", titulo: "Lembrete 3h antes", desc: "Manda um lembrete automático antes do atendimento" },
  { chave: "remarcar", titulo: "Permitir remarcação", desc: "Deixa o cliente remarcar sozinho pela conversa" },
  { chave: "encaixe", titulo: "Aceitar encaixes", desc: "Pode oferecer horários que abriram de última hora" },
];

export const TOGGLES_COMPORTAMENTO: { chave: ChaveCfg; titulo: string; desc: string }[] = [
  { chave: "encaminhar", titulo: "Chamar você quando não souber", desc: "Em vez de arriscar, ela te passa a conversa" },
  { chave: "precoCatalogo", titulo: "Nunca inventar preço", desc: "Só fala valores que estão no catálogo" },
  { chave: "pix", titulo: "Pedir Pix antecipado", desc: "Para garantir o horário em dia cheio" },
];

/** Preview de WhatsApp que acompanha a seção aberta em "A MAISA". */
export const PREVIEWS: Record<string, { titulo: string; msgs: Msg[] }> = {
  personalidade: {
    titulo: "Personalidade",
    msgs: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: "Olá! Aqui é a MAISA, assistente do Seu Negócio. Como posso te ajudar hoje?" },
    ],
  },
  horarios: {
    titulo: "Horário de atendimento",
    msgs: [
      { de: "cliente", txt: "Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo seg a sex das 8h às 20h, e sábado das 9h às 13h 🕗" },
      { de: "cliente", txt: "E domingo?" },
      { de: "bot", txt: "Domingo fechamos, mas já posso deixar seu horário marcado para segunda." },
    ],
  },
  agendamentos: {
    titulo: "Agendamentos",
    msgs: [
      { de: "cliente", txt: "Consigo marcar pra amanhã?" },
      { de: "bot", txt: "Consigo! Tenho 14:00 e 16:00. Qual fica melhor?" },
      { de: "cliente", txt: "16h" },
      { de: "bot", txt: "Fechado, 16:00 ✅ Te lembro 3h antes por aqui." },
    ],
  },
  comportamento: {
    titulo: "Comportamento",
    msgs: [
      { de: "cliente", txt: "Vocês fazem um serviço bem específico?" },
      { de: "bot", txt: "Boa pergunta! Vou confirmar com o responsável e já te respondo 🙌" },
    ],
  },
};

/* ───────────────────────────── "Mais" ───────────────────────────── */

export type Faq = { id: string; pergunta: string; resposta: string; usos: number };

export const FAQS: Faq[] = [
  { id: "fq1", pergunta: "Como faço para agendar?", resposta: "Me diz o melhor dia e horário que eu já agendo seu atendimento.", usos: 361 },
  { id: "fq2", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", usos: 240 },
  { id: "fq3", pergunta: "Quais formas de pagamento?", resposta: "Aceitamos Pix, cartão e dinheiro.", usos: 198 },
  { id: "fq4", pergunta: "Quais serviços vocês oferecem?", resposta: "Temos vários atendimentos — me diz o que você precisa que eu te explico.", usos: 129 },
];

export const NUMEROS_MES = {
  periodo: "Julho de 2026",
  resultado: [
    ["Faturamento", "R$ 18.240,00"],
    ["Atendimentos", "407"],
    ["Ocupação média", "78%"],
    ["Novos clientes", "37"],
  ] as [string, string][],
  maisa: [
    ["Conversas atendidas", "1.284"],
    ["Resolvidas sem você", "87%"],
    ["Resposta média", "12s"],
  ] as [string, string][],
};

export const FATURAS = [
  ["jul/2026", "R$ 149,90 · paga"],
  ["jun/2026", "R$ 149,90 · paga"],
  ["mai/2026", "R$ 149,90 · paga"],
] as [string, string][];

/* ───────────────────────────── lookups ───────────────────────────── */

export const profissional = (id: string) => EQUIPE.find((p) => p.id === id);
export const servico = (id: string) => SERVICOS.find((s) => s.id === id);
export const cliente = (id: string) => CLIENTES.find((c) => c.id === id);
/** Procura nos dois lados: o dia de partida E o mês gerado. Olhar só AGENDAMENTOS deixava
 *  arrastar um bloco de outro dia sem toast e sem "Desfazer" — a ação acontecia calada. */
export const agendamento = (id: string) =>
  AGENDAMENTOS.find((a) => a.id === id) ?? AGENDA_MES.find((a) => a.id === id);
export const conversa = (id: string) => CONVERSAS.find((c) => c.id === id);

export const nomeProfissional = (id: string) => profissional(id)?.nome ?? "—";
export const primeiroNome = (nome: string) => nome.split(" ")[0];
export const nomeServico = (id: string) => servico(id)?.nome ?? "—";
export const nomeCliente = (id: string) => cliente(id)?.nome ?? "—";

/** Hora decimal → "HH:MM". 9.5 → "09:30". */
export const hhmm = (v: number) => {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
