import { rostosOrbita } from "../../imagens";

/* ----------------------------------------------------------------------------
 * A FILEIRA — uma linha de rostos no pé da dobra, e ela É a divisória.
 *
 * O QUE ELA SUBSTITUI, e por que não é perda. Até 07/08/2026 a dobra era uma RODA
 * de 64 cartões em dois anéis que desenrolava no scroll e virava exatamente isto:
 * uma barra horizontal de rostos, pousada na costura com a seção seguinte. O
 * pedido foi "esteticamente está legal, mas está muito pesada — só uma linha de
 * pessoas". Então a página passa a COMEÇAR no estado em que a roda terminava.
 *
 * O que morreu junto: `Roda.tsx`, `Morph.tsx`, `geometria.ts` e `trilha.ts` — o
 * palco pinado de 200svh, a matemática de desenrolar e o traçado que varria o
 * vazio em volta do anel. Tudo em `.claude/snapshots/v3-antes-da-fileira-2026-08-07/`,
 * porque esta pasta é untracked e o git não protege nada dela.
 *
 * ── POR QUE ELA ANDA, se o pedido era aliviar.
 * Porque a frase diz "TODOS ESSES", e uma fila parada de catorze rostos afirma
 * catorze. Uma fita contínua não tem fim à vista: ela afirma "muitos", que é o que
 * a roda afirmava com 64 cartões e é a única coisa dela que a página não pode
 * perder. O custo é zero em JavaScript — são dois `translateX` de keyframe, na
 * thread de composição, sem layout e sem repintura. A roda custava 64 `transform`
 * escritos por quadro do lado do cliente; esta linha custa nenhum.
 *
 * ── COMO A EMENDA SE FECHA: a fita anda porque nada mais anda. O DS proíbe loop na
 * interface, e a exceção que esta página abriu é de UM elemento ambiente por vez —
 * era a trilha, hoje é a poeira. A fita não abre uma segunda: ela não pulsa, não
 * clareia e não reage a nada. É uma fotografia longa passando devagar, e o
 * `prefers-reduced-motion` a congela numa fotografia curta, que continua inteira.
 *
 * ── O TRUQUE DA COSTURA. A lista sai DUAS vezes e a pista anda -50%: quando a
 * segunda cópia chega onde a primeira começou, o quadro é idêntico ao quadro zero e
 * a keyframe reinicia sem emenda visível. É por isso que a duplicata é obrigatória,
 * e é por isso que ela vai `aria-hidden` — para um leitor de tela é a mesma fila.
 * -------------------------------------------------------------------------- */

/* CATORZE, e o número tem duas amarras. Por baixo: a lista precisa ser mais larga
   que a tela mais larga, senão a fita mostra o vazio entre a primeira cópia e a
   segunda. Em 1920px, com rosto de 134px e vão de 12px, catorze dão 2.044px — sobra.
   Por cima: cada rosto é um arquivo, e a dobra é a primeira tela. Vinte e oito nós
   (catorze × duas cópias) contra os 64 cartões de antes, servindo 14 URLs contra 32. */
const ROSTOS = rostosOrbita.slice(0, 14);

export function Fileira() {
  return (
    <div className="lp3-fileira">
      {/* UMA imagem para quem não enxerga, não catorze — mesma decisão que estava
          na <Roda>, pelo mesmo motivo: um leitor de tela anunciando catorze
          retratos de banco de imagem, um a um, transformaria o pé da dobra num
          túnel. O `alt` real de cada rosto continua escrito em imagens.ts, onde
          serve de documentação para quem for trocar as fotos. */}
      <div
        className="lp3-fileira-pista"
        role="img"
        aria-label="Uma fila de rapazes atendidos em barbearia, passando devagar."
      >
        {([0, 1] as const).map((copia) => (
          <div key={copia} className="lp3-fileira-lote" aria-hidden={copia === 1 ? true : undefined}>
            {ROSTOS.map((rosto, i) => (
              <div className="lp3-rosto" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rosto.url}
                  alt=""
                  width={240}
                  height={300}
                  /* `eager` porque a fileira está na primeira tela e `lazy` aqui não
                     adiaria nada — só atrasaria. `low` porque o pixel medido da
                     dobra é a frase, não os retratos. E são 14 arquivos, não 28: as
                     duas cópias repetem as URLs e o navegador busca cada uma
                     uma vez só. */
                  loading="eager"
                  fetchPriority="low"
                  decoding="async"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
