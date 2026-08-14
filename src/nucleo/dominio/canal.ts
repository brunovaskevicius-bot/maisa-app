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

/**
 * O número, do jeito que o provedor devolve, virando E.164 sem `+`.
 *
 * A Evolution devolve um JID: `5511994294906@s.whatsapp.net`, às vezes com sufixo de
 * device (`:12@…`) e às vezes com `@lid` em vez de `@s.whatsapp.net`. Guardar o JID cru
 * na coluna `numero` faria a tela mostrar "5511994294906@s.whatsapp.net" para o dono, e
 * faria qualquer comparação futura com um telefone digitado falhar em silêncio.
 *
 * Fica no domínio, e não no adaptador, pela mesma razão de `statusDeEstadoEvolution`: a
 * Cloud API entrega o número em outro formato e vai precisar da mesma normalização de
 * chegada. Uma tradução por vocabulário de provedor, num lugar só.
 */
export function numeroDeJid(jid: string | null | undefined): string | null {
  const so = String(jid ?? "").split("@")[0].split(":")[0].replace(/\D/g, "");
  /* Menos de 8 dígitos não é telefone — é lixo ou identificador interno da Evolution.
   * Devolver `null` deixa a tela dizer "conectado" sem número, que é honesto; devolver o
   * lixo faria o dono ler um número que não é dele e desconfiar do produto inteiro. */
  return so.length >= 8 ? so : null;
}

/**
 * O que o PROVEDOR sabe sobre a instância agora.
 *
 * Nasceu com `status` só. O `numero` entrou depois, em 13/08/2026, porque a coluna
 * `integracoes_whatsapp.numero` ficava `null` para sempre: nós gravávamos o que já
 * tínhamos (nada) em vez de perguntar a quem sabe. Quem sabe qual número pareou é o
 * provedor — o dono aponta a câmera para o QR e nunca digita o telefone em lugar nenhum.
 *
 * `numero: null` é resposta legítima e comum: instância que ainda não pareou não tem
 * dono. Não confundir com "o provedor não respondeu" — esse caso lança.
 */
export type EstadoDoCanal = {
  status: StatusDoCanal;
  numero: string | null;
};

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
