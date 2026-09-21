/* ----------------------------------------------------------------------------
 * O CATÁLOGO. Fonte única de preço, limite e CTA de plano do produto inteiro.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE (21/09/2026) ──────────────────────────────
 * Até hoje o produto tinha DUAS tabelas de preço que nunca se falaram:
 *
 *   · terapeutas  R$ 79 / R$ 197 / R$ 349   (digitados em lp/terapeutas/index.html)
 *   · barbeiros   R$ 97 / R$ 147 / R$ 197   (digitados em barbeiros/v3/dados.ts)
 *
 * Seis preços, cinco valores distintos, dois nomes de plano diferentes para a mesma
 * linha do banco — e um "R$ 147" redigitado numa TERCEIRA seção (o card da <Duelo>),
 * que tinha de ser atualizado à mão toda vez que o destaque mudasse. A LP de barbeiros
 * já carregava a cicatriz por escrito: "na v1 estes valores estavam digitados em 4
 * arquivos e já divergiam entre si".
 *
 * A causa nunca foi descuido: é que NÃO HAVIA ONDE ESCREVER O PREÇO UMA VEZ SÓ. Agora há.
 *
 * ── UMA TABELA PARA OS DOIS ICPs, E ISSO É DECISÃO DE PRODUTO ─────────────
 * Barbeiro e terapeuta compram O MESMO APP — a variação por cliente é linha no banco,
 * nunca ramo de código, e é regra escrita do projeto. Duas tabelas de preço eram a
 * promessa de dois produtos que ninguém pretende construir nem manter.
 *
 * O que VARIA por ICP é só a copy: o `resumo` (para quem é), o `cta` (o rótulo do
 * botão), a mensagem do WhatsApp e uma linha extra de especificação. Preço, limite e
 * excedente são os mesmos números nos dois mundos, porque são o mesmo produto.
 *
 * ── DE ONDE VÊM ESTES NÚMEROS ─────────────────────────────────────────────
 * Da tabela calibrada sobre o stack atual (Evolution = WhatsApp a R$ 0) e ancorada em
 * pesquisa de preço real: acima dos booking apps (R$ 76–110), no meio da faixa dos
 * peers de IA (Zaia/Belasis/Flly/Cloudia) e abaixo do topo. Margem de caixa ~40% /
 * ~35% / ~47%. Não são preços inventados para encher card — é a mesma regra que a v3
 * de barbeiros já aplicava aos dados da <Duelo>: sem origem, não entra.
 *
 * ⚠️ O EXCEDENTE É PARTE DA OFERTA, NÃO LETRA MIÚDA. Ele aparece como LINHA DO CARTÃO
 * nos dois mundos. Um limite de agendamentos sem o preço do que passa dele é a pegadinha
 * que o cliente descobre na fatura — e a página inteira se apoia em não ter pegadinha.
 *
 * ⚠️ O HTML DE TERAPEUTAS NÃO IMPORTA ESTE MÓDULO — é bundle estático, servido fora do
 * Next, e não tem como. Ele REDIGITA os mesmos números, e é por isso que existe
 * `planos.test.ts`: o teste lê o HTML como texto e reprova se um preço daqui não estiver
 * lá, ou se um preço morto continuar. A sincronia é garantida por teste, não por bom
 * comportamento — porque bom comportamento é exatamente o que falhou até hoje.
 * -------------------------------------------------------------------------- */

import { whatsappUrl, type ICP } from "./icp";

/* ─────────────────────────── os links de pagamento ───────────────────────────
 *
 * ⚠️ VAZIOS DE PROPÓSITO, EM 21/09/2026 — E É DECISÃO, NÃO PENDÊNCIA ESQUECIDA.
 *
 * Até hoje existia UM link de Stripe no projeto, cru dentro de
 * `lp/terapeutas/index.html`, no cartão do meio. Ele saiu: enquanto a tabela nova não
 * tiver preço correspondente no Stripe, aquele link cobraria o valor ANTIGO de quem
 * clicasse — o pior defeito possível numa LP, porque não quebra build, não aparece em
 * tela e só falha com o cartão na mão.
 *
 * Enquanto este mapa estiver vazio, TODO botão de plano cai no WhatsApp (ver
 * `linkPlano()`). É o caminho que de fato funciona hoje nos dois mundos, e a conversa já
 * chega com o nome do plano dentro.
 *
 * PARA LIGAR O STRIPE: criar os três preços, colar as URLs limpas aqui. Nada mais no
 * código muda — nem componente, nem CSS, nem o HTML estático (que tem o seu próprio
 * mapa, e o teste cobra os dois juntos).
 *
 * Sem `client_reference_id`: valor fixo faz todo comprador chegar com a mesma
 * referência. O vínculo com a pessoa é o e-mail da sessão do Stripe. */
export const CHECKOUT: Record<ChavePlano, string> = {
  essencial: "",
  profissional: "",
  escala: "",
};

export type ChavePlano = "essencial" | "profissional" | "escala";

/** Uma linha da tabela: rótulo à esquerda, valor à direita. É a MESMA forma nos dois
 *  mundos — rótulo e valor em colunas, e não bullet solto. Bullet compara mal: o olho
 *  não sabe se o item que falta no cartão de baixo é ausência ou esquecimento.
 *
 *  ⚠️ VALOR CURTO É REQUISITO, NÃO ESTILO. Medido em 1440: o lembrete dizia "1 por
 *  agendamento" e quebrava em duas linhas em DOIS dos três cartões de barbeiros — as
 *  linhas 4 e 5 saíam de altura entre as colunas e o olho perdia a horizontal na hora
 *  exata de comparar. Numa seção cujo trabalho é comparar, isso é o defeito. O "um por
 *  agendamento" virou frase da `nota`, que é onde cabe. Valor que não couber numa
 *  linha nos três cartões vira nota, sempre. */
export type Spec = { rotulo: string; valor: string };

export type Plano = {
  chave: ChavePlano;
  nome: string;
  preco: string;
  periodo: string;
  /** Os números do plano — iguais para os dois ICPs, porque é o mesmo produto. */
  specs: readonly Spec[];
  destaque?: boolean;
};

/* ⚠️ SE UM PREÇO MUDAR, MUDA AQUI E NO `lp/terapeutas/index.html`. São os dois únicos
 * lugares do projeto onde um preço pode estar escrito, e o `planos.test.ts` reprova se
 * eles divergirem. Nenhum outro arquivo redigita valor — o card da <Duelo> lê o plano
 * destacado daqui, e o `OFERTA.precoDe` lê o mais barato. */
export const PLANOS: readonly Plano[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    preco: "R$ 127",
    periodo: "/mês",
    specs: [
      { rotulo: "Profissionais", valor: "até 3" },
      { rotulo: "Agendamentos com IA", valor: "300/mês" },
      { rotulo: "Excedente por agendamento", valor: "R$ 0,29" },
      { rotulo: "Lembrete automático", valor: "incluído" },
      { rotulo: "Suporte", valor: "e-mail" },
    ],
  },
  {
    chave: "profissional",
    nome: "Profissional",
    preco: "R$ 197",
    periodo: "/mês",
    specs: [
      { rotulo: "Profissionais", valor: "até 10" },
      { rotulo: "Agendamentos com IA", valor: "800/mês" },
      { rotulo: "Excedente por agendamento", valor: "R$ 0,24" },
      { rotulo: "Lembrete automático", valor: "incluído" },
      { rotulo: "Suporte", valor: "WhatsApp" },
    ],
    destaque: true,
  },
  {
    chave: "escala",
    nome: "Escala",
    preco: "R$ 397",
    periodo: "/mês",
    specs: [
      { rotulo: "Profissionais", valor: "ilimitado" },
      { rotulo: "Agendamentos com IA", valor: "1.500/mês" },
      { rotulo: "Excedente por agendamento", valor: "R$ 0,19" },
      { rotulo: "Lembrete automático", valor: "incluído" },
      { rotulo: "Suporte", valor: "WhatsApp prioritário" },
    ],
  },
] as const;

/** O plano em destaque. Quem precisa dele: o card da <Duelo> (que compara O PREÇO
 *  DESTACADO com o salário de uma recepção) e qualquer copy que cite "a partir de"
 *  sem ser o piso. Função e não constante porque o destaque é um campo da tabela —
 *  mover a estrela de plano não pode exigir editar um segundo lugar. */
export function planoDestaque(): Plano {
  return PLANOS.find((p) => p.destaque) ?? PLANOS[0];
}

/** O plano mais barato — a origem do "a partir de". Primeiro da lista por convenção
 *  (a tabela é ordenada por preço), e não por `Math.min` de string. */
export function planoPiso(): Plano {
  return PLANOS[0];
}

/* ─────────────────────────── a copy, por ICP ───────────────────────────
 *
 * O ÚNICO EIXO EM QUE OS DOIS MUNDOS DIVERGEM. Preço, limite e excedente são os
 * mesmos; o que muda é para QUEM o plano é e o que o botão promete. Uma linha extra
 * de especificação também vive aqui: terapeuta compra nota fiscal, barbeiro não.
 */
export type CopiaPlano = {
  /** Uma linha dizendo para quem é. É o que faz a pessoa se reconhecer no cartão. */
  resumo: string;
  /** Rótulo do botão. Ação, nunca "Saiba mais". */
  cta: string;
};

type CopiaIcp = {
  titulo: string;
  lead: string;
  /** Linhas extras coladas ao fim das `specs`, só neste mundo. */
  extras: readonly Spec[];
  garantias: readonly string[];
  nota: string;
  planos: Record<ChavePlano, CopiaPlano>;
};

export const COPIA: Record<ICP, CopiaIcp> = {
  barbeiros: {
    titulo: "Escolha o tamanho da sua operação.",
    lead: "Todos atendem no WhatsApp que a barbearia já usa e começam a marcar horário no mesmo dia. A diferença é quantas cadeiras e quantos agendamentos cabem.",
    extras: [],
    garantias: [
      "No ar em cerca de 30 minutos",
      "Se não se pagar no primeiro mês, a gente devolve",
      "Sem fidelidade — cancele quando quiser",
    ],
    nota: "Um lembrete por agendamento, em todos os planos. A maisa atende no número que a barbearia já tem — você não troca de WhatsApp nem avisa cliente nenhum. Passou do limite do mês, você paga só o excedente; nada trava.",
    planos: {
      essencial: {
        resumo: "Pra barbearia de até três cadeiras que quer parar de perder horário.",
        cta: "Começar no Essencial",
      },
      profissional: {
        resumo: "Pra quem já tem equipe e agenda disputada o mês inteiro.",
        cta: "Ativar minha agenda",
      },
      escala: {
        resumo: "Pra rede com mais de uma unidade e time entrando e saindo.",
        cta: "Falar sobre o Escala",
      },
    },
  },
  terapeutas: {
    titulo: "Custa menos que uma sessão por mês.",
    lead: "Escolhe o plano e a maisa começa a atender no mesmo dia. A diferença é quantos terapeutas e quantos atendimentos cabem.",
    /* A linha que só existe neste mundo: a página inteira de terapeutas é sobre a
       NFS-e, e um cartão de preço que não a menciona parece esconder um adicional. */
    extras: [{ rotulo: "Nota fiscal e recibo", valor: "incluídos" }],
    garantias: [
      "No ar em cerca de 30 minutos",
      "Se não se pagar no primeiro mês, a gente devolve",
      "Sem fidelidade — cancele quando quiser",
    ],
    nota: "Um lembrete por agendamento, em todos os planos. A maisa atende no número que você já usa e emite a nota de cada sessão. Passou do limite do mês, você paga só o excedente; nada trava.",
    planos: {
      essencial: {
        resumo: "Pra quem atende sozinho e quer parar de emitir nota à mão.",
        cta: "Começar no Essencial",
      },
      profissional: {
        resumo: "Agenda cheia, mês fechado em um clique e relatório pro contador.",
        cta: "Ativar a maisa",
      },
      escala: {
        resumo: "Pra clínica com vários terapeutas na mesma sala.",
        cta: "Falar sobre o Escala",
      },
    },
  },
};

/** As `specs` do plano já com a linha extra do mundo, na ordem em que o cartão mostra. */
export function specsDoPlano(plano: Plano, icp: ICP): readonly Spec[] {
  return [...plano.specs, ...COPIA[icp].extras];
}

/** A mensagem do WhatsApp por plano e por mundo — a conversa já começa no contexto
 *  certo, em vez de três botões abrindo a mesma frase genérica.
 *
 *  ⚠️ O NÚMERO NÃO É DIGITADO AQUI. Vem do `whatsappUrl` de `./icp.ts`, que se declara
 *  fonte única do CTA de WhatsApp das landing pages e é módulo puro de propósito, para
 *  Server Components poderem importá-lo. Redigitar um telefone seria repetir com o
 *  número o defeito que este arquivo acabou de consertar com os preços. */
export function mensagemPlano(plano: Plano, icp: ICP): string {
  const quem = icp === "barbeiros" ? "Tenho uma barbearia" : "Sou terapeuta";
  return whatsappUrl(
    `Oi! ${quem} e quero ativar a maisa no plano ${plano.nome} (${plano.preco}/mês). Como começo?`,
  );
}

/** Para onde o botão de um plano aponta: Stripe quando houver link, WhatsApp enquanto
 *  não houver. Ver a nota do `CHECKOUT`. A página nunca fica com botão morto. */
export function linkPlano(plano: Plano, icp: ICP): { href: string; externo: boolean } {
  const url = CHECKOUT[plano.chave];
  return url ? { href: url, externo: false } : { href: mensagemPlano(plano, icp), externo: true };
}
