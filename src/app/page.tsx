import { redirect } from "next/navigation";
import AppShell from "@/ui/componentes/AppShell";
import { StoreProvider } from "@/ui/estado/store";
import { createClient } from "@/adaptadores/saida/supabase/server";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
import { tenantDoUsuario } from "@/adaptadores/entrada/http/contexto";

// ─────────────────────────────────────────────────────────────────────────────
// O PAINEL — e o desvio de quem ainda não tem negócio.
//
// ── POR QUE ESTA PÁGINA PERGUNTA ALGUMA COISA ANTES DE PINTAR ──
//
// Ela era três linhas: `<StoreProvider><AppShell /></StoreProvider>`. O desvio de quem
// não tem inquilino morava só no store, que pede `GET /api/cadastro`, recebe 409
// `sem_negocio` e faz `window.location.replace("/comecar")`.
//
// Funciona, e é tarde demais. Em 17/08/2026 um cliente confirmou a conta pelo e-mail e
// relatou exatamente a sequência que isso produz: **"entrei direto no painel da MAISA, e
// aí de repente voltei pro onboarding"**. Entre uma coisa e outra ele viu a agenda, as
// conversas e os números — todos de fixture, porque não há inquilino — e depois foi
// arrancado dali. O primeiro minuto de uso do produto mostrou dados que não existem e um
// salto que ninguém pediu.
//
// A correção não é acelerar o store: é NÃO PINTAR. `redirect()` aqui acontece no
// servidor, antes de qualquer HTML sair — não há tela intermediária para piscar, porque
// não há tela.
//
// ⚠️ O DESVIO DO STORE CONTINUA LÁ, e não é redundância. Ele cobre o que este não
// alcança: a sessão que perde o negócio com o painel já aberto, e a navegação de cliente
// que não repassa pelo servidor. Este mata o caso comum (a primeira visita), aquele mata
// o raro. Tirar qualquer um dos dois reabre um dos dois.
//
// ── O CUSTO, ESCRITO ──
//
// Uma consulta a `membros` por carregamento do painel. É índice, e o store já fazia a
// mesma pergunta logo em seguida por outro caminho — a diferença é que agora ela acontece
// ANTES do HTML em vez de depois. Se um dia isso pesar, o lugar de resolver é cache de
// sessão, não voltar a pintar primeiro e perguntar depois.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function Page() {
  /* Sem Supabase o app é demonstração aberta: não há login, não há `membros`, e perguntar
   * quem é a pessoa devolveria `null` para todo mundo — o que mandaria a demonstração
   * inteira para o wizard. Mesma porta de saída que `exigirUsuario` usa, pelo mesmo
   * motivo. */
  if (isSupabaseConfigured) {
    const { data: { user } } = await createClient().auth.getUser();

    /* Sem usuário NÃO redireciona para o login: quem faz isso é o middleware, que já
     * barra `/` e leva o `?next=` junto. Duplicar a decisão aqui criaria duas regras de
     * quem entra, e a hora em que elas discordarem é a hora em que ninguém entra. */
    if (user && !(await tenantDoUsuario(user.id))) redirect("/comecar");
  }

  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
