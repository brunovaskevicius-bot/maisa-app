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

/* A antiga const SEMANA (seg 13 … sáb 18, escrita à mão) saiu: a semana agora é DERIVADA do dia
   visível por semanaDoDia(), lá embaixo, junto com o resto do calendário. Duas verdades sobre
   qual semana é essa era uma a mais. */

/** Janela DESENHADA na grade da Agenda: 07:00 → 22:00, linha de 1h.
 *
 *  Era 09–19, a faixa do expediente. Deixou de servir quando a agenda passou a mostrar
 *  a agenda REAL do Google: um compromisso pessoal às 08:00 renderizava com `top`
 *  negativo, ou seja, por cima do cabeçalho das colunas. A grade agora desenha mais do
 *  que o expediente e marca visualmente o que está fora dele (ver `Vagos`). */
export const AGENDA_INICIO = 7;
export const AGENDA_HORAS = 15;

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

/* UM profissional só, e é de propósito.
 *
 * A agenda do Google do `pr1` é a fonte da verdade dos atendimentos (conectada em
 * 06/08/2026), e uma agenda real de UMA pessoa não convive com três colegas
 * fictícios: as outras colunas mostrariam atendimentos que não existem em lugar
 * nenhum. Quem quiser a equipe de volta traz junto uma conexão por pessoa.
 *
 * Os serviços de pr2/pr3/pr4 foram absorvidos aqui (ver SERVICOS abaixo) para
 * nenhum serviço ficar sem quem o faça. */
export const EQUIPE: Profissional[] = [
  { id: "pr1", nome: "Rafael Antunes", papel: "Atendimento geral", atendimentosMes: 168, avaliacao: 4.9, comissao: 50, desde: "jan/2024", servicoIds: ["sv1", "sv2", "sv3", "sv4", "sv5", "sv6", "sv7"], ativo: true, horario: "Seg–Sáb 09–19", folga: "domingo" },
];

/** Atendimento sendo marcado na Agenda, antes de virar agendamento de verdade.
 *  Nasce com horário e profissional (vieram do clique no vago); cliente e serviço faltam. */
export type RascunhoAgendamento = {
  id: string;
  /**
   * uuid cunhado quando o rascunho nasce, e mandado ao servidor na criação.
   *
   * É a chave de IDEMPOTÊNCIA: o servidor procura um evento com esta marca antes de
   * inserir. Nasce aqui, e não na hora de enviar, justamente para sobreviver a uma
   * falha — "Tentar de novo" reusa a mesma chave e encontra o evento que a primeira
   * tentativa talvez tenha criado, em vez de criar um segundo.
   */
  maisaAg: string;
  /** Data ISO em que o clique caiu — com Semana e Mês na tela, o vago já não é sempre hoje. */
  data: string;
  profissionalId: string;
  inicio: number;
  clienteId: string;
  servicoId: string;
};

/** Profissionais que aparecem como coluna na grade da Agenda.
 *
 *  ⚠️ É TAMBÉM a allowlist do servidor nas rotas do Google (conectar e evento): só
 *  ids daqui podem conectar uma agenda ou criar evento. A exceção é o DELETE de
 *  conectar, que aceita qualquer `pr…` de propósito — senão uma conexão antiga em
 *  pr2/pr3 viraria linha impossível de desconectar, segurando um refresh token vivo
 *  e invisível. O RLS já garante que ninguém apaga a linha de outro. */
export const COLUNAS_AGENDA = ["pr1"];

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

/* Todo serviço aponta para pr1 — sv4, sv5 e sv6 eram exclusivos de pr2/pr3/pr4.
 * Deixá-los sem ninguém não era só cosmético: a gaveta do serviço faz
 * `D.profissional(pid)!.nome` para montar "Quem faz", e abrir sv4 dava tela branca. */
export const SERVICOS: Servico[] = [
  { id: "sv1", nome: "Atendimento padrão", categoria: "Recorrente", preco: 100, duracao: 40, profissionalIds: ["pr1"], ativo: true },
  { id: "sv2", nome: "Atendimento rápido", categoria: "Recorrente", preco: 60, duracao: 30, profissionalIds: ["pr1"], ativo: true },
  { id: "sv3", nome: "Pacote completo", categoria: "Pacote", preco: 180, duracao: 60, profissionalIds: ["pr1"], ativo: true },
  { id: "sv4", nome: "Atendimento premium", categoria: "Pacote", preco: 150, duracao: 45, profissionalIds: ["pr1"], ativo: true },
  { id: "sv5", nome: "Serviço adicional", categoria: "Extra", preco: 80, duracao: 40, profissionalIds: ["pr1"], ativo: true },
  { id: "sv6", nome: "Atendimento avulso", categoria: "Extra", preco: 70, duracao: 30, profissionalIds: ["pr1"], ativo: true },
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
  { id: "cl1", nome: "Mariana Alves", telefone: "(11) 98123-4567", email: "bruno.vaskevicius@polijunior.com.br", cpf: "312.456.789-01", canal: "Online", ativo: true, desde: "mar/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl2", nome: "Rafael Costa", telefone: "(11) 99876-1234", email: "bruno.vaskevicius@polijunior.com.br", cpf: "408.221.334-90", canal: "Presencial", ativo: true, desde: "jan/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl3", nome: "Beatriz Lima", telefone: "(11) 97654-3210", email: "bruno.vaskevicius@polijunior.com.br", cpf: "199.873.221-44", canal: "Online", ativo: true, desde: "set/2024", servicoId: "sv3", atendimentos: 10, valor: 1800 },
  { id: "cl4", nome: "Camila e Rodrigo", telefone: "(11) 99654-0099", email: "bruno.vaskevicius@polijunior.com.br", cpf: "221.667.880-12", canal: "Presencial", ativo: true, desde: "nov/2024", servicoId: "sv4", atendimentos: 5, valor: 750 },
  { id: "cl5", nome: "Lucas Martins", telefone: "(11) 98112-9087", email: "bruno.vaskevicius@polijunior.com.br", cpf: "389.220.115-67", canal: "Online", ativo: true, desde: "abr/2025", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl6", nome: "Fernanda Rocha", telefone: "(11) 99003-2211", email: "bruno.vaskevicius@polijunior.com.br", cpf: "470.118.226-05", canal: "Presencial", ativo: true, desde: "jun/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl7", nome: "Pedro Henrique", telefone: "(11) 98890-5544", email: "bruno.vaskevicius@polijunior.com.br", cpf: "612.334.778-21", canal: "Online", ativo: true, desde: "out/2024", servicoId: "sv2", atendimentos: 9, valor: 540 },
  { id: "cl8", nome: "Juliana Dias", telefone: "(11) 97221-8866", email: "bruno.vaskevicius@polijunior.com.br", cpf: "298.554.110-78", canal: "Presencial", ativo: true, desde: "dez/2024", servicoId: "sv1", atendimentos: 8, valor: 800 },
  { id: "cl9", nome: "Gustavo Nunes", telefone: "(11) 99445-1100", email: "bruno.vaskevicius@polijunior.com.br", cpf: "334.876.220-09", canal: "Online", ativo: true, desde: "jun/2026", servicoId: "sv3", atendimentos: 8, valor: 1440 },
  { id: "cl10", nome: "Larissa Gomes", telefone: "(11) 98667-3322", email: "bruno.vaskevicius@polijunior.com.br", cpf: "145.998.667-30", canal: "Online", ativo: true, desde: "mai/2025", servicoId: "sv2", atendimentos: 8, valor: 480 },
  { id: "cl11", nome: "Thiago Barros", telefone: "(11) 99778-4455", email: "bruno.vaskevicius@polijunior.com.br", cpf: "502.117.889-64", canal: "Presencial", ativo: true, desde: "ago/2024", servicoId: "sv1", atendimentos: 9, valor: 900 },
  { id: "cl12", nome: "Vinícius Carvalho", telefone: "(11) 98223-6677", email: "bruno.vaskevicius@polijunior.com.br", cpf: "677.443.221-18", canal: "Online", ativo: true, desde: "jan/2025", servicoId: "sv5", atendimentos: 8, valor: 640 },
  { id: "cl13", nome: "Anderson Reis", telefone: "(11) 99771-0342", email: "bruno.vaskevicius@polijunior.com.br", cpf: "556.221.998-73", canal: "Presencial", ativo: true, desde: "fev/2025", servicoId: "sv6", atendimentos: 7, valor: 490 },
  { id: "cl14", nome: "Sofia Ribeiro", telefone: "(11) 97334-9988", email: "bruno.vaskevicius@polijunior.com.br", cpf: "811.225.443-50", canal: "Online", ativo: false, desde: "mar/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
  { id: "cl15", nome: "Marcelo Tavares", telefone: "(11) 99110-2200", email: "bruno.vaskevicius@polijunior.com.br", cpf: "723.889.110-42", canal: "Presencial", ativo: false, desde: "jul/2023", servicoId: "sv2", atendimentos: 0, valor: 0 },
  { id: "cl16", nome: "Patrícia Mendes", telefone: "(11) 98556-7711", email: "bruno.vaskevicius@polijunior.com.br", cpf: "455.667.889-23", canal: "Online", ativo: false, desde: "fev/2023", servicoId: "sv1", atendimentos: 0, valor: 0 },
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

/* ───────────────────────────── atendimentos ─────────────────────────────
 * Aqui ficam só o TIPO e as etapas — os atendimentos em si saíram deste arquivo.
 *
 * Eram ~150 exemplos gerados para um julho/2026 que nunca aconteceu. Enquanto a
 * agenda era ficção, serviam; a partir do momento em que a agenda do Google virou a
 * fonte da verdade, eles passaram a ser uma SEGUNDA agenda desenhada por cima da
 * primeira, e nenhuma tela conseguia dizer qual das duas era a real.
 *
 * De onde vem um atendimento agora: de um clique num horário vago, e ele vive no
 * localStorage (store.novosAgendamentos). Os compromissos que já estão no Google
 * entram pela LEITURA, em cinza e só leitura (store.bloqueios). Fluxo de hoje e
 * Agenda continuam lendo a MESMA lista — é isso que faz arrastar num lugar aparecer
 * no outro. */

/** Etapa do dia — as três colunas do kanban. */
export type Etapa = "chegando" | "atendendo" | "feito";

export const ETAPAS: Etapa[] = ["chegando", "atendendo", "feito"];

export type Agendamento = {
  id: string;
  /** Data ISO, "YYYY-MM-DD". Ausente ⇒ hoje. */
  data?: string;
  /** Início em hora decimal: 9.5 = 09:30. */
  inicio: number;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  /** Confirmou pelo WhatsApp? false ⇒ a MAISA ainda está cobrando. */
  confirmado: boolean;
  etapaInicial: Etapa;
};

/* ───────────────────────────── calendário ─────────────────────────────
 * DATAS REAIS, em "YYYY-MM-DD".
 *
 * Antes isto era um julho/2026 fixo: `dia: number` (dia do mês) e um `primeiroDow`
 * calculado à mão. Funcionava enquanto a agenda era ficção. Deixou de funcionar no
 * dia em que a agenda do Google virou a fonte da verdade — o Google fala em
 * instantes reais, e não existe mapa honesto de "6 de agosto de 2026" para um dia
 * de um julho que nunca aconteceu.
 *
 * Por que string ISO e não Date: uma `Date` é um INSTANTE, e instante carrega fuso.
 * `new Date("2026-08-06")` é meia-noite UTC, que em São Paulo é dia 5 às 21h — o
 * clássico erro de um dia. "2026-08-06" é uma DATA CIVIL e não tem esse problema.
 * De quebra, comparar duas datas ISO com `<` já é comparação cronológica, e elas
 * servem de chave de Map e de key de React sem conversão.
 *
 * `inicio` continua sendo hora DECIMAL (14.5 = 14:30): toda a matemática da grade
 * depende disso e não tinha nada de errado. */

const p2 = (n: number) => String(n).padStart(2, "0");

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Semana começando na segunda — convenção pt-BR. Domingo é a última coluna. */
export const DOW_CURTO = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
export const DOW_LONGO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

/* A aritmética toda roda em UTC, e isso é proposital: UTC não tem horário de verão,
   então somar 86.400.000 ms é somar exatamente um dia — sempre. Com data local, um
   país com DST faria "somar 1 dia" cair no mesmo dia ou pular dois, duas vezes por ano. */
const emUTC = (data: string) => new Date(`${data}T00:00:00Z`);
const paraISO = (d: Date) => d.toISOString().slice(0, 10);

export const somarDias = (data: string, n: number) =>
  paraISO(new Date(emUTC(data).getTime() + n * 86_400_000));

/** Índice do dia da semana: 0 = segunda … 6 = domingo. */
export const dowDoDia = (data: string) => (emUTC(data).getUTCDay() + 6) % 7;

/** Domingo a casa não abre. A coluna existe só para o mês ter sete colunas. */
export const fechado = (data: string) => dowDoDia(data) === 6;

export const diaDoMes = (data: string) => Number(data.slice(8, 10));
/** "2026-08-06" → "2026-08". */
export const mesDe = (data: string) => data.slice(0, 7);
export const nomeMes = (anoMes: string) => MESES[Number(anoMes.slice(5, 7)) - 1];
export const anoDe = (anoMes: string) => anoMes.slice(0, 4);

/** Dia 0 do mês SEGUINTE é o último do mês pedido — a forma sem tabela de bissexto. */
export const diasNoMes = (anoMes: string) =>
  new Date(Date.UTC(Number(anoMes.slice(0, 4)), Number(anoMes.slice(5, 7)), 0)).getUTCDate();

export function somarMeses(anoMes: string, n: number): string {
  const total = Number(anoMes.slice(0, 4)) * 12 + Number(anoMes.slice(5, 7)) - 1 + n;
  return `${Math.floor(total / 12)}-${p2((total % 12) + 1)}`;
}

/** "6 de agosto" */
export const rotuloDia = (data: string) => `${diaDoMes(data)} de ${nomeMes(mesDe(data))}`;
/** "quinta, 6 de agosto" */
export const rotuloLongo = (data: string) => `${DOW_LONGO[dowDoDia(data)]}, ${rotuloDia(data)}`;
/** "06/08/2026" — formato de documento (a nota fiscal usa este). */
export const rotuloBR = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

/**
 * Hoje em São Paulo, "YYYY-MM-DD".
 *
 * O navegador roda em BRT e a Vercel em UTC; sem correção os dois discordariam sobre
 * qual é o dia entre 21h e meia-noite — e discordar do fuso é justamente o que quebra
 * a hidratação do React. Deslocamos o instante e lemos com getters UTC, então os dois
 * chegam ao mesmo dia civil. Brasil não usa horário de verão desde 2019 ⇒ -3 fixo.
 */
export function hojeISO(agora = Date.now()): string {
  return new Date(agora - 3 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * "Hoje".
 *
 * GETTERS, não valores. Um `const HOJE = {...}` é avaliado uma vez, na carga do
 * módulo — e no servidor o módulo fica em memória entre requisições, então "hoje"
 * congelaria na data do deploy e a agenda destacaria o dia errado para sempre. Com
 * getter, cada leitura pergunta de novo.
 */
export const HOJE = {
  /** "2026-08-06" — a identidade do dia em todo o app. */
  get iso() { return hojeISO(); },
  /** "quinta, 6 de agosto" */
  get label() { return rotuloLongo(hojeISO()); },
  /** "QUI" */
  get dow() { return DOW_CURTO[dowDoDia(hojeISO())]; },
  /** "06/08/2026" */
  get data() { return rotuloBR(hojeISO()); },
};

/** Os seis dias úteis (seg–sáb) da semana de uma data. Atravessa a virada de mês. */
export function semanaDoDia(data: string): string[] {
  const segunda = somarDias(data, -dowDoDia(data));
  return Array.from({ length: 6 }, (_, i) => somarDias(segunda, i));
}

/** Célula da grade de mês. `noMes: false` são os dias vizinhos que fecham as semanas. */
export type CelulaMes = { chave: string; data: string; noMes: boolean };

/** A grade inteira, em múltiplos de 7 — sempre semanas completas, de segunda a domingo. */
export function celulasDoMes(anoMes: string): CelulaMes[] {
  const primeiro = `${anoMes}-01`;
  const antes = dowDoDia(primeiro);
  const inicio = somarDias(primeiro, -antes);
  const total = Math.ceil((antes + diasNoMes(anoMes)) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const data = somarDias(inicio, i);
    // chave = a própria data: `c${i}` fazia o React reaproveitar o nó da célula 12 de
    // agosto como célula 12 de setembro, e a animação do contador vazava entre meses.
    return { chave: data, data, noMes: mesDe(data) === anoMes };
  });
}

/**
 * Primeira e última data DESENHADAS na grade de um mês — os vizinhos que completam as
 * semanas entram.
 *
 * É também a janela que a Agenda busca no Google, e uma janela só serve às três visões.
 * O motivo é geométrico: a grade cobre semanas inteiras, então a semana de QUALQUER dia
 * do mês cabe dentro dela — inclusive a que atravessa a virada. Trocar de visão não
 * dispara request nenhum.
 */
export function janelaDoMes(anoMes: string): { de: string; ate: string } {
  const c = celulasDoMes(anoMes);
  return { de: c[0].data, ate: c[c.length - 1].data };
}

/** Quando cada profissional atende, em dado ESTRUTURADO.
 *  EQUIPE[].horario e EQUIPE[].folga são frases para o dono ler ("Seg–Sáb 09–19", "folga
 *  domingo"); o calendário precisa do número. Sem isto a Agenda marcava gente em dia de folga
 *  e fora do horário — e a tela de Equipe, na mesma sessão, desmentia a Agenda.
 *  Se os dois divergirem, é ESTE que a Agenda obedece: mantenha o par junto. */
export const EXPEDIENTE: Record<string, { folga: number[]; de: number; ate: number }> = {
  pr1: { folga: [6], de: 9, ate: 19 },     // Seg–Sáb 09–19 · folga domingo
};

/** Esse profissional trabalha nesse dia? */
export const atende = (profissionalId: string, data: string) => {
  const e = EXPEDIENTE[profissionalId];
  return !!e && !e.folga.includes(dowDoDia(data));
};

/** Esse profissional pode começar um atendimento aí — dia de trabalho e hora dentro do expediente. */
export const podeComecar = (profissionalId: string, data: string, inicio: number) => {
  const e = EXPEDIENTE[profissionalId];
  return !!e && atende(profissionalId, data) && inicio >= e.de && inicio < e.ate;
};

/* Aqui morava o GERADOR de atendimentos de exemplo — `agendaDoDia`/`agendaDaJanela`,
 * mais a PAUTA de horários e a lista de clientes que ele sorteava. Ele inventava de
 * quatro a sete atendimentos por dia útil, determinísticos a partir da data.
 *
 * Saiu porque a agenda passou a ser real. Um exemplo bem-feito é indistinguível do
 * dado verdadeiro — que é exatamente o que se quer de um protótipo e exatamente o que
 * não se pode ter quando a tela vira ferramenta: o dono não teria como saber se aquele
 * 14:00 é um cliente que vem ou uma invenção nossa.
 *
 * `cabeNoExpediente` saiu junto: o gerador era seu único chamador. Volta em quatro
 * linhas quando alguém precisar validar o destino de um arrasto. */

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
 * O que o dia tem de decisão pendente. `alvo` é o id que a Gaveta abre. */

export type ItemFila = { id: string; alvo: string; titulo: string; tag: string; msg: string };

/**
 * A METADE da fila que vem das conversas. A outra metade — as cobranças de confirmação —
 * é DERIVADA dos atendimentos de hoje, no store.
 *
 * Antes as quatro eram escritas à mão, e duas apontavam para `ag5` e `ag8`. Com os
 * atendimentos de exemplo fora, elas virariam cliques mortos: a gaveta abriria sem
 * encontrar nada. Pior que sumir seria continuar ali dizendo "17:00 sem confirmação"
 * sobre um horário que não existe em agenda nenhuma.
 *
 * Estas duas sobrevivem porque falam de CONVERSAS, e as conversas continuam sendo
 * demonstração — o WhatsApp não está integrado. Por isso também perderam a referência
 * a horários concretos: a conversa é fictícia, a agenda não é mais, e a fictícia não
 * pode afirmar nada sobre a real.
 */
export const FILA_CONVERSAS: ItemFila[] = [
  { id: "fl1", alvo: "cv2", titulo: "Larissa (mãe do Gustavo)", tag: "encaixe", msg: "Consegue encaixar o Gustavo hoje à tarde?" },
  { id: "fl2", alvo: "cv1", titulo: "Thiago Barros", tag: "remarcar", msg: "Quer trocar o horário de hoje por quinta às 10h." },
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
    // 168 e não 407: 407 era a soma dos quatro profissionais, e a tela de Equipe
    // agora mostra 168. Dois números para a mesma coisa, discordando.
    ["Atendimentos", "168"],
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
/* Não há mais `agendamento(id)` aqui. Enquanto existiam exemplos, este arquivo sabia
 * responder "quem é o ag5?"; agora todo atendimento nasce no navegador ou no Google, e
 * quem sabe responder é o store. Deixar um lookup que devolve `undefined` para todo id
 * seria pior que não ter: cada `?? D.agendamento(id)` viraria um fallback que nunca cai. */
export const conversa = (id: string) => CONVERSAS.find((c) => c.id === id);

export const nomeProfissional = (id: string) => profissional(id)?.nome ?? "—";
export const primeiroNome = (nome: string) => nome.split(" ")[0];
/* Só o catálogo DE PARTIDA — não enxerga o que o usuário renomeou. Nenhuma tela usa mais este:
 * quem tem o store à mão usa `st.nomeServico`. Continua exportado para quem NÃO tem (a rota do
 * Google, que roda no servidor), e lá é fallback de um nome que o cliente já manda pronto. */
export const nomeServico = (id: string) => servico(id)?.nome ?? "—";
export const nomeCliente = (id: string) => cliente(id)?.nome ?? "—";

/** Hora decimal → "HH:MM". 9.5 → "09:30". */
export const hhmm = (v: number) => {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
