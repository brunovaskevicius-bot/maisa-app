import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Cliente Supabase para o servidor (Server Components, Route Handlers, API).
// Lê/escreve a sessão via cookies. Em RSC o set pode falhar (não pode gravar cookie) —
// o middleware é quem renova a sessão, então o try/catch é seguro.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* chamado de um Server Component — ok, o middleware renova a sessão */
        }
      },
    },
  });
}
