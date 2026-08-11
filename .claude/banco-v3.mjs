/* banco-v3 — a régua de antes/depois da /barbeiros/v3.
 *
 * POR QUE MAIS UM. O perfil-jank e o perfil-jank2 comparam VARIAÇÕES injetando CSS na
 * mesma página. Servem para achar o culpado, e acharam. Para provar que um CONSERTO
 * funcionou é preciso outra coisa: medir a página REAL, sem injeção nenhuma, antes e
 * depois de mexer no código. É isto.
 *
 * DUAS CORREÇÕES DE MÉTODO em relação aos dois anteriores:
 *
 *   1. TRÊS REPETIÇÕES E MEDIANA. Rodando uma vez só, o mesmo cenário deu 4 e depois
 *      15 quadros perdidos em execuções diferentes — variação maior que o efeito que
 *      se quer medir. Com mediana de 3 o ruído para de mandar na conclusão.
 *   2. UM CENÁRIO NOVO: "LONGE". Sentar no PÉ da página, com a dobra fora da tela, e
 *      não tocar em nada. Ali nada deveria custar quadro nenhum — a órbita está fora
 *      de vista. Se custar, é a prova de que os 16 cartões continuam animando na
 *      thread principal para ninguém ver, que é o desperdício mais caro da página.
 *
 * USO:  node .claude/banco-v3.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9346;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const THROTTLE = 6;
const REPS = 3;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/* O laço é o mesmo nos três cenários; muda só onde ele senta e se rola. */
const laco = (prep, rola, quadros) => `(() => new Promise((ok) => {
  ${prep}
  const deltas = []; let n = 0, ultimo = 0;
  const passo = (t) => {
    if (ultimo) deltas.push(t - ultimo);
    ultimo = t;
    ${rola}
    if (++n < ${quadros}) requestAnimationFrame(passo);
    else { const ord = [...deltas].sort((a,b)=>a-b);
      ok({ quadros: deltas.length,
           media: +(deltas.reduce((s,x)=>s+x,0)/deltas.length).toFixed(2),
           p95: +ord[Math.floor(ord.length*0.95)].toFixed(2),
           pior: +ord[ord.length-1].toFixed(2),
           perdidos: deltas.filter((d)=>d>32).length }); }
  };
  requestAnimationFrame(() => requestAnimationFrame(passo));
}))()`;

const CENARIOS = [
  { id: "dobra parada", expr: laco(`window.scrollTo(0,0);`, "", 120) },
  { id: "longe parada", expr: laco(`window.scrollTo(0, document.body.scrollHeight);`, "", 120) },
  { id: "rolando tudo", expr: laco(`window.scrollTo(0,0);`, "window.scrollBy(0,24);", 200) },
];

const INTERESSA = ["RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration"];

async function conectar(porta) {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${porta}/json/version`); return (await r.json()).webSocketDebuggerUrl; }
    catch { await espera(250); }
  }
  throw new Error("o Chrome não abriu a porta de depuração");
}

function sessao(ws) {
  let id = 0; const pendentes = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, falha } = pendentes.get(m.id); pendentes.delete(m.id);
      m.error ? falha(new Error(m.error.message)) : ok(m.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((ok, falha) => { const meu = ++id; pendentes.set(meu, { ok, falha }); ws.send(JSON.stringify({ id: meu, method, params, sessionId })); });
}

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-banco");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(perfil, { recursive: true });

  const chrome = spawn(CHROME,
    ["--headless=new", `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
     "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"],
    { stdio: "ignore" });

  try {
    const url = await conectar(PORTA_CDP);
    const ws = new WebSocket(url);
    await new Promise((ok, falha) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", falha, { once: true }); });
    const cmd = sessao(ws);
    const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
    const env = (m, p) => cmd(m, p, sessionId);

    await env("Page.enable"); await env("Runtime.enable"); await env("Performance.enable");
    await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await env("Page.navigate", { url: ALVO });
    await espera(6000);
    await env("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
    await espera(1000);

    const metricas = async () => {
      const { metrics } = await env("Performance.getMetrics");
      return Object.fromEntries(metrics.filter((m) => INTERESSA.includes(m.name)).map((m) => [m.name, m.value]));
    };

    console.log(`\n  /barbeiros/v3 — CPU ${THROTTLE}×, 1440×900, mediana de ${REPS}`);
    console.log("  cenário         perdidos   média    p95    pior  | recalcEstilo  script  tarefa");
    console.log("  ─────────────────────────────────────────────────────────────────────────────");

    for (const cen of CENARIOS) {
      const corridas = [];
      for (let r = 0; r < REPS; r++) {
        await env("Runtime.evaluate", { expression: "window.scrollTo(0,0)" });
        await espera(1200);
        const antes = await metricas();
        const { result, exceptionDetails } = await env("Runtime.evaluate", { expression: cen.expr, returnByValue: true, awaitPromise: true });
        if (exceptionDetails) { console.error(`${cen.id}: estourou`); continue; }
        const depois = await metricas();
        const d = (k) => +(depois[k] - antes[k]).toFixed(3);
        corridas.push({ ...result.value, estilo: d("RecalcStyleDuration"), script: d("ScriptDuration"), tarefa: d("TaskDuration") });
        await espera(500);
      }
      if (!corridas.length) continue;
      const m = (k) => mediana(corridas.map((c) => c[k]));
      console.log(
        `  ${cen.id.padEnd(14)} ${String(m("perdidos")).padStart(4)}/${corridas[0].quadros} ${String(m("media")).padStart(7)} ` +
        `${String(m("p95")).padStart(6)} ${String(m("pior")).padStart(7)} | ${String(m("estilo")).padStart(12)} ${String(m("script")).padStart(7)} ${String(m("tarefa")).padStart(7)}`,
      );
    }
    console.log("\n  (perdidos = quadros com delta > 32ms; durações em segundos, só do trecho medido)");
    console.log("  META: 'dobra parada' e 'longe parada' têm de ser 0 perdidos. Página imóvel não perde quadro.\n");
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) { try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); } }
  }
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
