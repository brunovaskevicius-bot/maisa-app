import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Porta de entrada: toda requisição passa aqui. Renova a sessão e barra quem não
// está logado (quando o Supabase está configurado). Ver src/lib/supabase/middleware.ts.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Roda em tudo, menos assets estáticos e os arquivos de PWA/ícones.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
