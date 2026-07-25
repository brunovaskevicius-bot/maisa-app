/* ----------------------------------------------------------------------------
 * Conteúdo da LP Barbeiros Completa (one-pager).
 *
 * Fica separado dos componentes porque é COPY — quem edita texto não deveria
 * precisar abrir JSX. Módulo puro: importável por Server e Client Components.
 *
 * O tipo `Trecho` existe porque o wordmark "maisa" aparece DENTRO das frases,
 * com tratamento tipográfico próprio (Jakarta 800 dourada em relevo). Em vez de
 * HTML em string, a frase é uma lista de trechos e o componente <Frase> decide
 * como desenhar cada um. Assim a copy fica legível e sem dangerouslySetInnerHTML.
 * -------------------------------------------------------------------------- */

import { imagensBarbeiros, type MktImagem } from "../../imagens";

/**
 * Reescreve a largura na URL do Unsplash.
 *
 * O módulo curado entrega tudo em w=1600, que é o certo para um fundo full-bleed
 * e exagerado para um cartão de 206px. O anel do herói são 8 imagens: baixar
 * 8×1600px para exibir a 206px custa banda e memória de textura à toa, e é o
 * primeiro que a pessoa espera carregar. Pedir o tamanho de exibição real.
 */
function emLargura(img: MktImagem, w: number): MktImagem {
  return { ...img, url: img.url.replace(/([?&]w=)\d+/, `$1${w}`) };
}

/** Um pedaço de frase. `marca: true` = renderiza como wordmark "maisa". */
export type Trecho = { t: string; marca?: boolean };

/** Atalho: quebra "…a {maisa} responde…" em trechos. */
export function frase(texto: string): Trecho[] {
  return texto
    .split(/(\{maisa\})/g)
    .filter((p) => p !== "")
    .map((p) => (p === "{maisa}" ? { t: "maisa", marca: true } : { t: p }));
}

/**
 * A frase como texto corrido.
 *
 * O wordmark vira um <span> com sombra e espaçamento próprios, e o nome
 * acessível calculado a partir disso sai truncado ("Quem é o time por trás da
 * ?"). Onde o nome importa — botão, aria-label — use isto.
 */
export function textoPlano(trechos: Trecho[]): string {
  return trechos.map((p) => p.t).join("");
}

/* ------------------------------- herói: anel ------------------------------- *
 * Cartões girando em perspectiva.
 *
 * As fotos vêm do módulo curado do projeto, não de IDs soltos: os ids que o
 * arquivo de design trazia respondem HTTP 200, mas as imagens NÃO são de
 * barbearia (retratos aleatórios). Foto errada num herói de barbearia derruba a
 * página inteira, e o alt viraria descrição de uma cena que não está lá.
 */
// 8 posições, 6 fotos: o keyframe só chega a opacidade 1 em dois pontos do
// ciclo, então com poucos cartões a cena passa a maior parte do tempo apagada.
// As duas repetições ficam em pontos opostos do anel para não aparecerem juntas.
export const ANEL = [
  imagensBarbeiros.hero,
  imagensBarbeiros.corte,
  imagensBarbeiros.interior,
  imagensBarbeiros.cadeira,
  imagensBarbeiros.fachada,
  imagensBarbeiros.ruaNeon,
  imagensBarbeiros.corte,
  imagensBarbeiros.cadeira,
].map((img) => emLargura(img, 420));

/* ---------------------------- como funciona (4) --------------------------- */
export type Msg = { doCliente: boolean; hora: string; texto: Trecho[] };
export type Passo = { titulo: string; legenda: string; descricao: Trecho[]; msgs: Msg[] };

export const PASSOS: Passo[] = [
  {
    titulo: "Chama no WhatsApp",
    legenda: "Terça, 14:02",
    descricao: frase("Cliente manda mensagem no número que a barbearia já usa. A {maisa} responde na hora e já oferece um horário."),
    msgs: [
      { doCliente: true, hora: "14:02", texto: frase("boa tarde, tem horário pra hoje?") },
      { doCliente: false, hora: "14:02", texto: frase("Opa! Aqui é a {maisa}, assistente da Navalha de Ouro 💈 Tenho 16:00 com o Diego e 18:30 com o Rafael. Qual fica melhor?") },
      { doCliente: true, hora: "14:03", texto: frase("16:00 com o Diego") },
    ],
  },
  {
    titulo: "Confirma e lembra",
    legenda: "Terça, 13:00",
    descricao: frase("Ela fecha o horário certo com o barbeiro certo e manda um lembrete 3h antes. Menos furo, mais cadeira ocupada."),
    msgs: [
      { doCliente: false, hora: "14:03", texto: frase("Fechado! Corte às 16:00 com o Diego. Te lembro 3h antes por aqui 👍") },
      { doCliente: false, hora: "13:00", texto: frase("Passando pra lembrar: seu corte é hoje às 16:00 com o Diego. Consegue vir?") },
      { doCliente: true, hora: "13:04", texto: frase("confirmado, tô indo ✅") },
    ],
  },
  {
    titulo: "Conhece cada cliente",
    legenda: "Sexta, 09:40",
    descricao: frase("Corte, preferência e frequência guardados — ela já sabe como você atende antes do cliente sentar."),
    msgs: [
      { doCliente: true, hora: "09:40", texto: frase("quero marcar o de sempre") },
      { doCliente: false, hora: "09:40", texto: frase("Degradê na máquina 1 + barba na navalha, com o Diego — igual das últimas 4 vezes. Marco sábado 10:00?") },
      { doCliente: true, hora: "09:41", texto: frase("perfeito 🙌") },
    ],
  },
  {
    titulo: "Fecha a conta",
    legenda: "Sábado, 10:48",
    descricao: frase("Serviço feito, ela emite a nota e registra no financeiro. Sem planilha no fim do dia."),
    msgs: [
      { doCliente: false, hora: "10:48", texto: frase("Degradê + barba fechou em R$ 75,00. Pix, cartão ou dinheiro?") },
      { doCliente: true, hora: "10:49", texto: frase("pix") },
      { doCliente: false, hora: "10:49", texto: frase("Recebido! Nota emitida e já lancei no caixa da barbearia. Até o próximo 💈") },
    ],
  },
];

/** Quanto tempo cada passo fica no ar no autoplay. */
export const PASSO_MS = 5000;

/* ------------------------------ antes / depois ---------------------------- */
export const COMPARACAO: { antes: string; depois: string }[] = [
  { antes: "Você para o corte pra responder o WhatsApp.", depois: "Foco total na tesoura — a MAISA responde por você." },
  { antes: "Cliente esquece, não aparece — cadeira vazia.", depois: "Menos no-show: ela confirma e lembra sozinha." },
  { antes: "Agenda no caderninho ou espalhada em grupos.", depois: "Agenda sempre organizada, na palma da mão." },
  { antes: "Cliente novo é um interrogatório do zero.", depois: "Ela já sabe o corte e a preferência de cada cliente." },
  { antes: "Comercial e financeiro roubando tempo da cadeira.", depois: "Comercial focado em preencher a agenda, sozinha." },
];

/* -------------------------------- diferenciais ---------------------------- */
export const DIFERENCIAIS: { icone: "sparkle" | "target" | "link"; titulo: string; texto: Trecho[] }[] = [
  { icone: "sparkle", titulo: "Disruptiva", texto: frase("IA de ponta pra barbearia — poderosa, barata, sem precisar entender de tecnologia.") },
  { icone: "target", titulo: "Descontínua", texto: frase("Responder, agendar e lembrar o cliente enquanto você corta: antes, simplesmente impossível.") },
  { icone: "link", titulo: "Defensável", texto: frase("Seus clientes, seu histórico e sua agenda já vivem dentro da {maisa}.") },
];

/* --------------------------------- números -------------------------------- */
export const NUMEROS: [string, string][] = [
  ["+38%", "agenda mais cheia"],
  ["24/7", "respondendo no automático"],
  ["3h antes", "lembrete automático"],
  ["30 min", "e já está no ar"],
];

/* ------------------------------- prova social ----------------------------- *
 * O design usava placeholders vazios de imagem. Aqui o carrossel roda sobre as
 * mesmas fotos curadas do projeto — cenas da barbearia como ambiente, com o
 * nome do cliente na placa central. O alt descreve a foto que está lá, não o
 * atendimento (a foto é do lugar, não da pessoa nomeada).
 */
export const PROVAS: { id: string; nome: string; url: string; alt: string }[] = [
  { id: "diego", nome: "Diego", ...emLargura(imagensBarbeiros.corte, 1200) },
  { id: "rafael", nome: "Rafael", ...emLargura(imagensBarbeiros.hero, 1200) },
  { id: "bruno", nome: "Bruno", ...emLargura(imagensBarbeiros.interior, 1200) },
  { id: "caio", nome: "Caio", ...emLargura(imagensBarbeiros.cadeira, 1200) },
  { id: "leo", nome: "Léo", ...emLargura(imagensBarbeiros.fachada, 1200) },
  { id: "rui", nome: "Rui", ...emLargura(imagensBarbeiros.ruaNeon, 1200) },
];

/* ------------------------------ FAQ interativo ---------------------------- */
export const FAQ: { pergunta: Trecho[]; resposta: Trecho[] }[] = [
  {
    pergunta: frase("Preciso trocar de número de WhatsApp?"),
    resposta: frase("Não precisa! A {maisa} entra no número que você já usa com seus clientes."),
  },
  {
    pergunta: frase("Funciona pra mais de um barbeiro na equipe?"),
    resposta: frase("Funciona sim — ela organiza a agenda de cada barbeiro, tudo no mesmo WhatsApp."),
  },
  {
    pergunta: frase("Quem é o time por trás da {maisa}?"),
    resposta: frase("Somos a Poli Júnior, cuidando de cada detalhe pra sua barbearia rodar redondo."),
  },
  {
    pergunta: frase("Em quanto tempo a barbearia entra no ar?"),
    resposta: frase("Rapidinho: 30 minutos pra escanear o QR, cadastrar os serviços e já estar no ar."),
  },
];

/* --------------------------------- âncoras -------------------------------- */
export const SECOES = [
  { id: "como", label: "Como funciona" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "prova-social", label: "Prova social" },
];
