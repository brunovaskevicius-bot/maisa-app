/* Dados mockados — Barbearia (assistente de IA por WhatsApp). Só front; nenhuma chamada de API.
 * BASE do resolver por profissão: este módulo é a fonte de estrutura (ids/horas/status/valores/
 * nomes de clientes) e de tipos + statusTone/statusLabel + billing agnóstico do SaaS.
 * O overlay temático por profissão vive em src/lib/profiles.ts e é aplicado em src/lib/adminConfig.tsx.
 * NÃO remover/renomear exports: as telas consomem via useAdmin() (valores resolvidos) e ainda
 * importam daqui os tipos e os agnósticos (statusTone, statusLabel, assinatura, faturasMaisa, etc.). */

export const shop = {
  nome: "Barbearia Navalha de Ouro",
  dono: "Rafael Antunes",
  telefone: "(11) 99820-1145",
  endereco: "R. Aurora, 320 — Santa Cecília, São Paulo",
  plano: "Profissional",
  desde: "2024",
};

export const assistant = {
  nome: "MAISA",
  tom: "amigável" as "amigável" | "profissional" | "descontraído",
  saudacao: "Opa! Aqui é a MAISA, assistente da Navalha de Ouro 💈 Como posso te ajudar hoje?",
  ativo: true,
  respostaMedia: "12s",
  taxaResolucao: 0.87,
};

export type Barbeiro = { id: string; nome: string; especialidade: string; ativo: boolean; atendimentosMes: number; avaliacao: number; comissao: number; desde: string };
export const equipe: Barbeiro[] = [
  { id: "b1", nome: "Rafael Antunes", especialidade: "Corte + barba clássico", ativo: true, atendimentosMes: 168, avaliacao: 4.9, comissao: 50, desde: "2024-01" },
  { id: "b2", nome: "Diego Moraes", especialidade: "Degradê e freestyle", ativo: true, atendimentosMes: 142, avaliacao: 4.8, comissao: 45, desde: "2024-03" },
  { id: "b3", nome: "Léo Barbosa", especialidade: "Barboterapia", ativo: true, atendimentosMes: 97, avaliacao: 4.7, comissao: 45, desde: "2024-06" },
  { id: "b4", nome: "Caio Ferraz", especialidade: "Cortes infantis", ativo: false, atendimentosMes: 0, avaliacao: 4.6, comissao: 40, desde: "2025-02" },
];

export type Servico = { id: string; nome: string; categoria: string; preco: number; duracao: number; ativo: boolean; barbeiroIds: string[] };
export const servicos: Servico[] = [
  { id: "s1", nome: "Corte máquina + tesoura", categoria: "Corte", preco: 55, duracao: 40, ativo: true, barbeiroIds: ["b1", "b2", "b3"] },
  { id: "s2", nome: "Barba na navalha", categoria: "Barba", preco: 45, duracao: 30, ativo: true, barbeiroIds: ["b1", "b3"] },
  { id: "s3", nome: "Combo corte + barba", categoria: "Combo", preco: 90, duracao: 60, ativo: true, barbeiroIds: ["b1", "b2"] },
  { id: "s4", nome: "Degradê navalhado", categoria: "Corte", preco: 65, duracao: 45, ativo: true, barbeiroIds: ["b2"] },
  { id: "s5", nome: "Pigmentação de barba", categoria: "Barba", preco: 70, duracao: 40, ativo: true, barbeiroIds: ["b3"] },
  { id: "s6", nome: "Corte infantil", categoria: "Corte", preco: 45, duracao: 30, ativo: true, barbeiroIds: ["b2", "b4"] },
  { id: "s7", nome: "Hidratação capilar", categoria: "Tratamento", preco: 50, duracao: 30, ativo: false, barbeiroIds: ["b1"] },
];

export type Status = "confirmado" | "aguardando" | "concluido" | "cancelado";
export type Agendamento = { id: string; hora: string; dur: number; cliente: string; servico: string; barbeiroId: string; status: Status };
export const agendaHoje: Agendamento[] = [
  { id: "a1", hora: "09:00", dur: 40, cliente: "Bruno Salles", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "concluido" },
  { id: "a2", hora: "09:30", dur: 30, cliente: "Marcos Vinícius", servico: "Barba na navalha", barbeiroId: "b3", status: "concluido" },
  { id: "a3", hora: "10:00", dur: 60, cliente: "Thiago Nunes", servico: "Combo corte + barba", barbeiroId: "b2", status: "confirmado" },
  { id: "a4", hora: "11:00", dur: 45, cliente: "Pedro Alencar", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  { id: "a5", hora: "13:30", dur: 40, cliente: "Rodrigo Lima", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "aguardando" },
  { id: "a6", hora: "14:30", dur: 30, cliente: "André Castro", servico: "Barba na navalha", barbeiroId: "b3", status: "confirmado" },
  { id: "a7", hora: "15:30", dur: 60, cliente: "Felipe Rocha", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
  { id: "a8", hora: "17:00", dur: 30, cliente: "Gustavo Pinho", servico: "Corte infantil", barbeiroId: "b2", status: "aguardando" },
];

export type Conversa = { id: string; cliente: string; telefone: string; ultimaMsg: string; hora: string; estado: "bot" | "humano" | "resolvido"; naoLidas: number };
export const conversas: Conversa[] = [
  { id: "c1", cliente: "Bruno Salles", telefone: "(11) 98812-4471", ultimaMsg: "Fechou, confirmo às 9h então 👍", hora: "08:42", estado: "resolvido", naoLidas: 0 },
  { id: "c2", cliente: "Larissa (mãe do Gu)", telefone: "(11) 99640-2210", ultimaMsg: "Consegue encaixar o Gustavo hoje à tarde?", hora: "10:15", estado: "bot", naoLidas: 2 },
  { id: "c3", cliente: "Thiago Nunes", telefone: "(11) 99123-8890", ultimaMsg: "Quero remarcar pra quinta, dá?", hora: "10:31", estado: "humano", naoLidas: 1 },
  { id: "c4", cliente: "Marcos Vinícius", telefone: "(11) 98033-5567", ultimaMsg: "Quanto tá o combo?", hora: "10:48", estado: "bot", naoLidas: 0 },
  { id: "c5", cliente: "Anderson Reis", telefone: "(11) 99771-0342", ultimaMsg: "Vcs abrem no feriado?", hora: "11:02", estado: "bot", naoLidas: 3 },
  { id: "c6", cliente: "Felipe Rocha", telefone: "(11) 98555-1200", ultimaMsg: "Obrigado, MAISA! Até mais 🙏", hora: "11:20", estado: "resolvido", naoLidas: 0 },
];

export const mensagensExemplo = [
  { de: "cliente" as const, txt: "Oi, boa tarde! Consegue encaixar o Gustavo hoje?", hora: "10:12" },
  { de: "bot" as const, txt: "Opa! Aqui é a MAISA 💈 Claro! Pra hoje tenho 15:30 e 17:00 com o Diego. Qual fica melhor?", hora: "10:12" },
  { de: "cliente" as const, txt: "17h é ótimo", hora: "10:14" },
  { de: "bot" as const, txt: "Fechado! Corte infantil às 17:00 com o Diego, no valor de R$ 45. Confirmo? ✅", hora: "10:14" },
  { de: "cliente" as const, txt: "Consegue encaixar o Gustavo hoje à tarde?", hora: "10:15" },
];

export type FAQ = { id: string; pergunta: string; resposta: string; categoria: string; ativo: boolean; usos: number };
export const faqs: FAQ[] = [
  { id: "f1", pergunta: "Quais os horários de funcionamento?", resposta: "Seg a sáb, das 9h às 20h. Domingo fechado.", categoria: "Geral", ativo: true, usos: 312 },
  { id: "f2", pergunta: "Vocês aceitam Pix?", resposta: "Sim! Pix, cartão e dinheiro. O Pix pode ser adiantado pra garantir o horário.", categoria: "Pagamento", ativo: true, usos: 205 },
  { id: "f3", pergunta: "Precisa agendar ou tem fila?", resposta: "Trabalhamos com hora marcada, mas encaixamos sempre que dá. Me diz o dia que eu vejo!", categoria: "Agendamento", ativo: true, usos: 448 },
  { id: "f4", pergunta: "Fazem corte infantil?", resposta: "Fazemos sim, com o Diego e o Caio. R$ 45 e leva uns 30 min.", categoria: "Serviços", ativo: true, usos: 121 },
  { id: "f5", pergunta: "Tem estacionamento?", resposta: "Tem zona azul na rua e um estacionamento a 50m (R$ 12 a diária).", categoria: "Geral", ativo: false, usos: 34 },
];

export type Pagamento = { id: string; data: string; cliente: string; servico: string; valor: number; metodo: "Pix" | "Cartão" | "Dinheiro"; status: "pago" | "pendente" };
export const pagamentos: Pagamento[] = [
  { id: "p1", data: "16/07", cliente: "Bruno Salles", servico: "Corte máquina + tesoura", valor: 55, metodo: "Pix", status: "pago" },
  { id: "p2", data: "16/07", cliente: "Marcos Vinícius", servico: "Barba na navalha", valor: 45, metodo: "Cartão", status: "pago" },
  { id: "p3", data: "16/07", cliente: "Thiago Nunes", servico: "Combo corte + barba", valor: 90, metodo: "Pix", status: "pendente" },
  { id: "p4", data: "15/07", cliente: "Pedro Alencar", servico: "Degradê navalhado", valor: 65, metodo: "Dinheiro", status: "pago" },
  { id: "p5", data: "15/07", cliente: "André Castro", servico: "Barba na navalha", valor: 45, metodo: "Pix", status: "pago" },
  { id: "p6", data: "14/07", cliente: "Felipe Rocha", servico: "Combo corte + barba", valor: 90, metodo: "Cartão", status: "pago" },
];

export const assinatura = {
  plano: "Profissional",
  valor: 149.9,
  proximaCobranca: "05/08/2026",
  metodo: "Cartão final 4417",
  limiteConversas: "Ilimitado",
  status: "ativa" as const,
};

export type Campanha = { id: string; nome: string; tipo: "Promoção" | "Lembrete" | "Reativação"; status: "ativa" | "rascunho" | "encerrada"; enviados: number; conversao: number; data: string };
export const campanhas: Campanha[] = [
  { id: "m1", nome: "Terça do degradê — 20% off", tipo: "Promoção", status: "ativa", enviados: 214, conversao: 0.31, data: "Toda terça" },
  { id: "m2", nome: "Sentiu falta? Volta pra cadeira 💈", tipo: "Reativação", status: "ativa", enviados: 89, conversao: 0.22, data: "A cada 45 dias" },
  { id: "m3", nome: "Lembrete de agendamento", tipo: "Lembrete", status: "ativa", enviados: 640, conversao: 0.94, data: "Automático" },
  { id: "m4", nome: "Combo dia dos pais", tipo: "Promoção", status: "rascunho", enviados: 0, conversao: 0, data: "—" },
];

export const kpis = {
  agendamentosHoje: 8,
  faturamentoHoje: 470,
  faturamentoMes: 18240,
  novosClientesMes: 37,
  taxaOcupacao: 0.78,
  respondidasBot: 0.83,
  avaliacaoMedia: 4.8,
  mensagensHoje: 46,
};

export const horarios = [
  { dia: "Segunda", aberto: true, de: "09:00", ate: "20:00" },
  { dia: "Terça", aberto: true, de: "09:00", ate: "20:00" },
  { dia: "Quarta", aberto: true, de: "09:00", ate: "20:00" },
  { dia: "Quinta", aberto: true, de: "09:00", ate: "20:00" },
  { dia: "Sexta", aberto: true, de: "09:00", ate: "21:00" },
  { dia: "Sábado", aberto: true, de: "09:00", ate: "18:00" },
  { dia: "Domingo", aberto: false, de: "—", ate: "—" },
];

export const barbeiroNome = (id: string) => equipe.find((b) => b.id === id)?.nome || "—";
export const statusTone: Record<Status, "success" | "primary" | "warn" | "danger" | "neutral"> = {
  concluido: "success",
  confirmado: "primary",
  aguardando: "warn",
  cancelado: "danger",
};
export const statusLabel: Record<Status, string> = {
  concluido: "Concluído",
  confirmado: "Confirmado",
  aguardando: "Aguardando",
  cancelado: "Cancelado",
};

// ---- serviços <-> barbeiros ----
export const servicosDoBarbeiro = (bid: string) => servicos.filter((s) => s.barbeiroIds.includes(bid));
export const barbeirosDoServico = (sid: string) => {
  const s = servicos.find((x) => x.id === sid);
  return s ? equipe.filter((b) => s.barbeiroIds.includes(b.id)) : [];
};

// ---- Configurações do Assistente: cada seção tem um exemplo de conversa no WhatsApp (preview) ----
export type PreviewMsg = { de: "cliente" | "bot"; txt: string };
export type ConfigSecao = { id: string; titulo: string; thread: PreviewMsg[] };
export const configSecoes: ConfigSecao[] = [
  {
    id: "personalidade",
    titulo: "Personalidade",
    thread: [
      { de: "cliente", txt: "Oi, bom dia!" },
      { de: "bot", txt: assistant.saudacao },
    ],
  },
  {
    id: "horarios",
    titulo: "Horário de atendimento",
    thread: [
      { de: "cliente", txt: "Quando a MAISA está ativa? Que horas vocês atendem?" },
      { de: "bot", txt: "Atendo todos os dias das 9h às 20h (sáb até 18h, domingo fechado). Fora do horário eu anoto seu recado e respondo assim que a barbearia abrir! 🕗" },
    ],
  },
  {
    id: "agendamentos",
    titulo: "Agendamentos",
    thread: [
      { de: "cliente", txt: "Consigo marcar um corte pra amanhã?" },
      { de: "bot", txt: "Consigo sim! 💈 Amanhã tenho 14:30 e 16:00 com o Diego. Qual fica melhor?" },
      { de: "cliente", txt: "Pode ser 16h" },
      { de: "bot", txt: "Fechado! Corte às 16:00 com o Diego. Te lembro 3h antes por aqui 👍" },
    ],
  },
  {
    id: "comportamento",
    titulo: "Comportamento",
    thread: [
      { de: "cliente", txt: "Vocês fazem sobrancelha?" },
      { de: "bot", txt: "Boa! Essa eu confirmo rapidinho com o Rafael e já te respondo 🙌" },
    ],
  },
];

// ---- Meus Pagamentos: assinatura do SaaS (o dono da barbearia paga a MAISA / Poli Júnior) ----
export type FaturaMaisa = { id: string; data: string; descricao: string; valor: number; status: "pago" | "aberta" };
export const faturasMaisa: FaturaMaisa[] = [
  { id: "fm1", data: "05/07/2026", descricao: "Plano Profissional — jul/2026", valor: 149.9, status: "pago" },
  { id: "fm2", data: "05/06/2026", descricao: "Plano Profissional — jun/2026", valor: 149.9, status: "pago" },
  { id: "fm3", data: "05/05/2026", descricao: "Plano Profissional — mai/2026", valor: 149.9, status: "pago" },
  { id: "fm4", data: "05/04/2026", descricao: "Plano Profissional — abr/2026", valor: 149.9, status: "pago" },
];
export const metodoPagamento = { tipo: "Cartão de crédito", bandeira: "Visa", final: "4417", validade: "08/29", titular: "Rafael Antunes" };
export const empresaMaisa = { razao: "MAISA · por Poli Júnior", cnpj: "62.025.689/0001-66", suporte: "suporte@maisa.app" };

// ---- Agenda recorrente por dia da semana (0=Dom..6=Sáb) — alimenta o calendário (dia/semana/mês) ----
// start = hora decimal (9.5 = 09:30). Domingo (0) fechado.
export type AgFixo = { id: string; dia: number; start: number; dur: number; cliente: string; servico: string; barbeiroId: string; status: Status };
export const agendaFixa: AgFixo[] = [
  // Segunda
  { id: "g1", dia: 1, start: 9, dur: 40, cliente: "Bruno Salles", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "confirmado" },
  { id: "g2", dia: 1, start: 10, dur: 60, cliente: "Thiago Nunes", servico: "Combo corte + barba", barbeiroId: "b2", status: "confirmado" },
  { id: "g3", dia: 1, start: 11.5, dur: 30, cliente: "André Castro", servico: "Barba na navalha", barbeiroId: "b3", status: "aguardando" },
  { id: "g4", dia: 1, start: 15, dur: 45, cliente: "Pedro Alencar", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  { id: "g5", dia: 1, start: 17, dur: 40, cliente: "Rodrigo Lima", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "confirmado" },
  // Terça
  { id: "g6", dia: 2, start: 9.5, dur: 60, cliente: "Felipe Rocha", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
  { id: "g7", dia: 2, start: 11, dur: 45, cliente: "Igor Mendes", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  { id: "g8", dia: 2, start: 14, dur: 40, cliente: "Pigmentação — Léo", servico: "Pigmentação de barba", barbeiroId: "b3", status: "aguardando" },
  { id: "g9", dia: 2, start: 16.5, dur: 30, cliente: "Caio Prado", servico: "Barba na navalha", barbeiroId: "b3", status: "confirmado" },
  // Quarta
  { id: "g10", dia: 3, start: 9, dur: 40, cliente: "Marcos Vinícius", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "confirmado" },
  { id: "g11", dia: 3, start: 10.5, dur: 60, cliente: "Otávio Reis", servico: "Combo corte + barba", barbeiroId: "b2", status: "confirmado" },
  { id: "g12", dia: 3, start: 13.5, dur: 45, cliente: "Vitor Hugo", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  { id: "g13", dia: 3, start: 15.5, dur: 30, cliente: "Renato Dias", servico: "Barba na navalha", barbeiroId: "b3", status: "aguardando" },
  { id: "g14", dia: 3, start: 17, dur: 40, cliente: "Sérgio Lopes", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "confirmado" },
  // Quinta
  { id: "g15", dia: 4, start: 9.5, dur: 30, cliente: "Gustavo Pinho", servico: "Corte infantil", barbeiroId: "b2", status: "confirmado" },
  { id: "g16", dia: 4, start: 11, dur: 60, cliente: "Daniel Souza", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
  { id: "g17", dia: 4, start: 14.5, dur: 40, cliente: "Léo — cliente", servico: "Pigmentação de barba", barbeiroId: "b3", status: "aguardando" },
  { id: "g18", dia: 4, start: 16, dur: 45, cliente: "Murilo Antunes", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  // Sexta (dia cheio)
  { id: "g19", dia: 5, start: 9, dur: 40, cliente: "Bruno Salles", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "concluido" },
  { id: "g20", dia: 5, start: 9.5, dur: 30, cliente: "Marcos Vinícius", servico: "Barba na navalha", barbeiroId: "b3", status: "concluido" },
  { id: "g21", dia: 5, start: 10, dur: 60, cliente: "Thiago Nunes", servico: "Combo corte + barba", barbeiroId: "b2", status: "confirmado" },
  { id: "g22", dia: 5, start: 11.5, dur: 45, cliente: "Pedro Alencar", servico: "Degradê navalhado", barbeiroId: "b2", status: "confirmado" },
  { id: "g23", dia: 5, start: 14, dur: 40, cliente: "André Castro", servico: "Corte máquina + tesoura", barbeiroId: "b1", status: "confirmado" },
  { id: "g24", dia: 5, start: 15.5, dur: 60, cliente: "Felipe Rocha", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
  { id: "g25", dia: 5, start: 17, dur: 30, cliente: "Gustavo Pinho", servico: "Corte infantil", barbeiroId: "b2", status: "aguardando" },
  // Sábado
  { id: "g26", dia: 6, start: 9, dur: 60, cliente: "Ricardo Alves", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
  { id: "g27", dia: 6, start: 10.5, dur: 40, cliente: "Henrique Sá", servico: "Corte máquina + tesoura", barbeiroId: "b2", status: "confirmado" },
  { id: "g28", dia: 6, start: 12, dur: 30, cliente: "Wesley Nunes", servico: "Barba na navalha", barbeiroId: "b3", status: "confirmado" },
  { id: "g29", dia: 6, start: 14, dur: 45, cliente: "Alan Ferreira", servico: "Degradê navalhado", barbeiroId: "b2", status: "aguardando" },
  { id: "g30", dia: 6, start: 15.5, dur: 60, cliente: "Diego — cliente", servico: "Combo corte + barba", barbeiroId: "b1", status: "confirmado" },
];
