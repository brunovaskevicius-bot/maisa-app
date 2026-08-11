/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o modelo de linguagem que conduz a conversa.
 *
 * Nasceu quando o agente trocou de provedor pela primeira vez. Antes, `agente.ts`
 * importava o SDK da Anthropic e falava `tool_use`, `stop_reason`, `TextBlock`: trocar
 * para Gemini era reescrever o loop, e voltar depois era reescrever de novo. Como a
 * chave de teste do Gemini vai ser revogada quando isto for para produção, "trocar de
 * provedor" não é hipótese — é o plano.
 *
 * Agora o loop fala esta linguagem, e o provedor é uma linha em `composicao.ts`.
 *
 * ⚠️ O QUE ESTA PORTA NÃO DEIXA PASSAR, e é o ponto dela:
 *   • nome de campo de provedor (`stop_reason`, `finishReason`, `candidates`)
 *   • formato de bloco (`content[].type === "text"`, `parts[].functionCall`)
 *   • id de ferramenta no formato de ninguém (a Anthropic exige `tool_use_id`; o Gemini
 *     casa por nome e não tem id — quem inventa o id é o adaptador)
 *
 * O `parametros` de ferramenta é JSON Schema, e isso é escolha consciente: JSON Schema
 * é padrão aberto, não formato de fornecedor. Inventar um vocabulário próprio aqui só
 * criaria uma tradução a mais em cada adaptador, sem tirar acoplamento nenhum.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Subconjunto de JSON Schema que uma ferramenta de conversa precisa. Deliberadamente
 *  pobre: sem aninhamento, sem array, sem `oneOf`. Um modelo preenchendo isso a partir
 *  de uma frase solta erra menos com campos rasos, e nada no agente precisa de mais. */
export type EsquemaDeFerramenta = {
  type: "object";
  properties: Record<string, { type: "string" | "integer" | "number" | "boolean"; description?: string }>;
  required?: string[];
};

export type DefinicaoDeFerramenta = {
  nome: string;
  /** O QUANDO chamar, não só o que faz — é o que mais move comportamento de agente. */
  descricao: string;
  /** Ausente = ferramenta sem argumento. */
  parametros?: EsquemaDeFerramenta;
};

export type ChamadaDeFerramenta = {
  /** Correlaciona chamada e resultado. Vem do provedor quando ele tem um; senão o
   *  adaptador cunha. Quem executa não precisa saber a diferença. */
  id: string;
  nome: string;
  argumentos: Record<string, unknown>;
  /**
   * Estado do provedor que precisa VOLTAR INTACTO no turno seguinte, ou ele recusa a
   * requisição. Opaco de propósito: nem o loop nem o executor têm o que fazer com isto
   * além de preservá-lo.
   *
   * Não é vazamento de abstração — é a abstração admitindo um fato do mundo. Os modelos
   * com raciocínio interno guardam estado cifrado junto da chamada de ferramenta e
   * exigem o replay literal: no Gemini 3 é o `thoughtSignature` (sem ele, HTTP 400 —
   * "Function call is missing a thought_signature"); na Anthropic é a mesma regra dos
   * blocos de pensamento. Fingir que não existe não fez o requisito desaparecer, só fez
   * o agente quebrar na primeira chamada de ferramenta.
   *
   * ⚠️ Nunca inspecione, corte ou reconstrua este valor. Só carregue.
   */
  estadoOpaco?: string;
};

export type ResultadoDeFerramenta = {
  id: string;
  nome: string;
  /** Texto, não JSON: o destinatário é um modelo de linguagem, e uma frase que diz o
   *  que fazer a seguir ("peça o dia ao cliente") funciona melhor que um objeto. */
  texto: string;
  erro: boolean;
};

/**
 * Um turno da conversa, do ponto de vista do modelo.
 *
 * `assistente_ferramentas` é separado de `assistente` porque um turno pode ter texto
 * E chamadas, e a ordem entre eles importa para o provedor. Achatar os dois num só
 * campo obrigaria cada adaptador a adivinhar se aquele texto veio antes ou depois.
 */
export type TurnoDeConversa =
  | { papel: "cliente"; texto: string }
  | { papel: "assistente"; texto: string }
  | { papel: "assistente_ferramentas"; texto?: string; chamadas: ChamadaDeFerramenta[] }
  | { papel: "resultados"; resultados: ResultadoDeFerramenta[] };

export type PedidoAoModelo = {
  /**
   * A parte do prompt que não muda entre mensagens de um mesmo negócio. Separada da
   * volátil porque é ela que entra em cache de prompt — e cache é casamento de
   * PREFIXO: um byte no começo invalida tudo depois. Quem implementa decide como
   * cachear (ou se cacheia); a porta só garante que a informação chega separada.
   */
  sistemaEstavel: string;
  /** Data de hoje, quem é o cliente, o que a MAISA lembra dele. Muda sempre. */
  sistemaVolatil: string;
  ferramentas: DefinicaoDeFerramenta[];
  turnos: TurnoDeConversa[];
  maxTokens: number;
};

export type RespostaDoModelo = {
  /** Vazio quando o modelo só chamou ferramenta. */
  texto: string;
  chamadas: ChamadaDeFerramenta[];
  /**
   * O classificador de segurança do provedor barrou.
   *
   * Merece campo próprio, e não um erro lançado, porque é uma resposta bem-sucedida do
   * ponto de vista de HTTP e **não se resolve tentando de novo**. Quem chama precisa
   * distinguir "deu erro, insista" de "foi recusado, chame um humano".
   */
  recusou: boolean;
};

export interface ModeloDeConversa {
  /** Para log e para a trilha do laboratório — "quem respondeu isso?". */
  readonly nome: string;
  conversar(p: PedidoAoModelo): Promise<RespostaDoModelo>;
}
