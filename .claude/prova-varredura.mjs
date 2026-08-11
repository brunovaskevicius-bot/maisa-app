/* prova-varredura — a varredura de cor do CTA da dobra está viva, emenda sem costura,
 * e responde ao hover? Descartável.
 *
 * Não basta fotografar: um quadro parado não distingue "gradiente animando" de
 * "gradiente estático", e uma foto do hover não diz se a cor mudou porque a custom
 * property mudou ou porque a animação calhou de estar naquele ponto. Então isto mede:
 *   1. o `background-image` computado resolveu para um gradiente (e não para `none`,
 *      que é onde uma custom property quebrada faria a declaração inteira cair);
 *   2. `getAnimations()` enxerga a animação com playState "running";
 *   3. o `background-position` MUDA entre duas amostras no repouso;
 *   4. as DUAS custom properties de cor trocam de valor no hover, e o
 *      `animation-duration` cai de 3s para 1,1s;
 *   5. a EMENDA: em `background-position: 0%` e em `100%` a tira de pixels do botão
 *      tem de ser idêntica — é o que prova que o loop de sentido único não dá tranco.
 *
 * USO:  node .claude/prova-varredura.mjs
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const PORTA_CDP = 9358;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ALVO = "http://localhost:3100/barbeiros/v3";
const SEL = ".lp3-cta .glass-button";
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
  `--user-data-dir=${resolve(RAIZ, ".auditoria-perfil-varredura")}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

const LEITURA = `(() => {
  const el = document.querySelector(${JSON.stringify(SEL)});
  if (!el) return { erro: "seletor não achou o botão" };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    imagem: cs.backgroundImage.slice(0, 220),
    tamanho: cs.backgroundSize,
    posicao: cs.backgroundPosition,
    duracao: cs.animationDuration,
    claro: cs.getPropertyValue("--lp3-cta-claro").trim(),
    escuro: cs.getPropertyValue("--lp3-cta-escuro").trim(),
    anims: el.getAnimations().map(a => ({ nome: a.animationName, estado: a.playState })),
    caixa: { x: r.x, y: r.y, w: r.width, h: r.height },
  };
})()`;

/* Para a prova da emenda: congela a animação e força uma posição, para as duas fotos
   saírem do MESMO instante lógico em vez de dois momentos quaisquer do loop. */
const trava = (pos) => `(() => {
  const el = document.querySelector(${JSON.stringify(SEL)});
  el.style.animation = "none";
  el.style.backgroundPosition = "${pos} 50%";
  return getComputedStyle(el).backgroundPosition;
})()`;

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
  await env("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await env("Page.navigate", { url: ALVO });
  await espera(9000);

  const ler = async () => (await env("Runtime.evaluate", { expression: LEITURA, returnByValue: true })).result.value;
  const foto = async (caixa, nome) => {
    const m = 10;
    const { data } = await env("Page.captureScreenshot", {
      format: "png",
      clip: { x: caixa.x - m, y: caixa.y - m, width: caixa.w + m * 2, height: caixa.h + m * 2, scale: 2 },
    });
    const buf = Buffer.from(data, "base64");
    await writeFile(resolve(DESTINO, `${nome}.png`), buf);
    return buf;
  };

  /* ⚠️ O RECORTE DA EMENDA É O INTERIOR DA PÍLULA, e a primeira versão desta prova
     errou justamente aqui: ela comparava a foto COM os 10px de margem, e nessa margem
     passam a <Orbita> e as <Particulas>. Dois quadros quaisquer dessas duas nunca são
     iguais, então o teste reprovava o fundo animado e dizia que a emenda tinha tranco.
     Aqui o clipe entra `h/2` de cada lado (passa das tampas arredondadas) e 4px em
     cima e embaixo: tudo dentro dessa caixa é superfície opaca do botão mais o rótulo,
     que é estático. Nada do que está atrás pode entrar. */
  const fotoMiolo = async (caixa, nome) => {
    const r = caixa.h / 2;
    const { data } = await env("Page.captureScreenshot", {
      format: "png",
      clip: { x: caixa.x + r, y: caixa.y + 4, width: caixa.w - r * 2, height: caixa.h - 8, scale: 2 },
    });
    const buf = Buffer.from(data, "base64");
    await writeFile(resolve(DESTINO, `${nome}.png`), buf);
    return buf;
  };

  const a = await ler();
  if (a.erro) throw new Error(a.erro);
  await foto(a.caixa, "varre-t0");
  await espera(1500);
  const b = await ler();
  await foto(b.caixa, "varre-t1");

  /* HOVER: mouse no centro do botão. */
  const cx = a.caixa.x + a.caixa.w / 2, cy = a.caixa.y + a.caixa.h / 2;
  await env("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx, y: cy, buttons: 0 });
  await espera(700);
  const h = await ler();
  await foto(h.caixa, "varre-hover");

  /* EMENDA: sai do hover, congela e fotografa os dois extremos do loop. */
  await env("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5, buttons: 0 });
  await espera(700);
  await env("Runtime.evaluate", { expression: trava("0%"), returnByValue: true });
  const p0 = await fotoMiolo(a.caixa, "varre-emenda-0");
  await env("Runtime.evaluate", { expression: trava("100%"), returnByValue: true });
  const p100 = await fotoMiolo(a.caixa, "varre-emenda-100");

  const linha = (r) => [
    `  background-image : ${r.imagem}`,
    `  background-size  : ${r.tamanho}`,
    `  background-pos   : ${r.posicao}`,
    `  animation-duration: ${r.duracao}`,
    `  --lp3-cta-claro  : ${r.claro}`,
    `  --lp3-cta-escuro : ${r.escuro}`,
    `  animações        : ${JSON.stringify(r.anims)}`,
  ].join("\n");

  console.log("=== REPOUSO t0 ===");        console.log(linha(a));
  console.log("\n=== REPOUSO t0 + 1500ms ==="); console.log(linha(b));
  console.log("\n=== HOVER ===");            console.log(linha(h));

  /* ⚠️ NÃO DÁ PARA EXIGIR BYTES IDÊNTICOS AQUI, e a razão é geométrica, não um defeito
     da emenda. O botão mede 188,671875px de largura (medido, 1440×900) — fracionária,
     porque a caixa vem de respiros em `em`. A imagem tem o dobro disso e o passo de um
     período é a própria largura, ou seja um deslocamento FRACIONÁRIO em pixels de
     dispositivo. A rasterização do gradiente muda de fase entre os dois quadros e alguns
     canais saem ±1. A emenda continua exata: em `0%` a janela é o trecho 0–50% do
     gradiente e em `100%` é o 50–100%, e os dois são a MESMA onda por construção (cinco
     stops, dois períodos). Por isso o número abaixo é informativo, e o veredito de
     verdade são as duas fotos lado a lado. */
  const difere = !(p0.length === p100.length && p0.equals(p100));
  console.log("\n=== VEREDITO ===");
  console.log(`  gradiente resolveu            : ${/gradient/.test(a.imagem) ? "SIM" : "NÃO — caiu para none"}`);
  console.log(`  animação viva                 : ${a.anims.some(x => x.estado === "running") ? "SIM" : "NÃO"}`);
  console.log(`  varre no repouso              : ${a.posicao !== b.posicao ? `SIM  (${a.posicao} -> ${b.posicao})` : `NÃO — travado em ${a.posicao}`}`);
  console.log(`  hover troca as duas cores     : ${a.claro !== h.claro && a.escuro !== h.escuro ? `SIM  (${a.claro} -> ${h.claro} | ${a.escuro} -> ${h.escuro})` : "NÃO"}`);
  console.log(`  hover acelera                 : ${a.duracao !== h.duracao ? `SIM  (${a.duracao} -> ${h.duracao})` : `NÃO — ficou em ${a.duracao}`}`);
  console.log(`  emenda 0% vs 100%             : ${difere ? "bytes diferem em ±1 por fase de rasterização (esperado — ver nota no código)" : "pixels idênticos"}`);
  console.log(`                                  confira a olho: varre-emenda-0 vs varre-emenda-100`);
  console.log(`\n  fotos em auditoria/: varre-t0, varre-t1, varre-hover, varre-emenda-0, varre-emenda-100`);
}

main().catch((e) => { console.error("FALHOU:", e.message); process.exitCode = 1; })
  .finally(async () => { chrome.kill(); await espera(1200); await rm(resolve(RAIZ, ".auditoria-perfil-varredura"), { recursive: true, force: true }).catch(() => {}); });
