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
} as const;

/** O rótulo do único botão da dobra. Ação, não navegação: "Ativar" descreve o que
 *  acontece do outro lado; "Saiba mais" descreveria o que acontece com o mouse. */
export const CTA_ROTULO = "Ativar minha agenda";

/* ─────────────────────────── a frase do miolo ─────────────────────────── */

/** A frase que fica no OCO da roda de rostos (ver Roda.tsx).
 *
 *  `{maisa}` é o marcador que o `frase()` abaixo abre no wordmark. Escrever
 *  "maisa" cru aqui daria mais uma grafia da marca no projeto e a cor pararia de
 *  vir de `--mk-wordmark` — o token que qualquer superfície de cor sob a manchete
 *  precisa poder inverter. (Este comentário dizia "a faixa dourada do fechamento";
 *  o fechamento saiu em 06/08/2026 e a razão é a mesma sem ele.)
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

/* ─────────────────────────── a seção das telas ───────────────────────────
 *
 * TODO TEXTO AQUI DESCREVE UMA FOTO, e essa restrição é de propósito. As três
 * imagens são capturas do app rodando (`scripts/captura-telas.mjs`), então a
 * frase ao lado de cada uma pode ser conferida contra o pixel por quem duvidar —
 * é a diferença entre "ela remarca sozinha" (promessa) e "ele quis remarcar, ela
 * já ofereceu outro horário" (legenda do que está na tela).
 *
 * ⚠️ ISSO NÃO É PEDANTISMO, É A REGRA DA CASA APLICADA. A copy de marketing do
 * projeto vende coisas que este repositório não implementa: não há integração com
 * WhatsApp (todo "WhatsApp" no produto é um link `wa.me` que abre o app com a
 * mensagem digitada, faltando apertar enviar — `src/lib/detalhe.tsx:574`), não há
 * modelo de IA, não há cron de lembrete. O README do produto diz, na linha 6:
 * "Protótipo visual (Next.js 14), sem backend: todos os dados são mockados". Se o
 * motor de verdade mora no outro repositório da MAISA, ótimo; mas ESTA página não
 * pode afirmar o que ESTAS fotos não mostram. Legenda de foto sempre pode.
 *
 * (E há uma contradição de copy pendente no projeto, que esta seção evita de
 * propósito por não falar de lembrete: `RecursosBarbeiros.tsx:86` promete o
 * lembrete "no dia anterior" e `completa/dados.ts:89` promete "3h antes".) */

export const TELAS_TITULO = "Foi assim que eles marcaram.";

export const TELAS_LEAD =
  "Chega mensagem no WhatsApp da barbearia, ela responde, o horário entra na agenda. Você descobre quando abre o app e o dia já está montado.";

export type Tela = {
  /** O arquivo em `public/telas/`. Refeito por `scripts/captura-telas.mjs`. */
  src: string;
  /** A legenda do passo, à esquerda. Descreve o que está NA foto. */
  passo: string;
  /** A pílula sobre a foto — três palavras, o rótulo do momento. */
  rotulo: string;
  /** `alt` da imagem: o que um leitor de tela precisa saber que a foto mostra. */
  alt: string;
};

export const TELAS: readonly Tela[] = [
  {
    src: "/telas/v3-conversa.png",
    passo: "Ele quis remarcar às 10h31. Ela já devolveu horário.",
    rotulo: "ela resolve",
    alt: "Conversa do app: o cliente avisa que surgiu uma reunião e quer remarcar; a MAISA responde oferecendo outro horário, com os atalhos “Ver quinta às 10h”, “Oferecer 14h” e “Manter 13:30” à mão.",
  },
  {
    src: "/telas/v3-faq.png",
    passo: "“Vocês abrem no feriado?” — respondido sem você ver.",
    rotulo: "ela responde",
    alt: "Conversa do app: o cliente pergunta se a barbearia abre no feriado e a MAISA responde que abre das 9h às 14h, e emenda perguntando se ele quer marcar um horário.",
  },
  {
    src: "/telas/v3-agenda.png",
    passo: "O dia chega montado — e quem falta confirmar fica em laranja.",
    rotulo: "o dia pronto",
    alt: "Agenda do app no dia: seis atendimentos das 9h às 16h, com serviço e duração em cada um, e o das 13h30 destacado em laranja com a etiqueta “a confirmar”.",
  },
] as const;

/* ─────────────────────────── o risco, uma vez só ───────────────────────────
 *
 * O traço desenhado à mão, verbatim do `lp/terapeutas/scroll-stroke.js`. Estava
 * digitado dentro do Telas.tsx; subiu para cá em 07/08/2026 quando a <Duelo>
 * passou a desenhá-lo também.
 *
 * ELE NÃO É COPIADO, É IMPORTADO — e essa é a mesma decisão que o Telas.tsx já
 * tinha tomado quando pegou o `d` da LP de terapeutas em vez de rabiscar um novo:
 * "redesenhá-lo à mão daria um segundo rabisco quase igual no projeto". Dois
 * `d` quase iguais em dois arquivos teriam o mesmo defeito, com o agravante de
 * divergirem no dia em que alguém ajustasse um só.
 *
 * O comprimento real do caminho é 1660,542 unidades do viewBox 600×440 — anotado
 * porque `pathLength="1"` no markup o esconde, e quem for medir stroke-dasharray
 * na mão vai precisar dele. */
export const RISCO_D =
  "M42 322 C 26 150, 214 62, 368 96 C 520 128, 566 292, 424 352 C 286 410, 84 372, 66 236 C 50 104, 226 36, 372 70";

/* ─────────────────────── o risco horizontal, só da <Duelo> ───────────────────
 *
 * UM TRAÇO NOVO, e não o `RISCO_D` esticado — que foi a primeira tentativa, em
 * 07/08/2026, e é a razão deste `d` existir.
 *
 * O `RISCO_D` é um LAÇO: a tinta está na borda e o meio é vazio. Esticá-lo na
 * horizontal não produz uma linha horizontal, produz o miolo vazio do laço com dois
 * cotocos amarelos entrando pelos cantos — o defeito que já estava anotado na media
 * query do celular deste mesmo arquivo. Um laço não vira linha mudando de tamanho;
 * é outro gesto, então é outro `d`. (A regra "não copiar o traço, importar" do bloco
 * acima continua valendo para quem quiser O LAÇO. Ela nunca disse que a página só
 * pode ter um gesto.)
 *
 * E ELE RESOLVE O QUE O LAÇO NÃO RESOLVIA: sendo aberto e horizontal, qualquer
 * pedaço dele ainda lê como "uma linha atravessando". Por isso o SVG pode ter
 * largura fixa em px e transbordar a tela à vontade — no celular sobra o terço do
 * meio, e o terço do meio de uma linha ainda é uma linha. Foi isso que permitiu
 * apagar as duas correções de largura/espessura que o laço exigia por breakpoint.
 *
 * ── COMO ELE É DESENHADO ──
 * viewBox 1600×96 — proporção 16,7:1, deliberadamente extrema: é o que garante que
 * a ondulação leia como imperfeição de mão e não como onda. Três cúbicas com os
 * pontos de controle quase colineares nas junções (em x=520 o ideal seria 692,34 e
 * está 700,33; em x=1046 seria 1220,36 e está 1214,37), então as emendas não fazem
 * bico. O y sai em 62 e chega em 44: a linha SOBE de leve, porque traço de régua não
 * combina com o resto da página.
 *
 * A amplitude vertical é ~±11 unidades de 1600 de largura. Não aumentar: o pedido
 * era "muito mais horizontal, somente uma linha". Mais amplitude devolve a onda. */
export const RISCO_H =
  "M 6 62 C 176 34, 348 78, 520 56 C 700 33, 872 80, 1046 58 C 1214 37, 1392 74, 1594 44";

/* ─────────────────────────── o duelo ───────────────────────────
 *
 * A terceira seção: o custo de contratar alguém contra o custo da assinatura.
 * Inspirada na seção "Humano vs. Inteligência Artificial" de maisasecretary.com.br.
 *
 * ⚠️ O NÚMERO DO LADO HUMANO TEM FONTE, E ISSO NÃO É DETALHE — É O QUE PERMITE A
 * SEÇÃO EXISTIR. A referência mostra "R$ 3.500/mês + encargos trabalhistas" sem
 * origem nenhuma. Esse número não entrou aqui, e a regra que o barrou é a mesma do
 * cabeçalho deste arquivo: dado sem origem verificável não entra, nem que sobre
 * espaço no layout. Foi ela que matou os "+38% agenda mais cheia" da v1.
 *
 * O que entrou no lugar: R$ 1.857,92 — a média nacional CLT do CBO 4221-05
 * (recepcionista), apurada sobre 658.305 vínculos dos últimos 12 meses no CAGED,
 * publicada em salario.com.br. Arredondado para R$ 1.858 na tela.
 *
 * A DIFERENÇA ANUAL É ARITMÉTICA DOS DOIS NÚMEROS QUE ESTÃO NA TELA, de propósito:
 * (1.858 − 97) × 12 = 21.132. Quem duvidar refaz a conta com o que está vendo, sem
 * precisar confiar em nós. É por isso que ela usa o valor arredondado e não o
 * centavo: uma "economia" de R$ 21.131 que não fecha com os preços exibidos parece
 * número inventado mesmo sendo mais exato.
 *
 * E É POR ISSO QUE O TEXTO DIZ "só no salário". Encargos, 13º e férias EXISTEM e
 * estão escritos na nota do card — mas o multiplicador que os converteria em reais
 * (1,4? 1,7? depende de Simples, sindicato e rotatividade) seria derivação nossa,
 * não fonte. Então ele aparece como fato qualitativo, nunca somado à conta. */

export const DUELO_TITULO = "Ou você contrata alguém.";

export const DUELO_LEAD =
  "As duas fazem a mesma coisa: atender no WhatsApp e marcar horário. Uma delas tira férias.";

export type Lado = {
  chave: "humano" | "maisa";
  /** Rótulo micro, caixa alta. Nenhum dos dois contém a palavra "maisa" — a marca
   *  não sobrevive a `text-transform: uppercase`, que é regra do DS. */
  rotulo: string;
  /** O nome do lado. `{maisa}` abre no wordmark via `frase()`. */
  nome: string;
  preco: string;
  periodo: string;
  /** A letra miúda embaixo do preço. */
  nota: string;
  itens: readonly string[];
};

export const DUELO_LADOS: readonly Lado[] = [
  {
    chave: "humano",
    rotulo: "CONTRATAÇÃO CLT",
    nome: "Alguém na recepção",
    preco: "R$ 1.858",
    periodo: "/mês",
    nota: "+ 13º, férias e encargos",
    /* Quatro fatos sobre um vínculo CLT, não quatro defeitos de uma pessoa. O tom
       importa: o leitor É dono de barbearia e provavelmente já foi funcionário. */
    itens: [
      "Atende nas horas que você paga",
      "Uma conversa por vez",
      "Falta, folga e tira férias",
      "Pede as contas, e você treina outro",
    ],
  },
  {
    chave: "maisa",
    rotulo: "ASSINATURA MENSAL",
    nome: "A {maisa}",
    preco: "R$ 97",
    periodo: "/mês",
    nota: "sem fidelidade, cancela quando quiser",
    /* Paralelos um a um com a lista de cima, na mesma ordem. É o paralelismo que
       faz a comparação funcionar sem uma tabela — o olho emparelha as linhas
       sozinho, e nenhum dos dois cards precisa repetir o critério. */
    itens: [
      "Responde a qualquer hora, todo dia",
      "Quantas conversas chegarem juntas",
      "Não falta, não folga, não sai de férias",
      "Já sabe sua agenda no primeiro dia",
    ],
  },
] as const;

/** A tira no pé do card da maisa. Ver a nota sobre aritmética acima. */
export const DUELO_SALDO = {
  valor: "R$ 21.132",
  texto: "de diferença por ano — só no salário.",
} as const;

/** A fonte, impressa na própria seção. Uma seção que afirma um número sobre o
 *  bolso de quem lê e esconde de onde ele veio é a mesma coisa que a v1 fazia. */
export const DUELO_FONTE = {
  texto:
    "Média nacional CLT de recepcionista (CBO 4221-05), sobre 658.305 vínculos nos últimos 12 meses.",
  veiculo: "salario.com.br, com dados do CAGED",
  href: "https://www.salario.com.br/profissao/recepcionista-cbo-422105/",
} as const;

/* ─────────────────────────── util de wordmark ─────────────────────────── */

export type Trecho = { t: string; marca: boolean };

/** Parte um texto nos pontos onde `{maisa}` aparece, para o componente Maisa
 *  renderizar o wordmark no meio da frase sem quebrar a linha de base. */
export function frase(texto: string): Trecho[] {
  return texto
    .split(/(\{maisa\})/g)
    .filter(Boolean)
    .map((t) =>
      t === "{maisa}" ? { t: "maisa", marca: true } : { t, marca: false },
    );
}
