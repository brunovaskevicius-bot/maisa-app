/* ─────────────────────────────────────────────────────────────────────────────
 * MEMÓRIA DO CLIENTE — o que a MAISA lembra de quem já falou com ela.
 *
 * Nome, profissional favorito, serviço favorito e — quando dá para AFIRMAR isso —
 * horário favorito. É a diferença entre "Olá! Como posso ajudar?" e "Oi, Mariana!
 * O de sempre com o Rafael, quinta às 15h?".
 *
 * ⚠️ A regra que faz este arquivo existir: **preferência é INFERIDA, não anotada.**
 * Se o agente pudesse escrever "horário favorito = 15h" porque o cliente disse uma
 * vez "15h tá bom", a memória viraria um bloco de notas do modelo — e um modelo
 * anotando conclusões próprias inventa padrão onde há coincidência. Aqui ele grava
 * FATOS (marcou tal dia, tal hora, com tal profissional) e a inferência é uma função
 * pura, com mínimo de amostras e mínimo de concentração. O que o agente lê de volta
 * é sempre derivado do que aconteceu.
 *
 * O nome é a exceção: ninguém deduz nome de padrão, o cliente diz. Por isso é o
 * único campo que o agente escreve direto.
 * ────────────────────────────────────────────────────────────────────────────── */

/** Um agendamento que de fato aconteceu. A matéria-prima da inferência. */
export type Escolha = {
  /** Data civil "YYYY-MM-DD". */
  data: string;
  /** Hora decimal: 14.5 = 14:30. */
  inicio: number;
  profissionalId: string;
  servicoId: string;
};

/**
 * O que sabemos de um cliente, indexado pelo TELEFONE.
 *
 * Telefone, e não `clienteId`, porque a memória nasce antes do cadastro: quem manda
 * a primeira mensagem é um lead, ganha nome na segunda e só vira cliente quando
 * marca. Se a chave fosse o id, tudo que ele disse antes de fechar seria perdido —
 * justamente a parte da conversa em que ele decide.
 */
export type MemoriaCliente = {
  telefone: string;
  /** Preenchido quando o telefone casa com alguém do cadastro. */
  clienteId?: string;
  nome?: string;

  /** Os favoritos, todos derivados de `historico`. Nunca gravados à mão. */
  profissionalFavoritoId?: string;
  servicoFavoritoId?: string;
  /** Hora decimal. Só existe quando o padrão passa do limiar — ver `horarioFavorito`. */
  horarioFavorito?: number;

  /** As últimas escolhas, mais antiga primeiro. Cauda cortada em MAX_HISTORICO. */
  historico: Escolha[];
  atualizadoEm: string;
};

/**
 * Quantas escolhas antes de a MAISA ter direito de dizer "de sempre".
 *
 * Três. Com duas, qualquer repetição parece padrão — quem marcou 15h duas vezes
 * seguidas provavelmente só olhou a primeira opção da lista que oferecemos, e tratar
 * isso como preferência é a IA confundindo o próprio eco com a vontade do cliente.
 */
export const MINIMO_PADRAO = 3;

/**
 * Quanto do histórico a opção mais comum precisa ocupar: metade.
 *
 * Alguém que alternou entre três profissionais em seis visitas não tem favorito, e
 * chamar o mais frequente de favorito (2 de 6) seria afirmar o que o dado não diz.
 * Preferimos não lembrar nada a lembrar errado — errar aqui é chamar o cliente pelo
 * nome do profissional que ele não quer.
 */
export const CONCENTRACAO_MINIMA = 0.5;

/** Tamanho da janela. Preferência muda; histórico infinito faz a MAISA lembrar de
 *  quem o cliente era em 2024 em vez de quem ele é agora. */
export const MAX_HISTORICO = 12;

/** Tolerância do agrupamento de horário: uma hora. Quem marca 14:30 e 15:00 quer
 *  "meio da tarde", não dois horários distintos — comparar hora exata nunca acharia
 *  padrão em ninguém que às vezes chega meia hora mais tarde. */
const JANELA_HORA = 1;

/**
 * A opção dominante de uma lista — ou `undefined` se não houver dominância.
 *
 * Exportada porque é a regra, e a regra é a parte que merece teste.
 */
export function dominante<T extends string>(valores: T[], minimo = MINIMO_PADRAO): T | undefined {
  if (valores.length < minimo) return undefined;

  // Objeto e não Map: o `target` do projeto não permite iterar Map sem
  // `downlevelIteration`, e mudar o tsconfig por causa de uma contagem de sete itens
  // seria mexer na compilação de todo o app para resolver um detalhe local.
  const contagem: Record<string, number> = {};
  for (const v of valores) contagem[v] = (contagem[v] ?? 0) + 1;

  let melhor: T | undefined;
  let maior = 0;
  for (const v of Object.keys(contagem)) {
    if (contagem[v] > maior) {
      maior = contagem[v];
      melhor = v as T;
    }
  }

  return maior / valores.length >= CONCENTRACAO_MINIMA ? melhor : undefined;
}

/**
 * O horário preferido, em hora decimal — ou `undefined`.
 *
 * Agrupa por faixa de uma hora, acha a faixa dominante e devolve a MÉDIA das horas
 * daquela faixa arredondada ao passo de meia hora. Devolver a moda crua daria
 * "14:30" para quem marcou 14:00, 14:30 e 15:00; a média dá 14:30 por ser o centro
 * do que ele realmente faz, e não por ter aparecido uma vez a mais.
 */
export function horarioFavorito(historico: Escolha[]): number | undefined {
  const faixas = historico.map((e) => String(Math.floor(e.inicio / JANELA_HORA)));
  const faixa = dominante(faixas);
  if (faixa === undefined) return undefined;

  const horas = historico.filter((_, i) => faixas[i] === faixa).map((e) => e.inicio);
  const media = horas.reduce((s, h) => s + h, 0) / horas.length;
  return Math.round(media * 2) / 2;
}

/** Uma memória vazia — o que existe para quem acabou de mandar a primeira mensagem. */
export const memoriaNova = (telefone: string, agoraISO: string): MemoriaCliente => ({
  telefone,
  historico: [],
  atualizadoEm: agoraISO,
});

/**
 * A memória depois de um fato novo. PURA: devolve uma cópia, não muta a entrada.
 *
 * Reinfere os três favoritos a cada gravação em vez de mantê-los incrementalmente.
 * É a escolha que sobrevive a mudar o limiar: com favorito acumulado, subir
 * `MINIMO_PADRAO` deixaria de pé todo favorito já calculado sob a regra antiga, e o
 * app passaria a ter duas regras vivas ao mesmo tempo sem nada indicando qual é qual.
 */
export function comFato(
  m: MemoriaCliente,
  fato: { nome?: string; clienteId?: string; escolha?: Escolha },
  agoraISO: string,
): MemoriaCliente {
  const historico = fato.escolha
    ? [...m.historico, fato.escolha].slice(-MAX_HISTORICO)
    : m.historico;

  return {
    ...m,
    // `?? m.nome`: um turno que só marca horário não apaga o nome que já sabíamos.
    nome: fato.nome?.trim() || m.nome,
    clienteId: fato.clienteId ?? m.clienteId,
    historico,
    profissionalFavoritoId: dominante(historico.map((e) => e.profissionalId)),
    servicoFavoritoId: dominante(historico.map((e) => e.servicoId)),
    horarioFavorito: horarioFavorito(historico),
    atualizadoEm: agoraISO,
  };
}

/** Tem algo que valha dizer em voz alta? Usado para decidir entre a saudação
 *  genérica e a saudação que chama pelo nome. */
export const conheceAlguem = (m: MemoriaCliente | null | undefined): boolean =>
  !!m && (!!m.nome || !!m.servicoFavoritoId || !!m.profissionalFavoritoId);
