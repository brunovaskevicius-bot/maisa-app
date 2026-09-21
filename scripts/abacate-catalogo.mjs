#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
 * PROVISIONA A CONTA DA ABACATEPAY — os três produtos e o webhook.
 *
 *   node scripts/abacate-catalogo.mjs            → mostra o que falta, NÃO escreve
 *   node scripts/abacate-catalogo.mjs --aplicar  → cria o que falta
 *
 * ── POR QUE ISTO É UM SCRIPT E NÃO UM PASSO NO CÓDIGO DO APP ──
 *
 * Porque criar produto é operação de CATÁLOGO, e catálogo muda quando o preço muda — o
 * que acontece uma vez por semestre, não uma vez por request. Um `ensureProduct()` dentro
 * do `abrirCheckout` gastaria dois round-trips em cada clique em "assinar" para garantir
 * algo que já está garantido, e daria ao app em produção a permissão de ESCREVER no
 * catálogo. Chave que pode criar produto é chave que pode criar produto de R$ 0,01.
 *
 * ── ⚠️ O QUE ELE NÃO FAZ ──
 *
 * Não muda preço de produto que já existe. A AbacatePay não documenta `products/update`, e
 * a operação certa quando um preço muda é a mesma da Stripe: **criar produto novo com
 * `externalId` novo** e apontar o código para ele. Quem já assinou continua no valor que
 * contratou — que é o comportamento correto e, no Brasil, o exigido.
 *
 * Por isso, se um preço divergir, este script AVISA e não corrige. Corrigir em silêncio
 * mudaria o valor cobrado de quem já é cliente.
 *
 * ⚠️ ESCREVE NA CONTA A QUE A CHAVE PERTENCE. Com uma chave `prod_`, escreve na conta que
 * cobra dinheiro de verdade. O modo padrão é só leitura justamente por isso.
 * ────────────────────────────────────────────────────────────────────────────── */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://api.abacatepay.com/v2";
const APLICAR = process.argv.includes("--aplicar");

/* ── as env vars, lidas do `.env.local` como os outros scripts da pasta ────────── */

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
const CHAVE = (env.ABACATEPAY_API_KEY ?? "").trim();
const SEGREDO_WEBHOOK = (env.ABACATEPAY_WEBHOOK_SECRET ?? "").trim();
const URL_PUBLICA = (env.MAISA_PUBLIC_URL ?? "").trim();

if (!CHAVE) {
  console.error("✗ falta ABACATEPAY_API_KEY (no .env.local ou no ambiente).");
  process.exit(1);
}

const EH_PRODUCAO = CHAVE.startsWith("prod_");

/* ── o catálogo: a MESMA verdade que o código usa ──────────────────────────────
 *
 * ⚠️ OS `externalId` SÃO LIDOS DE `config.ts` E OS PREÇOS DE `_lib/planos.ts`, por regex.
 * Redigitar qualquer um dos dois aqui criaria a terceira tabela de preço deste projeto —
 * e o cabeçalho de `_lib/planos.ts` conta o que aconteceu quando havia duas. Ler o
 * arquivo como texto é feio e é certo: um `.mjs` não importa `.ts`, e o `planos.test.ts`
 * já usa exatamente esta técnica. */

function doCodigo() {
  const cfg = readFileSync(join(RAIZ, "src/adaptadores/saida/abacatepay/config.ts"), "utf8");
  const bloco = cfg.match(/export const CATALOGO[^=]*=\s*\{([^}]+)\}/)?.[1] ?? "";
  const externos = Object.fromEntries(
    [...bloco.matchAll(/(\w+)\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );

  const lp = readFileSync(join(RAIZ, "src/app/(marketing)/_lib/planos.ts"), "utf8");
  const precos = Object.fromEntries(
    [...lp.matchAll(/chave:\s*"(\w+)"[\s\S]{0,200}?preco:\s*"R\$\s*([\d.]+)"/g)]
      .map((m) => [m[1], Number(m[2].replace(/\./g, "")) * 100]),
  );

  const planos = Object.keys(externos);
  const faltamPreco = planos.filter((p) => !precos[p]);
  if (faltamPreco.length) {
    console.error(`✗ não achei o preço de ${faltamPreco.join(", ")} em _lib/planos.ts.`);
    console.error("  O regex depende do formato `chave: <x>` … `preco: \"R$ N\"` em _lib/planos.ts.");
    process.exit(1);
  }

  return planos.map((chave) => ({
    chave,
    externalId: externos[chave],
    /* Centavos. É o que a API espera, em todo endpoint. */
    price: precos[chave],
    name: `MAISA ${chave[0].toUpperCase()}${chave.slice(1)}`,
    currency: "BRL",
    cycle: "MONTHLY",
  }));
}

/* ── o cliente HTTP, mínimo ─────────────────────────────────────────────────── */

async function api(caminho, corpo) {
  const r = await fetch(`${BASE}${caminho}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${CHAVE}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  const texto = await r.text();
  let env_;
  try { env_ = JSON.parse(texto); } catch {
    throw new Error(`${caminho}: HTTP ${r.status}, resposta não-JSON: ${texto.slice(0, 200)}`);
  }

  /* ⚠️ O ERRO VEM COM 200. Mesmo motivo detalhado em `saida/abacatepay/cliente.ts`. */
  if (!r.ok || env_.error) {
    throw new Error(`${caminho}: HTTP ${r.status} — ${env_.error ?? texto.slice(0, 200)}`);
  }
  return env_.data;
}

/* ── o trabalho ─────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`\nAbacatePay · conta da chave ${CHAVE.slice(0, 9)}…`);
  console.log(EH_PRODUCAO
    ? "⚠️  PRODUÇÃO — esta conta cobra dinheiro de verdade."
    : "   dev mode — pagamentos simulados.");
  console.log(APLICAR ? "   modo: APLICAR (escreve)\n" : "   modo: conferir (não escreve)\n");

  /* Confirma que a chave fala com a conta antes de qualquer coisa. Erro aqui é 401/403, e
   * a diferença entre os dois importa: 403 é permissão faltando na chave. */
  const loja = await api("/stores/get");
  console.log(`loja: ${loja?.name ?? "(sem nome)"}\n`);

  /* ── 1. os produtos ── */
  const existentes = await api("/products/list");
  const porExterno = new Map((existentes ?? []).map((p) => [p.externalId, p]));

  let criados = 0;
  let divergentes = 0;

  console.log("PRODUTOS");
  for (const alvo of doCodigo()) {
    const achado = porExterno.get(alvo.externalId);

    if (!achado) {
      if (APLICAR) {
        const novo = await api("/products/create", {
          externalId: alvo.externalId,
          name: alvo.name,
          price: alvo.price,
          currency: alvo.currency,
          cycle: alvo.cycle,
        });
        console.log(`  + criado  ${alvo.externalId}  R$ ${(alvo.price / 100).toFixed(2)}  → ${novo.id}`);
        criados++;
      } else {
        console.log(`  · FALTA   ${alvo.externalId}  R$ ${(alvo.price / 100).toFixed(2)}`);
        criados++;
      }
      continue;
    }

    const problemas = [];
    if (achado.price !== alvo.price) {
      problemas.push(`preço lá é R$ ${(achado.price / 100).toFixed(2)}, código diz R$ ${(alvo.price / 100).toFixed(2)}`);
    }
    /* ⚠️ Produto sem ciclo não serve para assinatura, e o erro da API não diz isso. */
    if (!achado.cycle) problemas.push("sem `cycle` — não serve para assinatura");
    if ((achado.status ?? "ACTIVE") !== "ACTIVE") problemas.push(`status ${achado.status}`);

    if (problemas.length) {
      console.log(`  ! ${alvo.externalId}  ${problemas.join("; ")}`);
      divergentes++;
    } else {
      console.log(`  ✓ ${alvo.externalId}  R$ ${(achado.price / 100).toFixed(2)}  ${achado.id}`);
    }
  }

  /* ── 2. o webhook ── */
  console.log("\nWEBHOOK");
  const EVENTOS = [
    "subscription.completed",
    "subscription.renewed",
    "subscription.cancelled",
    "subscription.trial_started",
    "subscription.payment_failed",
    "subscription.plan_changed",
  ];

  if (!SEGREDO_WEBHOOK || !URL_PUBLICA) {
    console.log("  · pulado: falta "
      + [!SEGREDO_WEBHOOK && "ABACATEPAY_WEBHOOK_SECRET", !URL_PUBLICA && "MAISA_PUBLIC_URL"]
        .filter(Boolean).join(" e "));
  } else {
    /* ⚠️ O SEGREDO VAI NO CAMPO `secret`, E ELES O DEVOLVEM NA QUERY STRING de cada POST.
     * Não é um HMAC secret — ver `entrada/abacatepay/LEIA-ME.md`. */
    const alvo = `${URL_PUBLICA.replace(/\/$/, "")}/api/abacatepay/webhook`;
    const jaTem = (await api("/webhooks/list").catch(() => []))
      ?.find((w) => w.endpoint?.startsWith(alvo));

    if (jaTem) {
      const faltam = EVENTOS.filter((e) => !(jaTem.events ?? []).includes(e));
      console.log(faltam.length
        ? `  ! ${jaTem.id} existe, mas NÃO escuta: ${faltam.join(", ")}`
        : `  ✓ ${jaTem.id} → ${alvo}`);
      if (faltam.length) divergentes++;
    } else if (APLICAR) {
      const novo = await api("/webhooks/create", {
        name: "MAISA — assinaturas",
        endpoint: alvo,
        secret: SEGREDO_WEBHOOK,
        events: EVENTOS,
      });
      console.log(`  + criado  ${novo.id} → ${alvo}`);
      criados++;
    } else {
      console.log(`  · FALTA   ${alvo}`);
      criados++;
    }
  }

  /* ── 3. o veredito ── */
  console.log("");
  if (divergentes) {
    console.log(`⚠️  ${divergentes} divergência(s). Este script NÃO corrige preço de produto que`);
    console.log("    já existe — mudar o valor cobraria diferente de quem já assinou. Crie um");
    console.log("    produto novo com `externalId` novo e aponte `CATALOGO` em config.ts.");
  }
  if (criados && !APLICAR) {
    console.log(`→ ${criados} item(ns) a criar. Rode de novo com --aplicar.`);
  }
  if (!criados && !divergentes) {
    console.log("✓ A conta está do jeito que o código espera.");
    if (!EH_PRODUCAO) {
      console.log("\n  Próximo passo: `abacatepay -l listen --forward-to");
      console.log('  "http://localhost:3100/api/abacatepay/webhook?webhookSecret=$ABACATEPAY_WEBHOOK_SECRET"`');
      console.log("  ⚠️ sem o ?webhookSecret= no --forward-to, todo evento local volta 401.");
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  /* 403 é permissão faltando na chave, não chave errada — a distinção economiza a tarde de
   * quem for investigar. As permissões estão em `saida/abacatepay/LEIA-ME.md`. */
  if (String(e.message).includes("403")) {
    console.error("  403 = a chave é válida mas falta escopo. Veja as permissões no LEIA-ME");
    console.error("  de src/adaptadores/saida/abacatepay/.\n");
  }
  process.exit(1);
});
