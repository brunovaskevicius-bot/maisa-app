import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Rotas que NÃO exigem login: a própria tela de login, o callback de OAuth e as APIs
// (as rotas /api fazem a própria checagem de sessão e devolvem 401 em JSON).
const PUBLIC_PREFIXES = ["/login", "/auth", "/api"];

const isPublic = (path: string) =>
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
