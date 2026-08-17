"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * PAREAR O WHATSAPP SEM CÂMERA — o código de 8 caracteres, e o campo que o pede.
 *
 * ── O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA RESOLVER ──
 *
 * O QR pressupõe DOIS aparelhos: um mostrando o código e outro fotografando. Metade dos
 * clientes abre a MAISA no próprio celular — o mesmo aparelho onde o WhatsApp do negócio
 * está instalado. Não existe segunda câmera, e a câmera que existe não fotografa a
 * própria tela. Para essa pessoa o onboarding simplesmente NÃO TERMINA, e o produto não
 * tem como saber: do lado de cá, é só um QR que ninguém leu.
 *
 * O WhatsApp resolve isso oficialmente com "Conectar com número de telefone", que troca a
 * câmera por 8 caracteres digitados. É o que estas peças desenham.
 *
 * ── POR QUE COMPARTILHADO, E NÃO COPIADO NAS DUAS TELAS ──
 *
 * Porque o conteúdo de valor aqui é a INSTRUÇÃO, não o layout: os nomes exatos dos itens
 * do menu do WhatsApp ("Aparelhos conectados", "Conectar aparelho", "Conectar com número
 * de telefone"). Eles mudam quando o WhatsApp muda, e a pessoa que for corrigir vai
 * corrigir onde viu o erro. Duas cópias garantem que uma delas fique mentindo — e uma
 * instrução errada aqui é o dono procurando um botão que não existe, no minuto em que ele
 * decide se o produto funciona.
 * ────────────────────────────────────────────────────────────────────────────── */

import React from "react";
import { s, Icon, toast } from "@/ui/primitivos";
import { telefoneBonito } from "@/nucleo/dominio/clientes";

/**
 * O telefone do jeito que se digita: dígitos no estado, máscara na tela.
 *
 * Guardar o formatado seria guardar pontuação como se fosse dado — e é o que faz um campo
 * recusar um número válido porque sobrou um parêntese. Quem valida de verdade é
 * `numeroParaPareamento`, no domínio, e ele só olha dígitos.
 */
export const digitosDoTelefone = (v: string) => v.replace(/\D/g, "").slice(0, 13);

/** A máscara de exibição. Reusa a do painel para não existir um segundo formato de
 *  telefone no produto. Enquanto o número está incompleto, ela devolve o que der. */
export const telefoneMascarado = (digitos: string) => (digitos ? telefoneBonito(digitos) : "");

/**
 * Os 8 caracteres, grandes, copiáveis, com o passo a passo do WhatsApp ao lado.
 *
 * ── AS TRÊS DECISÕES QUE ESTE COMPONENTE CARREGA ──
 *
 * **Quebra em dois blocos de quatro.** O WhatsApp mostra o campo assim, e um código
 * corrido de 8 caracteres é lido errado por quem está alternando entre dois apps de
 * memória. A quebra é visual: `aria-label` e a cópia levam o código inteiro e limpo.
 *
 * **Copiar é o caminho principal, não um enfeite.** A pessoa vai TROCAR DE APLICATIVO no
 * meio da tarefa — e é aí que se perde um código lido de relance. Com a cópia, o gesto
 * vira colar. O botão continua ao lado do código visível de propósito: `navigator.clipboard`
 * exige contexto seguro e permissão, e falha calado em navegador embutido (o WhatsApp tem
 * o dele). Quando falha, o código ainda está na tela para ler — e o `catch` avisa em vez
 * de fingir que copiou.
 *
 * **Monospace e `letter-spacing`.** O WhatsApp emite alfanumérico maiúsculo, onde 0/O e
 * 1/I são o erro mais comum. Fonte de largura fixa não resolve sozinha, mas é o que
 * separa os caracteres o bastante para a pessoa conferir o que digitou.
 */
export function CodigoPareamento({ codigo }: { codigo: string }) {
  const [copiou, setCopiou] = React.useState(false);

  const copiar = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiou(true);
      toast("Código copiado");
      /* Volta ao normal sozinho: o código expira em cerca de um minuto, e um "copiado!"
       * permanente ao lado de um código morto é a informação errada no pior momento. */
      setTimeout(() => setCopiou(false), 2500);
    } catch {
      toast("Não consegui copiar — digite o código do lado");
    }
  }, [codigo]);

  return (
    <div style={s("display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:var(--surface)")}>
      <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
        <span
          aria-label={`Código de pareamento ${codigo}`}
          style={s(
            "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:26px;font-weight:var(--w-title);" +
            "letter-spacing:.18em;color:var(--ink);white-space:nowrap",
          )}
        >
          {codigo.slice(0, 4)}<span style={s("opacity:.35;margin:0 .12em")}>-</span>{codigo.slice(4)}
        </span>

        <button
          onClick={() => void copiar()}
          className="m-hov-bg m-press m-focus"
          style={s(
            "display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:10px;" +
            "border:1px solid var(--border);background:var(--surface);font-family:inherit;font-size:var(--t-label);" +
            `font-weight:var(--w-title);cursor:pointer;color:${copiou ? "var(--success)" : "var(--muted)"}`,
          )}
        >
          <Icon name={copiou ? "check" : "copy"} size={15} sw={2.2} stroke="currentColor" />
          {copiou ? "Copiado" : "Copiar"}
        </button>
      </div>

      {/* O caminho EXATO do menu. Ver o cabeçalho: é o conteúdo que este arquivo protege
          de virar duas cópias divergentes. */}
      <ol style={s("margin:0;padding-left:17px;font-size:var(--t-label);color:var(--muted);line-height:1.75")}>
        <li>Abra o <b style={s("color:var(--ink)")}>WhatsApp</b> neste mesmo celular</li>
        <li>Menu <b style={s("color:var(--ink)")}>⋮</b> → <b style={s("color:var(--ink)")}>Aparelhos conectados</b></li>
        <li>
          <b style={s("color:var(--ink)")}>Conectar aparelho</b> → toque em{" "}
          <b style={s("color:var(--ink)")}>Conectar com número de telefone</b>
        </li>
        <li>Digite (ou cole) o código acima</li>
      </ol>

      {/* Diz que o prazo existe SEM cronômetro. Um contador regressivo transforma uma
          tarefa de 20 segundos em corrida contra o relógio, e quem se atrapalha refaz. */}
      <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
        O código vale por cerca de um minuto. Se vencer, é só gerar outro — esta tela avisa
        sozinha quando conectar.
      </span>
    </div>
  );
}
