/* foto-pulso — congela o pulso da <Duelo> em posições escolhidas e fotografa.
 *
 * DESCARTÁVEL, mesma plumbing dos outros dois. Existe porque o pulso é MOVIMENTO e
 * screenshot é instante: sem congelar, cada foto sai numa fase aleatória do ciclo de
 * 9s e não dá para conferir nada. Congelando, dá para ver o que importa —
 *
 *   · o engrossamento lê como pressão de marcador, ou como caroço no fio?
 *   · na janela do vão (37px) o pulso aparece de corpo inteiro?
 *   · sobra algum PONTO REDONDO nas pontas do caminho? (era o bug do gap 1)
 *
 * Congelar é `animation: none` + `--d-corre` inline: sem a animação no caminho, a
 * custom property inline passa a valer, e o quadro fica determinístico.
 *
 * USO:  node .claude/foto-pulso.mjs        (com o `npm run dev` no ar, porta 3100)
 */
import { spawn } from "node:child_process";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, ".claude/auditoria");
const ALVO = "http://localhost:3100/barbeiros/v3";
const PORTA_CDP = 9338;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* As posições da CABEÇA do pulso, escolhidas a partir da geometria medida em 1440: o
   <svg> vai de x=-64 a x=1504 (1567px), então a fração `f` do caminho cai em
   `x ≈ -64 + f × 1567`. O pulso ocupa [cabeça − 0,17 ; cabeça]. */
const FASES = [
  { nome: "1-margem-esq", corre: 0.13, o_que: "pulso atravessando a margem esquerda" },
  { nome: "2-entra-cartao", corre: 0.3, o_que: "meio pulso já escondido atrás do cartão humano" },
  { nome: "3-vao", corre: 0.56, o_que: "pulso aparecendo no vão, atrás da dobradiça" },
  { nome: "4-margem-dir", corre: 1.02, o_que: "pulso saindo pela margem direita" },
  { nome: "5-fora", corre: -0.2, o_que: "fallback: pulso fora do caminho (tem de sumir)" },
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

const CONGELA = (corre) => `(() => {
  const pu = document.querySelector(".lp3-d-pulso");
  pu.style.animation = "none";
  /* Congela na posição pedida. `cabeça = L − offset`, então `offset = L − cabeça`.
     ⚠️ Setar `stroke-dashoffset` inline e não `--d-corre`: a custom property saiu em
     07/08/2026 quando o offset passou a ser animado direto (ver v3.css). */
  const L = parseFloat(String(getComputedStyle(pu).strokeDasharray).split(",")[0]);
  pu.style.strokeDashoffset = String(L - ${corre});
  /* O traço tem de estar inteiro, senão o recorte do desenho confunde a leitura.
     ⚠️ O \`animation: none\` na arena é OBRIGATÓRIO, não zelo: animação ganha de estilo
     inline na cascata, então com a \`lp3-d-risca\` viva o \`--d-p: 1\` daqui era ignorado
     e valia o valor da rolagem — que no topo da página é 0. E como a posição do pulso
     é \`--d-corre × --d-p\`, esse 0 zerava o produto e TODAS as fotos saíam com a
     cabeça em 0, independentemente da fase pedida. Foi o que aconteceu na 1ª rodada. */
  const arena = document.querySelector(".lp3-d-arena");
  arena.style.animation = "none";
  arena.style.setProperty("--d-p", "1");
  const cs = getComputedStyle(pu);
  const num = (v) => parseFloat(String(v).replace(/[^0-9.\\-]/g, ""));
  const L = num(String(cs.strokeDasharray).split(",")[0]);
  return { cabeca: +(L - num(cs.strokeDashoffset)).toFixed(4), largura: cs.strokeWidth };
})()`;

async function main() {
  const perfil = resolve(RAIZ, ".auditoria-perfil-foto");
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
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await env("Page.navigate", { url: ALVO });
    await espera(4200);

    for (const f of FASES) {
      const { result } = await env("Runtime.evaluate", {
        expression: CONGELA(f.corre),
        returnByValue: true,
      });
      await espera(320);
      const { result: g } = await env("Runtime.evaluate", {
        expression: `(() => { const s = document.querySelector(".lp3-d-arena").getBoundingClientRect();
          return { y: Math.round(s.top + window.scrollY), a: Math.round(s.height) }; })()`,
        returnByValue: true,
      });
      /* Recorta só a FAIXA da linha (a meia-altura da arena, ±90px): o que se quer
         inspecionar é o fio, e a seção inteira reduzida a 0,6 esconde o detalhe. */
      const meio = g.value.y + Math.round(g.value.a / 2);
      const { data } = await env("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: meio - 90, width: 1440, height: 180, scale: 1 },
      });
      await writeFile(resolve(DESTINO, `pulso-${f.nome}.png`), Buffer.from(data, "base64"));
      console.log(
        `pulso-${f.nome}.png  cabeça=${String(result.value.cabeca).padStart(7)}  ${result.value.largura}  — ${f.o_que}`,
      );
    }
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r) && setTimeout(r, 3000));
    for (let i = 0; i < 5; i++) {
      try {
        await rm(perfil, { recursive: true, force: true });
        break;
      } catch {
        await espera(500);
      }
    }
  }
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
