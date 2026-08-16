/* ─────────────────────────────────────────────────────────────────────────────
 * AS FALAS SUGERIDAS DA ETAPA 4 — montadas a partir do catálogo REAL do inquilino.
 *
 * Mora fora do componente por um motivo só: é a única parte da etapa 4 que tem invariante
 * própria, e ela merece asserção. O resto daquela tela é layout.
 *
 * ⚠️ A INVARIANTE: **uma sugestão nunca pode nomear serviço ou profissional que não veio do
 * banco.** O `/laboratorio` tem sete atalhos escritos à mão ("quero marcar o atendimento
 * padrão", "quanto custa o pacote completo?") e eles são certos lá — aquela tela é de quem
 * afina o agente. Aqui não: uma frase sobre um serviço que este negócio não vende faria a
 * MAISA responder, corretamente, que não conhece — na primeira mensagem da tela que existe
 * para mostrar que o produto funciona.
 *
 * Por isso todo nome é opcional no tipo e todo caminho tem versão sem nome. Sugestão sem
 * nome é morna; sugestão com o nome errado é o produto se desmentindo.
 * ────────────────────────────────────────────────────────────────────────────── */

/** O que o inquilino realmente vende, para a frase falar disso e de mais nada. */
export type ExemploDoNegocio = {
  /** Primeiro serviço ativo. `null` quando não deu para ler — nunca um chute. */
  servico: string | null;
  /** Primeiro profissional ativo. Idem. */
  profissional: string | null;
};

/** Onde a conversa está. Derivado do que já aconteceu na tela, não de um contador. */
export type EstadoDaConversa = {
  /** Já houve ao menos uma fala. */
  comecou: boolean;
  /** A ferramenta `agendar` rodou sem erro neste diálogo. */
  marcou: boolean;
};

/** "com Rafael Bessa" não é frase de cliente; "com Rafael" é. */
export const primeiroNome = (n: string): string => n.trim().split(/\s+/)[0] || n.trim();

/**
 * As frases que a pessoa pode tocar em vez de digitar.
 *
 * Mudam com o estado porque uma lista fixa é um MENU, e menu é ferramenta de quem depura.
 * Quem está vendo o produto pela primeira vez precisa da PRÓXIMA frase — a que um cliente
 * dele diria agora.
 *
 * Depois de marcar, a primeira sugestão vira cancelar. Não é limpeza de teste disfarçada:
 * é a segunda coisa que todo dono quer saber que a MAISA faz, e ela desfaz de graça o
 * horário que a demonstração criou na agenda de verdade.
 */
export function sugestoes(exemplo: ExemploDoNegocio, estado: EstadoDaConversa): string[] {
  if (estado.marcou) return ["Preciso cancelar esse horário", "Obrigado!"];

  if (!estado.comecou) {
    /* A abertura é a do roteiro original, e é deliberadamente VAGA: não diz o serviço. É o
     * que força a MAISA a consultar a agenda e a perguntar — que é o comportamento que a
     * etapa existe para exibir. Uma abertura que já entrega tudo produz um turno só, e um
     * turno só não mostra nada. */
    return ["Bom dia! Queria marcar um horário para amanhã às 13h", "Vocês atendem sábado?"];
  }

  const alvo = [
    exemplo.servico,
    exemplo.profissional ? `com ${primeiroNome(exemplo.profissional)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [alvo ? `Pode ser ${alvo}` : "Pode ser esse mesmo", "Perfeito, obrigado!", "Quanto fica?"];
}
