/* ----------------------------------------------------------------------------
 * Dados da v2 de /barbeiros/completa.
 *
 * A v1 tinha 8 seções e por isso 8 conteúdos foram inventados para caber nelas:
 * "+38% agenda mais cheia" (sem fonte — um grep por "38%" em todo o src/ só acha
 * a linha que o criou), "Disruptiva / Descontínua / Defensável" (porque o grid
 * pedia três cards, e "Defensável" vendia lock-in numa oferta que diz SEM
 * FIDELIDADE), e seis clientes fabricados reciclando as fotos do herói e os nomes
 * dos próprios barbeiros sob a afirmação "Atendido ontem".
 *
 * Aqui só existe o que é verdade. A regra é: se um dado não tem origem
 * verificável, ele não entra — nem que sobre espaço no layout.
 * -------------------------------------------------------------------------- */

import { imagensBarbeiros } from "../../imagens";

/* ─────────────────────────── a oferta, fonte única ───────────────────────── */

/* Na v1 estes valores estavam duplicados em 4 lugares (page.tsx:35, page.tsx:173,
   HeroCompleto.tsx:148, dados.ts:176) e já divergiam entre si — "setup em 30 min"
   contra "cerca de 30 minutos" nas outras páginas. Uma fonte só. */
export const OFERTA = {
  /** Existe plano de R$ 197 (PlanosBarbeiros.tsx:67), então "a partir de" não é enfeite. */
  precoDe: "R$ 97",
  precoPor: "/mês",
  garantia: "Se no primeiro mês ela não se pagar, a gente devolve.",
  garantiaCurta: "garantia de 1 mês",
  fidelidade: "sem fidelidade",
  setup: "cerca de 30 min para ativar",
  operadora: "Poli Júnior",
} as const;

/* ─────────────────────────── o fio ───────────────────────────
 * O melhor texto do projeto, que na v1 estava preso num mockup de 336px a 13,5px
 * de corpo, com 3 de 4 painéis em aria-hidden + opacity:0 — ilegível em qualquer
 * instante. Aqui ele é o corpo da página.
 *
 * O RELÓGIO FOI CONSERTADO. Na v1 o cliente marcava terça 14:02 para as 16:00 do
 * MESMO dia, a maisa prometia "lembrete 3h antes", e o lembrete aparecia às 13:00
 * — uma hora e dois minutos ANTES da conversa que o gerou. Agora o agendamento é
 * para o dia seguinte e a linha do tempo é monotônica. */

export type Turno = {
  /** quem fala: o cliente, a assistente, ou o dono da barbearia */
  voz: "cliente" | "maisa" | "dono";
  /** hora no formato 24h, para <time> */
  hora: string;
  texto: string;
  /** true quando o texto contém o wordmark como sujeito da frase */
  marca?: boolean;
};

export type Marco = {
  /** o dia, como cabeçalho de dia de WhatsApp */
  dia: string;
  /** o que este trecho prova — anotação na margem, não título de seção */
  nota: string;
  turnos: Turno[];
};

export const FIO: Marco[] = [
  {
    dia: "Terça",
    nota: "Ela responde no número que a barbearia já usa, e já oferece horário — sem você soltar a tesoura.",
    turnos: [
      { voz: "cliente", hora: "14:02", texto: "boa tarde, tem horário pra amanhã?" },
      { voz: "maisa", hora: "14:02", marca: true, texto: "Opa! Aqui é a {maisa}, assistente da Navalha de Ouro. Amanhã tenho 16:00 com o Diego e 18:30 com o Rafael. Qual fica melhor?" },
      { voz: "cliente", hora: "14:03", texto: "16:00 com o Diego" },
      { voz: "maisa", hora: "14:03", texto: "Fechado: quarta, 16:00, com o Diego. Te lembro na véspera." },
    ],
  },
  {
    dia: "Quarta",
    nota: "O lembrete é o que separa cadeira ocupada de furo. Ele sai sozinho, e a resposta também é dela.",
    turnos: [
      { voz: "maisa", hora: "13:00", texto: "Passando pra lembrar: seu corte é hoje às 16:00 com o Diego. Consegue vir?" },
      { voz: "cliente", hora: "13:04", texto: "confirmado, tô indo" },
    ],
  },
  {
    dia: "Sexta",
    nota: "Ela guarda corte, preferência e frequência. E quando a decisão não é dela, ela para e te chama — este é o limite dela, escrito por ela.",
    turnos: [
      { voz: "cliente", hora: "09:40", texto: "quero marcar o de sempre" },
      { voz: "maisa", hora: "09:40", texto: "Degradê na máquina 1 + barba na navalha, com o Diego — igual das últimas 4 vezes. Marco sábado 10:00?" },
      { voz: "cliente", hora: "09:41", texto: "dá pra fazer 30% de desconto? sou cliente antigo" },
      { voz: "maisa", hora: "09:41", texto: "Desconto quem decide é o Diego, não eu. Vou chamar ele aqui." },
      { voz: "dono", hora: "09:52", texto: "Fala! Cliente antigo eu faço 15%. Fecha sábado 10:00?" },
      { voz: "cliente", hora: "09:53", texto: "fechado" },
    ],
  },
];

/** O rótulo de honestidade. Vem DEPOIS do fio: dizer "isto não aconteceu" antes de
 *  ler a coisa cuja força é "isto aconteceu" desarma o próprio argumento. */
export const ROTULO_FIO =
  "Fio de demonstração: é assim que a maisa se comporta, no WhatsApp que a barbearia já usa. A barbearia e os nomes são ilustrativos; as respostas, os horários e o limite dela não.";

/* ─────────────────────── as três perguntas que travam a compra ────────────── */

/* As objeções REAIS e já testadas, que a v1 descartou para gastar os quatro slots
   de FAQ em número/vários barbeiros/"quem é o time"/tempo. Vêm de
   FaqBarbeiros.tsx:26, :30 e :42. */
export const PERGUNTAS: { q: string; a: string }[] = [
  {
    q: "E se o cliente quiser falar com uma pessoa?",
    a: "Ela passa pra você. A qualquer momento você entra na conversa e assume — o cliente nem percebe a troca, porque é o mesmo WhatsApp. E quando a decisão não é dela (desconto, encaixe fora do horário, caso estranho), ela para e te chama sozinha.",
  },
  {
    q: "Vou perder o controle da agenda?",
    a: "Não. Ela só oferece os horários que você abriu, com os profissionais que você marcou como disponíveis. Tudo que ela marca aparece na sua agenda na hora, e você desmarca, remarca ou pausa ela quando quiser.",
  },
  {
    q: "E se não der certo pra mim?",
    a: "Você cancela. Não tem fidelidade, e no primeiro mês vale a garantia: se ela não se pagar, a gente devolve o que você pagou.",
  },
];

/* ─────────────────────────── a conta do furo ─────────────────────────── */

/* Pisos deliberados. Sem eles a aritmética desqualifica o melhor cliente:
   1 cadeira · R$ 20 · 1 furo = R$ 80/mês, menor que os R$ 97 da mensalidade. O
   bloco NUNCA subtrai o preço — ele só mostra o buraco. A justaposição acontece
   na cabeça de quem lê, que é mais forte, e não é alegação nossa. */
export const TICKETS = [30, 40, 50, 60, 70, 80, 100, 120] as const;
/* 1 a 4, e nada além: o bloco agora mostra UM ROSTO por furo da semana, e quatro
   é o teto em que quatro retratos ainda dividem a mesma área sem virar miniatura
   ilegível. O número não é mais só um multiplicador — ele é a quantidade de
   pessoas desenhadas na tela, então a lista tem que parar onde o desenho para. */
export const FUROS_SEMANA = [1, 2, 3, 4] as const;

export const TICKET_PADRAO = 50;
/* Começa em 1 porque é daqui que a contagem automática parte quando a seção
   entra na tela (1 → 4). Qualquer padrão maior obrigaria a voltar atrás para
   animar, e "voltar atrás" é um salto visível. Sem JS, 1 furo · R$ 50 · 4
   semanas = R$ 200/mês: o piso da conta, e ainda assim verdade. */
export const FUROS_PADRAO = 1;

/** A foto da dobra: a casa cheia, duas cadeiras ocupadas no mesmo instante.
 *
 *  TROCOU A FOTO E TROCOU O PAPEL DELA, e o segundo é o que importa aqui.
 *
 *  Até esta versão a foto era o FUNDO da dobra: tela inteira, e o texto por cima. Isso
 *  cobrava quatro camadas de véu navy — até 92% de alpha — só para o texto ter substrato,
 *  e o preço era a própria foto, que virava um retângulo quase preto. A autocrítica de
 *  quem escreveu o véu anterior já dizia em voz alta: "no terço de baixo a imagem
 *  praticamente desaparece". Havia ainda uma restrição de asset escrita neste comentário
 *  (o canto superior esquerdo tinha de ser escuro, senão o wordmark dourado caía para
 *  ~1,4:1) que era consequência do mesmo arranjo.
 *
 *  Agora a foto é uma FAIXA, e nada é desenhado em cima dela: nem wordmark, nem manchete,
 *  nem botão. Duas coisas seguem disso, e as duas são vantagem:
 *    · véu ZERO. A foto aparece na cor em que foi tirada — o vermelho da cabine, o
 *      terracota dos aventais, o branco do piso. É essa a diferença de "ar" desta versão.
 *    · a restrição de asset MORREU. Não existe mais canto que precise ser escuro, porque
 *      não existe mais glifo em cima de canto nenhum.
 *
 *  A RESTRIÇÃO QUE SOBROU é de composição, não de contraste. A faixa recorta em
 *  `height: min(66vw, 46svh)` com `object-position: center 42%` (regra .lp2-dobra-foto no
 *  v2.css): no celular sai o quadro 3:2 quase inteiro, e no desktop uma letterbox de
 *  ~3,4:1 que mostra a banda vertical de 18% a 62% da altura. Quem trocar esta foto
 *  precisa que o ASSUNTO viva nessa banda — nesta, as quatro cabeças estão entre 20% e
 *  32%, e os aventais até 55%. Foto com o assunto no chão ou no teto perde o assunto.
 *
 *  E se alguém puser texto de volta sobre a foto: o orçamento de contraste inteiro tem
 *  de ser refeito do zero, porque não há mais véu nenhum para herdar. */
export const IMAGEM_DOBRA = imagensBarbeiros.salaoCheio;

/* ─────────────────────────── util de wordmark ─────────────────────────── */

/** Parte um texto em trechos, marcando onde `{maisa}` aparece, para o componente
 *  Maisa renderizar o wordmark no meio da frase. Mesma ideia da v1, sem o
 *  vocabulário de "Trecho" espalhado. */
export function partes(texto: string): { t: string; marca: boolean }[] {
  return texto.split(/(\{maisa\})/g).filter(Boolean).map((t) =>
    t === "{maisa}" ? { t: "maisa", marca: true } : { t, marca: false },
  );
}
