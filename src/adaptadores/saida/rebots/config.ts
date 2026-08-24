/* ─────────────────────────────────────────────────────────────────────────────
 * REBOTS — configuração. ⚠️ SÓ SERVIDOR.
 *
 * Mesma regra da Evolution, do Google e da Focus: **nenhuma variável daqui tem prefixo
 * NEXT_PUBLIC_**. A `master_key` é credencial de emissão de documento fiscal em nome de
 * terceiro — quem a tem emite recibo do Receita Saúde no CPF das nossas clientes.
 *
 * ⚠️ O `identificador` VIAJA EM TODA CHAMADA e não é segredo: é o nome da conta. O segredo é a
 * `master_key`, e ela só aparece no `POST /auth/token`. Trocar os dois de lugar é o erro de
 * estreia — mandar a master_key em toda requisição multiplica por N a chance de ela cair num log.
 * ────────────────────────────────────────────────────────────────────────────── */

const env = process.env;

/** A Vercel guarda o valor cru: é comum colar com aspas ou espaço. Mesmo `clean` das outras. */
const clean = (v?: string): string => (v ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();

export const REBOTS = {
  /** Raiz da API, sem barra no fim. Fica em env porque um dia eles versionam o host. */
  baseUrl: clean(env.REBOTS_BASE_URL).replace(/\/+$/, "") || "https://api.rebots.com.br",
  /** O nome da conta. Vai no corpo de toda chamada. Não é segredo. */
  identificador: clean(env.REBOTS_IDENTIFICADOR),
  /** ⚠️ O SEGREDO. Só no `/auth/token`. */
  masterKey: clean(env.REBOTS_MASTER_KEY),
  /**
   * `test: true` em toda emissão enquanto isto não for explicitamente `"false"`.
   *
   * ★ O PADRÃO É TESTE, E É DE PROPÓSITO — invertido em relação a quase toda flag do repo. O
   * desfecho de errar para cada lado não é simétrico: nascer em teste custa uma variável de
   * ambiente esquecida; nascer em produção custa um documento fiscal no CPF de uma paciente,
   * que se cancela um por um, em dez dias. Mesma lógica do `ambiente` da config fiscal, que
   * também nasce em homologação.
   */
  producao: clean(env.REBOTS_PRODUCAO) === "true",
  /**
   * Teto por chamada. 20s porque a emissão é assíncrona do lado deles — o POST só registra, e
   * registrar não deveria levar mais que isso. Curto o bastante para não segurar a função
   * serverless até a plataforma matá-la, que é quando não sobra log nosso.
   */
  timeoutMs: Number(clean(env.REBOTS_TIMEOUT_MS)) || 20_000,
};

const OBRIGATORIAS: [string, string][] = [
  ["REBOTS_IDENTIFICADOR", REBOTS.identificador],
  ["REBOTS_MASTER_KEY", REBOTS.masterKey],
];

export const isRebotsConfigured = OBRIGATORIAS.every(([, v]) => Boolean(v));

/** Nomes das variáveis que faltam — para a tela dizer o que falta, sem adivinhação. */
export function rebotsFaltando(): string[] {
  return OBRIGATORIAS.filter(([, v]) => !v).map(([nome]) => nome);
}

/**
 * Avisos que não impedem funcionar, mas mudam o que acontece.
 *
 * O primeiro é o que importa: emitir em produção sem ninguém ter decidido isso é o único
 * caminho deste adaptador que produz consequência irreversível.
 */
export function rebotsAvisos(): string[] {
  const avisos: string[] = [];
  if (!REBOTS.producao) {
    avisos.push(
      "A Rebots está em MODO TESTE (`test: true` em toda emissão). Nenhum recibo sai de verdade "
      + "até `REBOTS_PRODUCAO=true`.",
    );
  }
  return avisos;
}
