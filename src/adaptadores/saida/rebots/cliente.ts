/* ─────────────────────────────────────────────────────────────────────────────
 * REBOTS — o cliente HTTP. ⚠️ SÓ SERVIDOR.
 *
 * Cinco POSTs, JWT obtido com a `master_key`. **Nenhum GET** — ver o LEIA-ME desta pasta para o
 * que essa ausência custa.
 *
 * ── ⚠️ O TTL DO TOKEN NÃO ESTÁ DOCUMENTADO ──
 *
 * A resposta do `/auth/token` traz `access_token`, `token_type` e `client_name`. Nenhum
 * `expires_in`. Então não há como calcular validade, e chutar um número seria fingir que
 * sabemos: chute curto queima chamada de autenticação à toa, chute longo faz a emissão falhar
 * com 401 justamente quando o token vence.
 *
 * A saída é não depender do prazo: guarda o token, e **em 401 pega outro e tenta de novo, uma
 * vez**. É o mesmo desenho do `comSegundaChance` da Evolution, e por o mesmo motivo — a única
 * informação confiável sobre expiração é a resposta do servidor.
 *
 * ⚠️ A retentativa é APENAS para 401. Repetir um `POST /receipts` por timeout emitiria o segundo
 * recibo — e é exatamente o que o `receipt_id` (nossa chave de idempotência) existe para
 * impedir. Mas confiar na idempotência de terceiro para uma consequência irreversível é aposta
 * que não precisamos fazer: em timeout, quem resolve é a reconciliação.
 * ────────────────────────────────────────────────────────────────────────────── */

import { REBOTS } from "./config";

/** O token em memória do processo. Morre com ele, e isso é aceitável: pegar outro é um POST. */
let tokenEmMemoria: string | null = null;

export class ErroRebots extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string | null,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroRebots";
  }
}

type Resposta = { status: number; corpo: any };

async function postCru(caminho: string, corpo: unknown, token?: string): Promise<Resposta> {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), REBOTS.timeoutMs);
  try {
    const r = await fetch(`${REBOTS.baseUrl}${caminho}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    });
    const texto = await r.text();
    let json: any = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { json = { raw: texto }; }
    return { status: r.status, corpo: json };
  } finally {
    clearTimeout(relogio);
  }
}

/** Pega um token novo. Chamado na estreia e em todo 401. */
async function autenticar(): Promise<string> {
  const { status, corpo } = await postCru("/receita-saude/v2/auth/token", {
    identificador: REBOTS.identificador,
    master_key: REBOTS.masterKey,
  });

  if (status !== 200 || !corpo?.access_token) {
    /* ⚠️ A MENSAGEM NÃO PODE CARREGAR O CORPO CRU. Um 4xx de autenticação às vezes ecoa o que
     * foi mandado, e o que foi mandado aqui é a `master_key`. Ela iria para o log e para a tela. */
    throw new ErroRebots(status, corpo?.error_code ?? null,
      "A Rebots recusou a autenticação. Confira `REBOTS_IDENTIFICADOR` e `REBOTS_MASTER_KEY`.");
  }
  tokenEmMemoria = String(corpo.access_token);
  return tokenEmMemoria;
}

/** Só para teste: esquece o token guardado. */
export function esquecerTokenRebots(): void {
  tokenEmMemoria = null;
}

/**
 * POST autenticado, com uma segunda chance em 401.
 *
 * `naoRepetir` desliga a retentativa para chamadas cuja repetição tem consequência — hoje
 * nenhuma precisa, porque `/receipts` leva `receipt_id`. Fica como a alavanca explícita de
 * "esta chamada não se repete", para o dia em que alguém adicionar uma que não seja idempotente.
 */
export async function chamar(
  caminho: string,
  corpo: Record<string, unknown>,
  opcoes: { naoRepetir?: boolean } = {},
): Promise<any> {
  const comIdentificador = { identificador: REBOTS.identificador, ...corpo };

  let token = tokenEmMemoria ?? (await autenticar());
  let r = await postCru(caminho, comIdentificador, token);

  if (r.status === 401 && !opcoes.naoRepetir) {
    token = await autenticar();
    r = await postCru(caminho, comIdentificador, token);
  }

  if (r.status < 200 || r.status >= 300) {
    const codigo = r.corpo?.error_code ?? null;
    const mensagem = r.corpo?.error_message
      ?? r.corpo?.message
      ?? `A Rebots respondeu ${r.status}.`;
    throw new ErroRebots(r.status, codigo, String(mensagem));
  }

  return r.corpo;
}
