/* ----------------------------------------------------------------------------
 * Dados da v3 de barbeiros: dobra, telas, duelo e planos.
 *
 * ARQUIVO NOVO, NÃO UM FORK DA v2. A v2 (/barbeiros/completa/v2) continua no
 * disco e continua servindo, mas deixou de ser a base — nada aqui importa nada
 * de lá, de propósito. O que sobrevive dela é o que era verdade antes dela: a
 * oferta (que tem origem verificável) e o jeito de escrever a marca.
 *
 * A REGRA QUE FICA DA v1 PARA CÁ: se um dado não tem origem verificável, ele não
 * entra — nem que sobre espaço no layout. Foi ela que matou os "+38% agenda mais
 * cheia" e os seis clientes fabricados da v1.
 *
 * ⚠️ "NÃO IMPORTA NADA DE LÁ" VALE PARA AS OUTRAS LPs, NÃO PARA A INFRA COMPARTILHADA.
 * O `whatsappUrl` abaixo vem de `_lib/icp.ts`, que é a fonte única do número da MAISA
 * para as 6 landing pages e é módulo puro justamente para Server Components o
 * importarem. É a mesma distinção que já valia para o `<World>`, importado por todas.
 * Redigitar um telefone aqui seria repetir com o número o erro que a v1 cometeu com os
 * preços: quatro cópias que já divergiam entre si.
 * -------------------------------------------------------------------------- */

import { whatsappUrl } from "../../icp";

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

/** A manchete da dobra, centrada acima da fila de rostos (ver Fileira.tsx).
 *
 *  Chamava-se `FRASE_RODA` e morava no OCO de um anel de 64 rostos. A roda saiu em
 *  07/08/2026 e o nome foi junto — o "esses" da frase agora aponta para a fila no
 *  pé da dobra, que é o mesmo referente em outro arranjo.
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
export const FRASE_DOBRA = [
  "Todos esses foram marcados com a {maisa}.",
  "Você não quer perder eles.",
] as const;

/* ─────────────────────────── a seção das telas ───────────────────────────
 *
 * ⚠️ EM 07/08/2026 ESTA SEÇÃO MUDOU DE NATUREZA, E ISSO PRECISA ESTAR ESCRITO.
 * Até hoje as três peças eram CAPTURAS do app rodando (`scripts/captura-telas.mjs`)
 * e a disciplina era "toda frase aqui descreve uma foto" — conferível contra o
 * pixel por quem duvidasse. As capturas saíram a pedido: o celular passou a mostrar
 * a CONVERSA no WhatsApp, porque a tela do painel não explicava ao barbeiro pelo
 * que ele estava pagando. O diagnóstico estava certo. O custo vem abaixo.
 *
 * O QUE ISSO CUSTA, SEM MAQUIAGEM. As conversas deste arquivo são ESCRITAS, não
 * capturadas. Este repositório NÃO tem integração com WhatsApp (todo "WhatsApp" no
 * produto é um link `wa.me` que abre o app com a mensagem digitada, faltando apertar
 * enviar — `src/lib/detalhe.tsx:574`), não tem modelo de IA e não tem cron de
 * lembrete; o README do produto diz, na linha 6: "Protótipo visual (Next.js 14),
 * sem backend: todos os dados são mockados". Ou seja: a peça deixou de ser PROVA e
 * virou ILUSTRAÇÃO. Se o motor de verdade mora no outro repositório da MAISA, a
 * ilustração é honesta e o problema é só de rastreabilidade. Se não mora, esta seção
 * está desenhando o que não existe — e essa é decisão de quem assina a oferta, não
 * do CSS. O arquivo não pode tomá-la; pode se recusar a escondê-la, e é o que faz.
 *
 * O QUE FOI PRESERVADO DA REGRA ANTIGA: cada `passo` continua sendo LEGENDA do que
 * está no celular ao lado, nunca promessa sobre o sistema. "Ele perguntou 9h12, foi
 * respondido 9h12" é conferível contra a peça; "ela responde sozinha 24h por dia"
 * não seria — e por isso não está escrito em lugar nenhum aqui. É a única parte da
 * disciplina antiga que sobreviveu à troca, e é a que mais importa.
 *
 * ⚠️ NENHUMA DAS TRÊS CONVERSAS FALA DE LEMBRETE, e isso é deliberado. Há uma
 * contradição de copy pendente no projeto: `RecursosBarbeiros.tsx:86` promete o
 * lembrete "no dia anterior" e `completa/dados.ts:89` promete "3h antes". Escrever
 * um horário de lembrete aqui criaria a TERCEIRA versão do mesmo prazo, num arquivo
 * que ninguém lembraria de conferir no dia em que as outras duas fossem alinhadas. A
 * palavra "confirmado" aparece, mas só como fecho da própria conversa — fechar um
 * agendamento na hora não promete cron nenhum. */

export const TELAS_TITULO = "Foi assim que eles marcaram.";

export const TELAS_LEAD =
  "Tudo isso aconteceu no WhatsApp da barbearia, no número que ela já tinha. Você descobre quando abre o app e o dia já está montado.";

/** Quem falou. `ela` é a maisa, no balão cinza da esquerda; `ele` é o cliente, no
 *  balão verde da direita, com tique duplo.
 *
 *  A DIREÇÃO É A DO CELULAR DO CLIENTE, e não a do barbeiro — o aparelho desenhado
 *  é o dele. Trocar os lados desenharia um WhatsApp que não existe, e qualquer um
 *  que já usou o app veria o erro em meio segundo, mesmo sem saber nomear. */
export type Balao = {
  de: "ela" | "ele";
  txt: string;
  hora: string;
};

export type Conversa = {
  /** O relógio da barra de status. Vale o horário da ÚLTIMA mensagem: uma barra
   *  marcando 9h13 embaixo de um fio que termina 10h33 é o tipo de furo que ninguém
   *  sabe apontar mas todo mundo sente como "montado". */
  relogio: string;
  /** O divisor de data no topo do fio. */
  dia: string;
  baloes: readonly Balao[];
};

export type Tela = {
  /** A conversa desenhada dentro do aparelho. Ver <Zap>. */
  conversa: Conversa;
  /** A legenda do passo, à esquerda. Descreve o que está NA conversa — os horários
   *  aqui têm de bater com os dos balões, que é o que a torna conferível. */
  passo: string;
  /** A pílula sob o celular — o rótulo do momento, em três palavras. */
  rotulo: string;
};

export const TELAS: readonly Tela[] = [
  /* A ORDEM É UMA ESCADA, não a antiga (que era a ordem em que as capturas ficaram
     prontas). Responder é o que ela faz o dia inteiro e não dá dinheiro; agendar é
     o que dá; remarcar é o que SALVA o que já estava dado. Quem chega no terceiro
     celular já viu o dinheiro entrar e agora vê ele não escapar. */
  {
    passo: "Ele perguntou do feriado às 9h12. Foi respondido 9h12.",
    rotulo: "ela responde",
    conversa: {
      relogio: "9:13",
      dia: "HOJE",
      baloes: [
        { de: "ele", txt: "Vocês abrem no feriado?", hora: "09:12" },
        {
          de: "ela",
          txt: "Abrimos sim! No feriado o atendimento vai das 9h às 14h.",
          hora: "09:12",
        },
        {
          de: "ela",
          txt: "Quer que eu veja um horário pra você?",
          hora: "09:12",
        },
        { de: "ele", txt: "Depois eu vejo, valeu", hora: "09:13" },
        /* O FIO FECHA SEM VENDA, e isso é escolha. Esta é a conversa que mostra o
           trabalho que não dá dinheiro — a que hoje interrompe o corte. Fechá-la
           num agendamento faria as três conversas serem a mesma conversa. */
        {
          de: "ela",
          txt: "Tranquilo 👊 É só chamar quando quiser.",
          hora: "09:13",
        },
      ],
    },
  },
  {
    passo: "Ele quis horário às 13h47. Saiu marcado 13h48.",
    rotulo: "ela agenda",
    conversa: {
      relogio: "13:48",
      dia: "HOJE",
      baloes: [
        {
          de: "ele",
          txt: "Boa tarde! Tem horário hoje à tarde?",
          hora: "13:47",
        },
        {
          de: "ela",
          txt: "Boa tarde, Thiago! Hoje tenho 14h e 16h30 com o Léo.",
          hora: "13:47",
        },
        { de: "ele", txt: "16h30", hora: "13:48" },
        {
          de: "ela",
          txt: "Fechado: corte e barba, 16h30 com o Léo. Confirmado 👊",
          hora: "13:48",
        },
      ],
    },
  },
  {
    passo: "Surgiu uma reunião às 10h31. O 13:30 de hoje voltou pra fila.",
    rotulo: "ela remarca",
    conversa: {
      relogio: "10:33",
      dia: "HOJE",
      baloes: [
        {
          de: "ele",
          txt: "Oi! Marquei pra hoje 13:30, mas surgiu uma reunião",
          hora: "10:31",
        },
        {
          de: "ela",
          txt: "Sem problema. Quer que eu veja outro horário?",
          hora: "10:31",
        },
        { de: "ele", txt: "Quinta dá?", hora: "10:32" },
        {
          de: "ela",
          txt: "Dá sim. Quinta tenho 10h e 14h livres.",
          hora: "10:32",
        },
        { de: "ele", txt: "10h", hora: "10:33" },
        {
          de: "ela",
          txt: "Remarcado pra quinta às 10h. Já liberei o seu 13:30 de hoje.",
          hora: "10:33",
        },
      ],
    },
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
/* ⚠️ ESTE `d` É PERIÓDICO, E A PERIODICIDADE É A ANIMAÇÃO — não é enfeite.
 *
 * A onda anda por `transform: translateX(0 → -400)` em loop. Isso só não pisca porque
 * o desenho REPETE exatamente a cada 400 unidades: deslocado de um período inteiro, ele
 * é idêntico a si mesmo, então o instante em que a animação volta ao início é
 * invisível. Se alguém "melhorar" a onda mexendo num pico só, a emenda aparece — um
 * salto a cada ciclo. Mexer num período = mexer nos seis.
 *
 * A CONSTRUÇÃO: 6 períodos de 400, de x=-100 a x=2300, cada um com duas meias-ondas de
 * 200. Os pontos de controle são reflexos exatos nas junções (em x=100 o de entrada é
 * (50,26) e o de saída (150,70), reflexo em torno de (100,48)), então não há bico em
 * emenda nenhuma — nem entre períodos.
 *
 * ⚠️ POR QUE SOBRA TANTA PISTA (de -100 a 2300, sendo que o viewBox é 0..1600): a onda
 * desliza 400 para a esquerda, então precisa de um período inteiro de folga à direita,
 * senão a ponta do caminho entra na área visível no fim do ciclo. Medido: a janela
 * visível vai de ~60 a ~1540 do viewBox; com esta pista ela fica coberta nos dois
 * extremos do deslocamento (-100..2300 e -500..1900).
 *
 * AMPLITUDE ±16 DE UM PERÍODO DE 400 — razão 1:12, deliberadamente achatada. O pedido
 * original ainda vale ("muito mais horizontal, somente uma linha"): é uma linha que
 * ondula, não uma senoide decorativa. Subir a amplitude devolve a onda que o pedido
 * anterior mandou embora.
 *
 * (AQUI MOROU o `RISCO_H` de traço único e irregular, desenhado à mão em 07/08/2026.
 * Ele não podia andar: sendo aperiódico, qualquer translação em loop dava salto. A
 * troca custou a irregularidade de mão livre — este é regular por obrigação
 * matemática, não por gosto.) */
export const ONDA_H =
  "M -100 48 C -50 26, 50 26, 100 48 C 150 70, 250 70, 300 48 C 350 26, 450 26, 500 48 C 550 70, 650 70, 700 48 C 750 26, 850 26, 900 48 C 950 70, 1050 70, 1100 48 C 1150 26, 1250 26, 1300 48 C 1350 70, 1450 70, 1500 48 C 1550 26, 1650 26, 1700 48 C 1750 70, 1850 70, 1900 48 C 1950 26, 2050 26, 2100 48 C 2150 70, 2250 70, 2300 48";

/** O deslocamento de um período, em unidades do viewBox. A keyframe da onda usa este
 *  número; se o período do `ONDA_H` mudar, muda aqui também — e são os dois únicos
 *  lugares. (Está aqui e não só no CSS para o número ter um nome e uma explicação.) */
export const ONDA_PERIODO = 400;

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
 * (1.858 − 147) × 12 = 20.532. Quem duvidar refaz a conta com o que está vendo, sem
 * precisar confiar em nós. É por isso que ela usa o valor arredondado e não o
 * centavo: uma "economia" que não fecha com os preços exibidos parece número
 * inventado mesmo sendo mais exato.
 *
 * ⚠️ ESTE LADO MOSTRA R$ 147 E NÃO R$ 97, E A TROCA FOI DELIBERADA (07/08/2026).
 * Enquanto a página não tinha seção de planos, o card mostrava os R$ 97 do Essencial
 * — o preço mais baixo real, e o gancho mais forte contra R$ 1.858. Com a <Planos>
 * no fim, o destaque de lá é o Profissional de R$ 147, e aí os R$ 97 aqui viravam
 * ISCA: o leitor compara com um preço e encontra outro dois blocos depois.
 *
 * A REGRA QUE ISSO CRIA, e ela vale para quem mexer: o preço deste card é o preço do
 * plano DESTACADO em `PLANOS`, não o mais barato do catálogo. São o mesmo número em
 * dois lugares porque são a mesma afirmação — se um mudar, o outro muda, e o
 * `DUELO_SALDO` abaixo muda junto. Trocar o destaque de plano sem refazer esta conta
 * deixa a página se contradizendo sozinha, em silêncio.
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
    /* O preço do plano DESTACADO em `PLANOS` — ver a nota no cabeçalho da seção.
       Não é o mais barato do catálogo, e isso é a decisão, não um descuido. */
    preco: "R$ 147",
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

/** A tira no pé do card da maisa. Ver a nota sobre aritmética acima.
 *  (1.858 − 147) × 12 = 20.532. Era 21.132 enquanto o card mostrava R$ 97. */
export const DUELO_SALDO = {
  valor: "R$ 20.532",
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

/* ─────────────────────────── o fecho: os planos ───────────────────────────
 *
 * A QUARTA E ÚLTIMA SEÇÃO. Até 07/08/2026 a página terminava no <Duelo>, sem preço
 * de catálogo e sem botão — lacuna deixada por escrito na page.tsx, com a regra
 * "perguntar antes de encher espaço vazio". Perguntado e respondido: três planos,
 * Profissional em destaque, botão para o checkout.
 *
 * ⚠️ OS PREÇOS NÃO FORAM INVENTADOS AQUI. São os mesmos três de
 * `../PlanosBarbeiros.tsx`, que é o catálogo que já servia as outras LPs de barbeiros
 * (97 / 147 / 197, com o Profissional marcado `destaque: true`). Este arquivo os
 * REDIGITA em vez de importar de lá, e isso é uma dívida consciente, não descuido:
 * aquele módulo é `"use client"`, arrasta `@/lib/ui`, `../primitives` e `../icp`, e
 * importá-lo puxaria o bundle de um componente inteiro para ler três strings. A v3
 * não importa NADA das outras LPs, por decisão escrita no topo deste arquivo.
 *
 *   ⇒ SE OS PREÇOS MUDAREM, MUDAM NOS DOIS LUGARES. É o custo aceito. O outro
 *     consumidor a conferir é o `DUELO_LADOS`, que espelha o preço do plano
 *     destacado (ver a nota lá em cima).
 *
 * ── AS GARANTIAS TAMBÉM VÊM DE LÁ ─────────────────────────────────────────
 * "No ar em cerca de 30 minutos", "se não se pagar no 1º mês a gente devolve" e
 * "sem fidelidade" são as três do `GARANTIAS` do catálogo, e a segunda é a mesma do
 * `OFERTA.garantia` no topo deste arquivo. Nenhuma é nova.
 */

export const PLANOS_TITULO = "Escolha o tamanho da sua operação.";

export const PLANOS_LEAD =
  "Todos atendem no WhatsApp que a barbearia já usa e começam a marcar horário no mesmo dia. A diferença é o que vem depois disso.";

/* ⚠️ OS LINKS DE CHECKOUT — O ÚNICO LUGAR DO PROJETO EM QUE ELES DEVEM EXISTIR.
 *
 * ESTÃO VAZIOS DE PROPÓSITO, E NÃO É PENDÊNCIA ESQUECIDA: em 07/08/2026 não existe
 * produto de barbearia no Stripe. O que existe é UM link, e é de TERAPEUTAS — está
 * digitado cru no `lp/terapeutas/index.html:429`, com um `client_reference_id`
 * daquele funil. Reaproveitá-lo aqui cobraria o plano errado de quem clicasse.
 *
 * INVENTAR UMA URL DE PAGAMENTO É O PIOR BUG POSSÍVEL NUMA LP: ela não quebra o
 * build, não aparece em teste, e só falha no único momento que importa — com o
 * cartão na mão. Por isso não há placeholder plausível aqui, há string vazia.
 *
 * ENQUANTO VAZIO, O BOTÃO CAI NO WHATSAPP (ver `linkPlano()` abaixo), que é o
 * caminho que de fato funciona para barbeiros hoje e o que as outras LPs já fazem.
 * A página nunca fica com botão morto, e trocar é colar a URL numa linha.
 *
 * PARA PREENCHER: criar os três preços no Stripe, pegar os links de pagamento e
 * colar abaixo. Nada mais no código precisa mudar. */
export const CHECKOUT: Record<string, string> = {
  essencial: "",
  profissional: "",
  completo: "",
};

/** A mensagem por plano. Mesmo formato do `mensagemPlano()` do catálogo — a conversa
 *  já começa no contexto certo em vez de uma mensagem genérica igual nos três botões.
 *
 *  ⚠️ O NÚMERO VEM DO `whatsappUrl` DE `_lib/icp.ts`, NÃO DIGITADO AQUI. Aquele
 *  módulo se declara "fonte única do CTA de WhatsApp para as 6 landing pages" e é
 *  puro de propósito (sem "use client"), justamente para Server Components como este
 *  poderem importá-lo. A regra de a v3 não importar nada das outras LPs vale para os
 *  COMPONENTES delas; um número de telefone redigitado num sétimo arquivo é o defeito
 *  que a v1 tinha com os preços — quatro cópias que já divergiam entre si. */
function whats(plano: string): string {
  return whatsappUrl(`Oi! Tenho uma barbearia e quero ativar a MAISA no plano ${plano}. Como começo?`);
}

export type Plano = {
  chave: keyof typeof CHECKOUT & string;
  nome: string;
  preco: string;
  periodo: string;
  /** Uma linha dizendo para QUEM é o plano. É o que faz a pessoa se reconhecer. */
  resumo: string;
  /** O que este plano tem A MAIS que o de baixo. O primeiro item dos dois últimos é
   *  "Tudo do <anterior>" de propósito: sem isso a lista teria de repetir os quatro
   *  itens do Essencial em todos, e o cartão viraria uma parede de texto igual. */
  itens: readonly string[];
  destaque?: boolean;
  /** Rótulo do botão. Ação, como o da dobra — nunca "Saiba mais". */
  cta: string;
};

export const PLANOS: readonly Plano[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    preco: "R$ 97",
    periodo: "/mês",
    resumo: "Pra encher a agenda e parar de perder horário.",
    itens: [
      "Agenda pelo WhatsApp",
      "Confirmação automática",
      "Lembrete antes do horário",
      "Painel de horários",
    ],
    cta: "Começar no Essencial",
  },
  {
    chave: "profissional",
    nome: "Profissional",
    preco: "R$ 147",
    periodo: "/mês",
    resumo: "Pra quem já tem cadeira cheia e quer manter cheia.",
    itens: [
      "Tudo do Essencial",
      "Recuperação de cliente sumido",
      "Mensagens em massa",
      "Ficha do cliente",
      "Relatórios da agenda",
    ],
    destaque: true,
    cta: "Ativar minha agenda",
  },
  {
    chave: "completo",
    nome: "Completo",
    preco: "R$ 197",
    periodo: "/mês",
    resumo: "Pra barbearia com equipe e nota fiscal.",
    itens: [
      "Tudo do Profissional",
      "Nota fiscal para PJ",
      "Agenda por profissional",
      "Prioridade no suporte",
    ],
    cta: "Falar sobre o Completo",
  },
] as const;

/** Para onde o botão de um plano aponta. Stripe quando houver link; WhatsApp
 *  enquanto não houver. Ver a nota gigante do `CHECKOUT` para o porquê. */
export function linkPlano(p: Plano): { href: string; externo: boolean } {
  const url = CHECKOUT[p.chave];
  return url ? { href: url, externo: false } : { href: whats(p.nome), externo: true };
}

/** As três garantias, na tira abaixo dos cartões. Todas já existiam no catálogo. */
export const PLANOS_GARANTIAS: readonly string[] = [
  "No ar em cerca de 30 minutos",
  "Se não se pagar no primeiro mês, a gente devolve",
  "Sem fidelidade — cancele quando quiser",
];

/** A letra miúda do pé. A primeira frase é a mesma do catálogo; a segunda existe
 *  porque a página inteira é sobre WhatsApp e alguém vai perguntar. */
export const PLANOS_NOTA =
  "Preços de lançamento. A maisa atende no número que a barbearia já tem — você não troca de WhatsApp nem avisa cliente nenhum.";

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
