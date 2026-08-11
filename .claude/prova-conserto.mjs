/* prova-conserto — as três coisas que os consertos de 08/08/2026 podiam ter quebrado.
 *
 * Nenhuma delas aparece num screenshot parado, e é por isso que este arquivo existe:
 *
 *   1. A ÓRBITA PAUSA FORA DA TELA E VOLTA. Se o atributo não for escrito, o ganho
 *      não existe; se não for APAGADO na volta, o anel fica parado na cara de quem
 *      sobe de volta — que é pior que o problema original.
 *   2. O BRILHO AINDA GIRA. `.lp3-z::after` lê `--d` e parou de herdar (`inherits:
 *      false`). Se a <Sincronia> não escrever nele, o reflexo congela em 0 e NADA
 *      acusa: sem erro, sem tela quebrada, só um detalhe que morreu.
 *   3. O LEQUE AINDA VIRA. O `if` que pula a escrita quando o índice não mudou não
 *      pode ter travado o carrossel.
 *
 * USO:  node .claude/prova-conserto.mjs      (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9347;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const perfil = resolve(RAIZ, ".auditoria-conserto");
  await rm(perfil, { recursive: true, force: true });
  await mkdir(perfil, { recursive: true });

  const chrome = spawn(CHROME,
    ["--headless=new", `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
     "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"],
    { stdio: "ignore" });

  const falhas = [];
  const diz = (ok, nome, detalhe) => {
    console.log(`  ${ok ? "✓" : "✗"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    if (!ok) falhas.push(nome);
  };

  try {
    const url = await conectar(PORTA_CDP);
    const ws = new WebSocket(url);
    await new Promise((ok, falha) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", falha, { once: true }); });
    const cmd = sessao(ws);
    const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
    const env = (m, p) => cmd(m, p, sessionId);
    const roda = async (expr) => {
      const { result, exceptionDetails } = await env("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails).slice(0, 300));
      return result.value;
    };

    await env("Page.enable"); await env("Runtime.enable");
    await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await env("Page.navigate", { url: ALVO });
    await espera(6000);

    console.log("\n  ── 1. a órbita pausa fora da tela e volta ──");
    const noTopo = await roda(`(() => { window.scrollTo(0,0); return new Promise(ok => setTimeout(() => ok({
      fora: document.querySelector(".lp3-dobra").hasAttribute("data-fora"),
      estado: getComputedStyle(document.querySelector(".lp3-orb-card")).animationPlayState,
    }), 700)); })()`);
    diz(!noTopo.fora && noTopo.estado === "running", "na dobra o anel gira", `data-fora=${noTopo.fora}, ${noTopo.estado}`);

    const noPe = await roda(`(() => { window.scrollTo(0, document.body.scrollHeight); return new Promise(ok => setTimeout(() => ok({
      fora: document.querySelector(".lp3-dobra").hasAttribute("data-fora"),
      estado: getComputedStyle(document.querySelector(".lp3-orb-card")).animationPlayState,
    }), 900)); })()`);
    diz(noPe.fora && noPe.estado === "paused", "no pé o anel pausa", `data-fora=${noPe.fora}, ${noPe.estado}`);

    const voltou = await roda(`(() => { window.scrollTo(0,0); return new Promise(ok => setTimeout(() => ok({
      fora: document.querySelector(".lp3-dobra").hasAttribute("data-fora"),
      estado: getComputedStyle(document.querySelector(".lp3-orb-card")).animationPlayState,
    }), 900)); })()`);
    diz(!voltou.fora && voltou.estado === "running", "voltando à dobra ele volta a girar", `data-fora=${voltou.fora}, ${voltou.estado}`);

    /* O anel tem de estar em posição DIFERENTE de onde pausou — se `animation: none`
       tivesse entrado no lugar de `play-state`, ele saltaria para a estática. */
    const andou = await roda(`(() => {
      const c = document.querySelectorAll(".lp3-orb-card");
      const p = (e) => e.getBoundingClientRect().left;
      const a = [...c].map(p);
      return new Promise(ok => setTimeout(() => ok(Math.max(...[...c].map((e,i)=>Math.abs(p(e)-a[i])))), 900));
    })()`);
    diz(andou > 0.5, "o anel realmente anda depois de voltar", `maior deslocamento ${andou.toFixed(2)}px em 0,9s`);

    console.log("\n  ── 2. o brilho ainda gira com o leque (não herda mais) ──");
    const brilho = await roda(`(() => {
      const pilha = document.querySelector(".lp3-t-pilha");
      const topo = pilha.getBoundingClientRect().top + window.scrollY;
      const leia = () => [...document.querySelectorAll(".lp3-z-brilho")].map(z => ({
        d: getComputedStyle(z).getPropertyValue("--d").trim(),
        rot: getComputedStyle(z).transform,
      }));
      window.scrollTo(0, topo + 200);
      return new Promise(ok => setTimeout(() => { const a = leia();
        window.scrollTo(0, topo + 1600);
        setTimeout(() => ok({ a, b: leia() }), 800); }, 800));
    })()`);
    const dMudou = brilho.a.some((x, i) => x.d !== brilho.b[i].d);
    const rotMudou = brilho.a.some((x, i) => x.rot !== brilho.b[i].rot);
    diz(brilho.a.every((x) => x.d !== "" && x.d !== "0"), "o --d chega no .lp3-z-brilho", `antes: ${brilho.a.map((x) => x.d).join(" | ")}`);
    diz(dMudou, "o --d do brilho muda com a rolagem", `depois: ${brilho.b.map((x) => x.d).join(" | ")}`);
    diz(rotMudou, "a rotação do brilho acompanha", `${brilho.a[0].rot} → ${brilho.b[0].rot}`);

    console.log("\n  ── 3. o leque ainda vira ──");
    const leque = await roda(`(() => {
      const pilha = document.querySelector(".lp3-t-pilha");
      const topo = pilha.getBoundingClientRect().top + window.scrollY;
      const raiz = document.querySelector(".lp3-t");
      const leia = () => ({ ativo: raiz.dataset.ativo,
        d: [...document.querySelectorAll(".lp3-t-cel")].map(f => getComputedStyle(f).getPropertyValue("--d").trim()) });
      window.scrollTo(0, topo + 100);
      return new Promise(ok => setTimeout(() => { const a = leia();
        window.scrollTo(0, topo + 2600);
        setTimeout(() => ok({ a, b: leia() }), 900); }, 900));
    })()`);
    diz(leque.a.ativo !== leque.b.ativo, "o passo aceso muda", `${leque.a.ativo} → ${leque.b.ativo}`);
    diz(leque.a.d.join() !== leque.b.d.join(), "o --d das figuras muda", `${leque.a.d.join(" | ")} → ${leque.b.d.join(" | ")}`);

    console.log(falhas.length ? `\n  ✗ ${falhas.length} FALHA(S): ${falhas.join("; ")}\n` : "\n  ✓ tudo de pé\n");
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) { try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); } }
  }
  if (falhas.length) process.exit(1);
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
