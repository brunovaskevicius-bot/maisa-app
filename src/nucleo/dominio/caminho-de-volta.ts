/* ─────────────────────────────────────────────────────────────────────────────
 * PARA ONDE VOLTAR — o saneamento do `?next=` / `?volta=`.
 *
 * ── POR QUE ISTO MORA NO NÚCLEO (22/09/2026) ──
 *
 * Porque a mesma pergunta é feita de quatro lugares que NÃO podem se importar entre si:
 *
 *   • `/auth/callback` e `/api/google/{conectar,callback}` — servidor;
 *   • `auth/RecuperarSessaoDaUrl` e `ui/componentes/BotaoGoogle` — `"use client"`.
 *
 * A função nasceu em `saida/google/config.ts`, que é módulo **de servidor** e carrega
 * `GOOGLE_CLIENT_SECRET`. Importá-lo de um componente do navegador puxaria segredo para
 * dentro do bundle, e a guarda de arquitetura reprova — com razão. A saída da vez foi
 * reescrever as três linhas dentro do `RecuperarSessaoDaUrl`, com o motivo anotado lá:
 * *"duas linhas duplicadas custam menos que a exceção"*.
 *
 * Duas cópias com motivo escrito é uma decisão. A TERCEIRA, que o `BotaoGoogle` exigiria,
 * é o começo de regras de saneamento que discordam entre si — e o comentário do
 * `/auth/callback` já dizia que era isso que se queria evitar. Como a função é pura e não
 * sabe nada de Google, o lugar certo dela sempre foi aqui: daqui servidor e navegador
 * importam a MESMA linha, sem exceção de arquitetura e sem segredo atravessando.
 *
 * ⚠️ IMPORTAR PELO CAMINHO DIRETO (`@/nucleo/dominio/caminho-de-volta`), não pelo barril
 * `@/nucleo/dominio`, quando quem importa roda no navegador: o barril arrasta o domínio
 * inteiro para o bundle por causa de três linhas.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * Saneia o caminho de retorno. Só aceita caminho relativo à raiz.
 *
 * Um `startsWith("/")` sozinho deixaria passar `//evil.com` e `/\evil.com`: o primeiro é
 * *protocol-relative* e o navegador obedece — `location.replace("//evil.com")` sai do
 * site. Qualquer coisa fora do formato vira `/`.
 */
export function caminhoDeVolta(volta: string | null | undefined): string {
  const v = volta ?? "";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}
