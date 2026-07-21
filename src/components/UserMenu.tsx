"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Chip do usuário logado + botão Sair, no rodapé da sidebar.
// Não renderiza nada quando o auth está desligado ou ninguém está logado
// → o app como demo aberta fica idêntico.
export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured || !email) return null;

  const sair = async () => {
    setSaindo(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const inicial = email[0]?.toUpperCase() || "?";

  return (
    <div style={s("margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--nav-active)")}>
      <div style={s("width:34px;height:34px;flex-shrink:0;border-radius:10px;background:var(--nav-accent);color:var(--nav);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px")}>{inicial}</div>
      <div style={s("min-width:0;flex:1;line-height:1.25")}>
        <div style={s("font-size:11px;color:var(--nav-muted);font-weight:600")}>Conectado</div>
        <div style={{ ...s("font-size:12.5px;font-weight:700;color:var(--nav-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis") }} title={email}>{email}</div>
      </div>
      <button onClick={sair} disabled={saindo} aria-label="Sair" title="Sair" className="m-press m-focus" style={s("width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid var(--nav-line);border-radius:10px;background:transparent;color:var(--nav-muted);cursor:pointer")}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
      </button>
    </div>
  );
}
