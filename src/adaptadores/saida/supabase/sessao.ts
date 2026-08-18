import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Rotas que NÃO exigem login: a própria tela de login, o callback de OAuth, as APIs
// (as rotas /api fazem a própria checagem de sessão e devolvem 401 em JSON) e as
// landing pages de marketing (públicas por natureza — topo/meio/base de funil).
//
// ⚠️ `/lp` ENTROU EM 14/08/2026, E A FALTA DELE ERA O BUG MAIS CARO DO PRODUTO.
//
// As LPs em `/terapeutas` e `/barbeiros` são rotas do Next; a LP OFICIAL de terapeutas é
// um bundle estático servido de `public/lp/` — e `/lp` nunca esteve nesta lista. Como ela
// é a única página do produto com link de pagamento, o funil inteiro terminava num
// redirect para `/login`: o visitante que clicasse em comprar era mandado para uma tela
// de login de um produto que ele ainda não assinou.
//
// Não quebrou nada visível para quem desenvolve — logado, a página abre. O sintoma era
// zero venda, que é o sintoma que ninguém consegue atribuir a uma linha de código.
// ⚠️ `/barbeiro` É UMA ENTRADA PRÓPRIA, e não um caso do `/barbeiros` abaixo. A
// comparação é por SEGMENTO (`p` ou `p + "/"`), de propósito — sem isso, uma rota futura
// chamada `/barbeiros-admin` entraria de graça. O efeito colateral é que o singular não
// herda nada do plural: as duas LPs de barbearia moram em `/barbeiros` (v3) e `/barbeiro`
// (v4, a variante filmada), e esquecer esta linha põe a segunda atrás do login.
// ⚠️ `/cadastro` ENTROU EM 15/08/2026 e é o caso mais óbvio de todos: barrar a tela de
// criar conta redireciona para o login exatamente quem não tem login — o laço perfeito, e
// invisível para quem desenvolve porque desenvolvedor já está logado. Mesma família do
// `/lp` acima, e a mesma consequência: zero venda.
const PUBLIC_PREFIXES = [
  "/login", "/cadastro", "/auth", "/api", "/lp", "/barbeiro", "/barbeiros", "/terapeutas",
  /* ⚠️ JURÍDICAS SÃO PÚBLICAS POR EXIGÊNCIA EXTERNA, não por conveniência. O Google
   * confere as URLs de privacidade e termos ao verificar um app que pede escopo sensível —
   * e `calendar.events` é sensível. Atrás do login, o revisor abre a política e vê um
   * formulário de senha: reprovação, e a fila leva semanas para tentar de novo.
   * Também são as URLs que o rodapé do produto aponta para o próprio cliente. */
  "/privacidade", "/termos",
  /* ⚠️ `/esqueci` é PÚBLICA pela razão mais óbvia possível: ela atende exatamente quem
   * NÃO consegue fazer login. Atrás do middleware, ela mandaria a pessoa para o login —
   * que é o lugar de onde ela veio e onde ela não entra. O laço perfeito.
   *
   * `/nova-senha` NÃO entra aqui de propósito: só faz sentido com sessão, e o link de
   * recuperação já cria uma ao passar pelo `/auth/callback`. */
  "/esqueci",
];

/* Exportada para o teste. É a única função deste arquivo que decide quem entra, e o
 * defeito que ela teve não aparecia em nenhuma tela — só no faturamento. */
export const isPublic = (path: string) =>
  PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

export async function updateSession(request: NextRequest) {
  // Auth desligado (sem chaves) → não bloqueia nada. App segue como demo aberta.
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalida o token no Supabase (não confie só no cookie).
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Não logado tentando acessar área protegida → manda pro login (guardando o destino).
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Já logado tentando ver o /login → manda pro app.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
