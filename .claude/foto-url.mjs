/* foto-url — abre uma URL qualquer no headless e fotografa. Descartável.
 * USO:  node .claude/foto-url.mjs "<url>" <nome> [largura] [altura]
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const PORTA_CDP = 9353;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [, , ALVO, NOME = "url", L = "1440", A = "900"] = process.argv;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(p) {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${p}/json/version`); return (await r.json()).webSocketDebuggerUrl; }
    catch { await espera(250); }
  }
  throw new Error("Chrome não abriu");
}

function sessao(ws) {
  let id = 0; const pend = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const { ok, falha } = pend.get(m.id); pend.delete(m.id); m.error ? falha(new Error(m.error.message)) : ok(m.result); }
  });
  return (method, params = {}, sessionId) => new Promise((ok, falha) => { const meu = ++id; pend.set(meu, { ok, falha }); ws.send(JSON.stringify({ id: meu, method, params, sessionId })); });
}

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORTA_CDP}`,
  `--user-data-dir=${resolve(RAIZ, ".auditoria-perfil-url")}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

async function main() {
  await mkdir(DESTINO, { recursive: true });
  const url = await conectar(PORTA_CDP);
  const ws = new WebSocket(url);
  await new Promise((ok, falha) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", falha, { once: true }); });
  const cmd = sessao(ws);
  const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
  const env = (m, p) => cmd(m, p, sessionId);
  await env("Page.enable");
  await env("Runtime.enable");
  await env("Emulation.setDeviceMetricsOverride", { width: +L, height: +A, deviceScaleFactor: 2, mobile: false });
  await env("Page.navigate", { url: ALVO });
  await espera(9000);
  const { data } = await env("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(DESTINO, `${NOME}.png`), Buffer.from(data, "base64"));
  console.log(`${NOME}.png`);
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exitCode = 1; })
  .finally(async () => { chrome.kill(); await espera(1200); await rm(resolve(RAIZ, ".auditoria-perfil-url"), { recursive: true, force: true }).catch(() => {}); });
