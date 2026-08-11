/* foto-zap — fotografa e MEDE o carrossel da <Telas>.
 *
 * DESCARTÁVEL, mesma plumbing do foto-pulso.mjs. O que ele existe para provar, e que
 * screenshot sozinho não prova:
 *
 *   1. SINCRONIA. O celular que está de frente (menor |--d|) é o mesmo que o
 *      `data-ativo` diz — em toda posição da pista, não só nas três paradas. É o
 *      pedido literal ("as duas têm que ficar sincronizadas"), então é o que se mede.
 *   2. O leque não cria rolagem horizontal (o `overflow-x: clip` está pegando).
 *   3. A régua `--u` do WhatsApp continua exata dentro do aparelho girado.
 *
 * USO:  node .claude/foto-zap.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9341;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

/* `f` é a fração da pista, 0 a 1. Com 3 telas, 0 / 0,5 / 1 são as três paradas e
   0,25 / 0,75 são os meios do caminho — onde o leque está em trânsito e onde um
   `data-ativo` calculado por outro caminho divergiria primeiro. */
const MEDE = (f) => `(() => {
  const sec = document.querySelector(".lp3-t");
  const pista = document.querySelector(".lp3-t-pilha");
  const palco = document.querySelector(".lp3-t-palco");
  const rp = pista.getBoundingClientRect();
  const hP = palco.getBoundingClientRect().height;
  const topoPin = (window.innerHeight - hP) / 2;
  const percurso = rp.height - hP;
  window.scrollTo(0, window.scrollY + (rp.top - (topoPin - ${f} * percurso)));

  return new Promise((ok) => setTimeout(() => {
    const num = (v) => +parseFloat(v).toFixed(3);
    const figs = [...document.querySelectorAll(".lp3-t-cel")];
    const ds = figs.map((x) => num(getComputedStyle(x).getPropertyValue("--d")));
    /* Quem está de frente = menor |d|. É a definição geométrica, independente do
       que o JS da página achou — por isso serve de contraprova do data-ativo. */
    let frente = 0;
    ds.forEach((d, i) => { if (Math.abs(d) < Math.abs(ds[frente])) frente = i; });
    const ativo = +sec.dataset.ativo;
    /* ⚠️ O CRITÉRIO É "O ATIVO ESTÁ ENTRE OS MAIS CENTRAIS", NÃO "ativo === frente".
       Na metade exata do caminho entre dois celulares os dois têm |d| = 0,5: não
       existe um da frente, existe empate. Comparar com um vencedor escolhido a dedo
       reprovava a página por causa do desempate do teste (o meu pegava o primeiro, o
       Math.round da página arredonda para cima) e não por dessincronia nenhuma. */
    const maisPerto = Math.min(...ds.map((d) => Math.abs(d)));
    const empate = ds.filter((d) => Math.abs(Math.abs(d) - maisPerto) < 1e-6).length > 1;
    const z = figs[frente].querySelector(".lp3-z");
    const rz = z.getBoundingClientRect();
    const ultimo = figs[frente].querySelectorAll(".lp3-z-b");
    ok({
      ativo,
      frente,
      empate,
      bate: Math.abs(Math.abs(ds[ativo]) - maisPerto) < 1e-6,
      rotuloAtivo: figs[ativo].querySelector(".lp3-t-rotulo").textContent,
      ds,
      /* rect de elemento girado é a caixa ENVOLVENTE; com d=0 não há giro, então
         para o da frente ela é a caixa real. */
      telaFrente: num(rz.width) + "x" + num(rz.height),
      corpo: num(getComputedStyle(ultimo[ultimo.length - 1]).fontSize),
      rotulosVisiveis: [...document.querySelectorAll(".lp3-t-rotulo")]
        .filter((x) => getComputedStyle(x).visibility === "visible").length,
      rolagemH: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    });
  }, 280));
})()`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-zap");
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
    await env("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 2, mobile: false,
    });
    await env("Page.navigate", { url: ALVO });
    await espera(4500);

    let falhas = 0;
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const { result, exceptionDetails } = await env("Runtime.evaluate", {
        expression: MEDE(f), returnByValue: true, awaitPromise: true,
      });
      if (exceptionDetails) {
        console.error(`f=${f}: estourou —`, JSON.stringify(exceptionDetails).slice(0, 500));
        falhas++;
        continue;
      }
      const m = result.value;
      if (!m.bate || m.rolagemH || m.rotulosVisiveis !== 1) falhas++;
      await espera(300);
      const { data } = await env("Page.captureScreenshot", { format: "png" });
      await writeFile(resolve(DESTINO, `zap-f${String(f).replace(".", "")}.png`), Buffer.from(data, "base64"));
      console.log(
        `f=${String(f).padEnd(4)} --d [${m.ds.map((d) => String(d).padStart(6)).join(" ")}]  ` +
          `ativo=${m.ativo} ${m.bate ? (m.empate ? "✓ sincronizado (empate no meio)" : "✓ sincronizado") : "✗ DIVERGIU"}  ` +
          `"${m.rotuloAtivo}" (${m.rotulosVisiveis} rótulo)` +
          `${m.rolagemH ? "  ✗ ROLAGEM HORIZONTAL" : ""}` +
          `${f === 0 ? `\n       tela do da frente ${m.telaFrente}, corpo ${m.corpo}px` : ""}`,
      );
    }

    /* 390×844 — o leque fechado do breakpoint de uma coluna. */
    await env("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
    });
    await espera(800);
    const { result: mob } = await env("Runtime.evaluate", {
      expression: MEDE(0.5), returnByValue: true, awaitPromise: true,
    });
    await espera(300);
    const { data: d2 } = await env("Page.captureScreenshot", { format: "png" });
    await writeFile(resolve(DESTINO, "zap-mobile.png"), Buffer.from(d2, "base64"));
    const mm = mob.value;
    if (!mm.bate || mm.rolagemH) falhas++;
    console.log(
      `\n390×844  frente=${mm.frente} ativo=${mm.ativo} ${mm.bate ? "✓" : "✗ DIVERGIU"}` +
        `${mm.rolagemH ? "  ✗ ROLAGEM HORIZONTAL" : "  sem rolagem horizontal"}`,
    );
    console.log(falhas === 0 ? "\n── tudo passou" : `\n── ${falhas} verificação(ões) reprovada(s)`);
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) {
      try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); }
    }
  }
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
