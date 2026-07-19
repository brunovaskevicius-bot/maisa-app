/* Infra compartilhada — MAISA modular.
 * FEATURE_REGISTRY (features + superadm) + 5 perfis de PROFISSÃO (terms + dados temáticos).
 * Sem "use client" — dados puros. Consumido por adminConfig.tsx (resolver) e pelas telas via contexto. */

/* ────────────────────────────── FEATURE REGISTRY ────────────────────────────── */

export type FeatureId =
  | "config" | "equipe" | "servicos" | "faq" | "marketing" | "pagamentos"
  | "dashboard" | "atendimentos" | "agenda" | "dados"
  | "clin-dashboard" | "pacientes" | "clin-servicos" | "calendario" | "faturamento"
  | "superadm";

export type Grupo = "GESTÃO" | "OPERACIONAL" | "CLÍNICO" | "ADMIN";
export type Modulo = "maisa" | "clinico";

export type FeatureDef = {
  id: FeatureId;
  label: string;
  grupo: Grupo;
  icon: string;
  modulo: Modulo;
  defaultOn: boolean;
  fixo?: boolean; // fixo=true => sempre visível, não desligável
};

export const FEATURE_REGISTRY: FeatureDef[] = [
  // GESTÃO
  { id: "config",       label: "Configurações do Assistente", grupo: "GESTÃO",      icon: "config",      modulo: "maisa",   defaultOn: true },
  { id: "equipe",       label: "Minha Equipe",                grupo: "GESTÃO",      icon: "equipe",      modulo: "maisa",   defaultOn: true },
  { id: "servicos",     label: "Meus Serviços",               grupo: "GESTÃO",      icon: "scissors",    modulo: "maisa",   defaultOn: true },
  { id: "faq",          label: "Perguntas Frequentes",        grupo: "GESTÃO",      icon: "faq",         modulo: "maisa",   defaultOn: true },
  { id: "marketing",    label: "Marketing",                   grupo: "GESTÃO",      icon: "marketing",   modulo: "maisa",   defaultOn: true },
  { id: "pagamentos",   label: "Meus Pagamentos",             grupo: "GESTÃO",      icon: "card",        modulo: "maisa",   defaultOn: true },
  // OPERACIONAL
  { id: "dashboard",    label: "Dashboard",                   grupo: "OPERACIONAL", icon: "dashboard",   modulo: "maisa",   defaultOn: true },
  { id: "atendimentos", label: "Atendimentos",                grupo: "OPERACIONAL", icon: "chat",        modulo: "maisa",   defaultOn: true },
  { id: "agenda",       label: "Agenda",                      grupo: "OPERACIONAL", icon: "calendar",    modulo: "maisa",   defaultOn: true },
  { id: "dados",        label: "Dados",                       grupo: "OPERACIONAL", icon: "trending-up", modulo: "maisa",   defaultOn: true },
  // CLÍNICO (módulo clínico nativo — consultório da Carla)
  { id: "clin-dashboard", label: "Dashboard",    grupo: "CLÍNICO", icon: "dashboard", modulo: "clinico", defaultOn: true },
  { id: "pacientes",      label: "Pacientes",    grupo: "CLÍNICO", icon: "equipe",    modulo: "clinico", defaultOn: true },
  { id: "clin-servicos",  label: "Serviços",     grupo: "CLÍNICO", icon: "tag",       modulo: "clinico", defaultOn: true },
  { id: "calendario",     label: "Calendário",   grupo: "CLÍNICO", icon: "calendar",  modulo: "clinico", defaultOn: true },
  { id: "faturamento",    label: "Faturamento",  grupo: "CLÍNICO", icon: "receipt",   modulo: "clinico", defaultOn: true },
  // ADMIN (sempre visível, NÃO desligável)
  { id: "superadm",     label: "Super Adm",                   grupo: "ADMIN",       icon: "config",      modulo: "maisa",   defaultOn: true, fixo: true },
];

// Ordem visual dos grupos na sidebar.
export const GRUPOS_ORDEM: Grupo[] = ["GESTÃO", "OPERACIONAL", "CLÍNICO", "ADMIN"];

/* ────────────────────────────── PROFISSÕES ────────────────────────────── */

export type Profissao = "barbearia" | "psicologia" | "odontologia" | "medica" | "generico";

export const PROFISSOES_ORDEM: Profissao[] = ["barbearia", "psicologia", "odontologia", "medica", "generico"];

export const PROFISSAO_LABELS: Record<Profissao, string> = {
  barbearia: "Barbearia",
  psicologia: "Psicologia",
  odontologia: "Odontologia",
  medica: "Clínica Médica",
  generico: "Genérico",
};

export type Terms = {
  negocioTipo: string;
  negocioNome: string;
  emoji: string;
  profissionalSing: string;
  profissionalPlur: string;
  clienteSing: string;
  clientePlur: string;
  localAtendimento: string;
  saudacao: string;
  agendaSub: string;
  equipeSub: string;
  dadosSub: string;
  atendimentosSub: string;
  catalogoLabel: string; // label completo da tela "Meus Serviços"
  servicoIcon: string;   // ícone do catálogo/serviços por profissão (nunca "de barbeiro" fora da barbearia)
};

export type ServicoTema = { nome: string; categoria: string; preco: number; duracao: number };
export type CampanhaTema = { nome: string; tipo: "Promoção" | "Lembrete" | "Reativação" };
export type FaqTema = { id: string; pergunta: string; resposta: string; categoria: string; ativo: boolean; usos: number };
export type PreviewMsgTema = { de: "cliente" | "bot"; txt: string };
export type ConfigSecaoTema = { id: string; titulo: string; thread: PreviewMsgTema[] };
export type ExemploMsg = { de: "cliente" | "bot"; txt: string; hora: string };

export type ProfissaoSpec = {
  terms: Terms;
  servicos: ServicoTema[];          // 7 — index-alinhado a mock.servicos (s1..s7)
  equipeEspecialidades: string[];   // 4 — index-alinhado a mock.equipe (b1..b4)
  campanhas: CampanhaTema[];        // 4 — index-alinhado a mock.campanhas (m1..m4)
  configSecoes: ConfigSecaoTema[];  // 4 — ids: personalidade/horarios/agendamentos/comportamento
  faqs: FaqTema[];                  // 5 — ids f1..f5
  faqsSugeridos: string[];          // 4
  mensagensExemplo: ExemploMsg[];   // thread do preview de Atendimentos
};

/* ── 2.1 barbearia (DEFAULT = dados atuais de mock.ts) ── */
const barbeariaSaudacao = "Opa! Aqui é a MAISA, assistente da Navalha de Ouro 💈 Como posso te ajudar hoje?";
const barbearia: ProfissaoSpec = {
  terms: {
    negocioTipo: "barbearia",
    negocioNome: "Barbearia Navalha de Ouro",
    emoji: "💈",
    profissionalSing: "barbeiro",
    profissionalPlur: "barbeiros",
    clienteSing: "cliente",
    clientePlur: "clientes",
    localAtendimento: "cadeira",
    saudacao: barbeariaSaudacao,
    agendaSub: "Sua semana na cadeira",
    equipeSub: "Barbeiros, serviços e disponibilidade",
    dadosSub: "Os números da sua barbearia",
    atendimentosSub: "Conversas do WhatsApp em tempo real",
    catalogoLabel: "Meus Serviços",
    servicoIcon: "scissors",
  },
  servicos: [
    { nome: "Corte máquina + tesoura", categoria: "Corte", preco: 55, duracao: 40 },
    { nome: "Barba na navalha", categoria: "Barba", preco: 45, duracao: 30 },
    { nome: "Combo corte + barba", categoria: "Combo", preco: 90, duracao: 60 },
    { nome: "Degradê navalhado", categoria: "Corte", preco: 65, duracao: 45 },
    { nome: "Pigmentação de barba", categoria: "Barba", preco: 70, duracao: 40 },
    { nome: "Corte infantil", categoria: "Corte", preco: 45, duracao: 30 },
    { nome: "Hidratação capilar", categoria: "Tratamento", preco: 50, duracao: 30 },
  ],
  equipeEspecialidades: ["Corte + barba clássico", "Degradê e freestyle", "Barboterapia", "Cortes infantis"],
  campanhas: [
    { nome: "Terça do degradê — 20% off", tipo: "Promoção" },
    { nome: "Sentiu falta? Volta pra cadeira 💈", tipo: "Reativação" },
    { nome: "Lembrete de agendamento", tipo: "Lembrete" },
    { nome: "Combo dia dos pais", tipo: "Promoção" },
  ],
  configSecoes: [
    { id: "personalidade", titulo: "Personalidade", thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: barbeariaSaudacao },
    ] },
    { id: "horarios", titulo: "Horário de atendimento", thread: [
      { de: "cliente", txt: "Quando a MAISA está ativa? Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo todos os dias das 9h às 20h (sáb até 18h, domingo fechado). Fora do horário eu anoto seu recado e respondo assim que a barbearia abrir! 🕗" },
    ] },
    { id: "agendamentos", titulo: "Agendamentos", thread: [
      { de: "cliente", txt: "Consigo marcar um corte pra amanhã?" },
      { de: "bot", txt: "Consigo sim! 💈 Amanhã tenho 14:30 e 16:00 com o Diego. Qual fica melhor?" },
      { de: "cliente", txt: "Pode ser 16h" },
      { de: "bot", txt: "Fechado! Corte às 16:00 com o Diego. Te lembro 3h antes por aqui 👍" },
    ] },
    { id: "comportamento", titulo: "Comportamento", thread: [
      { de: "cliente", txt: "Vocês fazem sobrancelha?" },
      { de: "bot", txt: "Boa! Essa eu confirmo rapidinho com o Rafael e já te respondo 🙌" },
    ] },
  ],
  faqs: [
    { id: "f1", pergunta: "Quais os horários de funcionamento?", resposta: "Seg a sáb, das 9h às 20h. Domingo fechado.", categoria: "Geral", ativo: true, usos: 312 },
    { id: "f2", pergunta: "Vocês aceitam Pix?", resposta: "Sim! Pix, cartão e dinheiro. O Pix pode ser adiantado pra garantir o horário.", categoria: "Pagamento", ativo: true, usos: 205 },
    { id: "f3", pergunta: "Precisa agendar ou tem fila?", resposta: "Trabalhamos com hora marcada, mas encaixamos sempre que dá. Me diz o dia que eu vejo!", categoria: "Agendamento", ativo: true, usos: 448 },
    { id: "f4", pergunta: "Fazem corte infantil?", resposta: "Fazemos sim, com o Diego e o Caio. R$ 45 e leva uns 30 min.", categoria: "Serviços", ativo: true, usos: 121 },
    { id: "f5", pergunta: "Tem estacionamento?", resposta: "Tem zona azul na rua e um estacionamento a 50m (R$ 12 a diária).", categoria: "Geral", ativo: false, usos: 34 },
  ],
  faqsSugeridos: ["Vocês fazem sobrancelha?", "Tem programa de fidelidade?", "Dá pra pagar depois?", "Atendem sem agendar?"],
  mensagensExemplo: [
    { de: "cliente", txt: "Oi, boa tarde! Consegue encaixar o Gustavo hoje?", hora: "10:12" },
    { de: "bot", txt: "Opa! Aqui é a MAISA 💈 Claro! Pra hoje tenho 15:30 e 17:00 com o Diego. Qual fica melhor?", hora: "10:12" },
    { de: "cliente", txt: "17h é ótimo", hora: "10:14" },
    { de: "bot", txt: "Fechado! Corte infantil às 17:00 com o Diego, no valor de R$ 45. Confirmo? ✅", hora: "10:14" },
    { de: "cliente", txt: "Consegue encaixar o Gustavo hoje à tarde?", hora: "10:15" },
  ],
};

/* ── 2.2 psicologia ── */
const psicologiaSaudacao = "Oi! Aqui é a MAISA, assistente do Espaço Bem-Estar 🌱 Como posso te ajudar hoje?";
const psicologia: ProfissaoSpec = {
  terms: {
    negocioTipo: "consultório",
    negocioNome: "Espaço Bem-Estar",
    emoji: "🌱",
    profissionalSing: "psicólogo(a)",
    profissionalPlur: "psicólogos(as)",
    clienteSing: "paciente",
    clientePlur: "pacientes",
    localAtendimento: "consultório",
    saudacao: psicologiaSaudacao,
    agendaSub: "Sua semana de sessões",
    equipeSub: "Psicólogos, especialidades e disponibilidade",
    dadosSub: "Os números do seu consultório",
    atendimentosSub: "Conversas do WhatsApp em tempo real",
    catalogoLabel: "Minhas Sessões",
    servicoIcon: "heart",
  },
  servicos: [
    { nome: "Sessão individual", categoria: "Serviços", preco: 200, duracao: 50 },
    { nome: "Terapia de casal", categoria: "Serviços", preco: 280, duracao: 60 },
    { nome: "Pacote mensal (4 sessões)", categoria: "Serviços", preco: 720, duracao: 50 },
    { nome: "Avaliação psicológica", categoria: "Serviços", preco: 250, duracao: 60 },
    { nome: "Sessão online", categoria: "Serviços", preco: 180, duracao: 50 },
    { nome: "Orientação de pais", categoria: "Serviços", preco: 220, duracao: 50 },
    { nome: "Atendimento infantil", categoria: "Serviços", preco: 190, duracao: 45 },
  ],
  equipeEspecialidades: ["Terapia cognitivo-comportamental", "Terapia de casal e família", "Psicanálise", "Psicologia infantil"],
  campanhas: [
    { nome: "Setembro Amarelo — cuide da mente", tipo: "Promoção" },
    { nome: "Sentiu falta da terapia? Vamos remarcar 🌱", tipo: "Reativação" },
    { nome: "Lembrete de sessão", tipo: "Lembrete" },
    { nome: "Grupo terapêutico — inscrições abertas", tipo: "Promoção" },
  ],
  configSecoes: [
    { id: "personalidade", titulo: "Personalidade", thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: psicologiaSaudacao },
    ] },
    { id: "horarios", titulo: "Horário de atendimento", thread: [
      { de: "cliente", txt: "Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo seg a sex das 8h às 20h (sáb até 13h). Fora do horário anoto seu recado e retorno assim que o consultório abrir 🕗" },
    ] },
    { id: "agendamentos", titulo: "Agendamentos", thread: [
      { de: "cliente", txt: "Consigo marcar uma sessão pra amanhã?" },
      { de: "bot", txt: "Consigo! 🌱 Amanhã tenho 14:00 e 16:00 com a Dra. Diego. Qual fica melhor?" },
      { de: "cliente", txt: "16h" },
      { de: "bot", txt: "Fechado! Sessão às 16:00. Te lembro 3h antes por aqui 👍" },
    ] },
    { id: "comportamento", titulo: "Comportamento", thread: [
      { de: "cliente", txt: "Vocês fazem laudo?" },
      { de: "bot", txt: "Boa! Confirmo rapidinho com o(a) responsável e já te respondo 🙌" },
    ] },
  ],
  faqs: [
    { id: "f1", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", categoria: "Geral", ativo: true, usos: 288 },
    { id: "f2", pergunta: "Emitem recibo para reembolso?", resposta: "Sim! Emitimos recibo para reembolso do plano. Aceitamos Pix e cartão.", categoria: "Pagamento", ativo: true, usos: 190 },
    { id: "f3", pergunta: "Como marco a primeira sessão?", resposta: "Me diz o melhor dia e horário que eu já agendo sua primeira conversa.", categoria: "Agendamento", ativo: true, usos: 402 },
    { id: "f4", pergunta: "Atendem crianças?", resposta: "Atendemos sim, com especialista em psicologia infantil.", categoria: "Serviços", ativo: true, usos: 134 },
    { id: "f5", pergunta: "Fazem atendimento online?", resposta: "Fazemos por vídeo, com a mesma qualidade do presencial.", categoria: "Serviços", ativo: true, usos: 176 },
  ],
  faqsSugeridos: ["Trabalham com adolescentes?", "Qual a duração da sessão?", "Aceitam convênio?", "Fazem terapia de casal?"],
  mensagensExemplo: [
    { de: "cliente", txt: "Oi, boa tarde! Consigo marcar uma sessão essa semana?", hora: "10:12" },
    { de: "bot", txt: "Oi! Aqui é a MAISA 🌱 Claro! Essa semana tenho quinta 15:30 e 17:00. Qual fica melhor?", hora: "10:12" },
    { de: "cliente", txt: "17h é ótimo", hora: "10:14" },
    { de: "bot", txt: "Fechado! Sessão individual às 17:00, no valor de R$ 200. Confirmo? ✅", hora: "10:14" },
    { de: "cliente", txt: "Consigo remarcar se precisar?", hora: "10:15" },
  ],
};

/* ── 2.3 odontologia ── */
const odontologiaSaudacao = "Oi! Aqui é a MAISA, assistente da Clínica Sorriso 🦷 Como posso te ajudar hoje?";
const odontologia: ProfissaoSpec = {
  terms: {
    negocioTipo: "consultório",
    negocioNome: "Clínica Sorriso",
    emoji: "🦷",
    profissionalSing: "dentista",
    profissionalPlur: "dentistas",
    clienteSing: "paciente",
    clientePlur: "pacientes",
    localAtendimento: "consultório",
    saudacao: odontologiaSaudacao,
    agendaSub: "Sua semana de consultas",
    equipeSub: "Dentistas, especialidades e disponibilidade",
    dadosSub: "Os números do seu consultório",
    atendimentosSub: "Conversas do WhatsApp em tempo real",
    catalogoLabel: "Meus Procedimentos",
    servicoIcon: "tooth",
  },
  servicos: [
    { nome: "Limpeza + profilaxia", categoria: "Serviços", preco: 180, duracao: 40 },
    { nome: "Restauração", categoria: "Serviços", preco: 250, duracao: 45 },
    { nome: "Clareamento a laser", categoria: "Serviços", preco: 900, duracao: 60 },
    { nome: "Tratamento de canal", categoria: "Serviços", preco: 800, duracao: 60 },
    { nome: "Extração", categoria: "Serviços", preco: 300, duracao: 40 },
    { nome: "Avaliação + raio-x", categoria: "Serviços", preco: 120, duracao: 30 },
    { nome: "Aplicação de flúor", categoria: "Serviços", preco: 90, duracao: 30 },
  ],
  equipeEspecialidades: ["Clínico geral e prevenção", "Ortodontia", "Endodontia", "Odontopediatria"],
  campanhas: [
    { nome: "Clareamento com 20% off", tipo: "Promoção" },
    { nome: "Faz tempo na cadeira? Volte pra revisão 🦷", tipo: "Reativação" },
    { nome: "Lembrete de consulta", tipo: "Lembrete" },
    { nome: "Check-up de fim de ano", tipo: "Promoção" },
  ],
  configSecoes: [
    { id: "personalidade", titulo: "Personalidade", thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: odontologiaSaudacao },
    ] },
    { id: "horarios", titulo: "Horário de atendimento", thread: [
      { de: "cliente", txt: "Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo seg a sex das 8h às 20h (sáb até 13h). Fora do horário anoto seu recado e retorno assim que o consultório abrir 🕗" },
    ] },
    { id: "agendamentos", titulo: "Agendamentos", thread: [
      { de: "cliente", txt: "Consigo marcar uma consulta pra amanhã?" },
      { de: "bot", txt: "Consigo! 🦷 Amanhã tenho 14:00 e 16:00 com o(a) Dr(a). Diego. Qual fica melhor?" },
      { de: "cliente", txt: "16h" },
      { de: "bot", txt: "Fechado! Consulta às 16:00. Te lembro 3h antes por aqui 👍" },
    ] },
    { id: "comportamento", titulo: "Comportamento", thread: [
      { de: "cliente", txt: "Vocês fazem clareamento?" },
      { de: "bot", txt: "Boa! Confirmo rapidinho com o(a) responsável e já te respondo 🙌" },
    ] },
  ],
  faqs: [
    { id: "f1", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", categoria: "Geral", ativo: true, usos: 264 },
    { id: "f2", pergunta: "Aceitam convênio?", resposta: "Trabalhamos com os principais convênios e também particular (Pix e cartão).", categoria: "Pagamento", ativo: true, usos: 221 },
    { id: "f3", pergunta: "Como agendo minha avaliação?", resposta: "Me diz o melhor dia e horário que eu já marco sua avaliação.", categoria: "Agendamento", ativo: true, usos: 356 },
    { id: "f4", pergunta: "Atendem crianças?", resposta: "Atendemos sim, com especialista em odontopediatria.", categoria: "Serviços", ativo: true, usos: 142 },
    { id: "f5", pergunta: "Tem estacionamento?", resposta: "Tem convênio com o estacionamento ao lado e zona azul na rua.", categoria: "Geral", ativo: false, usos: 47 },
  ],
  faqsSugeridos: ["Fazem aparelho?", "Aceitam parcelamento?", "Atendem emergência?", "Fazem clareamento?"],
  mensagensExemplo: [
    { de: "cliente", txt: "Oi, boa tarde! Consigo marcar uma consulta?", hora: "10:12" },
    { de: "bot", txt: "Oi! Aqui é a MAISA 🦷 Claro! Amanhã tenho 15:30 e 17:00. Qual fica melhor?", hora: "10:12" },
    { de: "cliente", txt: "17h", hora: "10:14" },
    { de: "bot", txt: "Fechado! Consulta às 17:00, no valor de R$ 120. Confirmo? ✅", hora: "10:14" },
    { de: "cliente", txt: "Perfeito, obrigado!", hora: "10:15" },
  ],
};

/* ── 2.4 medica ── */
const medicaSaudacao = "Oi! Aqui é a MAISA, assistente da Clínica Vida 🩺 Como posso te ajudar hoje?";
const medica: ProfissaoSpec = {
  terms: {
    negocioTipo: "consultório",
    negocioNome: "Clínica Vida",
    emoji: "🩺",
    profissionalSing: "médico(a)",
    profissionalPlur: "médicos(as)",
    clienteSing: "paciente",
    clientePlur: "pacientes",
    localAtendimento: "consultório",
    saudacao: medicaSaudacao,
    agendaSub: "Sua semana de consultas",
    equipeSub: "Médicos, especialidades e disponibilidade",
    dadosSub: "Os números do seu consultório",
    atendimentosSub: "Conversas do WhatsApp em tempo real",
    catalogoLabel: "Meus Procedimentos",
    servicoIcon: "stethoscope",
  },
  servicos: [
    { nome: "Consulta clínica", categoria: "Serviços", preco: 350, duracao: 40 },
    { nome: "Retorno", categoria: "Serviços", preco: 180, duracao: 30 },
    { nome: "Check-up completo", categoria: "Serviços", preco: 1200, duracao: 60 },
    { nome: "Consulta + exames", categoria: "Serviços", preco: 500, duracao: 45 },
    { nome: "Teleconsulta", categoria: "Serviços", preco: 250, duracao: 40 },
    { nome: "Aplicação / procedimento", categoria: "Serviços", preco: 220, duracao: 30 },
    { nome: "Avaliação nutricional", categoria: "Serviços", preco: 200, duracao: 30 },
  ],
  equipeEspecialidades: ["Clínica geral", "Cardiologia", "Dermatologia", "Pediatria"],
  campanhas: [
    { nome: "Campanha de vacinação — agende já", tipo: "Promoção" },
    { nome: "Está na hora do seu check-up anual 🩺", tipo: "Reativação" },
    { nome: "Lembrete de consulta", tipo: "Lembrete" },
    { nome: "Outubro Rosa — prevenção", tipo: "Promoção" },
  ],
  configSecoes: [
    { id: "personalidade", titulo: "Personalidade", thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: medicaSaudacao },
    ] },
    { id: "horarios", titulo: "Horário de atendimento", thread: [
      { de: "cliente", txt: "Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo seg a sex das 8h às 20h (sáb até 13h). Fora do horário anoto seu recado e retorno assim que o consultório abrir 🕗" },
    ] },
    { id: "agendamentos", titulo: "Agendamentos", thread: [
      { de: "cliente", txt: "Consigo marcar uma consulta pra amanhã?" },
      { de: "bot", txt: "Consigo! 🩺 Amanhã tenho 14:00 e 16:00 com o(a) Dr(a). Diego. Qual fica melhor?" },
      { de: "cliente", txt: "16h" },
      { de: "bot", txt: "Fechado! Consulta às 16:00. Te lembro 3h antes por aqui 👍" },
    ] },
    { id: "comportamento", titulo: "Comportamento", thread: [
      { de: "cliente", txt: "Vocês emitem atestado?" },
      { de: "bot", txt: "Boa! Confirmo rapidinho com o(a) responsável e já te respondo 🙌" },
    ] },
  ],
  faqs: [
    { id: "f1", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", categoria: "Geral", ativo: true, usos: 276 },
    { id: "f2", pergunta: "Aceitam convênio?", resposta: "Atendemos os principais convênios e também particular (Pix e cartão).", categoria: "Pagamento", ativo: true, usos: 233 },
    { id: "f3", pergunta: "Como marco uma consulta?", resposta: "Me diz o melhor dia e horário que eu já agendo sua consulta.", categoria: "Agendamento", ativo: true, usos: 389 },
    { id: "f4", pergunta: "Atendem crianças?", resposta: "Atendemos sim, com pediatra na equipe.", categoria: "Serviços", ativo: true, usos: 158 },
    { id: "f5", pergunta: "Fazem teleconsulta?", resposta: "Fazemos por vídeo, com a mesma qualidade do presencial.", categoria: "Serviços", ativo: true, usos: 168 },
  ],
  faqsSugeridos: ["Emitem atestado?", "Aceitam meu convênio?", "Fazem exames no local?", "Atendem urgência?"],
  mensagensExemplo: [
    { de: "cliente", txt: "Oi, boa tarde! Consigo marcar uma consulta?", hora: "10:12" },
    { de: "bot", txt: "Oi! Aqui é a MAISA 🩺 Claro! Amanhã tenho 15:30 e 17:00. Qual fica melhor?", hora: "10:12" },
    { de: "cliente", txt: "17h", hora: "10:14" },
    { de: "bot", txt: "Fechado! Consulta clínica às 17:00, no valor de R$ 350. Confirmo? ✅", hora: "10:14" },
    { de: "cliente", txt: "Perfeito, obrigado!", hora: "10:15" },
  ],
};

/* ── 2.5 generico (neutro — sem emoji temático) ── */
const genericoSaudacao = "Olá! Aqui é a MAISA, assistente do Seu Negócio. Como posso te ajudar hoje?";
const generico: ProfissaoSpec = {
  terms: {
    negocioTipo: "negócio",
    negocioNome: "Seu Negócio",
    emoji: "",
    profissionalSing: "profissional",
    profissionalPlur: "profissionais",
    clienteSing: "cliente",
    clientePlur: "clientes",
    localAtendimento: "atendimento",
    saudacao: genericoSaudacao,
    agendaSub: "Sua semana de atendimentos",
    equipeSub: "Profissionais, serviços e disponibilidade",
    dadosSub: "Os números do seu negócio",
    atendimentosSub: "Conversas do WhatsApp em tempo real",
    catalogoLabel: "Meus Serviços",
    servicoIcon: "tag",
  },
  servicos: [
    { nome: "Atendimento padrão", categoria: "Serviços", preco: 100, duracao: 40 },
    { nome: "Atendimento rápido", categoria: "Serviços", preco: 60, duracao: 30 },
    { nome: "Pacote completo", categoria: "Serviços", preco: 180, duracao: 60 },
    { nome: "Atendimento premium", categoria: "Serviços", preco: 150, duracao: 45 },
    { nome: "Serviço adicional", categoria: "Serviços", preco: 80, duracao: 40 },
    { nome: "Atendimento avulso", categoria: "Serviços", preco: 70, duracao: 30 },
    { nome: "Consulta inicial", categoria: "Serviços", preco: 90, duracao: 30 },
  ],
  equipeEspecialidades: ["Atendimento geral", "Especialista sênior", "Atendimento especializado", "Atendimento júnior"],
  campanhas: [
    { nome: "Promoção da semana — 20% off", tipo: "Promoção" },
    { nome: "Sentimos sua falta! Volte a agendar", tipo: "Reativação" },
    { nome: "Lembrete de atendimento", tipo: "Lembrete" },
    { nome: "Campanha sazonal", tipo: "Promoção" },
  ],
  configSecoes: [
    { id: "personalidade", titulo: "Personalidade", thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: genericoSaudacao },
    ] },
    { id: "horarios", titulo: "Horário de atendimento", thread: [
      { de: "cliente", txt: "Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo seg a sex das 8h às 20h (sáb até 13h). Fora do horário anoto seu recado e retorno assim que possível 🕗" },
    ] },
    { id: "agendamentos", titulo: "Agendamentos", thread: [
      { de: "cliente", txt: "Consigo marcar um atendimento pra amanhã?" },
      { de: "bot", txt: "Consigo! Amanhã tenho 14:00 e 16:00. Qual fica melhor?" },
      { de: "cliente", txt: "16h" },
      { de: "bot", txt: "Fechado! Atendimento às 16:00. Te lembro 3h antes por aqui 👍" },
    ] },
    { id: "comportamento", titulo: "Comportamento", thread: [
      { de: "cliente", txt: "Vocês têm um serviço específico?" },
      { de: "bot", txt: "Boa! Confirmo rapidinho com o(a) responsável e já te respondo 🙌" },
    ] },
  ],
  faqs: [
    { id: "f1", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", categoria: "Geral", ativo: true, usos: 240 },
    { id: "f2", pergunta: "Quais formas de pagamento?", resposta: "Aceitamos Pix, cartão e dinheiro.", categoria: "Pagamento", ativo: true, usos: 198 },
    { id: "f3", pergunta: "Como faço para agendar?", resposta: "Me diz o melhor dia e horário que eu já agendo seu atendimento.", categoria: "Agendamento", ativo: true, usos: 361 },
    { id: "f4", pergunta: "Quais serviços vocês oferecem?", resposta: "Temos vários atendimentos — me diz o que você precisa que eu te explico.", categoria: "Serviços", ativo: true, usos: 129 },
    { id: "f5", pergunta: "Onde vocês ficam?", resposta: "Te mando o endereço e a localização por aqui, é rapidinho.", categoria: "Geral", ativo: false, usos: 40 },
  ],
  faqsSugeridos: ["Vocês têm fidelidade?", "Dá pra pagar depois?", "Atendem sem agendar?", "Fazem atendimento online?"],
  mensagensExemplo: [
    { de: "cliente", txt: "Oi, boa tarde! Consigo marcar um atendimento?", hora: "10:12" },
    { de: "bot", txt: "Olá! Aqui é a MAISA. Claro! Amanhã tenho 15:30 e 17:00. Qual fica melhor?", hora: "10:12" },
    { de: "cliente", txt: "17h", hora: "10:14" },
    { de: "bot", txt: "Fechado! Atendimento às 17:00. Confirmo? ✅", hora: "10:14" },
    { de: "cliente", txt: "Perfeito!", hora: "10:15" },
  ],
};

export const PROFISSOES: Record<Profissao, ProfissaoSpec> = {
  barbearia,
  psicologia,
  odontologia,
  medica,
  generico,
};
