/* ─────────────────────────────────────────────────────────────────────────────
 * O CADERNO DE NOMES, E A REGRA DE QUEM A MAISA ATENDE.
 *
 * ⚠️ A PREMISSA QUE ESTAVA ERRADA. Até 16/08/2026 o raciocínio era: *"o número pareado É o
 * número do negócio, então quem manda mensagem para ele é alguém com quem o negócio quer
 * falar — responde todo mundo"*. Bruno derrubou isso com o ICP na mão: *"essa MAISA roda no
 * meu número pessoal, muitos barbeiros fazem o mesmo, não tem número corporativo diferente
 * do pessoal"*. E nomeou o desfecho: **"seria terrível ter a MAISA falando com seu PAI"**.
 *
 * O inverso também é armadilha. Calar para quem está na agenda de contatos silencia
 * justamente os clientes fiéis de um barbeiro — que estão salvos no celular dele.
 *
 * **Nenhum sinal separa os dois sozinho.** Nem "está nos contatos", nem "é número novo". A
 * informação que falta é do dono, e por isso ela é uma PERGUNTA, feita uma vez, no
 * pareamento: este número é só do negócio, ou é o seu também?
 *
 * ── POR QUE NÃO É UMA LISTA DE PERMISSÃO ──
 *
 * Porque lista de permissão faz a MAISA ignorar exatamente quem traz dinheiro: cliente novo
 * não está em contato nenhum. É o argumento do Bruno e ele é decisivo. O caderno entra pelo
 * outro lado — ele diz quem é da VIDA PESSOAL, e só no modo em que essa distinção existe.
 *
 * ── O QUE O CADERNO FAZ NOS DOIS MODOS ──
 *
 * Nos dois ele empresta NOME: quando `+55 11 97xxx` escreve, ela diz "Oi, Fernanda!" em vez
 * de "Oi!". Isso vale sempre, e é a maior parte do valor dele.
 *
 * ⚠️ CONTATO NÃO É CLIENTE, e essa separação é estrutural. `clientes` alimenta o faturamento
 * (`v_clientes.valor`) e a tela de Clientes; encher aquela tabela com as 374 pessoas da
 * agenda de alguém quebra as duas. Cliente continua sendo quem MARCOU — `garantirCliente`
 * cria a linha na hora em que isso acontece.
 * ────────────────────────────────────────────────────────────────────────────── */

import { soDigitos } from "./clientes";

/**
 * De quem é o número que a MAISA atende.
 *
 * ⚠️ O PADRÃO É `pessoal`, e é fail-safe deliberado. Errar para "negócio" faz a MAISA
 * oferecer horário para a mãe do dono; errar para "pessoal" faz ela deixar de responder um
 * contato salvo — chato, visível na tela de Conversas (a mensagem é registrada mesmo quando
 * ela cala), e corrigível com um toque. O primeiro erro custa a confiança no produto; o
 * segundo custa um clique.
 */
export type ModoDoNumero =
  /** Linha do negócio. Ela responde todo mundo. */
  | "negocio"
  /** Também é o celular pessoal do dono. Ela responde desconhecido e quem ele marcar. */
  | "pessoal";

export const MODO_PADRAO: ModoDoNumero = "pessoal";

export function ehModoDoNumero(v: unknown): v is ModoDoNumero {
  return v === "negocio" || v === "pessoal";
}

/** Uma linha do caderno. Vem da agenda do WhatsApp do dono, ou de um toque na tela. */
export type Contato = {
  /** Os 8 últimos dígitos — a MESMA chave de `clientes` e `mensagens_agente`. Ver `chaveDe`. */
  chave: string;
  /** Como o dono salvou a pessoa. É isto que a MAISA usa para chamar pelo nome. */
  nome: string | null;
  /**
   * O dono disse que esta pessoa é cliente.
   *
   * ⚠️ TERNÁRIO DE PROPÓSITO, não booleano. `null` é "ele nunca disse", e é diferente de
   * "ele disse que não": no modo pessoal o silêncio de um contato importado significa não
   * atender, mas quem foi marcado explicitamente como NÃO-cliente nunca deve voltar a ser
   * sugerido. Um booleano com default `false` misturaria as duas coisas.
   */
  cliente: boolean | null;
};

/**
 * A chave de casamento: os 8 últimos dígitos.
 *
 * Oito, e não o número inteiro, porque o mesmo telefone chega escrito de três formas — com
 * e sem DDI, com e sem o nono dígito de celular. É a normalização que `clientes.telefone_chave`
 * e `mensagens_agente.telefone_chave` já usam; divergir aqui faria o caderno nunca casar com
 * quem escreve.
 *
 * Devolve `""` para o que não tem 8 dígitos — e quem chama trata isso como "não sei quem é",
 * nunca como uma chave válida. Chave vazia casando com chave vazia juntaria estranhos.
 */
export function chaveDe(telefone: string | null | undefined): string {
  const d = soDigitos(telefone);
  return d.length >= 8 ? d.slice(-8) : "";
}

/**
 * A MAISA pode responder esta pessoa?
 *
 * Função pura, e é aqui que a decisão mora — não no adaptador do webhook nem num `if` dentro
 * do agente. O motivo é que ela precisa ser LIDA por quem for auditar o produto: "por que a
 * MAISA não respondeu meu pai?" tem que ter uma resposta de uma linha.
 *
 * `contato` é `null` quando o número não está no caderno.
 */
export function podeResponder(p: { modo: ModoDoNumero; contato: Contato | null }): boolean {
  /* Linha do negócio: não há vida pessoal para proteger. Responde todo mundo, inclusive —
   * e principalmente — quem ela nunca viu, que é o lead. */
  if (p.modo === "negocio") return true;

  /* Modo pessoal, número DESCONHECIDO: é o lead. Responde.
   *
   * ⚠️ Esta linha é o coração do desenho e ela parece contraintuitiva de fora: a MAISA
   * atende justamente quem ela não conhece. É deliberado — quem não está na agenda do dono
   * de uma barbearia é, quase sempre, alguém que achou o número procurando corte. Uma lista
   * de permissão faria o contrário e perderia essa pessoa. */
  if (!p.contato) return true;

  /* Está no caderno. Só responde se o dono disse que é cliente. `null` (nunca disse) cala:
   * ver o ⚠️ de `MODO_PADRAO` — o erro barato é este. */
  return p.contato.cliente === true;
}

/**
 * Por que ela calou, em uma frase, para o log e para a tela.
 *
 * Existe porque silêncio sem motivo registrado é o modo de falha mais caro deste canal: o
 * dono vê "a MAISA não respondeu" e não tem como distinguir isto de um erro de verdade.
 */
export function motivoDoSilencio(p: { modo: ModoDoNumero; contato: Contato | null }): string | null {
  if (podeResponder(p)) return null;
  const quem = p.contato?.nome?.trim();
  return quem
    ? `${quem} está nos seus contatos e não foi marcado como cliente — neste número a MAISA só atende cliente e quem ela não conhece.`
    : "Este número está nos seus contatos e não foi marcado como cliente.";
}
