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
 * O telefone DIGITADO pelo dono, virando o formato que o pareamento por código exige.
 *
 * ── POR QUE ISTO EXISTE, SE O DONO "NUNCA DIGITA O TELEFONE" ──
 *
 * Porque quem conecta pelo celular não consegue ler o QR: a câmera do aparelho não
 * fotografa a própria tela. O WhatsApp resolve isso com "Conectar com número de telefone",
 * que troca a câmera por um código de 8 caracteres — e para emitir esse código o provedor
 * precisa saber PARA QUAL número emitir. Não há como não perguntar.
 *
 * ⚠️ ISSO NÃO REVOGA A REGRA DE QUEM É A FONTE DA VERDADE. O que o dono digita é INSUMO
 * do pareamento e morre ali: quem escreve `integracoes_whatsapp.numero` continua sendo o
 * `ownerJid` que o provedor devolve depois de conectar (ver `numeroDeJid` e o
 * `EstadoDoCanal`). Guardar o digitado seria gravar uma intenção como se fosse um fato —
 * e o dia em que ele errar um dígito, a tela mostraria para sempre um número que não
 * pareou. Com a regra atual, errar o dígito só faz o código não chegar.
 *
 * ── O VIÉS BRASILEIRO É DELIBERADO ──
 *
 * 10 ou 11 dígitos ganham `55` na frente, porque é o que o dono digita: ele escreve
 * "(11) 99429-4906", não "+55 11…". A consequência é que um número estrangeiro de 11
 * dígitos (um +1 americano, por exemplo) seria lido como brasileiro. É trade-off
 * assumido — o produto vende para barbearia e clínica no Brasil, e quem tiver número de
 * fora pode digitar com o DDI que o ramo de 12–15 dígitos aceita.
 *
 * `null` = não dá para pedir código com isso. Quem chama transforma em erro de campo,
 * nunca em chamada ao provedor: pedir código para um número inválido gasta uma tentativa
 * do WhatsApp e devolve um código que não chega em lugar nenhum.
 */
export function numeroParaPareamento(v: string | null | undefined): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  /* Celular ou fixo com DDD e sem DDI — o caso normal, e por isso o primeiro. */
  if (d.length === 10 || d.length === 11) return `55${d}`;
  /* Já veio com o 55: aceita como está, inclusive o celular antigo de 8 dígitos (12 no
   * total). Não normalizamos o nono dígito aqui — quem sabe se a linha o tem é a operadora,
   * e inventar um dígito faria pedir código para um número que não existe. */
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  /* Estrangeiro com DDI. 15 é o teto do E.164. */
  if (d.length >= 12 && d.length <= 15) return d;
  return null;
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
  /**
   * Para quem a MAISA manda "preciso de você nessa conversa". Em E.164 sem `+`.
   *
   * ── POR QUE ISTO É POR INQUILINO, E NÃO UMA VARIÁVEL DE AMBIENTE ──
   *
   * Porque era uma env global (`MAISA_WHATSAPP_DONO`) até 17/08/2026, e isso significava
   * que a escalação de QUALQUER negócio ia para o mesmo celular. O aviso carrega o
   * telefone do cliente final e o motivo da conversa: com uma env, o cliente da barbearia
   * do Zé teria o número dele entregue no WhatsApp de outra pessoa — vazamento entre
   * inquilinos por configuração, não por bug de consulta.
   *
   * E o dono do Zé nunca seria avisado, então toda conversa que a MAISA não conseguisse
   * resolver simplesmente morreria: o cliente esperando, e ninguém do outro lado sabendo
   * que havia alguém esperando.
   *
   * `null` = ninguém é avisado, e a escalação fica só no log. É estado legítimo (o dono
   * ainda não preencheu), e a tela pede — mas não bloqueia, porque um canal que atende é
   * melhor que um canal que não sobe por falta de um campo opcional.
   */
  telefoneDono: string | null;
};

/**
 * O que a tela precisa para desenhar o passo "conecte seu WhatsApp".
 *
 * ── DOIS CAMINHOS, E O SEGUNDO NÃO É LUXO ──
 *
 * `qrcode` é `data:image/png;base64,…` pronto para um `<img src>`. `codigo` são os 8
 * caracteres do "Conectar com número de telefone" do WhatsApp. Vêm juntos no mesmo tipo
 * porque respondem à mesma pergunta do dono ("como eu ligo isso?") e porque a escolha
 * entre eles é da TELA, não do domínio: quem está no celular não tem como ler o QR — a
 * câmera não fotografa a própria tela —, e quem está no computador acha o código mais
 * trabalhoso que apontar a câmera.
 *
 * Os dois são EFÊMEROS e não se guardam em lugar nenhum, nem no banco: a Evolution troca
 * o QR a cada poucos segundos e o código do WhatsApp vale cerca de um minuto. Persistir
 * qualquer um dos dois é oferecer ao dono um código morto na próxima vez que ele abrir a
 * tela — e o sintoma disso é ele concluir que o produto não funciona.
 *
 * `codigo: null` com `status: "pareando"` é caso legítimo: significa "pediram QR". O
 * inverso também — os dois nulos ao mesmo tempo é que é problema, e quem trata é a tela
 * (ver o comentário de `conectar` no adaptador da Evolution).
 */
export type Pareamento = {
  qrcode: string | null;
  /** Os 8 caracteres do "Conectar com número de telefone". `null` = pareamento por QR. */
  codigo: string | null;
  status: StatusDoCanal;
  instancia: string;
};
