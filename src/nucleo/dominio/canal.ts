/* ─────────────────────────────────────────────────────────────────────────────
 * CANAL — por onde o negócio fala com o cliente dele.
 *
 * Hoje é WhatsApp via Evolution API. O tipo não diz "Evolution" em lugar nenhum de
 * propósito: a Cloud API da Meta é o segundo provedor previsto, e a tabela
 * `integracoes_whatsapp` já tem a coluna `provedor` com os dois valores.
 *
 * ── POR QUE ISTO É DOMÍNIO, E NÃO DETALHE DO ADAPTADOR ──
 *
 * Porque "conectado / pareando / desconectado" é a pergunta que o produto faz o tempo
 * todo — a tela mostra, o onboarding conta como etapa, e a cobrança um dia vai olhar.
 * Se o estado só existisse dentro do adaptador, cada consumidor traduziria o vocabulário
 * da Evolution (`open`/`connecting`/`close`) por conta própria, e o dia em que entrar a
 * Cloud API haveria três traduções diferentes para consertar.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Os três estados que o produto conhece. Espelha o `check` de `integracoes_whatsapp.status`. */
export type StatusDoCanal = "desconectado" | "pareando" | "conectado";

/**
 * O vocabulário da Evolution, traduzido uma vez só.
 *
 * `open` é o único que significa conectado. `connecting` é o QR na tela esperando alguém
 * apontar a câmera. Qualquer outra coisa — `close`, ausente, nome novo numa versão futura
 * — é desconectado: o padrão seguro é dizer que não está no ar, porque o erro contrário
 * (dizer "conectado" quando não está) faz o dono ir embora achando que terminou.
 */
export function statusDeEstadoEvolution(estado: string | null | undefined): StatusDoCanal {
  const e = String(estado ?? "").toLowerCase();
  if (e === "open") return "conectado";
  if (e === "connecting") return "pareando";
  return "desconectado";
}

export type Canal = {
  status: StatusDoCanal;
  /** O nome da instância no provedor. Identificador técnico — não mostrar ao cliente. */
  instancia: string;
  /** O número que o cliente do negócio vê, em E.164. `null` até o pareamento terminar. */
  numero: string | null;
  conectadoEm: string | null;
};

/**
 * O que a tela precisa para desenhar o passo "conecte seu WhatsApp".
 *
 * `qrcode` é `data:image/png;base64,…` pronto para um `<img src>`. Ele é EFÊMERO: a
 * Evolution troca o código a cada poucos segundos e o antigo para de funcionar, então
 * isto não se guarda em lugar nenhum — nem no banco, nem no estado do navegador além do
 * necessário para pintar.
 */
export type Pareamento = {
  qrcode: string | null;
  status: StatusDoCanal;
  instancia: string;
};
