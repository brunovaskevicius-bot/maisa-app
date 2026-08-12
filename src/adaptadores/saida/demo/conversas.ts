/* O que sobrou dos fixtures de conversa: as FAQs.
 *
 * ⚠️ AS CONVERSAS SAÍRAM DAQUI. Eram `CONVERSAS` (seis contatos com hora fixa), `THREADS`
 * (as falas), `SUGESTOES` (respostas prontas por conversa) e `FILA_CONVERSAS` (dois itens de
 * pendência apontando para `cv1` e `cv2`). Este arquivo prometia, no topo: "quando o WhatsApp
 * for real, este arquivo some e quem responde é o adaptador do canal". É o que aconteceu — a
 * tela de Conversas lê `GET /api/conversas`, que lê a MESMA tabela que o agente escreve.
 *
 * Nada foi "portado". Uma conversa de demonstração ao lado de uma conversa real seria pior que
 * inútil: o dono responderia a uma pessoa que não existe, e a MAISA nunca veria essa resposta.
 * É o mesmo motivo pelo qual os atendimentos de exemplo saíram quando a agenda do Google entrou.
 *
 * As SUGESTÕES não voltam como fixture porque elas não são conteúdo, são uma FEATURE: "o que a
 * MAISA sugere que você responda" só faz sentido gerado a partir da conversa real. Enquanto isso
 * não existe, a tela não mostra a barra — melhor um espaço a menos que três botões que sempre
 * dizem a mesma coisa.
 *
 * `FAQS` fica porque não é conversa: é o que o dono cadastrou como resposta pronta, e é lido
 * pelo AGENTE (ver `composicao.ts` → `configuracaoDoAgente`). A tabela `faqs` já existe no
 * `002_multitenant.sql`; falta a tela que grava nela. */

import type { Faq } from "@/nucleo/dominio/conversas";

export const FAQS: Faq[] = [
  { id: "fq1", pergunta: "Como faço para agendar?", resposta: "Me diz o melhor dia e horário que eu já agendo seu atendimento.", usos: 361 },
  { id: "fq2", pergunta: "Quais os horários de atendimento?", resposta: "Seg a sex, das 8h às 20h. Sáb das 9h às 13h.", usos: 240 },
  { id: "fq3", pergunta: "Quais formas de pagamento?", resposta: "Aceitamos Pix, cartão e dinheiro.", usos: 198 },
  { id: "fq4", pergunta: "Quais serviços vocês oferecem?", resposta: "Temos vários atendimentos — me diz o que você precisa que eu te explico.", usos: 129 },
];
