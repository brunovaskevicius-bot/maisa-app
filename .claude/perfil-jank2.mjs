/* perfil-jank2 — responde UMA pergunta que o perfil-jank não respondia:
 * a órbita é animada no COMPOSITOR ou na thread principal?
 *
 * POR QUE OUTRO SCRIPT. O perfil-jank rola a seção das telas numa máquina sem
 * throttle, e ali o baseline perde 3 quadros em 149 — ruído, não o "travando muito"
 * do relato. Duas correções de método:
 *
 *   1. THROTTLE DE CPU. O Mac que mede é rápido demais para reproduzir o aparelho de
 *      quem reclamou. Com 6× o trabalho de thread principal aparece; o que é
 *      compositor continua liso, porque não passa pela thread.
 *   2. MEDIR PARADO. O teste decisivo não tem rolagem nenhuma: sentar na dobra e não
 *      tocar em nada. Animação de compositor custa ~0 de RecalcStyle parada. Se o
 *      RecalcStyleDuration subir com a página IMÓVEL, a animação está na thread
 *      principal — e aí são 16 elementos recalculando estilo 60×/s para sempre.
 *
 * USO:  node .claude/perfil-jank2.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9344;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const THROTTLE = 6;

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

const VARIACOES = [
  { id: "A", o_que: "baseline", css: "" },
  { id: "B", o_que: "órbita parada (animation:none)", css: ".lp-v3 .lp3-orb-card{animation:none!important}" },
  { id: "C", o_que: "partículas fora", css: ".lp-v3 .lp3-poeira{display:none!important}" },
  { id: "D", o_que: "as duas fora", css: ".lp-v3 .lp3-orb-card{animation:none!important}.lp-v3 .lp3-poeira{display:none!important}" },
];

/* PARADO na dobra: 120 quadros sem tocar na rolagem. */
const IMOVEL = `(() => new Promise((ok) => {
  window.scrollTo(0, 0);
  const deltas = [];
  let n = 0, ultimo = 0;
  const laco = (t) => {
    if (ultimo) deltas.push(t - ultimo);
    ultimo = t;
    if (++n < 120) requestAnimationFrame(laco);
    else {
      const ord = [...deltas].sort((a,b)=>a-b);
      ok({ quadros: deltas.length,
           media: +(deltas.reduce((s,x)=>s+x,0)/deltas.length).toFixed(2),
           p95: +ord[Math.floor(ord.length*0.95)].toFixed(2),
           perdidos: deltas.filter((d)=>d>32).length });
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(laco));
}))()`;

/* ROLANDO a página inteira, de cima a baixo — inclui a dobra, que o perfil-jank
   pulava. É aqui que a órbita e as partículas convivem com a <Sincronia>. */
const ROLANDO = `(() => new Promise((ok) => {
  window.scrollTo(0, 0);
  const deltas = [];
  let n = 0, ultimo = 0;
  const laco = (t) => {
    if (ultimo) deltas.push(t - ultimo);
    ultimo = t;
    window.scrollBy(0, 24);
    if (++n < 200) requestAnimationFrame(laco);
    else {
      const ord = [...deltas].sort((a,b)=>a-b);
      ok({ quadros: deltas.length,
           media: +(deltas.reduce((s,x)=>s+x,0)/deltas.length).toFixed(2),
           p95: +ord[Math.floor(ord.length*0.95)].toFixed(2),
           perdidos: deltas.filter((d)=>d>32).length });
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(laco));
}))()`;

const CENARIOS = [
  { id: "imóvel", expr: IMOVEL },
  { id: "rolando", expr: ROLANDO },
];

const INTERESSA = ["RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration", "RecalcStyleCount", "LayoutCount"];

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-jank2");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(perfil, { recursive: true });

  const chrome = spawn(
    CHROME,
    ["--headless=new", `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
     "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"],
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
    await espera(6000);
    await env("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
    await espera(1000);

    const metricas = async () => {
      const { metrics } = await env("Performance.getMetrics");
      return Object.fromEntries(metrics.filter((m) => INTERESSA.includes(m.name)).map((m) => [m.name, m.value]));
    };

    for (const cen of CENARIOS) {
      const linhas = [];
      for (const v of VARIACOES) {
        await env("Runtime.evaluate", {
          expression: `(() => { const a = document.getElementById("perfil-css"); if (a) a.remove();
            if (${JSON.stringify(v.css)}) { const s = document.createElement("style"); s.id = "perfil-css";
            s.textContent = ${JSON.stringify(v.css)}; document.head.appendChild(s); }
            window.scrollTo(0, 0); })()`,
        });
        await espera(1200);

        const antes = await metricas();
        const { result, exceptionDetails } = await env("Runtime.evaluate", { expression: cen.expr, returnByValue: true, awaitPromise: true });
        if (exceptionDetails) { console.error(`${cen.id}/${v.id}: estourou`); continue; }
        const depois = await metricas();
        const d = (k) => +(depois[k] - antes[k]).toFixed(3);
        linhas.push({ v, m: result.value, estilo: d("RecalcStyleDuration"), nEstilo: d("RecalcStyleCount"),
                      layout: d("LayoutDuration"), script: d("ScriptDuration"), tarefa: d("TaskDuration") });
        await espera(500);
      }

      console.log(`\n  ── ${cen.id.toUpperCase()} (CPU ${THROTTLE}×) ──`);
      console.log("  id  perdidos   média    p95  | recalcEstilo  nRecalc  layout  script  tarefa");
      console.log("  ─────────────────────────────────────────────────────────────────────────────");
      for (const l of linhas) {
        console.log(
          `  ${l.v.id}  ${String(l.m.perdidos).padStart(5)}/${l.m.quadros} ${String(l.m.media).padStart(7)} ${String(l.m.p95).padStart(6)} | ` +
          `${String(l.estilo).padStart(12)} ${String(l.nEstilo).padStart(8)} ${String(l.layout).padStart(7)} ${String(l.script).padStart(7)} ${String(l.tarefa).padStart(7)}  ${l.v.o_que}`,
        );
      }
    }
    console.log("\n  (perdidos = delta > 32ms; durações em segundos, só do trecho medido)");
    console.log("  LEITURA: se em IMÓVEL o recalcEstilo de A for >> o de B, a órbita anda na thread principal.\n");
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) {
      try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); }
    }
  }
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
