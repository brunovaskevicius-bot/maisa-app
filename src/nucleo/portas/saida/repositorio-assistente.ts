/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — os ajustes da assistente, por inquilino.
 *
 * O tom, a saudação, o liga/desliga e os sete toggles de comportamento. É o que a tela
 * "A MAISA" edita e o que `entrada/whatsapp/persona.ts` transforma em prompt.
 *
 * ── POR QUE UMA PORTA NOVA, E NÃO UM MÉTODO EM `RepositorioNegocio` ──
 *
 * Porque `RepositorioNegocio` é inteiramente de LEITURA (`negocio`, `profissionais`,
 * `servicos`, `clientes`, `agendasPermitidas`) e o cabeçalho dele o descreve assim: "o
 * cadastro do negócio". Enfiar uma escrita ali mudaria a natureza da porta, e um dia
 * alguém acrescentaria a segunda sem pensar. Aqui a escrita é o motivo de existir.
 *
 * E porque o CICLO DE VIDA é outro: o cadastro muda quando o dono mexe no catálogo; isto
 * muda quando ele mexe na personalidade. Quem lê também é diferente — o agente lê ISTO a
 * cada mensagem para montar o prompt, e não precisa da lista de clientes para isso.
 *
 * ── A LINHA SEMPRE EXISTE ──
 *
 * `provisionar_negocio` insere a linha de `assistente` na mesma transação que cria o
 * negócio (`supabase/005_provisionar.sql:209`), com o tom já variando por vertical. Então
 * `ler` devolver `null` não significa "inquilino novo": significa que alguém apagou a
 * linha ou que o inquilino nasceu por fora da RPC. É anomalia, e quem chama decide se
 * cai no padrão ou grita — por isso o `| null` está aqui, e não escondido num `??`
 * dentro do adaptador.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Assistente, ChaveCfg } from "../../dominio/assistente";

/** O estado completo. É isto que o agente recebe e o que a tela desenha. */
export type AjustesDaAssistente = {
  assistente: Assistente;
  cfg: Record<ChaveCfg, boolean>;
};

/**
 * O que um PATCH pode mandar: qualquer subconjunto.
 *
 * Parcial de propósito. A tela "A MAISA" é uma lista de toggles — virar um switch manda
 * UM campo. Exigir o objeto inteiro em cada mexida obrigaria o navegador a reenviar um
 * estado que ele pode ter desatualizado, e duas abas abertas se sobrescreveriam: a
 * última a salvar apagaria a mudança da outra em campos que nem tocou.
 */
export type AjustesParciais = {
  assistente?: Partial<Assistente>;
  cfg?: Partial<Record<ChaveCfg, boolean>>;
};

export interface RepositorioAssistente {
  ler(t: ContextoTenant): Promise<AjustesDaAssistente | null>;

  /**
   * Grava o subconjunto e devolve o estado RESULTANTE, não o que foi mandado.
   *
   * Devolver o resultado é o que deixa a tela reconciliar sem uma segunda ida: ela
   * manda `{ cfg: { pix: true } }` e recebe os onze campos de volta. Também é o único
   * jeito honesto de responder um PATCH — o que o banco gravou pode diferir do que se
   * pediu (normalização, default, gatilho).
   */
  salvar(t: ContextoTenant, p: AjustesParciais): Promise<AjustesDaAssistente>;
}
