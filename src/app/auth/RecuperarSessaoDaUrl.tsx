"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * A SESSÃO QUE CHEGA NO FRAGMENTO DA URL — o caso que o servidor não tem como ver.
 *
 * ── POR QUE ISTO PRECISA EXISTIR NO NAVEGADOR ──
 *
 * No fluxo implícito, o Supabase devolve a sessão assim:
 *
 *     https://app/…#access_token=…&refresh_token=…&type=signup
 *
 * O que vem depois do `#` **nunca é enviado ao servidor**. Nem o middleware, nem
 * `/auth/callback`, nem uma rota qualquer conseguem lê-lo — não é escolha de desenho,
 * é como o HTTP funciona. Então essa sessão só pode ser recolhida por código de
 * navegador, e é isto aqui.
 *
 * ── O SINTOMA QUE ISTO CONSERTA ──
 *
 * Uma tela de login LIMPA, sem mensagem de erro nenhuma, depois de clicar no link de
 * confirmação. A sequência é: o link devolve para uma rota protegida com o token no
 * fragmento → o middleware olha os cookies, não acha sessão, e manda para `/login?next=`
 * → o fragmento sobrevive ao redirecionamento (o navegador o preserva quando a URL de
 * destino não traz um próprio) → e ninguém nunca o lê. A pessoa fica olhando um
 * formulário de login logo depois de ter confirmado a conta, e conclui que perdeu tudo.
 *
 * ── QUANDO ELE ACONTECE ──
 *
 * Quando o `emailRedirectTo` não está na lista de **Redirect URLs** do painel do
 * Supabase. Nesse caso o Supabase IGNORA o endereço pedido e usa o **Site URL** do
 * projeto, que não é `/auth/callback` — e aí não há `?code=` para trocar. A causa é
 * configuração, não código; este componente é a rede de segurança para quando ela
 * estiver errada, e não substituto de arrumá-la.
 * ────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { createClient } from "@/adaptadores/saida/supabase/client";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
/* ⚠️ PELO CAMINHO DIRETO, não pelo barril `@/nucleo/dominio` — este arquivo é
 * `"use client"` e o barril arrastaria o domínio inteiro para o bundle.
 *
 * Até 22/09/2026 estas três linhas estavam reescritas aqui dentro, com o motivo anotado:
 * `saida/google/config` é módulo de servidor e importá-lo puxaria `GOOGLE_CLIENT_SECRET`
 * para o navegador. O motivo continua valendo; o que mudou é que a função saiu de lá e
 * foi para o núcleo, onde os dois lados alcançam a MESMA linha. */
import { caminhoDeVolta } from "@/nucleo/dominio/caminho-de-volta";

export function RecuperarSessaoDaUrl() {
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const bruto = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!bruto) return;
    const frag = new URLSearchParams(bruto);

    /* O fracasso também vem pelo fragmento, e é o caso mais comum depois do sucesso: link
     * de confirmação vencido. Sem ler isto, um link velho produziria exatamente a mesma
     * tela de login muda que este arquivo existe para acabar. */
    if (frag.get("error")) {
      const desc = frag.get("error_description") ?? "";
      setErro(
        /expired|invalid/i.test(desc)
          ? "O link de confirmação venceu. Entre com seu e-mail e senha — sua conta já existe."
          : "Não foi possível concluir a confirmação por esse link. Entre com e-mail e senha.",
      );
      /* Limpa o fragmento: sem isso, um F5 repete o mesmo aviso para sempre e a pessoa
       * não consegue usar o formulário que está bem na frente dela. */
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    const access_token = frag.get("access_token");
    const refresh_token = frag.get("refresh_token");
    if (!access_token || !refresh_token) return;

    let vivo = true;
    void (async () => {
      const { error } = await createClient().auth.setSession({ access_token, refresh_token });
      if (!vivo) return;
      if (error) {
        setErro("Não foi possível concluir a confirmação por esse link. Entre com e-mail e senha.");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }

      /* `location.replace` e não `router.push`: a sessão nova mora em cookie, e é o
       * SERVIDOR (middleware e rotas) que precisa enxergá-la. Uma navegação de cliente
       * reaproveitaria a árvore React já montada com o estado de "deslogado", e a pessoa
       * veria o painel meio carregado antes de qualquer coisa funcionar.
       *
       * `replace` também tira esta URL do histórico — com `push`, o botão "voltar" traria
       * de volta um fragmento já consumido, que não vira sessão duas vezes. */
      const destino = caminhoDeVolta(new URLSearchParams(window.location.search).get("next"));
      window.location.replace(destino);
    })();

    return () => { vivo = false; };
  }, []);

  if (!erro) return null;

  return (
    <div
      role="alert"
      style={{
        marginBottom: 14, padding: "11px 13px", borderRadius: 12,
        background: "var(--warn-soft)", color: "var(--warn)",
        fontSize: "var(--t-sm)", lineHeight: 1.45, fontWeight: "var(--w-title)" as never,
      }}
    >
      {erro}
    </div>
  );
}
