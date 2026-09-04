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
 * Quanto antes do atendimento o lembrete sai — o PADRÃO, desde 04/09/2026.
 *
 * ⚠️ DEIXOU DE SER O NÚMERO. Quem manda agora é `assistente.lembrete_horas`, por
 * inquilino (`026_lembrete_horas.sql`): três horas é prazo de barbearia, e uma sessão de
 * terapia avisada três horas antes já está perdida. Esta constante sobrou como o valor de
 * partida de quem nunca escolheu, e o `default` da coluna tem que bater com ela.
 *
 * O que continua valendo do aviso antigo: o prazo aparece em texto para o cliente, e texto
 * que promete um número específico envelhece calado. Por isso os dois lugares que o citavam
 * agora o LEEM em vez de escrevê-lo:
 *   • `src/adaptadores/saida/demo/assistente.ts` → o rótulo do toggle;
 *   • `lp/terapeutas/index.html` → passou a falar em lembrete automático, sem prazo fixo.
 *
 * A LP de barbeiros v3 NÃO cita prazo, de propósito — o cabeçalho de `v3/dados.ts`
 * explica por quê. Não acrescente.
 */
export const HORAS_ANTES = 3;

/**
 * O teto do que se pode escolher: sete dias.
 *
 * ⚠️ TEM QUE BATER COM O `check` DA COLUNA (`026_lembrete_horas.sql`). Aqui ele serve para
 * duas coisas: recusar no caso de uso antes de o banco recusar — erro de domínio em
 * português vale mais que `23514` — e dizer até onde a varredura precisa olhar.
 */
export const MAX_HORAS_ANTES = 168;

/**
 * O que a tela oferece. Lista fechada, e não campo livre.
 *
 * ★ O CAMPO LIVRE É O DESENHO DO SMILLER, e ele erra por cima e por baixo: aceita "2" numa
 * agenda de terapia (tarde demais) e aceita "100" sem que ninguém saiba o que isso quer
 * dizer em dias. Uma lista curta com o prazo escrito em português de gente decide por
 * reconhecimento, não por aritmética mental.
 *
 * ⚠️ O piso é 1h porque o `pg_cron` da 011 roda de 15 em 15 minutos. "30 minutos antes"
 * seria prometer uma precisão que o disparador não tem.
 */
export const OPCOES_ANTECEDENCIA: { horas: number; rotulo: string }[] = [
  { horas: 1, rotulo: "1 hora antes" },
  { horas: 3, rotulo: "3 horas antes" },
  { horas: 12, rotulo: "12 horas antes" },
  { horas: 24, rotulo: "1 dia antes" },
  { horas: 48, rotulo: "2 dias antes" },
  { horas: 168, rotulo: "1 semana antes" },
];

/**
 * O TETO da varredura — não a janela.
 *
 * ⚠️ A JANELA É POR INQUILINO e vive no SQL, porque a varredura é uma só para todos e um
 * número aqui não consegue expressar N réguas diferentes (ver o cabeçalho da 026). O que
 * esta função devolve é o "nem olhe depois disto" que mantém a consulta presa ao índice
 * parcial em vez de varrer a agenda inteira do futuro.
 */
export const janelaDeLembrete = (agora: Date): Date =>
  new Date(agora.getTime() + MAX_HORAS_ANTES * 60 * 60 * 1000);

/** `24` → `"1 dia antes"`. Cai no genérico quando o valor não está na lista. */
export const rotuloDaAntecedencia = (horas: number): string =>
  OPCOES_ANTECEDENCIA.find((o) => o.horas === horas)?.rotulo ?? `${horas} horas antes`;

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
