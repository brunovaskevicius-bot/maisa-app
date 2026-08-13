/* ─────────────────────────────────────────────────────────────────────────────
 * LEMBRETE — a mensagem que sai sozinha antes do atendimento.
 *
 * A função existia como promessa em três lugares (o toggle "Lembrete 3h antes" na tela,
 * o prompt do agente, e as landing pages: "os lembretes chegam sozinhos aos seus
 * pacientes") e não existia em lugar nenhum como código.
 *
 * ── POR QUE O TEXTO É TEMPLATE, E NÃO O MODELO ESCREVENDO ──
 *
 * A MAISA tem tom configurável e um agente que escreve bem. A tentação de mandar o
 * lembrete por ele é grande e está errada, por três razões:
 *
 *   1. CUSTO — um lembrete por atendimento, todo dia, para sempre. É a única mensagem do
 *      produto cujo volume é proporcional à agenda inteira, e não à conversa.
 *   2. RISCO — ninguém revisa. Uma mensagem que o modelo inventa numa conversa tem o
 *      cliente do outro lado corrigindo; esta chega pronta, sem ninguém no meio.
 *   3. LATÊNCIA — a rotina roda em lote. Uma chamada de modelo por linha transforma uma
 *      varredura de 100 atendimentos numa função que estoura o tempo da plataforma.
 *
 * O que o template NÃO faz é fingir personalidade: ele assina com o nome da assistente e
 * do negócio e para por aí. Quem quiser um lembrete escrito com o tom da casa, escreve o
 * texto — é a evolução natural daqui, e é um campo, não um modelo.
 * ────────────────────────────────────────────────────────────────────────────── */

/** O que a varredura devolve por atendimento a lembrar. */
export type LembretePendente = {
  id: string;
  tenantId: string;
  clienteNome: string | null;
  clienteTel: string;
  servicoNome: string | null;
  /** ISO com fuso — é `timestamptz` no banco. */
  inicio: string;
};

/**
 * Quanto antes do atendimento o lembrete sai.
 *
 * ⚠️ TRÊS LUGARES PROMETEM PRAZOS DIFERENTES hoje: a tela diz "3h antes", a LP de
 * barbeiros v3 diz "no dia anterior", e `completa/dados.ts:89` diz "3h antes". Este valor
 * é o que o produto FAZ, e a tela é a que concorda com ele. As LPs que divergem estão
 * erradas — está anotado no log de iteração, e a correção é de texto, não de código.
 */
export const HORAS_ANTES = 3;

/** A janela da varredura: de agora até `HORAS_ANTES` à frente. */
export const janelaDeLembrete = (agora: Date): Date =>
  new Date(agora.getTime() + HORAS_ANTES * 60 * 60 * 1000);

/**
 * `"2026-08-14T18:30:00+00:00"` → `"15:30"` no fuso do negócio.
 *
 * ⚠️ O FUSO É O PONTO INTEIRO DESTA FUNÇÃO. O banco guarda `timestamptz` e devolve em
 * UTC; a função serverless roda em UTC; e o cliente que lê a mensagem está em São Paulo.
 * Formatar sem dizer o fuso mandaria "seu horário é às 18:30" para um atendimento das
 * 15:30 — o tipo de erro que ninguém percebe em teste, porque a máquina do teste também
 * está em UTC, e que todo cliente percebe na primeira mensagem.
 */
export function horaLocal(iso: string, fuso = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
    hour12: false,
  }).format(new Date(iso));
}

/** O primeiro nome. "Maria Aparecida da Silva" vira "Maria" — é como se fala no WhatsApp. */
const primeiroNome = (nome: string | null): string => {
  const limpo = (nome ?? "").trim();
  if (!limpo) return "";
  return limpo.split(/\s+/)[0];
};

/**
 * O texto do lembrete.
 *
 * Uma mensagem só, e não as duas ou três bolhas que o agente usa numa conversa: isto
 * chega sem contexto, provavelmente no meio de outra coisa, e três notificações seguidas
 * de um número comercial é o que faz gente bloquear.
 *
 * Fecha com a saída — "se não puder, me avisa" — porque o valor do lembrete para o dono
 * não é o cliente lembrar: é o horário vago aparecer com antecedência suficiente para ser
 * reocupado. Um lembrete que não convida a responder perde justamente isso.
 */
export function textoDoLembrete(p: {
  pendente: LembretePendente;
  nomeDoNegocio: string;
  nomeDaAssistente: string;
  fuso?: string;
}): string {
  const nome = primeiroNome(p.pendente.clienteNome);
  const ola = nome ? `Oi, ${nome}!` : "Oi!";
  const servico = p.pendente.servicoNome ? ` de ${p.pendente.servicoNome}` : "";
  const hora = horaLocal(p.pendente.inicio, p.fuso);

  return (
    `${ola} Passando para lembrar do seu horário${servico} hoje às ${hora}, ` +
    `no ${p.nomeDoNegocio}. Se não puder vir, me avisa por aqui que eu remarco. ` +
    `— ${p.nomeDaAssistente}`
  );
}
