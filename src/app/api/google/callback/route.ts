import { NextResponse } from "next/server";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { isGoogleConfigured, redirectUri, caminhoDeVolta } from "@/adaptadores/saida/google/config";
import { lerEstado } from "@/adaptadores/saida/google/cripto";
import { trocarCodigo, emailDaConta, RecusaDoGoogle } from "@/adaptadores/saida/google/oauth";
import { salvar } from "@/adaptadores/saida/google/conexoes";
import { tenantDoUsuario } from "@/adaptadores/entrada/http/contexto";

// ─────────────────────────────────────────────────────────────────────────────
// Volta do consentimento do Google.
//
// Como o BIP: NUNCA responde JSON — o usuário chegou aqui navegando, então toda
// saída é um redirect de volta para a tela com `?google=ok` ou `?google=erro&motivo=…`.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_PKCE = "maisa_google_pkce";

/** Erro de uma etapa nomeada. Existe para que o `catch` lá embaixo saiba QUAL etapa
 *  quebrou sem precisar comparar mensagens soltas. */
class FalhaDeEtapa extends Error {
  constructor(readonly motivo: string, readonly causa: unknown) {
    super(motivo);
  }
}

/** Roda uma etapa e converte qualquer exceção em um motivo que a tela entende.
 *
 *  Antes havia um `try` só em volta das três etapas, devolvendo "falha_ao_conectar"
 *  para causas MUITO diferentes: client secret errado, GOOGLE_TOKEN_KEY do tamanho
 *  errado, insert recusado pelo banco. A única forma de descobrir qual era ler o log
 *  do servidor — e quem está conectando uma agenda não tem acesso a log nenhum. */
async function etapa<T>(nome: string, motivo: string, f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (err) {
    console.error(`[google/callback] ${nome}:`, String(err));
    throw new FalhaDeEtapa(motivo, err);
  }
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const state = searchParams.get("state") ?? "";
  const code = searchParams.get("code");
  const negado = searchParams.get("error");

  // O `volta` sai do state ASSINADO, não de um parâmetro solto: um redirect cujo
  // destino vem de query string crua é um open redirect esperando para acontecer.
  const e = lerEstado(state);
  const destino = caminhoDeVolta(e?.volta);
  const erro = (motivo: string) => NextResponse.redirect(`${origin}${destino}?google=erro&motivo=${motivo}`);

  // O cookie do PKCE some em qualquer saída — sucesso ou erro, ele já cumpriu o papel.
  const encerrar = (r: NextResponse) => {
    r.cookies.set(COOKIE_PKCE, "", { httpOnly: true, path: "/api/google", maxAge: 0 });
    return r;
  };

  if (!isGoogleConfigured) return encerrar(erro("nao_configurado"));
  if (negado) return encerrar(erro("permissao_negada"));
  if (!e) return encerrar(erro("sessao_expirada")); // state inválido, adulterado ou vencido
  if (!code) return encerrar(erro("sem_codigo"));

  // Confere que quem voltou é quem saiu. O state prova que NÓS emitimos o pedido;
  // esta checagem prova que a sessão do navegador é a mesma de lá.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== e.userId) return encerrar(erro("nao_autenticado"));

  const verifier = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${COOKIE_PKCE}=`))
    ?.slice(COOKIE_PKCE.length + 1);
  if (!verifier) return encerrar(erro("pkce_ausente"));

  try {
    const tokens = await etapa("troca do código por token", "troca_recusada", () =>
      trocarCodigo(code, redirectUri(origin), verifier),
    );

    // Sem refresh token a conexão é inútil: o acesso morre em uma hora e não há como
    // renovar. O BIP grava string vazia aqui e redireciona com status=success — a UI
    // mostra "conectado", e só na primeira operação de agenda é que quebra. Preferimos
    // falhar agora, com um motivo que diz o que fazer.
    //
    // Vai para um const próprio porque o `salvar` abaixo roda dentro de um callback, e
    // o TypeScript descarta o narrowing de `tokens.refreshToken` ao cruzar a closure.
    const refreshToken = tokens.refreshToken;
    if (!refreshToken) return encerrar(erro("sem_refresh_token"));

    const email = await etapa("leitura do e-mail da conta", "sem_email", () =>
      emailDaConta(tokens.accessToken),
    );

    /* O inquilino sai de `membros`, não do id do usuário (ver `entrada/http/contexto.ts`).
     * Importa aqui mais do que em qualquer outra rota: `integracoes_google` tem FK
     * COMPOSTA para `profissionais (tenant_id, id)`. Com o tenant errado o insert não
     * grava dado torto — ele é RECUSADO pela FK, e o usuário volta do consent do Google
     * com "falha_ao_salvar" depois de já ter autorizado. */
    const tenant = await tenantDoUsuario(user.id);
    if (!tenant) return encerrar(erro("sem_negocio"));

    // `salvar` cifra os tokens ANTES do insert, então esta etapa cobre duas falhas de
    // conserto bem diferente: env var mal colada e banco recusando. O `catch` separa.
    await etapa("gravação da conexão", "falha_ao_salvar", () =>
      salvar({
        tenant,
        agendaId: e.profissionalId,
      }, {
        googleEmail: email,
        accessToken: tokens.accessToken,
        refreshToken,
        expiraEm: tokens.expiraEm,
      }),
    );

    return encerrar(NextResponse.redirect(`${origin}${destino}?google=ok&pid=${e.profissionalId}`));
  } catch (err) {
    if (err instanceof FalhaDeEtapa) {
      // O Google diz por que recusou, e cada código tem conserto próprio. Sem isto,
      // "secret errado" e "redirect URI que não bate" saem com a mesma frase — e o
      // usuário vai mexer na coisa errada.
      if (err.causa instanceof RecusaDoGoogle) {
        const porCodigo: Record<string, string> = {
          invalid_client: "secret_invalido",
          unauthorized_client: "secret_invalido",
          redirect_uri_mismatch: "uri_nao_bate",
          invalid_grant: "codigo_gasto",
        };
        return encerrar(erro(porCodigo[err.causa.codigo] ?? "troca_recusada"));
      }

      // A chave torta é a causa mais provável de a gravação falhar, e o conserto é
      // outro (recolar uma env var, não mexer no banco). Vale distinguir: `chave()`
      // lança citando GOOGLE_TOKEN_KEY pelo nome.
      if (err.motivo === "falha_ao_salvar" && String(err.causa).includes("GOOGLE_TOKEN_KEY")) {
        return encerrar(erro("chave_invalida"));
      }
      return encerrar(erro(err.motivo));
    }
    console.error("[google/callback] falha inesperada", String(err));
    return encerrar(erro("falha_ao_conectar"));
  }
}
