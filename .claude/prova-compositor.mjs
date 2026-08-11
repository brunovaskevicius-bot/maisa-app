/* prova-compositor — a órbita pode sair da thread principal?
 *
 * O perfil-jank2 provou que `offset-distance` anda na thread principal: com a página
 * IMÓVEL, parar a órbita derruba o recalc de estilo de 0,314s para 0,062s.
 *
 * A saída óbvia é trocar `offset-distance` por `transform: translate3d()`, que o
 * Chrome sabe compositar. Só que há uma armadilha conhecida: animação cujos keyframes
 * contêm `var()` historicamente NÃO compositava. Este script mede as duas formas, no
 * mesmo laço, para a decisão não ser por fé:
 *
 *   T1  translate3d com calc(var(--orb-rx) * k)   — mantém a elipse responsiva
 *   T2  translate3d com px cravado                — perde a responsividade, mas é o
 *                                                    teto do que dá para ganhar
 *
 * Se T1 ≈ T2 ≈ "órbita parada", a troca resolve e dá para manter as vars.
 * Se T1 ≈ baseline e T2 ≈ parada, o var() é o que impede — e aí a elipse precisa
 * virar px por media query.
 *
 * USO:  node .claude/prova-compositor.mjs      (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9345;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const THROTTLE = 6;
const N = 48; // amostras da elipse

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* Os keyframes. Amostragem por ÂNGULO aqui é suficiente porque esta prova mede CUSTO,
   não espaçamento — se compositar, a versão final refaz a amostragem por comprimento
   de arco (senão os cartões se amontoam nas pontas da elipse). */
function keyframes(nome, x, y) {
  const passos = [];
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    const pc = ((i / N) * 100).toFixed(4);
    passos.push(`${pc}%{transform:translate3d(${x(Math.cos(th))},${y(Math.sin(th))},0)}`);
  }
  return `@keyframes ${nome}{${passos.join("")}}`;
}

const comVar = keyframes(
  "lp3-orb-t1",
  (c) => `calc(var(--orb-rx) * ${c.toFixed(6)})`,
  (s) => `calc(var(--orb-ry) * ${s.toFixed(6)})`,
);
/* px cravado: os raios medidos em 1440×900 (v3.css: rx 835, ry 297). */
const comPx = keyframes("lp3-orb-t2", (c) => `${(835 * c).toFixed(2)}px`, (s) => `${(297 * s).toFixed(2)}px`);

const base = (nome) =>
  `.lp-v3 .lp3-orb-card{offset-path:none!important;left:50%!important;top:50%!important;` +
  `margin-left:calc(var(--orb-larg)/-2)!important;margin-top:calc(var(--orb-alt)/-2)!important;` +
  `animation:${nome} var(--orb-t) linear infinite!important;` +
  `animation-delay:calc(var(--i) * var(--orb-t) / var(--orb-k) * -1)!important}`;

const VARIACOES = [
  { id: "A", o_que: "baseline (offset-distance)", css: "" },
  { id: "P", o_que: "órbita PARADA (piso de referência)", css: ".lp-v3 .lp3-orb-card{animation:none!important}" },
  { id: "T1", o_que: "translate3d com calc(var())", css: comVar + base("lp3-orb-t1") },
  { id: "T2", o_que: "translate3d com px cravado", css: comPx + base("lp3-orb-t2") },
];

const IMOVEL = `(() => new Promise((ok) => {
  window.scrollTo(0, 0);
  const deltas = []; let n = 0, ultimo = 0;
  const laco = (t) => {
    if (ultimo) deltas.push(t - ultimo);
    ultimo = t;
    if (++n < 120) requestAnimationFrame(laco);
    else { const ord = [...deltas].sort((a,b)=>a-b);
      ok({ quadros: deltas.length,
           media: +(deltas.reduce((s,x)=>s+x,0)/deltas.length).toFixed(2),
           p95: +ord[Math.floor(ord.length*0.95)].toFixed(2),
           perdidos: deltas.filter((d)=>d>32).length }); }
  };
  requestAnimationFrame(() => requestAnimationFrame(laco));
}))()`;

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

const INTERESSA = ["RecalcStyleDuration", "LayoutDuration", "ScriptDuration", "TaskDuration"];

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-compositor");
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

    const linhas = [];
    for (const v of VARIACOES) {
      await env("Runtime.evaluate", {
        expression: `(() => { const a = document.getElementById("prova-css"); if (a) a.remove();
          if (${JSON.stringify(v.css)}) { const s = document.createElement("style"); s.id = "prova-css";
          s.textContent = ${JSON.stringify(v.css)}; document.head.appendChild(s); }
          window.scrollTo(0, 0); })()`,
      });
      await espera(1500);
      const antes = await metricas();
      const { result, exceptionDetails } = await env("Runtime.evaluate", { expression: IMOVEL, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) { console.error(`${v.id}: estourou`); continue; }
      const depois = await metricas();
      const d = (k) => +(depois[k] - antes[k]).toFixed(3);
      linhas.push({ v, m: result.value, estilo: d("RecalcStyleDuration"), layout: d("LayoutDuration"), script: d("ScriptDuration"), tarefa: d("TaskDuration") });
      await espera(600);
    }

    console.log(`\n  ── IMÓVEL na dobra, CPU ${THROTTLE}× ──`);
    console.log("  id   perdidos   média    p95  | recalcEstilo  layout  script  tarefa");
    console.log("  ──────────────────────────────────────────────────────────────────────");
    for (const l of linhas) {
      console.log(`  ${l.v.id.padEnd(3)} ${String(l.m.perdidos).padStart(5)}/${l.m.quadros} ${String(l.m.media).padStart(7)} ${String(l.m.p95).padStart(6)} | ` +
        `${String(l.estilo).padStart(12)} ${String(l.layout).padStart(7)} ${String(l.script).padStart(7)} ${String(l.tarefa).padStart(7)}  ${l.v.o_que}`);
    }
    console.log("\n  VEREDITO: compare T1 e T2 com P (parada). Perto de P = compositado.\n");
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) { try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); } }
  }
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
