/* ─────────────────────────────────────────────────────────────────────────────
 * O CLIENTE DA STRIPE. ⚠️ SÓ SERVIDOR.
 *
 * Um por processo, criado na primeira chamada. Não há sessão para renovar; o que se
 * economiza é o handshake de TLS a cada clique em "assinar".
 *
 * ── SEM `apiVersion` EXPLÍCITA, E ISSO É DECISÃO ──
 *
 * O SDK fixa a versão que os TIPOS dele descrevem (22.6.2 → `2026-08-26.dahlia`).
 * Passar uma string à mão desacopla os dois: o TypeScript continua compilando contra os
 * tipos de uma versão enquanto a API responde outra, e a divergência aparece em runtime,
 * num campo que virou `undefined`. Atualizar versão de API aqui é subir o SDK.
 *
 * ── `StripeClient`, NÃO A CHAVE GLOBAL ──
 *
 * O padrão `stripe.api_key = …` está depreciado em todos os SDKs atuais. Além de
 * depreciado é global: num processo que um dia fale com duas contas (a nossa e a de um
 * cliente via Connect), chave global é vazamento entre contas por construção.
 * ────────────────────────────────────────────────────────────────────────────── */

import Stripe from "stripe";
import { NaoConfigurado } from "@/nucleo/dominio/erros";
import { SEGREDO, faltando } from "./config";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!SEGREDO) throw new NaoConfigurado(faltando());
  if (!_stripe) {
    _stripe = new Stripe(SEGREDO, {
      /* Aparece no painel da Stripe ao lado de cada request. Num dia de investigação
       * ("quem criou essa assinatura às 3h?"), a resposta ser "maisa-app" em vez de
       * "unknown" é a diferença entre um minuto e uma hora. */
      appInfo: { name: "maisa-app", url: "https://app.maisasecretary.com.br" },
      /* A rede falha. Dois retries é o padrão da casa em integração de pagamento: o
       * suficiente para atravessar um blip, pouco o bastante para não empilhar atrás do
       * teto de 10s da função na Vercel. As chamadas que fazemos são idempotentes ou
       * carregam chave de idempotência. */
      maxNetworkRetries: 2,
    });
  }
  return _stripe;
}

/** Só para o teste poder trocar o cliente sem subir processo novo. */
export function _resetarCliente(): void {
  _stripe = null;
}
