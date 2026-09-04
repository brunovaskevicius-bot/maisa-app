/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — o REGISTRO dos atendimentos. É a fonte PRIMÁRIA de ocupação.
 *
 * ⚠️ ISTO MUDOU, e o texto anterior dizia o contrário. Vale ler o porquê antes de usar.
 *
 * Até aqui esta porta era um ESPELHO: a verdade dos horários era a agenda externa, e o
 * cabeçalho proibia em voz alta desenhar agenda a partir dela. O problema é o que isso
 * fazia com quem NÃO conecta o Google — e é muita gente, entre quem não quer (barbeiro de
 * caderno, terapeuta que não entrega a agenda inteira a um terceiro) e quem não consegue
 * (o app ainda não tem selo de verificado). Para essas pessoas o produto simplesmente não
 * funcionava: `oferecerHorarios` estourava, o agente escalava para humano em toda tentativa
 * de marcar, e — o pior — como o espelho era escrito DEPOIS do provedor, `atendimentos`
 * ficava vazio. Sem linha não há faturamento, não há lembrete e não há nota fiscal. Sem
 * Google, a promessa fiscal também não existia.
 *
 * Agora a ocupação sai DAQUI, e a agenda externa é uma camada ADITIVA em cima: ela
 * acrescenta os compromissos que nasceram fora da MAISA (o encaixe que o dono marcou no
 * celular) e, quando não existe ou falha, acrescenta zero. Não derruba mais nada.
 *
 * É o padrão que o Ludi já roda em produção desde 05/2026 — `get_staff_availability` lê o
 * banco como passo obrigatório e o FreeBusy do Google dentro de um `try` que segue em
 * frente ("prosseguindo sem Google"). Ver o ADR.
 *
 * ⚠️ O que NÃO mudou: a conta continua pura e fora daqui (`dominio/vagas.ts`). Esta porta
 * entrega dado, não decide disponibilidade. A tentação de resolver "está livre?" numa
 * função do banco é exatamente o que deixou o Smiller com a regra mais cara do produto
 * escrita em plpgsql sem fonte versionada.
 *
 * As três perguntas que já só tinham resposta aqui continuam valendo, e agora são quatro:
 *
 *   1. IDEMPOTÊNCIA sem ida ao provedor — `unique (tenant_id, maisa_ag)`. Um modelo de
 *      linguagem que não recebeu a resposta retenta sozinho, e não pode pagar uma
 *      varredura de agenda por tentativa.
 *   2. FATURAMENTO — `Cliente.atendimentos` e `Cliente.valor` são a base da nota do mês.
 *   3. AUDITORIA DO ATOR — `dominio/tenant.ts` pede que um atendimento criado pela IA seja
 *      distinguível de um criado à mão. O Google guarda a descrição, não quem escreveu.
 *   4. DISPONIBILIDADE SEM PROVEDOR — `listarJanela`. É o que faz a MAISA marcar para quem
 *      nunca vai conectar agenda nenhuma.
 *
 * ⚠️ GRAVAR AQUI QUASE NUNCA PODE DERRUBAR UM AGENDAMENTO — e a palavra "quase" é nova.
 * A regra continua sendo log-e-segue: se a escrita falhar por rede, permissão ou coluna
 * torta, o atendimento não pode morrer por causa disso. A ÚNICA exceção é CONFLITO DE
 * HORÁRIO (`23P01`, a constraint de exclusão): aí derrubar é o comportamento certo, porque
 * a alternativa é vender o mesmo horário duas vezes. Quem implementa distingue os dois
 * casos explicitamente — um `if` nomeado, não um `catch` genérico — e lança
 * `HorarioOcupado`.
 *
 * ⚠️ A ORDEM DE ESCRITA INVERTEU (ADR-0009). Antes o provedor era chamado primeiro e este
 * registro depois, e o comentário "quando este arquivo roda, o evento JÁ EXISTE" valia. Não
 * vale mais: agora grava-se AQUI primeiro — é aqui que o conflito é detectado — e o
 * provedor recebe o evento depois, dentro de um `try` que segue em frente. Um atendimento
 * com `evento_id` nulo passou a ser estado NORMAL, não corrupção: é o inquilino que não
 * conectou calendário nenhum, que é o caso da maioria.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";
import type { Janela } from "../../dominio/tempo";
import type { Ocupado } from "../../dominio/vagas";

/**
 * Uma linha do espelho. Desnormalizada de propósito, igual a `AtendimentoMarcado`: o
 * valor cobrado é fato fiscal (mudar o preço da tabela não reescreve o passado) e o
 * serviço pode não existir no cadastro (criado pelo usuário na tela).
 */
export type LinhaDeAtendimento = {
  /** A chave de idempotência que quem pediu cunhou. É o `unique` da tabela. */
  maisaAg: string;
  /** Qual agenda — hoje o id do profissional. Precisa existir no cadastro (FK composta). */
  agendaId: string;

  /** `null` quando quem marcou não está no cadastro. O snapshot abaixo preserva o dado. */
  clienteId: string | null;
  clienteNome: string;
  clienteTel: string;
  /** `null` quando o serviço não é do catálogo. A coluna não tem FK justamente por isso. */
  servicoId: string | null;
  servicoNome: string;
  servicoValor: number;

  /** Instante absoluto — é a verdade, e o que se compara. */
  inicioISO: string;
  fimISO: string;
  duracaoMin: number;
  /**
   * A PROJEÇÃO CIVIL no fuso do negócio: "2026-08-14" e 14.5.
   *
   * Calculada por quem escreve, e não por coluna gerada, porque coluna gerada no
   * Postgres não consegue ler o fuso da outra tabela. É o que a tela e o fechamento
   * fiscal pensam ("06/08", "14:30"), e não UTC.
   */
  dataLocal: string;
  horaInicio: number;

  /** O evento lá fora. `null` num provedor que não devolva id. */
  eventoId: string | null;
  meetLink: string | null;
  htmlLink: string | null;
};

/**
 * Uma linha como ela VOLTA da leitura. É a de escrita mais o que só o banco sabe.
 *
 * `situacao` não entra em `LinhaDeAtendimento` de propósito: quem grava nunca escolhe se
 * está criando um atendimento cancelado. Cancelar é outro método.
 */
export type AtendimentoRegistrado = LinhaDeAtendimento & {
  situacao: "marcado" | "cancelado";
};

export interface RegistroDeAtendimentos {
  /**
   * O que já tem dono na agenda deste profissional, dentro da janela. É a **fonte
   * primária de ocupação** — quem responde "está livre?" para todo mundo, com ou sem
   * Google conectado.
   *
   * Devolve `Ocupado` (`{ data, inicio, fim }`) e não a linha inteira de propósito: quem
   * chama quer saber o que está tomado, não quem marcou nem quanto custou. Entregar
   * `LinhaDeAtendimento` aqui convidaria a tela de agenda a se montar a partir do
   * faturamento, que é o acoplamento que essa porta passou a vida evitando.
   *
   * Só `situacao = 'marcado'`: cancelado não bloqueia horário. A projeção civil
   * (`data_local`/`hora_inicio`) é o que sai daqui, porque é nela que `vagasDoDia`
   * pensa — a conversão de fuso já aconteceu na escrita, e refazê-la na leitura é a
   * chance de as duas discordarem.
   *
   * **Lança** se não conseguir ler, ao contrário do resto desta porta. Aqui o silêncio é
   * pior: devolver lista vazia por causa de uma falha de banco significa "o dia inteiro
   * está livre", e a MAISA ofereceria horários já vendidos. É o mesmo raciocínio do
   * Passo B do Ludi, onde falha ao ler `appointments` é 500 e não lista vazia.
   */
  listarJanela(t: ContextoTenant, p: { agendaId: string; janela: Janela }): Promise<Ocupado[]>;

  /**
   * Os atendimentos da janela, INTEIROS — é o que a grade do painel desenha.
   *
   * Existe separado de `listarJanela` porque as duas perguntas têm preço diferente e
   * chamadores diferentes. `listarJanela` responde "está livre?" no caminho quente do
   * agente e lê três colunas; esta responde "o que tem no dia?" para uma tela e lê a
   * linha toda. Uma só, na forma gorda, faria o agente pagar por dado que ele descarta.
   *
   * Traz cancelado também (`situacao` vem junto): a grade precisa saber a diferença entre
   * "não tem nada" e "tinha e desmarcaram". Quem só quer ocupação filtra.
   *
   * **Lança**, pelo mesmo motivo de `listarJanela`: tela de agenda vazia por falha de
   * banco é indistinguível de dia sem atendimento, e o dono acredita.
   */
  listar(t: ContextoTenant, p: { agendaId: string; janela: Janela }): Promise<AtendimentoRegistrado[]>;

  /**
   * A linha desta chave de idempotência, se existir. É a metade do servidor da criação
   * idempotente — a que NÃO depende de provedor nenhum.
   *
   * Substitui a varredura de agenda que `agendar-atendimento.ts` fazia antes de criar: a
   * pergunta "já marquei isso?" é respondida por `unique (tenant_id, maisa_ag)` num
   * índice, e não por uma leitura de calendário que custa uma ida à rede e não existe
   * para quem não conectou calendário.
   *
   * ⚠️ Devolve a linha mesmo com `eventoId` nulo, e é ISSO que a torna útil: linha sem
   * evento é a marca de uma tentativa que gravou no banco e morreu antes do provedor.
   * Quem chama usa essa diferença para retomar de onde parou em vez de criar de novo.
   *
   * **Lança** se não conseguir ler: devolver `null` numa falha de banco significa "pode
   * criar", e o resultado é o atendimento duplicado que este método existe para impedir.
   */
  buscarPorAg(t: ContextoTenant, p: { maisaAg: string }): Promise<AtendimentoRegistrado | null>;

  /**
   * Grava (ou reconhece) a linha. **Idempotente por `maisaAg`**: chamar duas vezes com a
   * mesma chave não cria duas linhas — é a mesma proteção que o caso de uso já tem contra
   * o modelo que retenta.
   *
   * É chamado DUAS vezes no caminho normal, e isso é desenho: a primeira grava o
   * atendimento com `eventoId` nulo (é ela que colide, se for para colidir), a segunda
   * anexa o id que o provedor devolveu. A alternativa era um método `anexarEvento` só
   * para isso; um upsert idempotente já faz o trabalho sem crescer a porta.
   *
   * Não lança, EXCETO em conflito de horário — aí lança `HorarioOcupado`. Ver o ⚠️ do
   * cabeçalho.
   */
  registrar(t: ContextoTenant, a: LinhaDeAtendimento): Promise<void>;

  /**
   * Marca como cancelado. **Não apaga**: o histórico de quem desmarca é informação do
   * negócio, e é isso que a coluna `situacao` existe para guardar.
   *
   * ⚠️ Aceita `maisaAg` OU `eventoId`, e o primeiro é o caminho normal desde o ADR-0009.
   * `eventoId` nulo passou a ser estado legítimo (atendimento de quem não conectou
   * calendário), então cancelar só por ele deixaria esses atendimentos impossíveis de
   * desmarcar. `eventoId` continua aceito para o que foi gravado antes desta mudança.
   *
   * Não lança, pela mesma razão do `registrar`.
   */
  cancelar(t: ContextoTenant, p: { maisaAg?: string; eventoId?: string }): Promise<void>;
}
