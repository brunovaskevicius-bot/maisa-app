/* ─────────────────────────────────────────────────────────────────────────────
 * REGISTRAR CALLBACK — diz à Rebots para onde mandar o desfecho dos recibos.
 *
 *   npm run callback -- https://algo.trycloudflare.com     (túnel para o dev local)
 *   npm run callback -- https://app.maisasecretary.com.br  (produção, depois do deploy)
 *
 * Passe a BASE; o script acrescenta `/api/recibos/callback`.
 *
 * ── ⚠️ CADA CHAMADA SUBSTITUI A ANTERIOR ──
 *
 * A Rebots guarda UMA url por cliente (`POST /endpoint`, documentado). Registrar o túnel local
 * derruba o registro de produção e vice-versa: enquanto o túnel estiver registrado, uma emissão
 * feita em produção manda o desfecho para a sua máquina — e se ela estiver desligada, o desfecho
 * se perde para sempre, porque a API deles não tem consulta.
 *
 * ── ★ POR QUE ELE TESTA A URL ANTES DE REGISTRAR ──
 *
 * Registrar uma url que responde 307 (porque ficou atrás do login) ou 404 (porque o deploy não
 * subiu) não dá erro nenhum na Rebots: ela aceita, e o silêncio começa depois, um recibo por vez.
 * O sintoma é `pendente` para sempre — o mesmo defeito de "LP fora do PUBLIC_PREFIXES", com a
 * diferença de que aqui o que se perde é documento fiscal.
 *
 * Então: bate na url duas vezes antes. Sem segredo tem que dar 401; com o segredo e corpo vazio,
 * 400. Qualquer outra coisa aborta.
 * ────────────────────────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(process.argv[1], "../..");
for (const linha of fs.readFileSync(path.join(raiz, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (!linha.trim() || linha.trim().startsWith("#") || corte < 0) continue;
  const chave = linha.slice(0, corte).trim();
  if (!process.env[chave]) process.env[chave] = linha.slice(corte + 1).trim().replace(/^["']|["']$/g, "");
}

const BASE_REBOTS = (process.env.REBOTS_BASE_URL || "").replace(/\/+$/, "");
const ID = process.env.REBOTS_IDENTIFICADOR;
const MASTER = process.env.REBOTS_MASTER_KEY;
const SEGREDO = process.env.RECIBOS_CALLBACK_SECRET || process.env.ROTINAS_SECRET;

const baseApp = (process.argv[2] || "").replace(/\/+$/, "");
if (!baseApp || !/^https:\/\//.test(baseApp)) {
  console.error("\nUso: npm run callback -- https://sua-url-publica\n"
    + "A url tem que ser HTTPS e pública — a Rebots chama de fora.\n");
  process.exit(1);
}
if (!BASE_REBOTS || !ID || !MASTER) {
  console.error("Falta REBOTS_BASE_URL, REBOTS_IDENTIFICADOR ou REBOTS_MASTER_KEY no .env.local.");
  process.exit(1);
}
if (!SEGREDO) {
  console.error("Falta RECIBOS_CALLBACK_SECRET no .env.local — sem ele a rota de callback responde 401 a tudo.");
  process.exit(1);
}

const API = `${BASE_REBOTS}/receita-saude/v2`;
const alvo = `${baseApp}/api/recibos/callback`;
const ehSandbox = /sandbox/.test(BASE_REBOTS);

async function bate(comSegredo) {
  const r = await fetch(alvo, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(comSegredo ? { Authorization: `Bearer ${SEGREDO}` } : {}),
    },
    body: "{}",
    redirect: "manual",
  });
  return r.status;
}

async function main() {
  console.log(`\nambiente Rebots: ${ehSandbox ? "SANDBOX" : "⚠️  PRODUÇÃO"}  (${BASE_REBOTS})`);
  console.log(`url do callback: ${alvo}\n`);

  /* ── 1 · a url responde o que a nossa rota responde? ── */
  const semSegredo = await bate(false);
  const comSegredo = await bate(true);
  console.log(`sonda sem segredo: ${semSegredo}  (esperado 401)`);
  console.log(`sonda com segredo: ${comSegredo}  (esperado 400 — corpo vazio)`);

  if (semSegredo !== 401 || comSegredo !== 400) {
    console.error(
      `\n✗ Não registrei nada.\n\n`
      + `  307/308 → a url caiu no redirecionamento de login ou de domínio canônico\n`
      + `  404     → o deploy não tem esta rota ainda\n`
      + `  401/401 → o segredo daqui não é o que está rodando lá (a rota lê o env no boot:\n`
      + `            trocou o .env.local? reinicie o \`npm run dev\`)\n\n`
      + `Registrar assim aceitaria de boa e perderia um recibo por vez, em silêncio.\n`,
    );
    process.exit(1);
  }

  /* ── 2 · token ── */
  const rt = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identificador: ID, master_key: MASTER }),
  });
  const dt = await rt.json().catch(() => null);
  if (!rt.ok || !dt?.access_token) {
    /* Sem ecoar o corpo: um 4xx de autenticação às vezes devolve o que foi mandado, e o que foi
     * mandado aqui é a master_key. */
    console.error(`\n✗ A Rebots recusou a autenticação (${rt.status}). Confira REBOTS_IDENTIFICADOR e REBOTS_MASTER_KEY.\n`);
    process.exit(1);
  }

  /* ── 3 · registra ── */
  const rr = await fetch(`${API}/endpoint`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${dt.access_token}` },
    body: JSON.stringify({ identificador: ID, url: alvo, token: SEGREDO }),
  });
  const dr = await rr.json().catch(() => null);
  if (!rr.ok) {
    console.error(`\n✗ POST /endpoint falhou (${rr.status}): ${JSON.stringify(dr)}\n`);
    process.exit(1);
  }

  console.log(`\n✓ ${dr?.message ?? "registrado"}`);
  console.log(`\n⚠️  Isto SUBSTITUIU a url registrada antes. Se era a de produção, os desfechos de lá`);
  console.log(`   passam a vir para cá — e se esta url morrer (túnel fechado), eles se perdem: a API`);
  console.log(`   da Rebots não tem consulta.\n`);
}

main().catch((e) => { console.error(`\n✗ ${e.message}\n`); process.exit(1); });
