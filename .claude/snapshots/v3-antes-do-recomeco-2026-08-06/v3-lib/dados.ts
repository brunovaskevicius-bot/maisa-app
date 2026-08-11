/* ----------------------------------------------------------------------------
 * Dados da v3 de barbeiros. Por enquanto: só a dobra.
 *
 * ARQUIVO NOVO, NÃO UM FORK DA v2. A v2 (/barbeiros/completa/v2) continua no
 * disco e continua servindo, mas deixou de ser a base — nada aqui importa nada
 * de lá, de propósito. O que sobrevive dela é o que era verdade antes dela: a
 * oferta (que tem origem verificável) e o jeito de escrever a marca.
 *
 * A REGRA QUE FICA DA v1 PARA CÁ: se um dado não tem origem verificável, ele não
 * entra — nem que sobre espaço no layout. Foi ela que matou os "+38% agenda mais
 * cheia" e os seis clientes fabricados da v1.
 * -------------------------------------------------------------------------- */

/** A oferta. Fonte única — na v1 estes valores estavam digitados em 4 arquivos e
 *  já divergiam entre si. Existe plano de R$ 197 no catálogo (PlanosBarbeiros.tsx),
 *  então "a partir de" não é hedge de marketing, é o preço mais baixo real. */
export const OFERTA = {
  precoDe: "R$ 97",
  precoPor: "/mês",
  fidelidade: "sem fidelidade",
  garantia: "Se no primeiro mês ela não se pagar, a gente devolve.",
  /** VERBATIM de PlanosBarbeiros.tsx, GARANTIAS[0]. Não existia aqui porque nada na
   *  v3 falava de prazo — o fecho fala. O "cerca de" NÃO é hedge de marketing: é o
   *  que o catálogo escreve, e encurtar para "30 minutos" endureceria uma promessa
   *  que a operação deixou de propósito com folga. */
  setup: "No ar em cerca de 30 minutos",
} as const;

/* ══════════════════════════ FECHO — preço + CTA ══════════════════════════
 *
 * O TERCEIRO ATO, e ele estava PROMETIDO no código antes de existir: o cabeçalho da
 * Dobra.tsx diz, com estas palavras, que não há linha de preço na dobra porque "preço
 * na dobra é argumento de fechamento, não de abertura". Este é o fechamento.
 *
 * MEDIDO ANTES (auditoria de 06/08/2026): a página tinha UM botão, a 557px do topo, e
 * terminava numa nota de 12,8px. Nenhum alvo de conversão no ato 2 inteiro.
 *
 * NADA AQUI É NOVO — cada linha é catálogo, com a origem ao lado, que é a regra deste
 * arquivo. Três coisas que um bloco de preço costuma trazer e que NÃO EXISTEM NO REPO,
 * por isso não estão aqui: teste grátis, número de barbearias atendidas e desconto
 * anual. É a mesma regra que matou os "+38% agenda mais cheia" da v1.
 *
 * ⚠️ PENDÊNCIA REAL, NÃO ESQUECIDA: PlanosBarbeiros.tsx fecha com "Preços de
 * lançamento. Fale no WhatsApp para o valor atual". O fecho publica R$ 97 SEM essa
 * ressalva. Hoje as duas páginas concordam (as duas dizem R$ 97), mas no dia em que o
 * preço subir o catálogo se corrige sozinho e este bloco NÃO. Decidir com o cliente:
 * ou o selo ganha a ressalva, ou o preço vira "a partir de" sem número. */
export const FECHO = {
  /** Diz QUAL preço é este. São três planos no catálogo (97 / 147 / 197) e o de 97 é
   *  o de entrada; sem esta linha "R$ 97" leria como preço único e a página de destino
   *  desmentiria a LP no primeiro scroll. */
  rotulo: "O PLANO DE ENTRADA",
  /** Escrita do zero, como a manchete da batida A: descreve o que o catálogo promete,
   *  não cita. O "hoje" é PlanosBarbeiros.tsx ("começam a confirmar cliente no mesmo
   *  dia") somado a GARANTIAS[0] — e essa segunda frase aparece na MESMA TELA, em
   *  corpo normal, poucas linhas abaixo: a letra gigante nunca é o único portador da
   *  informação. Duas linhas à mão, mesma razão de ATO2.a.titulo. */
  titulo: ["Ela começa", "a atender hoje."],
  /** VERBATIM de PlanosBarbeiros.tsx, os quatro itens do Essencial na ordem do
   *  catálogo. É o que R$ 97 compra, nem uma palavra a mais. É CÓPIA, não referência:
   *  importar PlanosBarbeiros aqui puxaria um componente "use client" inteiro. Se o
   *  catálogo mudar, esta lista mente. */
  inclui: [
    "Agenda pelo WhatsApp",
    "Confirmação automática",
    "Lembrete anti no-show",
    "Painel de horários",
  ],
  /** Na ordem em que quebram objeção: quanto demora, o que acontece se não der certo,
   *  e se prende. [0] e [1] saem de OFERTA (fonte única); [2] é VERBATIM de
   *  GARANTIAS[2] — a forma longa, e não `OFERTA.fidelidade` ("sem fidelidade"),
   *  porque numa lista o leitor precisa da consequência, não do rótulo jurídico. */
  selos: [OFERTA.setup, OFERTA.garantia, "Sem fidelidade — cancele quando quiser"],
} as const;

/** O rótulo do único botão da dobra. Ação, não navegação: "Ativar" descreve o que
 *  acontece do outro lado; "Saiba mais" descreveria o que acontece com o mouse. */
export const CTA_ROTULO = "Ativar minha agenda";

/* ─────────────────────────── a frase do miolo ─────────────────────────── */

/** A frase que fica no OCO da roda de rostos (ver Roda.tsx).
 *
 *  `{maisa}` é o marcador que o `frase()` abaixo abre no wordmark. Escrever
 *  "maisa" cru aqui daria mais uma grafia da marca no projeto e a cor pararia de
 *  vir de `--mk-wordmark` — que é o token que a faixa dourada do fechamento
 *  precisa inverter.
 *
 *  ⚠️ ESTA LINHA AFIRMA UM FATO SOBRE PESSOAS DE BANCO DE IMAGEM. Os rostos que
 *  giram em volta são de gente real e identificável que nunca ouviu falar da
 *  marca; a licença do Unsplash cobre o uso comercial da FOTO, não torna a FRASE
 *  verdadeira. É a mesma linha que a v1 cruzou (seis "clientes" fabricados sob
 *  "Atendido ontem") e que a reforma seguinte existiu para desfazer.
 *
 *  Foi pedida assim, duas vezes, e está publicada assim. O conserto, se um dia
 *  quiser, é trocar o fato inventado por um condicional que continua sendo perda
 *  — mesma força, sem alegação, e sem pedir foto nem layout novo:
 *      "Todos esses podiam estar marcados com a {maisa}. Você não quer perder eles."
 */
/*  DUAS ENTRADAS, UMA POR FRASE, e não uma string só com um ponto no meio.
 *  Num parágrafo único o `text-wrap: balance` otimiza o COMPRIMENTO das linhas e
 *  não o sentido: numa caixa de 287px ele quebrava em
 *      "Todos esses foram / marcados com a / maisa. Você não / quer perder eles."
 *  — que separa o artigo do substantivo ("com a" numa linha, "maisa." na
 *  seguinte) e ainda cola o fim de uma frase no começo de outra. Cada frase no
 *  próprio bloco continua quebrando internamente conforme a viewport, mas nunca
 *  invade a vizinha. */
export const FRASE_RODA = [
  "Todos esses foram marcados com a {maisa}.",
  "Você não quer perder eles.",
] as const;

/* ══════════════════════════ ATO 2 — "um sai da fila" ══════════════════════════
 *
 * COPIADO de completa-v2/dados.ts, nunca importado. O cabeçalho deste arquivo diz
 * que a v3 não importa nada da v2, e isso é contrato e não estilo: a v2 continua
 * servindo numa rota própria e precisa poder mudar sem derrubar esta.
 *
 * A ORIGEM DE CADA AFIRMAÇÃO ESTÁ ESCRITA AO LADO DELA. Não é zelo decorativo — é
 * o que impede a v1 de acontecer de novo. Lá, oito conteúdos foram inventados para
 * caber em oito seções, e o que os denunciou foi justamente não haver de onde
 * vieram. Uma linha acrescentada aqui sem a anotação de origem é suspeita por
 * construção.
 *
 * ⚠️ ONDE O TEXTO PUBLICADO NÃO É LITERAL. Este aviso já esteve errado: ele dizia
 * que o "SEXTA-FEIRA" era o único desvio, o que faria alguém revisar o
 * microrrótulo e passar batido justamente pelas duas linhas que divergiam da
 * fonte. Um aviso de honestidade que subestima o próprio desvio é pior que aviso
 * nenhum, porque compra confiança que não sustenta. A lista completa:
 *   · `a.rotulo` — "SEXTA-FEIRA" expande o "Sexta" do fio. Expansão, não fato novo.
 *   · `a.titulo` — escrito do zero. Não é citação: descreve o que o fio demonstra.
 *   · `a.corpo` — verbatim COM DUAS normalizações: "4" → "quatro" por extenso, e o
 *     "+" de "máquina 1 + barba na navalha" virou vírgula.
 *   · `b.respostas[1]` — quase-verbatim; reordena a lista da fonte numa frase.
 *   · `b.respostas[2]` — compõe duas fontes numa linha só.
 * O resto é verbatim de verdade, e está marcado como tal linha a linha. */

/** As duas batidas. Cada uma é uma afirmação verificável, e elas são OPOSTAS de
 *  propósito: a primeira diz que ela LEMBRA, a segunda diz que ela PARA. Vender só
 *  a primeira é o que faz um dono de barbearia desconfiar — ele já comprou
 *  automação que prometeu autonomia e devolveu retrabalho. */
export const ATO2 = {
  a: {
    /* FIO[2] em completa-v2/dados.ts: marco `dia: "Sexta"`, primeiro turno 09:40 */
    rotulo: "SEXTA-FEIRA · 09:40",
    /* Descreve o comportamento demonstrado no fio: o cliente escreve "o de sempre"
       e ela devolve o corte exato. Sentence case — o DS só autoriza caixa alta em
       rótulo micro. Duas linhas escritas à mão porque `text-wrap: balance` num
       display de 112px quebra pelo comprimento, não pelo sentido. */
    titulo: ["Ele não precisou", "dizer o corte."],
    /* Verbatim dos turnos 09:40 do FIO[2]. O "4" virou "quatro" por extenso:
       algarismo isolado no meio de um corpo lê como estatística, e não há
       estatística nenhuma aqui. */
    corpo:
      "Ele escreveu “quero marcar o de sempre”. A {maisa} já sabia qual era: degradê na máquina 1, barba na navalha, com o Diego — igual das últimas quatro vezes.",
  },
  b: {
    /* FIO[2].nota: "…quando a decisão não é dela, ela para e te chama — este é o
       limite dela, escrito por ela." */
    rotulo: "QUANDO A DECISÃO NÃO É DELA",
    /* VERBATIM do FIO[2], turno voz:"maisa", 09:41. Não parafrasear: o valor da
       linha é ser exatamente o que a assistente diz. */
    fala: "Desconto quem decide é o Diego, não eu. Vou chamar ele aqui.",
    respostas: [
      /* Verbatim de completa-v2/dados.ts:109 (PERGUNTAS[1]).
         ⚠️ A CADEIA DE CUSTÓDIA PARA AQUI, e isto é o oposto do que este comentário
         dizia antes: ele citava "FaqBarbeiros.tsx:30" como origem, e lá a resposta é
         outra — "Ao contrário. Você vê tudo num painel e ajusta quando quiser. A
         MAISA tira o trabalho manual; a decisão continua sua." O que veio do FAQ foi
         a PERGUNTA; a resposta nasceu na reescrita da v2. Ou seja: esta é a
         afirmação mais forte da batida B (a maisa é incapaz de oferecer horário que
         você não abriu) e ela não tem confirmação de engenharia dentro do repo.
         Vale confirmar com o time antes de publicar de verdade.
         O "como disponíveis" NÃO PODE CAIR: sem ele, "os profissionais que você
         marcou" lê como "os profissionais que você agendou" — nesta mesma página
         "marcar" é o verbo de agendar ("Todos esses foram marcados com a maisa") —,
         e a garantia de escopo desaparece justamente na linha que existe para dá-la. */
      "Ela só oferece os horários que você abriu, com os profissionais que você marcou como disponíveis.",
      /* quase-verbatim de PERGUNTAS[0]: "…(desconto, encaixe fora do horário, caso
         estranho), ela para e te chama sozinha." */
      "Desconto, encaixe fora do horário e caso estranho param nela e caem no seu WhatsApp.",
      /* PERGUNTAS[2] ("Você cancela. Não tem fidelidade") + PlanosBarbeiros.tsx:80
         ("Sem fidelidade — cancele quando quiser").
         ⚠️ "PAUSAR" SAIU DAQUI, e a distinção não é preciosismo. A linha dizia "você
         pausa ou cancela quando quiser", apoiada em PERGUNTAS[1] — mas lá o que se
         pausa é A ASSISTENTE ("desmarca, remarca ou pausa ela"), controle de
         produto. Entre "sem fidelidade" e "cancela", respondendo "e se não der
         certo", "pausa" vira vocabulário de contrato e promete suspender a
         mensalidade. Isso não existe no catálogo: as GARANTIAS de
         PlanosBarbeiros.tsx só oferecem cancelar. Era o único item do ATO2 que
         afirmava algo que nenhuma fonte diz.
         SEM PREÇO: a página já decidiu que preço é argumento de fechamento, e o que
         falta aqui é prova de escopo. */
      "E se não der certo: sem fidelidade, você cancela quando quiser.",
    ],
  },
  /* ROTULO_FIO, de completa-v2/dados.ts. VEM DEPOIS das falas, e a ordem é o
     argumento: dizer "isto não aconteceu" antes de ler a coisa cuja força é ter
     acontecido desarma a própria peça.
     ISTO É ESTRUTURAL, NÃO RODAPÉ. Sem esta nota a manchete passa a afirmar algo
     sobre uma pessoa que não existe — a mesma linha que a v1 cruzou com seis
     clientes fabricados. Se não couber a nota, não cabe a manchete. */
  nota: {
    rotulo: "FIO DE DEMONSTRAÇÃO",
    /* "E AS PESSOAS FOTOGRAFADAS" NÃO ESTAVA NO ORIGINAL, e a falta era grave.
       O ROTULO_FIO da v2 foi escrito para uma seção que era só balão de texto: por
       isso ele enumera "a barbearia e os nomes" e para aí. A v3 acrescentou o que a
       v2 não tinha — a foto de uma pessoa real e identificável, colada em "Ele não
       precisou dizer o corte" e "Ele escreveu 'quero marcar o de sempre'". Ou seja,
       uma ação inventada atribuída a um rosto que existe.
       É o mesmo padrão que o cabeçalho deste arquivo diz ter matado na v1 (seis
       clientes fabricados sob "Atendido ontem"), reaparecendo por uma porta que o
       rótulo herdado não cobria. */
    texto:
      "A barbearia, os nomes e as pessoas fotografadas são ilustrativos; as respostas, os horários e o limite dela não.",
  },
} as const;

/* ─────────────────────────── util de wordmark ─────────────────────────── */

export type Trecho = { t: string; marca: boolean };

/** Parte um texto nos pontos onde `{maisa}` aparece, para o componente Maisa
 *  renderizar o wordmark no meio da frase sem quebrar a linha de base. */
export function frase(texto: string): Trecho[] {
  return texto
    .split(/(\{maisa\})/g)
    .filter(Boolean)
    .map((t) => (t === "{maisa}" ? { t: "maisa", marca: true } : { t, marca: false }));
}
