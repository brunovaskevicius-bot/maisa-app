/* foto-telas — uma foto da seção das telas + a prova de que o brilho continua CLIPADO.
 *
 * POR QUE. O glint deixou de ser `::after` e virou <span> (08/08/2026). As regras de
 * CSS são as mesmas, mas a caixa dele é 200% × 200% e centrada em -50%/-50% — ela só
 * não vaza porque o `.lp3-z` corta. Pseudo-elemento e elemento real são cortados pela
 * mesma regra, então isto deveria ser idêntico; "deveria" não é medida, e um brilho
 * vazando por cima do aro do celular é exatamente o tipo de coisa que passa batida
 * numa auditoria de números e salta aos olhos numa foto.
 *
 * USO:  node .claude/foto-telas.mjs      (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9348;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SAIDA = resolve(RAIZ, ".claude/pos-conserto-telas.png");

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
  const perfil = resolve(RAIZ, ".auditoria-foto-telas");
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

    await env("Page.enable"); await env("Runtime.enable");
    await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await env("Page.navigate", { url: ALVO });
    await espera(6000);

    /* Para no meio da pista, onde o leque está aberto e o brilho está girado — que é
       o estado em que um vazamento apareceria. */
    const info = await env("Runtime.evaluate", {
      returnByValue: true, awaitPromise: true,
      expression: `(() => { const p = document.querySelector(".lp3-t-pilha");
        window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY + 1400);
        return new Promise(ok => setTimeout(() => {
          const fora = [...document.querySelectorAll(".lp3-z-brilho")].map(b => {
            const rb = b.getBoundingClientRect();
            const rz = b.parentElement.getBoundingClientRect();
            /* Quanto do brilho aparece FORA da tela do celular, em px. Se o corte
               estiver valendo, o retângulo pintado nunca passa da caixa do pai. */
            return +Math.max(0, rz.top - rb.top, rz.left - rb.left,
                                rb.bottom - rz.bottom, rb.right - rz.right).toFixed(1);
          });
          ok({ vazamento: fora,
               corta: getComputedStyle(document.querySelector(".lp3-z")).overflow,
               brilhos: document.querySelectorAll(".lp3-z-brilho").length });
        }, 900)); })()`,
    });
    console.log("  brilhos no DOM:", info.result.value.brilhos);
    console.log("  overflow do .lp3-z:", info.result.value.corta);
    console.log("  vazamento do brilho, em px além da tela:", info.result.value.vazamento.join(" | "));
    console.log(info.result.value.corta === "visible" ? "  ⚠️ o pai NÃO corta — o brilho vaza" : "  ✓ o pai corta o brilho");

    const foto = await env("Page.captureScreenshot", { format: "png" });
    await writeFile(SAIDA, Buffer.from(foto.data, "base64"));
    console.log("  foto:", SAIDA);
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) { try { await rm(perfil, { recursive: true, force: true }); break; } catch { await espera(500); } }
  }
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exit(1); });
