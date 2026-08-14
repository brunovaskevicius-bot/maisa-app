/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — provisionar o inquilino via `criar_negocio()`.
 *
 * ⚠️ USA O CLIENTE DE SESSÃO, NÃO O SERVICE ROLE. Isto é a decisão que mais importa
 * neste arquivo, e é deliberada.
 *
 * A RPC `criar_negocio()` é `security definer` com `set search_path = ''`, resolve o dono
 * por `auth.uid()` lá dentro e tem `grant execute` só para `authenticated`
 * (`supabase/005_provisionar.sql:281-316`). Ou seja: ela já é a fronteira. Chamá-la com a
 * sessão do usuário significa que **é impossível criar um negócio para outra pessoa** —
 * nem por bug, nem por parâmetro malicioso, porque não existe parâmetro de dono.
 *
 * Se este adaptador usasse service role, o dono passaria a ser um argumento que o código
 * escolhe, e a garantia viraria "confie que o TypeScript não errou". Trocaríamos uma
 * garantia do Postgres por uma convenção nossa. Vale registrar que a referência que
 * estudamos foi por esse caminho: a edge function equivalente do outro produto usa
 * service role e insere a linha na mão, e por isso precisa checar duplicata no código.
 * Aqui a checagem é o teto do próprio banco.
 *
 * Consequência prática: esta porta não funciona para o ator `agente` nem `sistema` — eles
 * não têm cookie. Está certo. Um agente de WhatsApp não cria inquilino.
 *
 * ── SEGREDOS ──
 * Nada aqui lê chave de lugar nenhum além do nosso `.env.local` / Vercel, via
 * `supabase/config.ts` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  IdentidadeDaSessao, NegocioCriado, PedidoDeNegocio, ProvisionadorDeNegocio,
} from "@/nucleo/portas/saida/provisionador-negocio";
import { FalhaDoProvedor } from "@/nucleo/dominio/erros";
import { createClient } from "./server";
import { isSupabaseConfigured } from "./config";

/**
 * O `errcode` que `criar_negocio()` levanta quando a pessoa passou do teto de 10.
 * `restrict_violation` (`005_provisionar.sql:303`) — um código escolhido a dedo lá para
 * ser distinguível aqui. Casar por código e não por texto da mensagem: a mensagem é em
 * português e vai mudar; o código não.
 */
const ERRO_TETO = "restrict_violation";

/** Sessão ausente ou expirada no meio do fluxo. Vira 401 em vez de 502. */
const ERRO_SEM_SESSAO = "insufficient_privilege";

export const provisionadorSupabase: ProvisionadorDeNegocio = {
  faltando() {
    return isSupabaseConfigured ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  },

  async criar(_sessao: IdentidadeDaSessao, p: PedidoDeNegocio): Promise<NegocioCriado> {
    /* `_sessao` não é passada adiante de propósito: quem é o dono é decidido pelo
     * `auth.uid()` de dentro da RPC. O argumento existe na porta porque o caso de uso e o
     * adaptador de demonstração precisam dele — e porque o dia em que alguém tentar
     * "passar o usuarioId para a RPC" vai esbarrar neste comentário primeiro. */
    const supabase = createClient();

    const { data, error } = await supabase.rpc("criar_negocio", {
      p_nome: p.nome,
      p_vertical: p.vertical,
      p_profissional: p.profissional ?? null,
    });

    if (error) {
      if (error.code === ERRO_TETO) return { ok: false, motivo: "limite_de_negocios" };
      if (error.code === ERRO_SEM_SESSAO) {
        throw new FalhaDoProvedor("Sua sessão expirou. Entre de novo para criar o negócio.");
      }
      throw new FalhaDoProvedor(`Não foi possível criar o negócio: ${error.message}`);
    }

    /* A RPC devolve `uuid`. Ausência aqui não é "não achei" — é a transação ter voltado
     * sem erro e sem id, que não deveria acontecer. Falhar alto: silenciar deixaria o
     * usuário numa tela de sucesso com uma conta que não existe. */
    const tenantId = typeof data === "string" ? data : "";
    if (!tenantId) {
      throw new FalhaDoProvedor("O negócio foi criado, mas o banco não devolveu o identificador.");
    }

    return { ok: true, tenantId };
  },
};
