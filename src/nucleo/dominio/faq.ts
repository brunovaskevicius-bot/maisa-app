/* ─────────────────────────────────────────────────────────────────────────────
 * FAQ — a base de conhecimento do negócio, e a matemática que a torna buscável.
 *
 * O tipo `Faq` em si mora em `conversas.ts`, onde nasceu, e continua lá: mover um tipo
 * usado pela persona do agente e por três telas para ganhar simetria de arquivo é churn
 * sem benefício. O que mora AQUI é o que a busca por sentido precisa e o domínio de
 * conversas não tem por que conhecer.
 *
 * ── POR QUE ISTO É DOMÍNIO, E NÃO DETALHE DO ADAPTADOR ──
 *
 * Normalizar vetor parece assunto de quem fala com o provedor. Não é: é a condição para
 * que "parecido" signifique alguma coisa. A similaridade de cosseno só é comparável entre
 * vetores de mesma norma — com normas diferentes, o ranking passa a medir tamanho junto
 * com direção, e ordena errado sem errar visivelmente.
 *
 * Se isso vivesse no adaptador do Gemini, trocar de provedor (ou acrescentar um segundo)
 * duplicaria a regra — e a segunda cópia é a que alguém esquece.
 * ────────────────────────────────────────────────────────────────────────────── */

/* Reexportado, não redefinido. `Faq` continua declarado em `conversas.ts` — isto é um
 * ponteiro para que quem trabalha com FAQ importe de um lugar só, e não uma segunda
 * definição que possa divergir da primeira. */
export type { Faq } from "./conversas";

/**
 * ⚠️ CASADO COM `vector(768)` DA MIGRAÇÃO `012_faqs_vetorial.sql`.
 *
 * Mudar aqui sem mudar lá faz o Postgres recusar a escrita com erro de dimensão — o que,
 * das formas de errar, é a boa: falha alta e imediata. Mudar LÁ sem mudar aqui é pior,
 * porque o insert passa e a busca compara vetores de espaços diferentes.
 *
 * O número saiu de duas medições, e o porquê inteiro está no cabeçalho da migração: os
 * índices do pgvector param em 2000 dimensões, e o padrão do modelo é 3072.
 */
export const DIMENSOES_DO_VETOR = 768;

/**
 * Põe o vetor na esfera unitária.
 *
 * ⚠️ NÃO É PRECAUÇÃO — É CORREÇÃO DE UM DEFEITO MEDIDO. O `gemini-embedding-001` devolve
 * o vetor de 3072 já normalizado (norma 1.0000), mas os truncados por
 * `outputDimensionality` NÃO: medido em 15/08/2026, 768 volta com norma 0.5882 e 1536 com
 * 0.6949. Como usamos 768, todo vetor que entra precisa passar por aqui.
 *
 * O sintoma de esquecer isto é o pior tipo: nada quebra. A busca responde, a ordem é
 * plausível, e a MAISA passa a responder a FAQ errada com a mesma confiança de sempre.
 *
 * Vetor nulo (norma 0) volta como está: dividir por zero produziria `NaN` em cada posição,
 * e um vetor de `NaN` atravessa o `insert` para morrer no `<=>`, longe daqui.
 */
export function normalizarVetor(v: readonly number[]): number[] {
  let soma = 0;
  for (const x of v) soma += x * x;
  const norma = Math.sqrt(soma);
  if (norma === 0 || !Number.isFinite(norma)) return [...v];
  return v.map((x) => x / norma);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * O CORTE DE SIMILARIDADE — e o que ele NÃO faz.
 *
 * ⚠️ ELE NÃO DECIDE SE A FAQ RESPONDE A PERGUNTA. Isso foi medido em 15/08/2026 contra as
 * FAQs reais deste banco, e o resultado reprovou o desenho original:
 *
 *     menor acerto   0.705   "aceita pix?"           → Quais formas de pagamento?
 *     maior ruído    0.725   "vocês atendem cachorro?" → Quais serviços vocês oferecem?
 *     separação     -0.019
 *
 * A separação é NEGATIVA: o pior acerto pontua ABAIXO do pior erro. Não existe valor que
 * aceite "aceita pix?" e recuse "vocês atendem cachorro?" — qualquer corte erra um dos
 * dois. E não é limitação da truncagem para 768: com os 3072 nativos a separação é -0.022,
 * praticamente idêntica.
 *
 * A causa não é o modelo, é a pergunta que se está fazendo a ele. Embedding mede ASSUNTO,
 * não RESPOSTA — "vocês atendem cachorro?" e "quais serviços vocês oferecem?" são de fato
 * o mesmo assunto ("esse negócio faz X?"), e um bom modelo de embedding TEM que colocá-las
 * perto. Esperar que a distância também julgue se uma responde a outra é pedir a ele uma
 * coisa que ele não mede.
 *
 * ── ENTÃO PARA QUE ELE SERVE ──
 * Para cortar o que não tem nada a ver: "qual a capital da França?" pontua 0.574. 0.65
 * elimina esse tipo de coisa e deixa passar tudo que é do assunto do negócio.
 *
 * Quem JULGA é o modelo de conversa, com as candidatas e as notas na frente — é o que a
 * ferramenta `responder_duvidas` faz. A divisão de trabalho é essa, e escrevê-la aqui
 * evita que alguém volte a tentar afinar este número para resolver relevância.
 * ────────────────────────────────────────────────────────────────────────────── */
export const CORTE_DE_SIMILARIDADE = 0.65;

/** Uma pergunta é uma pergunta, não um documento. Ela também vira embedding, e texto
 *  longo demais dilui o vetor: a média de mil palavras não aponta para lugar nenhum. */
export const PERGUNTA_MAX = 200;

/** A resposta vai INTEIRA para o WhatsApp do cliente, então o limite é de leitura, não
 *  de banco. Acima disso não é resposta pronta, é documento — e documento é a próxima
 *  fatia (importar arquivo e fatiar), não esta. */
export const RESPOSTA_MAX = 1000;

/** O que a busca devolve: a FAQ mais o quanto ela se parece com o que foi perguntado. */
export type FaqEncontrada = {
  id: string;
  pergunta: string;
  resposta: string;
  /** 1 = idêntico, 0 = sem relação. É `1 - distância_de_cosseno`, calculado no Postgres. */
  similaridade: number;
};
