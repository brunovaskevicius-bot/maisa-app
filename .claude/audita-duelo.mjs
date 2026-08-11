/* audita-duelo — mede e fotografa a seção <Duelo> da LP /barbeiros/v3.
 *
 * DESCARTÁVEL, de propósito: mora no .claude/ e não em scripts/, porque não faz parte
 * do build de ninguém. A plumbing de CDP é a mesma do scripts/captura-telas.mjs.
 *
 * A MEDIÇÃO É O PONTO, não a foto. O que se quer saber daqui:
 *   · a página ganhou rolagem horizontal? (o risco da ponte tem 132% de largura)
 *   · os dois cartões terminam na mesma linha? (o paralelismo das listas depende disso)
 *   · o card da maisa é mesmo MAIOR que o vizinho, e por quanto?
 *   · as cores de texto sobre o card escuro são as que as contas previram?
 *
 * USO:  node .claude/audita-duelo.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9334;
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

/* A sonda roda DENTRO da página. Devolve só números e strings — nada de nós. */
const SONDA = `(() => {
  const cx = (s) => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), l: Math.round(r.width), a: Math.round(r.height),
             base: Math.round(r.bottom), topo: Math.round(r.top) }; };
  const cor = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };

  const de = document.documentElement;
  const sec = document.querySelector(".lp3-d");
  return {
    rolagemH: { scrollW: de.scrollWidth, clientW: de.clientWidth, estoura: de.scrollWidth > de.clientWidth },
    secao: cx(".lp3-d"),
    cartaoHumano: cx('.lp3-d-cartao[data-lado="humano"]'),
    cartaoMaisa: cx('.lp3-d-cartao[data-lado="maisa"]'),
    vs: cx(".lp3-d-vs"),
    risco: cx(".lp3-d-risco"),
    
    saldo: cx(".lp3-d-saldo"),
    cores: {
      ouroToken: getComputedStyle(document.querySelector(".lp-v3")).getPropertyValue("--mk-ouro").trim(),
      riscoStroke: cor(".lp3-d-risco path", "stroke"),
      riscoOffset: cor(".lp3-d-risco path", "strokeDashoffset"),
      fundoMaisa: cor('.lp3-d-cartao[data-lado="maisa"]', "backgroundColor"),
      txtMaisa: cor('.lp3-d-cartao[data-lado="maisa"] .lp3-d-txt', "color"),
      rotuloMaisa: cor('.lp3-d-cartao[data-lado="maisa"] .lp3-d-rotulo', "color"),
      pontoMaisa: cor('.lp3-d-cartao[data-lado="maisa"] .lp3-d-ponto', "backgroundColor"),
      saldoValor: cor(".lp3-d-saldo-valor", "color"),
      saldoFundo: cor(".lp3-d-saldo", "backgroundColor"),
      wordmark: cor('.lp3-d-cartao[data-lado="maisa"] .lp3-d-nome span', "color"),
    },
    textos: {
      titulo: (document.querySelector(".lp3-d-titulo") || {}).textContent,
      precos: [...document.querySelectorAll(".lp3-d-preco")].map((e) => e.textContent),
      itens: [...document.querySelectorAll(".lp3-d-item")].length,
      fonteLink: (document.querySelector(".lp3-d-fonte a") || {}).href,
    },
    alturaDoc: de.scrollHeight,
    secaoAbsY: sec ? Math.round(sec.getBoundingClientRect().top + window.scrollY) : null,
  };
})()`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil");
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
      await espera(3500); // dev server compila na primeira visita

      /* Rola até a seção e deixa o `view()` assentar antes de medir. */
      await env("Runtime.evaluate", {
        expression: `document.querySelector(".lp3-d").scrollIntoView({block:"center"})`,
      });
      await espera(900);

      const { result } = await env("Runtime.evaluate", { expression: SONDA, returnByValue: true });
      relatorio[v.nome] = result.value;

      /* A foto da seção inteira, recortada pela caixa dela. */
      const s = result.value.secao;
      const clip = {
        x: 0,
        y: result.value.secaoAbsY,
        width: v.largura,
        height: Math.min(s.a, 6000),
        scale: v.largura < 700 ? 1 : 0.6,
      };
      const { data } = await env("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip,
      });
      await writeFile(resolve(DESTINO, `duelo-${v.nome}.png`), Buffer.from(data, "base64"));
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
