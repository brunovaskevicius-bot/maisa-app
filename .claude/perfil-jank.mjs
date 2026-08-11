/* perfil-jank — mede o custo de quadro da /barbeiros/v3 e isola o culpado.
 *
 * MÉTODO. Rola a seção das telas de ponta a ponta dentro de um laço de rAF na
 * própria página, guardando o delta entre quadros. Delta > 32ms é quadro perdido a
 * 60Hz. Em paralelo tira o diff dos contadores do `Performance.getMetrics`, que dão
 * o tempo gasto em recalcular estilo, em layout e em script.
 *
 * ⚠️ OS NÚMEROS ABSOLUTOS DE UM HEADLESS NÃO VALEM COMO FPS REAL — não há compositor
 * de tela de verdade. O que vale é a COMPARAÇÃO entre as variações, todas medidas na
 * mesma máquina, no mesmo laço, com a mesma rolagem. É para isso que ele existe.
 *
 * USO:  node .claude/perfil-jank.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9343;
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

/* As variações. Cada uma desliga UMA coisa; a última desliga tudo o que entrou nesta
   seção, e a extra desliga o que é da DOBRA — para saber se o travamento é meu ou
   se ele já estava na página antes do carrossel. */
const VARIACOES = [
  { id: "A", o_que: "baseline (nada desligado)", css: "" },
  { id: "B", o_que: "sem box-shadow do aro (8 sombras, 2 seguem --d)", css: ".lp-v3 .lp3-t-vidro{box-shadow:none!important}" },
  { id: "C", o_que: "sem glint (gradiente com ângulo em --d)", css: ".lp-v3 .lp3-z::after{display:none!important}" },
  { id: "D", o_que: "sem papel de parede (pattern SVG)", css: ".lp-v3 .lp3-z-papel{display:none!important}" },
  { id: "E", o_que: "sem anel de profundidade (inset)", css: ".lp-v3 .lp3-z{box-shadow:none!important}" },
  { id: "F", o_que: "sem nada disso (B+C+D+E)", css: ".lp-v3 .lp3-t-vidro{box-shadow:none!important}.lp-v3 .lp3-z::after{display:none!important}.lp-v3 .lp3-z-papel{display:none!important}.lp-v3 .lp3-z{box-shadow:none!important}" },
  { id: "G", o_que: "sem a dobra inteira (órbita + partículas off)", css: ".lp-v3 .lp3-orb-card{animation:none!important}.lp-v3 .lp3-poeira{display:none!important}" },
  { id: "G1", o_que: "só a ÓRBITA parada (16 cards, offset-distance infinito)", css: ".lp-v3 .lp3-orb-card{animation:none!important}" },
  { id: "G2", o_que: "só as PARTÍCULAS fora (canvas 2D)", css: ".lp-v3 .lp3-poeira{display:none!important}" },
  { id: "Z", o_que: "o melhor caso possível (F + G)", css: ".lp-v3 .lp3-t-vidro{box-shadow:none!important}.lp-v3 .lp3-z::after{display:none!important}.lp-v3 .lp3-z-papel{display:none!important}.lp-v3 .lp3-z{box-shadow:none!important}.lp-v3 .lp3-orb-card{animation:none!important}.lp-v3 .lp3-poeira{display:none!important}" },
];

/* O laço de medição, rodando DENTRO da página. Rola 30px por quadro por 150 quadros:
   4500px, que cobre a pista inteira (5 alturas de aparelho) com folga. */
const MEDIR = `(() => new Promise((ok) => {
  const pista = document.querySelector(".lp3-t-pilha");
  window.scrollTo(0, pista.getBoundingClientRect().top + window.scrollY - 300);
  const deltas = [];
  let n = 0;
  let ultimo = 0;
  const PASSO = 30, QUADROS = 150;
  const laco = (t) => {
    if (ultimo) deltas.push(t - ultimo);
    ultimo = t;
    window.scrollBy(0, PASSO);
    if (++n < QUADROS) requestAnimationFrame(laco);
    else {
      const ord = [...deltas].sort((a, b) => a - b);
      const soma = deltas.reduce((s, x) => s + x, 0);
      ok({
        quadros: deltas.length,
        media: +(soma / deltas.length).toFixed(2),
        p95: +ord[Math.floor(ord.length * 0.95)].toFixed(2),
        pior: +ord[ord.length - 1].toFixed(2),
        perdidos: deltas.filter((d) => d > 32).length,
      });
    }
  };
  /* Dois quadros de aquecimento antes de começar a contar: o primeiro delta depois
     de um scrollTo carrega o custo do reposicionamento, não o da animação. */
  requestAnimationFrame(() => requestAnimationFrame(laco));
}))()`;

const INTERESSA = ["RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration", "LayoutCount", "RecalcStyleCount"];

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-jank");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(perfil, { recursive: true });

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
    await env("Performance.enable");
    await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await env("Page.navigate", { url: ALVO });
    await espera(5000);

    const metricas = async () => {
      const { metrics } = await env("Performance.getMetrics");
      return Object.fromEntries(metrics.filter((m) => INTERESSA.includes(m.name)).map((m) => [m.name, m.value]));
    };

    const linhas = [];
    for (const v of VARIACOES) {
      /* Injeta, mede, remove. Sempre com uma volta ao topo entre as variações, para
         que todas comecem do mesmo estado de rolagem. */
      await env("Runtime.evaluate", {
        expression: `(() => { const a = document.getElementById("perfil-css"); if (a) a.remove();
          if (${JSON.stringify(v.css)}) { const s = document.createElement("style"); s.id = "perfil-css";
          s.textContent = ${JSON.stringify(v.css)}; document.head.appendChild(s); }
          window.scrollTo(0, 0); })()`,
      });
      await espera(900);

      const antes = await metricas();
      const { result, exceptionDetails } = await env("Runtime.evaluate", { expression: MEDIR, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) {
        console.error(`${v.id}: estourou —`, JSON.stringify(exceptionDetails).slice(0, 400));
        continue;
      }
      const depois = await metricas();
      const d = (k) => +(depois[k] - antes[k]).toFixed(3);
      linhas.push({ v, m: result.value, estilo: d("RecalcStyleDuration"), layout: d("LayoutDuration"), script: d("ScriptDuration"), tarefa: d("TaskDuration") });
      await espera(400);
    }

    const base = linhas.find((l) => l.v.id === "A");
    console.log("\n  id  perdidos  média   p95    pior   | estilo  layout  script  tarefa | ganho vs A");
    console.log("  ──────────────────────────────────────────────────────────────────────────────────");
    for (const l of linhas) {
      const ganho = base && l.v.id !== "A" ? `${(((base.m.perdidos - l.m.perdidos) / Math.max(1, base.m.perdidos)) * 100).toFixed(0)}%` : "—";
      console.log(
        `  ${l.v.id}   ${String(l.m.perdidos).padStart(5)}/${l.m.quadros}  ` +
          `${String(l.m.media).padStart(6)} ${String(l.m.p95).padStart(6)} ${String(l.m.pior).padStart(7)} | ` +
          `${String(l.estilo).padStart(6)} ${String(l.layout).padStart(7)} ${String(l.script).padStart(7)} ${String(l.tarefa).padStart(7)} | ${ganho.padStart(6)}   ${l.v.o_que}`,
      );
    }
    console.log("\n  (perdidos = quadros com delta > 32ms; durações em segundos, só do trecho medido)\n");
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
