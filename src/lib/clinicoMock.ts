/* Dados mockados — MÓDULO CLÍNICO (consultório da Carla Mendes).
 * Fonte estática das 5 telas nativas: Dashboard, Pacientes, Serviços, Calendário, Faturamento.
 * Clonado do Psico Manager (psico-manager-app) — MESMOS shapes de tipos, porém 100% front (sem fetch/API).
 * TUDO estático e determinístico: nada de Math.random / Date.now — o "hoje" é fixo em junho/2026.
 * Semana começa no DOMINGO (diaSemana: 0=DOM … 6=SÁB). Nenhuma sessão em sáb/dom. */

/* ────────────────────────────── TIPOS (idênticos ao Psico) ────────────────────────────── */

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMin: number;
  ativo: boolean;
};

export type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cpf: string | null;
  tipoAtendimento: string; // "ONLINE" | "PRESENCIAL"
  status: string;          // "ATIVO" | "INATIVO"
  diagnostico: string | null;
  dataInicio: string | null; // ISO "YYYY-MM-DD"
};

export type Fixo = {
  id: string;
  pacienteId: string;
  servicoId: string;
  valor: number;
  diaSemana: number; // 0=DOM … 6=SÁB
  hora: string;      // "HH:MM"
  paciente: { id: string; nome: string };
  servico: { id: string; nome: string; preco: number; duracaoMin: number };
};

export type NFInfo = {
  status: "pendente" | "gerando" | "processando" | "emitida";
  numero?: string;
  notaId?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  dataEmissao?: string;
};

export type ResumoP = { totalSessoes: number; valorTotal: number; servicos: string[] };

export type KpisClinico = {
  sessoesMes: number;
  faturamentoMes: number;
  pacientesAtivos: number;
  pacientesInativos: number;
  ticketMedio: number;
  sessoesSemana: number;
  notasEmitidas: number;
  notasPendentes: number;
  novosPacientesMes: number;
  ocupacao: number; // 0..1
};

/* ────────────────────────────── CONTEXTO / PERÍODO ────────────────────────────── */

export const MES_CLIN = "2026-06";
export const periodoLabel = "Junho de 2026";

export const prestador = {
  nome: "Carla Mendes — Psicologia",
  crp: "CRP 06/12345",
  cnpj: "47.227.217/0001-00",
};

/* ────────────────────────────── SERVIÇOS ────────────────────────────── */

export const servicos: Servico[] = [
  { id: "s1", nome: "Sessão individual",     descricao: "Atendimento clínico individual de psicoterapia.", preco: 250, duracaoMin: 50, ativo: true },
  { id: "s2", nome: "Terapia de casal",      descricao: "Atendimento conjunto para casais.",               preco: 320, duracaoMin: 80, ativo: true },
  { id: "s3", nome: "Avaliação psicológica", descricao: "Aplicação de testes e laudo psicológico.",        preco: 450, duracaoMin: 90, ativo: true },
  { id: "s4", nome: "Sessão online",         descricao: "Psicoterapia por vídeo, mesma qualidade do presencial.", preco: 200, duracaoMin: 50, ativo: true },
  { id: "s5", nome: "Devolutiva",            descricao: "Encontro de devolutiva e orientação de resultados.", preco: 180, duracaoMin: 40, ativo: false },
];

const svcById: Record<string, Servico> = Object.fromEntries(servicos.map((s) => [s.id, s]));
const svcSnap = (id: string) => {
  const s = svcById[id] ?? servicos[0];
  return { id: s.id, nome: s.nome, preco: s.preco, duracaoMin: s.duracaoMin };
};

/* ────────────────────────────── PACIENTES ────────────────────────────── */

export const pacientes: Paciente[] = [
  { id: "p1",  nome: "Mariana Alves",     telefone: "11981234567", email: "mariana.alves@email.com",  cpf: "312.456.789-01", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Ansiedade",          dataInicio: "2024-03-01" },
  { id: "p2",  nome: "Rafael Costa",      telefone: "11998761234", email: "rafael.costa@email.com",   cpf: "408.221.334-90", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Depressão",          dataInicio: "2024-01-10" },
  { id: "p3",  nome: "Beatriz Lima",      telefone: "11976543210", email: "bia.lima@email.com",       cpf: "199.873.221-44", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "TOC",                dataInicio: "2024-09-05" },
  { id: "p4",  nome: "MACBV COMERCIO E SERVICOS LTDA", telefone: "11983457788", email: "joao.pereira@email.com",   cpf: "47.227.217/0001-00", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Estresse",           dataInicio: "2025-02-12" }, // NF teste: tomador com CNPJ real/válido (o buildBody detecta 14 dígitos e trata como CNPJ)
  { id: "p5",  nome: "Camila e Rodrigo",  telefone: "11996540099", email: "camila.rodrigo@email.com", cpf: "221.667.880-12", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Terapia de casal",   dataInicio: "2024-11-20" },
  { id: "p6",  nome: "Lucas Martins",     telefone: "11981129087", email: "lucas.martins@email.com",  cpf: "389.220.115-67", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Autoconhecimento",   dataInicio: "2025-04-03" },
  { id: "p7",  nome: "Fernanda Rocha",    telefone: "11990032211", email: "fe.rocha@email.com",       cpf: "470.118.226-05", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Ansiedade",          dataInicio: "2024-06-15" },
  { id: "p8",  nome: "Pedro Henrique",    telefone: "11988905544", email: "pedro.h@email.com",        cpf: "612.334.778-21", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Burnout",            dataInicio: "2024-10-08" },
  { id: "p9",  nome: "Juliana Dias",      telefone: "11972218866", email: "juliana.dias@email.com",   cpf: "298.554.110-78", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Luto",               dataInicio: "2024-12-01" },
  { id: "p10", nome: "Gustavo Nunes",     telefone: "11994451100", email: "gustavo.nunes@email.com",  cpf: "334.876.220-09", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Avaliação",          dataInicio: "2026-06-02" },
  { id: "p11", nome: "Larissa Gomes",     telefone: "11986673322", email: "larissa.gomes@email.com",  cpf: "145.998.667-30", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Ansiedade",          dataInicio: "2025-05-09" },
  { id: "p12", nome: "Thiago Barros",     telefone: "11997784455", email: "thiago.barros@email.com",  cpf: "502.117.889-64", tipoAtendimento: "PRESENCIAL", status: "ATIVO",   diagnostico: "Síndrome do pânico", dataInicio: "2024-08-19" },
  { id: "p13", nome: "Vinícius Carvalho", telefone: "11982236677", email: "vinicius.c@email.com",     cpf: "677.443.221-18", tipoAtendimento: "ONLINE",     status: "ATIVO",   diagnostico: "Ansiedade",          dataInicio: "2025-01-15" },
  { id: "p14", nome: "Sofia Ribeiro",     telefone: "11973349988", email: "sofia.r@email.com",        cpf: "811.225.443-50", tipoAtendimento: "ONLINE",     status: "INATIVO", diagnostico: "Alta — concluído",   dataInicio: "2023-03-01" },
  { id: "p15", nome: "Marcelo Tavares",   telefone: "11991102200", email: "marcelo.t@email.com",      cpf: "723.889.110-42", tipoAtendimento: "PRESENCIAL", status: "INATIVO", diagnostico: "Pausa solicitada",   dataInicio: "2023-07-01" },
  { id: "p16", nome: "Patrícia Mendes",   telefone: "11985567711", email: "patricia.m@email.com",     cpf: "455.667.889-23", tipoAtendimento: "ONLINE",     status: "INATIVO", diagnostico: "Alta — concluído",   dataInicio: "2023-02-01" },
];

const pacById: Record<string, Paciente> = Object.fromEntries(pacientes.map((p) => [p.id, p]));

/* ────────────────────────────── AGENDA FIXA (recorrência semanal) ────────────────────────────── */
// tabela compacta: [id, pacienteId, servicoId, valor, diaSemana(0-6), hora] — espalhada de SEG a SEX.

const FIXOS_TABLE: [string, string, string, number, number, string][] = [
  ["f1",  "p1",  "s4", 250, 1, "09:00"], // SEG
  ["f2",  "p3",  "s4", 280, 1, "11:00"], // SEG
  ["f3",  "p4",  "s1", 250, 1, "14:00"], // SEG
  ["f4",  "p2",  "s1", 200, 2, "09:00"], // TER
  ["f5",  "p6",  "s4", 300, 2, "16:00"], // TER
  ["f6",  "p5",  "s2", 320, 2, "17:00"], // TER
  ["f7",  "p7",  "s1", 230, 3, "09:00"], // QUA
  ["f8",  "p8",  "s4", 270, 3, "15:00"], // QUA
  ["f9",  "p13", "s4", 240, 3, "16:00"], // QUA
  ["f10", "p9",  "s1", 250, 4, "10:00"], // QUI
  ["f11", "p10", "s3", 450, 4, "14:00"], // QUI
  ["f12", "p11", "s4", 220, 5, "11:00"], // SEX
  ["f13", "p12", "s1", 260, 5, "15:00"], // SEX
];

export const fixos: Fixo[] = FIXOS_TABLE.map(([id, pacienteId, servicoId, valor, diaSemana, hora]) => {
  const p = pacById[pacienteId];
  return {
    id,
    pacienteId,
    servicoId,
    valor,
    diaSemana,
    hora,
    paciente: { id: p.id, nome: p.nome },
    servico: svcSnap(servicoId),
  };
});

/* ────────────────────────────── RESUMO / FATURAMENTO POR PACIENTE ────────────────────────────── */
// totais mensais (junho/2026) por paciente ATIVO — sessões acumuladas × valor da sessão.

export const resumoBy: Record<string, ResumoP> = {
  p1:  { totalSessoes: 9,  valorTotal: 2250, servicos: ["Sessão online"] },
  p2:  { totalSessoes: 9,  valorTotal: 1800, servicos: ["Sessão individual"] },
  p3:  { totalSessoes: 10, valorTotal: 2800, servicos: ["Sessão online"] },
  p4:  { totalSessoes: 9,  valorTotal: 1, servicos: ["Sessão individual"] }, // NF teste: R$ 1,00
  p5:  { totalSessoes: 5,  valorTotal: 1600, servicos: ["Terapia de casal"] },
  p6:  { totalSessoes: 9,  valorTotal: 2700, servicos: ["Sessão online"] },
  p7:  { totalSessoes: 9,  valorTotal: 2070, servicos: ["Sessão individual"] },
  p8:  { totalSessoes: 9,  valorTotal: 2430, servicos: ["Sessão online"] },
  p9:  { totalSessoes: 8,  valorTotal: 2000, servicos: ["Sessão individual"] },
  p10: { totalSessoes: 8,  valorTotal: 3600, servicos: ["Avaliação psicológica"] },
  p11: { totalSessoes: 8,  valorTotal: 1760, servicos: ["Sessão online"] },
  p12: { totalSessoes: 9,  valorTotal: 2340, servicos: ["Sessão individual"] },
  p13: { totalSessoes: 8,  valorTotal: 1920, servicos: ["Sessão online"] },
};

/* ────────────────────────────── NOTAS FISCAIS POR PACIENTE ────────────────────────────── */
// só pacientes ATIVOS têm linha de faturamento. 5 emitidas · 1 processando · resto pendente.

export const notas: Record<string, NFInfo> = {
  p1:  { status: "emitida",     numero: "2026/000112", notaId: "nf1", dataEmissao: "2026-06-30" },
  p2:  { status: "emitida",     numero: "2026/000113", notaId: "nf2", dataEmissao: "2026-06-30" },
  p3:  { status: "emitida",     numero: "2026/000114", notaId: "nf3", dataEmissao: "2026-06-30" },
  p5:  { status: "emitida",     numero: "2026/000115", notaId: "nf4", dataEmissao: "2026-06-30" },
  p9:  { status: "emitida",     numero: "2026/000116", notaId: "nf5", dataEmissao: "2026-06-30" },
  p7:  { status: "processando", numero: "…",           notaId: "nf6" },
  p4:  { status: "pendente" },
  p6:  { status: "pendente" },
  p8:  { status: "pendente" },
  p10: { status: "pendente" },
  p11: { status: "pendente" },
  p12: { status: "pendente" },
  p13: { status: "pendente" },
};

/* ────────────────────────────── KPIs DO CONSULTÓRIO ────────────────────────────── */

export const kpisClinico: KpisClinico = {
  sessoesMes: 110,
  faturamentoMes: 29520,
  pacientesAtivos: 13,
  pacientesInativos: 3,
  ticketMedio: 268.36, // faturamentoMes / sessoesMes
  sessoesSemana: 13,   // ocorrências na agenda fixa (SEG-SEX)
  notasEmitidas: 5,
  notasPendentes: 8,   // ativos - emitidas (processando conta como pendente)
  novosPacientesMes: 1,
  ocupacao: 0.86,
};

/* ────────────────────────────── AVATARES (paleta clínica) ────────────────────────────── */
// pares terrosos harmônicos com azul + mel. Cada entrada: [claro, escuro, dot].

export const PALETTE_CLIN: [string, string, string][] = [
  ["#DDE7F0", "#3A5A78", "#5A7A98"],
  ["#F5E6C8", "#8A6220", "#B08830"],
  ["#F3E0D6", "#A85A3C", "#C67B5C"],
  ["#E7EAD8", "#5E6B3A", "#7C8C4A"],
  ["#F1E2DD", "#93564A", "#B0766A"],
  ["#EAE3D6", "#6E6152", "#8E8172"],
  ["#DCE9E5", "#3C7A6E", "#5C9A8E"],
];

const pacIndex: Record<string, number> = Object.fromEntries(pacientes.map((p, i) => [p.id, i]));

/** avatarClin(id) → [claro, escuro, dot] determinístico pela ordem do paciente. */
export function avatarClin(id: string): [string, string, string] {
  return PALETTE_CLIN[(pacIndex[id] ?? 0) % PALETTE_CLIN.length];
}
