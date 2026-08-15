"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { s, Icon } from "@/ui/primitivos";
import { createClient } from "@/adaptadores/saida/supabase/client";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/adaptadores/saida/supabase/config";

/* Motivos que /auth/callback devolve, em português de gente. Cada um diz o que
 * aconteceu E o que fazer — "tente de novo" só serve quando tentar de novo pode
 * dar certo, e no caso do provedor desligado nunca dá. */
const MOTIVO: Record<string, string> = {
  provedor_desligado: "O login com Google não está habilitado neste projeto. Entre com e-mail e senha.",
  permissao_negada: "Você não autorizou o acesso à sua conta Google.",
  sem_codigo: "O provedor não devolveu a autorização. Entre com e-mail e senha.",
  troca_falhou: "A autorização expirou antes de virar sessão. Tente entrar de novo.",
  oauth: "Não foi possível concluir o login pelo provedor. Entre com e-mail e senha.",
  auth: "Não foi possível concluir o login. Tente de novo.", // legado: links antigos
};

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const motivo = params.get("error");
  const [erro, setErro] = useState<string | null>(motivo ? (MOTIVO[motivo] ?? MOTIVO.auth) : null);
  const [carregando, setCarregando] = useState(false);

  /* O botão do Google só aparece se o provedor estiver LIGADO no projeto.
   *
   * Sem esta checagem ele navega para o /authorize do Supabase, que responde
   * 400 com um JSON cru — e o usuário, que só queria entrar, encara
   * {"code":400,…,"Unsupported provider"} numa página branca. Um botão que não
   * pode funcionar é pior do que botão nenhum, então some.
   *
   * `null` = ainda checando: some também, para o botão não piscar na tela e
   * sumir. É um GET público no mesmo host que a página já vai conversar. */
  const [googleLigado, setGoogleLigado] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let vivo = true;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY! } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => vivo && setGoogleLigado(Boolean(j?.external?.google)))
      .catch(() => vivo && setGoogleLigado(false));
    return () => { vivo = false; };
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  };

  const entrarGoogle = async () => {
    if (!isSupabaseConfigured) return;
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setErro("Não foi possível iniciar o login com Google.");
      setCarregando(false);
    }
  };

  const inputCss = "width:100%;border:1px solid var(--border);border-radius:12px;padding:13px 14px;font-size:var(--t-body);background:var(--surface);color:var(--ink);outline:none;font-family:inherit";

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", overflow: "hidden" }}>
      {/* brilho de fundo (mesmo idioma calmo do app) */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(60% 55% at 25% 12%, var(--primary-soft) 0%, transparent 60%), radial-gradient(55% 55% at 88% 92%, var(--warm-soft) 0%, transparent 58%)" }} />

      <div className="m-enter" style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 22 }}>
        {/* wordmark dourado sobre navy (contraste) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={s("display:inline-flex;align-items:center;justify-content:center;padding:12px 22px;background:var(--nav);border:1px solid var(--nav-line);border-radius:18px;box-shadow:0 10px 30px oklch(0.22 0.03 262 / 0.22)")}>
            <span style={{ ...s("font-size:var(--t-data);font-weight:var(--w-title);color:var(--warm);line-height:1"), textShadow: "0 1.5px 0 var(--warm-line), 0 3px 5px rgba(0,0,0,.22)" }}>maisa</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={s("font-size:var(--t-title);font-weight:var(--w-title);color:var(--ink)")}>Entrar na MAISA</h1>
            <p style={s("font-size:var(--t-sm);color:var(--muted);margin-top:3px")}>Acesse o painel do seu negócio</p>
          </div>
        </div>

        {/* card */}
        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:26px 24px;display:flex;flex-direction:column;gap:16px")}>
          {!isSupabaseConfigured && (
            <div style={s("display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--warm-soft);color:var(--warn);font-size:var(--t-label);line-height:1.45")}>
              <Icon name="sparkle" size={16} />
              <span><strong>Login ainda não ativado.</strong> Configure o Supabase (chaves no ambiente) para habilitar o acesso. O app segue aberto até lá.</span>
            </div>
          )}

          <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>E-mail</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="m-focus" style={s(inputCss)} disabled={!isSupabaseConfigured || carregando} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>Senha</span>
              <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" className="m-focus" style={s(inputCss)} disabled={!isSupabaseConfigured || carregando} />
            </label>

            {erro && <div style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--danger);background:var(--danger-soft);padding:10px 12px;border-radius:10px")}>{erro}</div>}

            <button type="submit" disabled={!isSupabaseConfigured || carregando} className="m-hov-primary m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:9px;height:48px;border:none;border-radius:12px;background:var(--primary);color:var(--on-primary);font-weight:var(--w-title);font-size:var(--t-body);cursor:${!isSupabaseConfigured || carregando ? "not-allowed" : "pointer"};opacity:${!isSupabaseConfigured || carregando ? ".6" : "1"}`)}>
              {carregando ? <span style={{ ...s("width:17px;height:17px;border:2px solid rgba(255,255,255,.4);border-top-color:var(--on-primary);border-radius:50%"), animation: "mspin .7s linear infinite" }} /> : <Icon name="lock" size={17} sw={2} stroke="var(--on-primary)" />}
              Entrar
            </button>
          </form>

          {googleLigado && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={s("flex:1;height:1px;background:var(--border)")} />
                <span style={s("font-size:var(--t-label);color:var(--muted);font-weight:var(--w-title)")}>ou</span>
                <div style={s("flex:1;height:1px;background:var(--border)")} />
              </div>

              <button onClick={entrarGoogle} disabled={!isSupabaseConfigured || carregando} className="m-hov-bg m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:11px;height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:var(--w-title);font-size:var(--t-sm);cursor:${!isSupabaseConfigured || carregando ? "not-allowed" : "pointer"};opacity:${!isSupabaseConfigured ? ".6" : "1"}`)}>
                <GoogleG /> Continuar com Google
              </button>
            </>
          )}
        </div>

        {/* Até 15/08/2026 aqui dizia "Acesso restrito. As contas são criadas pelo
            administrador — fale com o responsável para receber o seu acesso". Não era
            política de segurança: era a descrição honesta de um produto sem tela de
            cadastro. Com `/cadastro` no ar, a frase virou o convite que ela devia ter
            sido desde sempre. */}
        <p style={s("text-align:center;font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="m-focus" style={s("color:var(--primary);font-weight:var(--w-title)")}>
            Criar conta grátis
          </Link>
          <br />14 dias para testar, sem cartão.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <LoginInner />
    </Suspense>
  );
}
