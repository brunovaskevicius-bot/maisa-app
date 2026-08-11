/* As conversas de WhatsApp — 100% demonstração enquanto a integração não entra.
 *
 * Quando o WhatsApp for real, este arquivo some e quem responde é o adaptador do
 * canal. Os TIPOS não mudam: eles moram em `nucleo/dominio/conversas.ts` justamente
 * para a troca ser de fonte, não de forma. */

import type { Conversa, Faq, ItemFila, Msg } from "@/nucleo/dominio/conversas";

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

/**
 * A METADE da fila "Precisa de você" que vem das conversas. A outra metade — as
 * cobranças de confirmação — é DERIVADA dos atendimentos de hoje, no store.
 *
 * Estas duas sobrevivem porque falam de CONVERSAS, e as conversas continuam sendo
 * demonstração. Por isso também perderam a referência a horários concretos: a conversa
 * é fictícia, a agenda não é mais, e a fictícia não pode afirmar nada sobre a real.
 */
export const FILA_CONVERSAS: ItemFila[] = [
  { id: "fl1", alvo: "cv2", titulo: "Larissa (mãe do Gustavo)", tag: "encaixe", msg: "Consegue encaixar o Gustavo hoje à tarde?" },
  { id: "fl2", alvo: "cv1", titulo: "Thiago Barros", tag: "remarcar", msg: "Quer trocar o horário de hoje por quinta às 10h." },
];

export const FAQS: Faq[] = [
  { id: "fq1", pergunta: "Como faço para agendar?", resposta: "Me diz o melhor dia e horário que eu já agendo seu atendimento.", usos: 361 },
  { id: "fq2", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", usos: 240 },
  { id: "fq3", pergunta: "Quais formas de pagamento?", resposta: "Aceitamos Pix, cartão e dinheiro.", usos: 198 },
  { id: "fq4", pergunta: "Quais serviços vocês oferecem?", resposta: "Temos vários atendimentos — me diz o que você precisa que eu te explico.", usos: 129 },
];
