/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — a cobrança.
 *
 * Três, e a assimetria entre eles é a coisa a entender antes de mexer:
 *
 *   · `abrirCheckout` .... humano na tela, sessão autenticada, síncrono
 *   · `lerAssinatura` .... humano na tela, sessão autenticada, síncrono
 *   · `registrarAssinatura` .. ninguém na tela, sem sessão, disparado pelo provedor
 *
 * O terceiro é o que decide o desenho. Ele não pode confiar em nada que veio no pedido —
 * o pedido é um POST de um servidor que não é nosso. O que o torna confiável é a
 * assinatura criptográfica conferida no adaptador de entrada ANTES de chegar aqui.
 * Aqui dentro a regra vale igual à de qualquer outra porta: o `ContextoTenant` já é
 * verdade quando entra.
 * ────────────────────────────────────────────────────────────────────────────── */

import { DadoInvalido, NaoEncontrado } from "../dominio/erros";
import { ehChaveDePlano } from "../dominio/assinatura";
import type { Assinatura } from "../dominio/assinatura";
import type {
  AbrirCheckout,
  AbrirPortalDeCobranca,
  LerAssinatura,
  RegistrarAssinatura,
} from "../portas/entrada/casos-de-uso";
import type { Cobranca } from "../portas/saida/cobranca";
import type { RepositorioAssinaturas } from "../portas/saida/repositorio-assinaturas";

export function criarAbrirCheckout(deps: {
  cobranca: Cobranca;
  assinaturas: RepositorioAssinaturas;
}): AbrirCheckout {
  return async (t, p) => {
    /* A chave do plano chega do corpo do request (o clique da tela), então é entrada
     * não confiável como qualquer outra. Validar aqui e não no adaptador porque "que
     * planos existem" é domínio: o provedor aceitaria alegremente um preço de outro
     * produto se a gente mandasse o id errado. */
    if (!ehChaveDePlano(p.plano)) {
      throw new DadoInvalido(`Plano desconhecido: ${String(p.plano)}.`, "plano");
    }

    /* ★ O CLIENTE QUE JÁ EXISTE. Sem esta leitura, quem desistiu na primeira tentativa
     * e voltou vira duas fichas no provedor — e duas fichas podem carregar duas
     * assinaturas ativas do MESMO negócio, cobrando duas vezes. A leitura é barata
     * (uma linha por chave primária) e acontece uma vez por clique em "assinar". */
    const atual = await deps.assinaturas.ler(t);
    return deps.cobranca.abrirCheckout(t, { ...p, clienteId: atual?.clienteId ?? null });
  };
}

export function criarAbrirPortalDeCobranca(deps: {
  cobranca: Cobranca;
  assinaturas: RepositorioAssinaturas;
}): AbrirPortalDeCobranca {
  return async (t, p) => {
    const atual = await deps.assinaturas.ler(t);
    /* Portal de quem nunca pagou não existe: a Stripe recusa `customer` nulo, e a
     * recusa dela chega como 400 genérico. Um erro de domínio aqui deixa a tela dizer
     * "você ainda não tem assinatura" em vez de "erro ao abrir o portal". */
    if (!atual?.clienteId) throw new NaoEncontrado("cliente de cobrança deste negócio");
    return deps.cobranca.abrirPortal(t, { ...p, clienteId: atual.clienteId });
  };
}

export function criarLerAssinatura(deps: { assinaturas: RepositorioAssinaturas }): LerAssinatura {
  return async (t) => deps.assinaturas.ler(t);
}

/**
 * O webhook, já traduzido e já autenticado.
 *
 * ⚠️ NÃO DECIDE NADA — grava o que o provedor afirmou. É de propósito, e é o mesmo
 * princípio do `ReconciliarRecibos`: quando o dono da verdade é externo, inventar regra
 * local produz duas verdades que divergem no dia em que alguém mexe pelo painel do
 * provedor. Cancelamento feito lá dentro chega aqui como evento, e este arquivo escreve.
 *
 * A única regra que sobra é a que `statusDoProvedor` carrega: estado desconhecido não
 * libera o produto.
 */
export function criarRegistrarAssinatura(deps: {
  assinaturas: RepositorioAssinaturas;
}): RegistrarAssinatura {
  return async (t, a: Assinatura) => {
    await deps.assinaturas.gravar(t, a);
  };
}
