/* rostos-candidatos — busca candidatos no Unsplash e monta uma folha de contato
 * NO MESMO RECORTE que a <Orbita> usa, para a escolha ser feita OLHANDO.
 *
 * POR QUE A FOLHA EXISTE. O `imagens.ts` manda, em caixa alta: "ID entra depois de
 * OLHADO no navegador já neste recorte, não depois de um 200". A razão está lá: com
 * `fit=facearea`, quando o detector não acha rosto a URL responde 200 do mesmo jeito
 * e cai calada num corte central. Foto de nuca, de mão com máquina, de cabelo no
 * chão — todas passam no teste de status e nenhuma serve para um cartão de 80px.
 *
 * USO:  node .claude/rostos-candidatos.mjs
 * SAÍDA: .claude/rostos/folha-N.png (para olhar) e .claude/rostos/candidatos.json
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = resolve(RAIZ, ".claude/rostos");
const PORTA_CDP = 9347;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* As buscas. A primeira é a que o Bruno mandou; as outras existem porque "homens
   cabelo" traz muita nuca e muito cabelo no chão — o que se quer aqui é ROSTO com
   corte visível, e em inglês o acervo é maior. */
const BUSCAS = [
  "homens cabelo",
  "mens haircut portrait",
  "barbershop client portrait",
  "man fresh haircut face",
  "men hairstyle studio portrait",
  "barber shop man smiling",
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Do `urls.raw` sai o id no formato que o `unsplashRosto()` espera. O slug curto da
 *  API (`zwzCvgTi_Wo`) NÃO serve: `images.unsplash.com/photo-` só entende este. */
function idDaUrl(raw) {
  const m = String(raw).match(/photo-([a-z0-9-]+)\?/i);
  return m ? m[1] : null;
}

const rosto = (id, w = 240, facepad = 3.2, razao = 1.25) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=${facepad}&w=${w}&h=${Math.round(w * razao)}&q=80`;

async function conectar(porta) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch {
      await espera(250);
    }
  }
  throw new Error("o Chrome não abriu a porta de depuração");
}

function sessao(ws) {
  let id = 0;
  const pendentes = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, falha } = pendentes.get(m.id);
      pendentes.delete(m.id);
      m.error ? falha(new Error(m.error.message)) : ok(m.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((ok, falha) => {
      const meu = ++id;
      pendentes.set(meu, { ok, falha });
      ws.send(JSON.stringify({ id: meu, method, params, sessionId }));
    });
}

async function main() {
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  /* ── 1. COLETA ── */
  const vistos = new Set();
  const candidatos = [];
  for (const q of BUSCAS) {
    const r = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) {
      console.error(`busca "${q}" falhou: HTTP ${r.status}`);
      continue;
    }
    const j = await r.json();
    for (const foto of j.results ?? []) {
      const id = idDaUrl(foto.urls?.raw);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      candidatos.push({
        id,
        alt: (foto.alt_description || foto.description || "").slice(0, 90),
        busca: q,
        autor: foto.user?.name ?? "",
      });
    }
    await espera(400);
  }
  console.log(`${candidatos.length} candidatos únicos de ${BUSCAS.length} buscas`);
  await writeFile(resolve(SAIDA, "candidatos.json"), JSON.stringify(candidatos, null, 2));

  /* ── 2. A FOLHA ──
     Fundo branco e cartões do tamanho real do cartão da órbita, com o número por
     baixo para eu poder dizer "fica o 7, o 12 e o 19" depois de olhar. */
  const cartao = (c, i) => `
    <figure>
      <img src="${rosto(c.id)}" width="120" height="150" loading="eager" />
      <figcaption>${i}</figcaption>
    </figure>`;

  const POR_FOLHA = 40;
  const folhas = [];
  for (let i = 0; i < candidatos.length; i += POR_FOLHA) folhas.push(candidatos.slice(i, i + POR_FOLHA));

  const url = await conectar(PORTA_CDP);
  const ws = new WebSocket(url);
  await new Promise((ok, falha) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", falha, { once: true });
  });
  const cmd = sessao(ws);
  const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
  const env = (m, p) => cmd(m, p, sessionId);
  await env("Page.enable");
  await env("Runtime.enable");

  for (let f = 0; f < folhas.length; f++) {
    const inicio = f * POR_FOLHA;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:16px;background:#fff;font:600 13px/1 ui-monospace,monospace;color:#0f172a;
           display:grid;grid-template-columns:repeat(10,120px);gap:14px}
      figure{margin:0}
      img{display:block;width:120px;height:150px;object-fit:cover;border-radius:8px;background:#e2e8f0}
      figcaption{padding-top:4px;text-align:center}
    </style>${folhas[f].map((c, i) => cartao(c, inicio + i)).join("")}`;

    await env("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 2, mobile: false });
    await env("Page.navigate", { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
    /* As imagens vêm da rede; sem esperar por elas a folha sai cinza. */
    await env("Runtime.evaluate", {
      expression: `Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = r; i.onerror = r; })))`,
      awaitPromise: true,
    });
    await espera(1200);
    const { result } = await env("Runtime.evaluate", {
      expression: `({ a: document.body.scrollHeight, l: document.body.scrollWidth })`,
      returnByValue: true,
    });
    const { data } = await env("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: result.value.l, height: result.value.a, scale: 1 },
    });
    await writeFile(resolve(SAIDA, `folha-${f}.png`), Buffer.from(data, "base64"));
    console.log(`folha-${f}.png — candidatos ${inicio}..${inicio + folhas[f].length - 1}`);
  }

  chromeKill();
  function chromeKill() {
    chrome.kill();
  }
}

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORTA_CDP}`,
    `--user-data-dir=${resolve(RAIZ, ".auditoria-perfil-rostos")}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    "about:blank",
  ],
  { stdio: "ignore" },
);

main()
  .catch((e) => {
    console.error("FALHOU:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    chrome.kill();
    await espera(1500);
    await rm(resolve(RAIZ, ".auditoria-perfil-rostos"), { recursive: true, force: true }).catch(() => {});
  });
