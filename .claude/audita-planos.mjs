/* audita-planos — mede e fotografa a seção <Planos> da LP /barbeiros/v3.
 *
 * DESCARTÁVEL, como o audita-duelo.mjs, e a plumbing de CDP é a mesma.
 *
 * O QUE SE QUER SABER:
 *   · a página ganhou rolagem horizontal?
 *   · os três cartões terminam na mesma linha? (os botões dependem disso)
 *   · o do meio é mesmo maior, e por quanto?
 *   · os botões têm ≥48px de altura (alvo de toque)?
 *   · para onde os três apontam de verdade — Stripe ou WhatsApp?
 *   · o Duelo e os Planos concordam no preço do plano destacado?
 *
 * USO:  node .claude/audita-planos.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9335;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VISTAS = [
  { nome: "desktop", largura: 1440, altura: 900, dpr: 2 },
  { nome: "celular", largura: 390, altura: 844, dpr: 2 },
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

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

const SONDA = `(() => {
  const cx = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { l: Math.round(r.width), a: Math.round(r.height),
             base: Math.round(r.bottom), topo: Math.round(r.top) }; };
  const de = document.documentElement;
  const sec = document.querySelector(".lp3-p");
  const cards = [...document.querySelectorAll(".lp3-p-cartao")];
  const ctas = [...document.querySelectorAll(".lp3-p-cta")];
  return {
    rolagemH: { scrollW: de.scrollWidth, clientW: de.clientWidth, estoura: de.scrollWidth > de.clientWidth },
    secao: cx(sec),
    cartoes: cards.map((c) => ({
      nome: c.querySelector(".lp3-p-nome").textContent,
      preco: c.querySelector(".lp3-p-preco").textContent,
      destaque: c.hasAttribute("data-destaque"),
      ...cx(c),
    })),
    botoes: ctas.map((a) => ({
      txt: a.textContent,
      destino: a.getAttribute("href").slice(0, 46),
      alvo: a.getAttribute("target") || "mesma aba",
      altura: Math.round(a.getBoundingClientRect().height),
      cor: getComputedStyle(a).color,
      fundo: getComputedStyle(a).backgroundColor,
    })),
    garantias: [...document.querySelectorAll(".lp3-p-garantia")].map((g) => g.textContent.trim()),
    precosY: [...document.querySelectorAll(".lp3-p-preco")].map((e) => Math.round(e.getBoundingClientRect().top)),
    botoesY: [...document.querySelectorAll(".lp3-p-cta")].map((e) => Math.round(e.getBoundingClientRect().top)),
    /* A coerência entre as duas seções: o preço do card da maisa no Duelo tem de ser
       o mesmo do plano destacado aqui. */
    duelo: {
      precoMaisa: (document.querySelector('.lp3-d-cartao[data-lado="maisa"] .lp3-d-preco') || {}).textContent,
      saldo: (document.querySelector(".lp3-d-saldo-valor") || {}).textContent,
    },
    secaoAbsY: sec ? Math.round(sec.getBoundingClientRect().top + window.scrollY) : null,
  };
})()`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-p");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(DESTINO, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORTA_CDP}`,
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
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

    const relatorio = {};
    for (const v of VISTAS) {
      await env("Emulation.setDeviceMetricsOverride", {
        width: v.largura,
        height: v.altura,
        deviceScaleFactor: v.dpr,
        mobile: v.largura < 700,
      });
      await env("Page.navigate", { url: ALVO });
      await espera(4000);
      await env("Runtime.evaluate", {
        expression: `document.querySelector(".lp3-p").scrollIntoView({block:"center"})`,
      });
      await espera(700);

      const { result } = await env("Runtime.evaluate", { expression: SONDA, returnByValue: true });
      relatorio[v.nome] = result.value;

      const s = result.value.secao;
      const { data } = await env("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: result.value.secaoAbsY,
          width: v.largura,
          height: Math.min(s.a, 6000),
          scale: v.largura < 700 ? 1 : 0.6,
        },
      });
      await writeFile(resolve(DESTINO, `planos-${v.nome}.png`), Buffer.from(data, "base64"));
    }
    console.log(JSON.stringify(relatorio, null, 2));
  } finally {
    chrome.kill();
  }
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
