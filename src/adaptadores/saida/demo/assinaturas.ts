/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — a cobrança, em memória e sem provedor.
 *
 * Duas portas num arquivo porque elas só fazem sentido juntas: o checkout falso grava na
 * memória falsa, e é isso que torna o ciclo inteiro clicável no `/laboratorio` sem conta
 * na Stripe, sem banco e sem cartão.
 *
 * ── ⚠️ O CHECKOUT DEMO "PAGA" NA HORA, E ISSO ESCONDE UM RISCO REAL ──
 *
 * `abrirCheckout` devolve direto a `voltarPara` e marca a assinatura como ativa. É o que
 * faz a tela ser afinável. Mas o mundo real NÃO é assim: lá a volta do navegador não
 * significa pagamento nenhum, e quem confirma é o webhook, depois, por outro caminho.
 *
 * Quem desenhar a tela só contra este demo vai escrever "Pronto, assinatura ativa!" na
 * página de retorno — e em produção essa frase aparece para boleto que ninguém pagou. A
 * página de retorno tem que dizer "recebemos, estamos confirmando". Está escrito aqui
 * porque é aqui que a ilusão nasce.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { Assinatura } from "@/nucleo/dominio/assinatura";
import type { Cobranca } from "@/nucleo/portas/saida/cobranca";
import type { RepositorioAssinaturas } from "@/nucleo/portas/saida/repositorio-assinaturas";

/** Daqui a 30 dias, em `YYYY-MM-DD`. */
const daquiUmMes = () =>
  new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

/**
 * ⚠️ MUTÁVEL, com o mesmo limite dos outros demos: vive enquanto a instância viver.
 * Começa em `trial` porque é o estado em que todo negócio nasce (`005_provisionar.sql`),
 * e portanto o estado em que a tela de faturamento mais vai ser vista.
 */
let estado: Assinatura = {
  plano: "Profissional",
  preco: 197,
  moeda: "BRL",
  status: "trial",
  clienteId: "cus_demo",
  assinaturaId: null,
  periodoFim: daquiUmMes(),
  trialFim: daquiUmMes(),
  cartaoMarca: null,
  cartaoFinal4: null,
};

export const assinaturasDemo: RepositorioAssinaturas = {
  async ler() {
    return { ...estado };
  },
  async gravar(_t, a) {
    estado = { ...a };
  },
  async tenantDoCliente(clienteId) {
    return clienteId === estado.clienteId ? "demo" : null;
  },
  faltando: () => [],
};

export const cobrancaDemo: Cobranca = {
  async abrirCheckout(_t, p) {
    estado = {
      ...estado,
      plano: p.plano.charAt(0).toUpperCase() + p.plano.slice(1),
      status: "ativa",
      assinaturaId: "sub_demo",
      periodoFim: daquiUmMes(),
      trialFim: null,
      cartaoMarca: "visa",
      cartaoFinal4: "4242",
    };
    return { url: p.voltarPara };
  },
  async abrirPortal(_t, p) {
    return { url: p.voltarPara };
  },
  faltando: () => [],
};
