"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * CRIAR CONTA — a porta que o produto não tinha.
 *
 * Até 15/08/2026 o `/login` terminava com "Acesso restrito. As contas são criadas pelo
 * administrador — fale com o responsável para receber o seu acesso". Não era um texto de
 * segurança: era a descrição honesta do produto. Não existia UMA chamada a `signUp` no
 * repositório inteiro, então toda conta nascia de alguém abrindo o painel do Supabase.
 *
 * Um SaaS em que o primeiro passo do funil exige uma pessoa não se vende sozinho — e o
 * resto do funil não importa se ninguém entra nele. É a mesma frase que justificou o
 * `POST /api/negocio` (ver o cabeçalho daquela rota); esta tela é o degrau ANTERIOR, que
 * ficou faltando: aquela rota cria o NEGÓCIO de quem já tem conta, e conta ninguém tinha
 * como criar.
 *
 * ── ESTA TELA É IRMÃ DO `/login`, NÃO UMA VARIAÇÃO DELE ──
 *
 * Mesmo cartão, mesmo wordmark, mesma checagem do provedor Google. O que muda é o modo de
 * falhar, e é isso que impediu de virar um `?modo=cadastro` na tela de login: entrar erra
 * de um jeito só ("e-mail ou senha inválidos") e cadastrar erra de quatro, sendo que dois
 * deles não são erro nenhum — e-mail já cadastrado e "deu certo, agora vá para a sua
 * caixa de entrada". Um formulário com dois conjuntos de estado é o formulário onde uma
 * das mensagens sai no lugar da outra.
 *
 * ⚠️ ROTA PÚBLICA. Precisa estar em `PUBLIC_PREFIXES` (`saida/supabase/sessao.ts`), senão
 * o middleware manda para o login quem estava indo criar conta — o laço perfeito. A
 * checagem é por SEGMENTO, então `/cadastro` não herda nada de outro prefixo. Há teste.
 * ────────────────────────────────────────────────────────────────────────────── */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { s, Icon } from "@/ui/primitivos";
import { createClient } from "@/adaptadores/saida/supabase/client";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/adaptadores/saida/supabase/config";

/**
 * Piso da senha.
 *
 * O mínimo do Supabase neste projeto é 6. Aqui são 8 de propósito: ser MAIS estrito que o
 * servidor nunca produz surpresa (o que passa daqui o servidor aceita), enquanto ser mais
 * frouxo produziria a pior sequência possível — o formulário aprova, a API recusa, e a
 * pessoa lê um erro em inglês vindo do Supabase sobre um campo que a tela disse estar bom.
 */
const SENHA_MIN = 8;

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

const inputCss =
  "width:100%;border:1px solid var(--border);border-radius:12px;padding:13px 14px;font-size:var(--t-body);background:var(--surface);color:var(--ink);outline:none;font-family:inherit";

function CadastroInner() {
  const params = useSearchParams();

  /* De onde a pessoa veio. `stripe` é o único valor que muda a tela hoje: quem acabou de
   * pagar chega aqui pela `success_url` do checkout e precisa ler que a compra deu certo
   * ANTES de encarar mais um formulário — senão a leitura é "paguei e agora estão me
   * pedindo cadastro de novo?". Valor desconhecido é ignorado, nunca ecoado: é query
   * string, ou seja, texto de terceiro. */
  const veioDoPagamento = params.get("origem") === "stripe";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  /** Sucesso é TELA, não aviso. Guarda o e-mail porque a instrução precisa dizer qual. */
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  /* Mesma checagem do `/login`: o botão do Google só existe se o provedor estiver LIGADO
   * no projeto. Sem ela, ele navega para o `/authorize` do Supabase e devolve um JSON cru
   * numa página branca. Medido em 15/08/2026: neste projeto `external.google` é `false` —
   * o botão não aparece em nenhuma das duas telas hoje, e as duas voltam a mostrá-lo no
   * dia em que o provedor for ligado, sem tocar em código. */
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

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setErro(null);

    const alvo = email.trim();

    if (senha.length < SENHA_MIN) {
      setErro(`A senha precisa de pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    /* A confirmação existe por causa de um beco sem saída, não por formalidade: a conta
     * só nasce depois de a pessoa sair do app e clicar no e-mail. Com a senha digitada
     * errado, ela confirma o e-mail, volta e não consegue entrar. O erro só apareceria
     * minutos depois, longe do campo que o causou.
     *
     * ⚠️ Este comentário dizia "e este produto AINDA NÃO TEM tela de recuperar senha".
     * Passou a ter em 17/08/2026 (`/esqueci`), então o beco deixou de ser sem saída — mas
     * a confirmação FICA: descobrir o erro aqui, no campo que o causou, continua sendo
     * muito melhor que descobrir dez minutos depois e ter que pedir outro e-mail. */
    if (senha !== confirma) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: alvo,
      password: senha,
      options: {
        /* Para onde o link do e-mail devolve. `/auth/callback` transforma o que veio na
         * URL em sessão — é o MESMO caminho do OAuth, e o comentário de lá diz isso.
         *
         * ⚠️ `next=/comecar` E NÃO `next=/`. Quem acaba de confirmar o e-mail é, por
         * definição, alguém que ainda não tem negócio: mandá-lo ao painel o fazia bater
         * num 409 `sem_negocio` e ser reexpulso para `/comecar` pelo store. Funcionava por
         * ricochete, e ricochete só funciona enquanto todo mundo no caminho concorda —
         * bastava o painel demorar a montar para a pessoa ver uma tela quebrada no
         * primeiro segundo de uso. Ir direto tira um salto e um estado intermediário.
         *
         * ⚠️ E ESTE ENDEREÇO PRECISA ESTAR EM **Redirect URLs** NO PAINEL DO SUPABASE.
         * Fora da lista, o Supabase IGNORA o `emailRedirectTo` em silêncio e usa o Site
         * URL do projeto — que não é `/auth/callback`, então não há `?code=` para trocar,
         * e a pessoa cai numa tela de login limpa logo depois de confirmar a conta. É
         * configuração, não código: `RecuperarSessaoDaUrl` é a rede de segurança, não o
         * conserto. */
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fcomecar`,
      },
    });

    if (error) {
      /* A mensagem do Supabase vem em inglês e fala de "user"/"credentials". Traduzir os
       * dois casos que a pessoa pode CONSERTAR, e cair numa frase honesta no resto —
       * ecoar o texto cru transformaria a resposta da API no texto da nossa tela. */
      const m = error.message.toLowerCase();
      if (/password/.test(m)) setErro(`A senha precisa de pelo menos ${SENHA_MIN} caracteres.`);
      else if (/email|invalid/.test(m)) setErro("Confira o e-mail digitado.");
      else if (/rate|limit|seconds/.test(m)) setErro("Muitas tentativas seguidas. Espere um minuto e tente de novo.");
      else setErro("Não foi possível criar a conta agora. Tente de novo em instantes.");
      setCarregando(false);
      return;
    }

    /* ⚠️ E-MAIL JÁ CADASTRADO NÃO VEM COMO ERRO.
     *
     * O Supabase responde 200 com um usuário de `identities` VAZIO quando o e-mail já
     * existe — é a defesa dele contra alguém usar o cadastro para descobrir quem tem
     * conta. O efeito colateral, se ninguém tratar, é o pior beco do fluxo: a tela diz
     * "confira sua caixa de entrada", nenhum e-mail chega (porque não há o que confirmar),
     * e a pessoa espera por algo que não vem.
     *
     * Preferimos dizer. Quem digita um e-mail no cadastro pode digitá-lo no login e ver o
     * mesmo resultado por outro caminho, então o que se ganha em sigilo aqui é quase
     * nada — e o que se perde em silêncio é um cliente parado olhando a caixa de entrada.
     */
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setErro("Este e-mail já tem uma conta. Entre por aqui embaixo.");
      setCarregando(false);
      return;
    }

    setEnviadoPara(alvo);
    setCarregando(false);
  };

  const criarComGoogle = async () => {
    if (!isSupabaseConfigured) return;
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    /* Entrar e cadastrar são a MESMA chamada no OAuth — o provedor não distingue, e o
     * Supabase cria a conta no primeiro acesso. Por isso não há um `signUp` social. */
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      /* Mesmo destino do cadastro por e-mail: quem entra pelo Google a partir da tela de
       * CADASTRO também está começando, e o painel não é o lugar de quem não tem negócio.
       * Quem já tem cai em `/comecar`, a retomada pergunta ao mundo e o wizard o manda
       * adiante — nenhum passo se repete. */
      options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Fcomecar` },
    });
    if (error) {
      setErro("Não foi possível continuar com o Google.");
      setCarregando(false);
    }
  };

  const travado = !isSupabaseConfigured || carregando;

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(60% 55% at 25% 12%, var(--primary-soft) 0%, transparent 60%), radial-gradient(55% 55% at 88% 92%, var(--warm-soft) 0%, transparent 58%)" }} />

      <div className="m-enter" style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={s("display:inline-flex;align-items:center;justify-content:center;padding:12px 22px;background:var(--nav);border:1px solid var(--nav-line);border-radius:18px;box-shadow:0 10px 30px oklch(0.22 0.03 262 / 0.22)")}>
            <span style={{ ...s("font-size:var(--t-data);font-weight:var(--w-title);color:var(--warm);line-height:1"), textShadow: "0 1.5px 0 var(--warm-line), 0 3px 5px rgba(0,0,0,.22)" }}>maisa</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={s("font-size:var(--t-title);font-weight:var(--w-title);color:var(--ink)")}>
              {enviadoPara ? "Confirme seu e-mail" : "Criar sua conta"}
            </h1>
            <p style={s("font-size:var(--t-sm);color:var(--muted);margin-top:3px")}>
              {enviadoPara ? "Falta um clique para começar" : "14 dias grátis — sem cartão"}
            </p>
          </div>
        </div>

        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:26px 24px;display:flex;flex-direction:column;gap:16px")}>
          {/* ── estado de sucesso: SUBSTITUI o formulário ──
              Não é toast e não é faixa acima dos campos. A pessoa vai SAIR do app agora,
              abrir outro aplicativo e voltar — e o que ela precisa levar na cabeça é
              "procure um e-mail da maisa". Um formulário ainda visível ao lado disso
              convida a tentar de novo, o que só gera um segundo e-mail e mais confusão
              sobre qual link vale. */}
          {enviadoPara ? (
            <>
              <div style={s("display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:999px;background:var(--success-soft);align-self:center")}>
                <Icon name="check" size={24} sw={2.2} stroke="var(--success)" />
              </div>
              <p style={s("font-size:var(--t-body);color:var(--ink);line-height:1.5;text-align:center")}>
                Enviamos um link de confirmação para<br />
                <strong style={s("font-weight:var(--w-title)")}>{enviadoPara}</strong>
              </p>
              <p style={s("font-size:var(--t-sm);color:var(--muted);line-height:1.5;text-align:center")}>
                Clique no link para entrar e configurar seu negócio. Se ele não aparecer em
                alguns minutos, <strong style={s("font-weight:var(--w-title);color:var(--ink)")}>olhe o spam</strong> — é
                onde e-mail de confirmação costuma cair.
              </p>
              <button
                onClick={() => { setEnviadoPara(null); setSenha(""); setConfirma(""); }}
                className="m-hov-bg m-press m-focus"
                style={s("height:44px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:var(--w-title);font-size:var(--t-sm);cursor:pointer;font-family:inherit")}
              >
                Digitei o e-mail errado
              </button>
            </>
          ) : (
            <>
              {!isSupabaseConfigured && (
                <div style={s("display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--warm-soft);color:var(--warn);font-size:var(--t-label);line-height:1.45")}>
                  <Icon name="sparkle" size={16} />
                  <span><strong>Cadastro ainda não ativado.</strong> Configure o Supabase (chaves no ambiente) para habilitar contas novas.</span>
                </div>
              )}

              {veioDoPagamento && (
                <div style={s("display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--success-soft);color:var(--success);font-size:var(--t-label);line-height:1.45")}>
                  <Icon name="check" size={16} sw={2.2} />
                  <span><strong>Pagamento recebido.</strong> Crie sua conta com o mesmo e-mail da compra para a gente ligar as duas.</span>
                </div>
              )}

              <form onSubmit={criar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>E-mail</span>
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="m-focus" style={s(inputCss)} disabled={travado} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>Senha</span>
                  <input type="password" required autoComplete="new-password" minLength={SENHA_MIN} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={`Pelo menos ${SENHA_MIN} caracteres`} className="m-focus" style={s(inputCss)} disabled={travado} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>Repita a senha</span>
                  <input type="password" required autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="••••••••" className="m-focus" style={s(inputCss)} disabled={travado} />
                </label>

                {erro && <div style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--danger);background:var(--danger-soft);padding:10px 12px;border-radius:10px;line-height:1.45")}>{erro}</div>}

                <button type="submit" disabled={travado} className="m-hov-primary m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:9px;height:48px;border:none;border-radius:12px;background:var(--primary);color:var(--on-primary);font-weight:var(--w-title);font-size:var(--t-body);cursor:${travado ? "not-allowed" : "pointer"};opacity:${travado ? ".6" : "1"};font-family:inherit`)}>
                  {carregando ? <span style={{ ...s("width:17px;height:17px;border:2px solid rgba(255,255,255,.4);border-top-color:var(--on-primary);border-radius:50%"), animation: "mspin .7s linear infinite" }} /> : <Icon name="sparkle" size={17} sw={2} stroke="var(--on-primary)" />}
                  Criar conta grátis
                </button>
              </form>

              {googleLigado && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={s("flex:1;height:1px;background:var(--border)")} />
                    <span style={s("font-size:var(--t-label);color:var(--muted);font-weight:var(--w-title)")}>ou</span>
                    <div style={s("flex:1;height:1px;background:var(--border)")} />
                  </div>
                  <button onClick={criarComGoogle} disabled={travado} className="m-hov-bg m-press m-focus" style={s(`display:flex;align-items:center;justify-content:center;gap:11px;height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font-weight:var(--w-title);font-size:var(--t-sm);cursor:${travado ? "not-allowed" : "pointer"};opacity:${travado ? ".6" : "1"};font-family:inherit`)}>
                    <GoogleG /> Continuar com Google
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <p style={s("text-align:center;font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
          Já tem conta?{" "}
          <Link href="/login" className="m-focus" style={s("color:var(--primary);font-weight:var(--w-title)")}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

/* `useSearchParams` obriga a fronteira de Suspense no App Router — sem ela a página
 * inteira vira renderização sob demanda no build. Mesmo arranjo do `/login`. */
export default function CadastroPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <CadastroInner />
    </Suspense>
  );
}
