#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
 * CONFERE O CAMINHO DO E-MAIL — DNS da Resend + estado do Supabase.
 *
 *   npm run email:conferir
 *
 * **Só leitura.** Não escreve em DNS, não escreve no Supabase, não manda e-mail.
 *
 * ── POR QUE ISTO EXISTE ──
 *
 * Porque o e-mail é o degrau mais silencioso do funil. `mailer_autoconfirm` é `false`,
 * então toda conta nova depende de uma mensagem chegar — e o `/assinar` nasce SEM SENHA,
 * de propósito, o que faz do e-mail a única volta para quem já pagou. Quando ele quebra,
 * ninguém vê um erro: as pessoas só não aparecem.
 *
 * Mesma ideia do `abacate:catalogo`: a pergunta "a conta está do jeito que o código
 * espera?" não tem endpoint que responda. Tem que ir lá e olhar cada peça.
 *
 * ── ⚠️ O RESOLVEDOR É O DO GOOGLE E DA CLOUDFLARE, NUNCA O DA MÁQUINA ──
 *
 * Em 21/09/2026 o resolvedor local desta máquina mostrou só o TXT ANTIGO enquanto o
 * 8.8.8.8 e o 1.1.1.1 já tinham o novo. Quem confiasse nele mandaria o Bruno esperar uma
 * propagação que já tinha acontecido. Cache de resolvedor mente, e mente com confiança.
 *
 * ── O QUE ELE NÃO CONSEGUE VER ──
 *
 * Se o SMTP próprio está LIGADO no Supabase, e qual é o `Site URL`. As duas coisas moram
 * na Management API, que pede um PAT que não temos. O script diz isso em vez de fingir.
 * ────────────────────────────────────────────────────────────────────────────── */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resolver } from "node:dns/promises";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOMINIO = "maisasecretary.com.br";

/* ── env, lida do `.env.local` como os outros scripts da pasta ─────────────────── */

function ambiente() {
  const env = { ...process.env };
  try {
    for (const linha of readFileSync(join(RAIZ, ".env.local"), "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* sem .env.local é legítimo: o CI passa por variável de ambiente */ }
  return env;
}

const env = ambiente();
const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const RESEND_KEY = (env.RESEND_API_KEY ?? "").trim();

const resolvedor = new Resolver();
resolvedor.setServers(["8.8.8.8", "1.1.1.1"]);

let faltou = false;
const ok = (t) => console.log(`  \x1b[32m✓\x1b[0m ${t}`);
const nao = (t) => { faltou = true; console.log(`  \x1b[31m✗\x1b[0m ${t}`); };
const nota = (t) => console.log(`  \x1b[90m·\x1b[0m ${t}`);
const titulo = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

const txt = async (nome) => {
  try { return (await resolvedor.resolveTxt(nome)).map((p) => p.join("")); }
  catch { return []; }
};
const mx = async (nome) => {
  try { return await resolvedor.resolveMx(nome); }
  catch { return []; }
};

/* ── 1. o conjunto que a Resend pede ───────────────────────────────────────────
 *
 * A Resend roda sobre Amazon SES. Ela cria `send.<dominio>` como caminho de retorno
 * (MAIL FROM) e o DKIM em `resend._domainkey.<dominio>`.
 *
 * ⚠️ É JUSTAMENTE POR USAR O SUBDOMÍNIO que dá para enviar sem tocar no SPF da raiz — que
 * aqui aponta para a Hostinger e é o que faz o e-mail que o Bruno já usa funcionar.
 * Apagar aquele include para "arrumar o SPF" derruba o e-mail dele. */

titulo("DNS — o que a Resend pede (via 8.8.8.8 / 1.1.1.1)");

const spfEnvio = await txt(`send.${DOMINIO}`);
spfEnvio.some((v) => v.includes("amazonses.com"))
  ? ok(`send.${DOMINIO} SPF → amazonses`)
  : nao(`send.${DOMINIO} sem SPF da Amazon SES`);

const mxEnvio = await mx(`send.${DOMINIO}`);
mxEnvio.some((r) => r.exchange.includes("feedback-smtp"))
  ? ok(`send.${DOMINIO} MX → ${mxEnvio[0].exchange}`)
  : nao(`send.${DOMINIO} sem MX de feedback (bounces somem)`);

const dkim = await txt(`resend._domainkey.${DOMINIO}`);
dkim.some((v) => v.includes("p="))
  ? ok("DKIM presente em resend._domainkey")
  : nao("DKIM ausente — sem ele o DMARC não alinha e a entrega despenca");

const dmarc = await txt(`_dmarc.${DOMINIO}`);
dmarc.length ? ok(`DMARC: ${dmarc[0]}`) : nota("DMARC ausente (não impede envio; melhora reputação)");

titulo("DNS — o que NÃO pode ter sido tocado");

const spfRaiz = await txt(DOMINIO);
spfRaiz.some((v) => v.includes("_spf.mail.hostinger.com"))
  ? ok("SPF da raiz ainda inclui a Hostinger")
  : nao("⚠️ O SPF DA RAIZ PERDEU A HOSTINGER — o e-mail que o Bruno já usa quebra");

const mxRaiz = await mx(DOMINIO);
mxRaiz.some((r) => r.exchange.includes("hostinger"))
  ? ok(`MX da raiz ainda na Hostinger (${mxRaiz.length} registros)`)
  : nao("⚠️ O MX DA RAIZ SAIU DA HOSTINGER — ele para de RECEBER e-mail");

/* ── 2. o Supabase, pelo que a API pública conta ───────────────────────────────── */

titulo("Supabase");

if (!SUPABASE_URL || !SUPABASE_ANON) {
  nao("faltam NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY — não dá para perguntar nada");
} else {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON } });
    const j = await r.json();
    j.external?.email ? ok("provedor de e-mail ligado") : nao("provedor de e-mail DESLIGADO");
    j.disable_signup === false ? ok("cadastro aberto") : nao("cadastro fechado (disable_signup)");
    j.mailer_autoconfirm === false
      ? nota("mailer_autoconfirm: false — toda conta nova DEPENDE do e-mail chegar")
      : nota("mailer_autoconfirm: true — contas entram sem confirmar");
  } catch (e) {
    nao(`não consegui ler /auth/v1/settings: ${e.message}`);
  }
}

nota("SMTP próprio e Site URL não aparecem nesta API — só no painel (Management API pede PAT)");

/* ── 3. a Resend, se houver chave ──────────────────────────────────────────────── */

titulo("Resend");

if (!RESEND_KEY) {
  nota("sem RESEND_API_KEY no ambiente — pulando. (A chave do SMTP mora no painel do");
  nota("Supabase, não aqui; põe uma no .env.local só se quiser esta checagem.)");
} else {
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    });
    if (!r.ok) {
      nao(`a Resend respondeu ${r.status} — chave inválida ou sem permissão`);
    } else {
      const { data = [] } = await r.json();
      const nosso = data.find((d) => d.name === DOMINIO);
      if (!nosso) nao(`${DOMINIO} não está cadastrado nesta conta da Resend`);
      else if (nosso.status === "verified") ok(`${DOMINIO} verificado (região ${nosso.region})`);
      else nao(`${DOMINIO} está "${nosso.status}" — o DNS está no lugar, falta clicar em verificar`);
    }
  } catch (e) {
    nao(`não consegui falar com a Resend: ${e.message}`);
  }
}

titulo(faltou ? "Tem coisa faltando acima." : "Tudo que dá para medir daqui está de pé.");
console.log(
  "\nO que este script NÃO prova: que o e-mail CHEGA. Isso é um cadastro de verdade,\n" +
  "com o link aberto em OUTRO aparelho — o teste que o template antigo reprova.\n" +
  "Passo a passo: 02 Integrações/(C) E-mail transacional — Resend + Supabase.md\n",
);

process.exit(faltou ? 1 : 0);
