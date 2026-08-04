/* espelha-lp — copia lp/ para public/lp/ antes do dev e do build.
 *
 * POR QUE EXISTE ESTE PASSO EM VEZ DE A LP MORAR DIRETO EM public/
 * A LP de terapeutas é um bundle estático (HTML + web components + o DS), e não
 * uma rota React. A fonte dela mora em `lp/terapeutas/` porque é lá que ela é
 * editada e de onde ela é publicada avulsa (dá para subir a pasta em qualquer
 * host estático, sem o Next). Mas o Next só serve arquivo estático do que está
 * em `public/`. Copiar é a ponte.
 *
 * `public/lp/` fica no .gitignore: é build, não fonte. Como a cópia roda em
 * predev e prebuild, ela nunca envelhece — editar `lp/` e reiniciar já reflete.
 * Editar `public/lp/` à mão é jogar trabalho fora, ele é sobrescrito.
 */
import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origem = resolve(raiz, "lp");
const destino = resolve(raiz, "public/lp");

if (!existsSync(origem)) {
  console.log("espelha-lp: não há lp/ para espelhar — nada a fazer.");
  process.exit(0);
}

// Apaga antes de copiar: sem isso, um arquivo renomeado em lp/ fica para trás
// em public/lp/ e continua sendo servido — a página passa a usar um asset que
// não existe mais na fonte, e o bug some quando alguém limpa a pasta na mão.
await rm(destino, { recursive: true, force: true });
await mkdir(dirname(destino), { recursive: true });
await cp(origem, destino, { recursive: true });
console.log("espelha-lp: lp/ -> public/lp/");
