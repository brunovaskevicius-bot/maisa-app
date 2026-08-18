/* ─────────────────────────────────────────────────────────────────────────────
 * O ENDEREÇO PÚBLICO DA MAISA — UM LUGAR SÓ.
 *
 * Em 17/08/2026 o produto ganhou domínio próprio (`app.maisasecretary.com.br`) e passou a
 * responder em DOIS endereços, porque o `maisa-app-sooty.vercel.app` continua no ar — de
 * propósito, é ele que segura o webhook já pareado. Duas consequências, e nenhuma delas
 * aparece como erro em lugar nenhum:
 *
 *   • o buscador vê duas cópias de cada página pública e escolhe sozinho qual mostrar;
 *   • o Google, ao verificar o app para o escopo sensível `calendar.events`, quer UMA
 *     homepage com UMA política de privacidade — e o revisor pode cair em qualquer das duas.
 *
 * Então o endereço canônico deixa de estar espalhado e vira este módulo. Ele é lido de
 * três lugares de naturezas bem diferentes:
 *
 *   `composicao.ts`   → a URL do webhook que a Evolution vai chamar
 *   `app/layout.tsx`  → o `metadataBase`, que é o que torna os `canonical` absolutos
 *   `middleware.ts`   → o 301 do host antigo para o canônico
 *
 * ⚠️ ESTE ARQUIVO RODA NO EDGE. O middleware do Next não roda em Node: nada de `node:`,
 * nada de SDK, nenhum import além de tipo. É a razão de ele não morar em `composicao.ts`,
 * que é o lugar natural de configuração mas instancia o app inteiro (Anthropic, Supabase,
 * Evolution) — importar aquilo de dentro do middleware derruba o build.
 * ────────────────────────────────────────────────────────────────────────────── */

const env = process.env;

/** A Vercel guarda o valor cru: é comum colar com aspas, espaço ou barra no fim. */
const limpar = (v?: string): string =>
  (v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim().replace(/\/+$/, "");

/**
 * O endereço canônico, sem barra no fim. `""` quando não há nenhum configurado.
 *
 * ⚠️ O fallback é `VERCEL_PROJECT_PRODUCTION_URL`, NUNCA `VERCEL_URL` — este último é o
 * endereço do DEPLOY e muda a cada publicação (o histórico do incidente está no
 * `webhookDoAgente` de `composicao.ts`). E os dois são system env da Vercel, que segundo
 * o histórico deste projeto pode simplesmente não chegar ao runtime: por isso nada aqui
 * DEPENDE delas para funcionar — elas só melhoram o padrão quando existem.
 */
export const URL_CANONICA: string =
  limpar(env.MAISA_PUBLIC_URL) ||
  (limpar(env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${limpar(env.VERCEL_PROJECT_PRODUCTION_URL)}` : "");

/**
 * A URL canônica já analisada, ou `null` se ela estiver ausente ou torta.
 *
 * ⚠️ O `try` NÃO É DECORAÇÃO — foi um teste que o exigiu. A primeira versão fazia
 * `new URL(URL_CANONICA || "http://localhost:3000")` direto na constante exportada
 * abaixo. Como `layout.tsx` importa este módulo, um `MAISA_PUBLIC_URL` com erro de
 * digitação (`app.maisasecretary.com.br`, sem o `https://`) lançava na CARGA DO MÓDULO:
 * o app inteiro virava 500 em toda página, por causa de um valor colado errado num painel.
 * Env torta agora vale o mesmo que env ausente — inerte, e o produto continua de pé.
 */
const CANONICA_ANALISADA: URL | null = (() => {
  if (!URL_CANONICA) return null;
  try {
    return new URL(URL_CANONICA);
  } catch {
    return null;
  }
})();

/** Só o host, minúsculo e sem porta. `""` quando não há URL canônica válida. */
export const HOST_CANONICO: string = CANONICA_ANALISADA?.hostname.toLowerCase() ?? "";

/**
 * Base absoluta para o `metadata` do Next.
 *
 * Existe separada da `URL_CANONICA` porque tem uma obrigação que ela não tem: SEMPRE
 * devolver algo, e nunca lançar. Sem `metadataBase`, todo `alternates.canonical:
 * "/barbeiros"` do projeto resolve contra `localhost:3000` no build — o que publica uma
 * tag canônica apontando para a máquina de quem compilou. O aviso do Next para isso é uma
 * linha no meio de centenas.
 *
 * ⚠️ ISTO É ASSADO NO BUILD, e o 301 não. Medido em 18/08/2026: `/barbeiros`, `/barbeiro`,
 * `/privacidade` e `/termos` são páginas ESTÁTICAS (`○` no relatório do build), então a tag
 * canônica delas sai gravada no HTML no momento em que o build roda. Trocar
 * `MAISA_PUBLIC_URL` no painel da Vercel muda o 301 na hora (o middleware é dinâmico) e
 * NÃO muda a tag canônica até o próximo deploy. Depois de trocar a variável, publique.
 */
export const BASE_DE_METADATA: URL = CANONICA_ANALISADA ?? new URL("http://localhost:3000");

/**
 * De quais hosts se redireciona para o canônico. LISTA EXPLÍCITA, e isso é o conteúdo.
 *
 * A versão óbvia deste módulo era "se o host não é o canônico, 301". Ela quebra três
 * coisas de uma vez, todas silenciosas:
 *
 *   • PREVIEW DEPLOY — `maisa-app-git-alguma-branch.vercel.app` passaria a jogar o
 *     revisor para produção, e testar uma branch deixaria de ser possível;
 *   • `localhost` — o dev com `MAISA_PUBLIC_URL` no `.env.local` seria expulso para
 *     produção ao abrir a própria máquina;
 *   • DOMÍNIO DE CLIENTE — se algum dia um cliente apontar o domínio dele para cá, o
 *     app o cospe de volta para o nosso.
 *
 * A lista tem o host antigo por PADRÃO porque ele é um fato do projeto, não um segredo:
 * já está escrito em `src/adaptadores/saida/supabase/LEIA-ME.md`. Assim isto liga sozinho
 * no momento em que `MAISA_PUBLIC_URL` virar um domínio próprio, sem depender de mais uma
 * variável configurada à mão. `MAISA_HOSTS_ANTIGOS` (lista por vírgula) sobrescreve. *
 * ⚠️ AUSENTE E VAZIA SÃO COISAS DIFERENTES aqui, e é o único lugar do projeto onde isso
 * importa: `undefined` (ninguém configurou) cai no padrão, e `""` (alguém configurou como
 * vazio) DESLIGA o 301. Sem essa distinção não haveria como desligar — só como trocar.
 */
export const HOSTS_ANTIGOS: string[] = (() => {
  const cru = env.MAISA_HOSTS_ANTIGOS;
  const lista = cru === undefined ? ["maisa-app-sooty.vercel.app"] : limpar(cru).split(",");
  return lista
    .map((h) => h.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0])
    .filter(Boolean);
})();

/**
 * Caminhos que NUNCA trocam de host, nem com 301.
 *
 * ⚠️ ESTA LISTA É A PARTE QUE SEGURA O PRODUTO DE PÉ. Não é cautela, são dois danos
 * concretos que o 301 causaria sem ela:
 *
 *   `/api` — a Evolution grava a URL do webhook DENTRO da instância no momento em que o
 *     cliente pareia o WhatsApp. Toda instância pareada antes da troca de domínio aponta
 *     para o host antigo, e a entrega é POST. Um cliente que receba 301 num POST pode
 *     seguir para o novo endereço, pode virar GET, pode desistir — nada disso está sob
 *     nosso controle. O sintoma seria a MAISA emudecer para quem já é cliente, que é o
 *     pior sintoma possível deste sistema. Mesmo raciocínio vale para o
 *     `/api/google/callback`, que precisa voltar na origem que emitiu o cookie do PKCE.
 *
 *   `/auth` — o `code_verifier` do Supabase e o cookie do PKCE do Google são presos à
 *     ORIGEM. Redirecionar `/auth/callback?code=…` para outro host preserva a query e
 *     perde o cookie: o link de confirmação de conta morre com o erro `outro_navegador`,
 *     que é exatamente o bug caçado em 17/08 (ver `app/auth/callback/route.ts`).
 */
export const SEM_TROCA_DE_HOST = ["/api", "/auth"] as const;

const naoTrocaDeHost = (caminho: string): boolean =>
  SEM_TROCA_DE_HOST.some((p) => caminho === p || caminho.startsWith(p + "/"));

/**
 * Para onde este pedido deveria ir, ou `null` para deixá-lo em paz.
 *
 * Função pura de propósito: quem chama é o middleware, que é difícil de testar, e a
 * decisão inteira é o que interessa provar. Ver `endereco.test.ts`.
 */
export function destinoCanonico(p: {
  host: string | null | undefined;
  caminho: string;
  busca: string;
  metodo: string;
}): string | null {
  if (!HOST_CANONICO) return null;
  // Só GET/HEAD. Um 301 em POST/PUT/DELETE deixa o corpo no caminho: o cliente reenvia
  // como GET (permitido pela norma) ou desiste, e em nenhum dos casos a ação acontece.
  if (p.metodo !== "GET" && p.metodo !== "HEAD") return null;

  const atual = (p.host ?? "").toLowerCase().split(":")[0];
  if (!atual || atual === HOST_CANONICO) return null;
  if (!HOSTS_ANTIGOS.includes(atual)) return null;
  if (naoTrocaDeHost(p.caminho)) return null;

  return `${URL_CANONICA}${p.caminho}${p.busca}`;
}
