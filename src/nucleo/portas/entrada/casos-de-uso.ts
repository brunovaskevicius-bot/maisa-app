/* ─────────────────────────────────────────────────────────────────────────────
 * PORTAS DE ENTRADA — tudo que se pode PEDIR ao app.
 *
 * Esta é a lista completa de ações do produto, escrita sem HTTP, sem React e sem
 * WhatsApp. Quem chama são os adaptadores de entrada:
 *
 *   • hoje  — `app/api/**` (o painel, via fetch)
 *   • em breve — o agente de IA no WhatsApp, que vai ler ESTE arquivo como se fosse a
 *     lista de ferramentas dele: cada caso de uso vira uma tool, com a mesma entrada e
 *     a mesma saída. É por isso que as entradas são objetos planos e serializáveis, e
 *     não classes: um modelo de linguagem precisa conseguir preencher isso em JSON.
 *
 * A implementação de cada um está em `nucleo/aplicacao/`. Os erros que qualquer um
 * deles pode lançar estão em `dominio/erros.ts` — quem chama traduz para o seu meio
 * (status HTTP, frase para o cliente).
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant, TenantId } from "../../dominio/tenant";
import type { EventoDeAgenda } from "../../dominio/agenda";
import type { Janela } from "../../dominio/tempo";
import type { Negocio, Vertical } from "../../dominio/negocio";
import type { Profissional, Servico } from "../../dominio/catalogo";
import type { Cliente } from "../../dominio/clientes";
import type { Conversa, Msg } from "../../dominio/conversas";
import type { Conexao } from "../saida/agenda-externa";
/* Os rascunhos são reexportados da porta de SAÍDA, não redefinidos: o que a tela manda e
 * o que o repositório grava têm que ser a mesma forma, e duas declarações de "o que é um
 * serviço para gravar" divergem no primeiro campo novo. Mesmo arranjo do `AjustesParciais`
 * logo abaixo, que também vem da porta de saída. */
import type { RascunhoDeProfissional, RascunhoDeServico } from "../saida/repositorio-negocio";
import type { AjustesDaAssistente, AjustesParciais } from "../saida/repositorio-assistente";
import type { Canal, Pareamento } from "../../dominio/canal";
import type { SemanaAnunciada } from "../../dominio/horarios";
import type { ResultadoDeNota, Tomador } from "../../dominio/fiscal";
import type { Escolha, MemoriaCliente } from "../../dominio/memoria";
import type { VagasDoDia } from "../../dominio/vagas";
import type { Faq, FaqEncontrada } from "../../dominio/faq";
import type { ProgressoDaAtivacao } from "../../dominio/ativacao";

/* ───────────────────────────── agenda ───────────────────────────── */

export type PedidoDeAgendamento = {
  /** Qual agenda (hoje: o id do profissional). Validado contra a allowlist do inquilino. */
  agendaId: string;
  /**
   * uuid v4 cunhado por QUEM PEDE, antes de pedir. Chave de idempotência: repetir o
   * mesmo pedido não cria um segundo atendimento. Ver `dominio/agenda.ts`.
   */
  maisaAg: string;
  /** Data civil "YYYY-MM-DD". */
  data: string;
  /** Hora decimal: 14.5 = 14:30. */
  inicio: number;
  /** Minutos. Ausente ⇒ usa a duração do serviço no catálogo. */
  duracao?: number;

  servicoId: string;
  /** Nome e valor do serviço quando ele não está no catálogo (criado pelo usuário). */
  servicoNome?: string;
  servicoValor?: number;

  clienteId: string;
  clienteNome?: string;
  clienteTelefone?: string;

  /** Cria link de videochamada. Padrão: sim. */
  comMeet?: boolean;
  /** Convida o cliente por e-mail. Padrão: NÃO — ver o caso de uso. */
  convidarCliente?: boolean;
};

export type AtendimentoAgendado = {
  /** `ja_existia` = a chave de idempotência encontrou o evento de uma tentativa anterior. */
  situacao: "criado" | "ja_existia";
  eventoId: string;
  meetLink: string | null;
  htmlLink: string | null;
  /** O instante REALMENTE gravado. Quem pediu passa a exibir a partir daqui. */
  inicioISO: string;
  /** Pediu videochamada e não veio link: a UI precisa saber para não prometer. */
  semMeet: boolean;
};

export type AgendaLida = {
  /** A janela que este lote cobre. Volta na resposta porque quem lê guarda um cache
   *  acumulativo e precisa saber QUAL pedaço este lote substitui — sem isso, uma
   *  resposta atrasada de agosto sobrescreve setembro e eventos somem sozinhos. */
  janela: Janela;
  eventos: EventoDeAgenda[];
};

export type AgendarAtendimento = (t: ContextoTenant, p: PedidoDeAgendamento) => Promise<AtendimentoAgendado>;
export type CancelarAtendimento = (t: ContextoTenant, p: { agendaId: string; eventoId: string }) => Promise<void>;
export type LerAgenda = (t: ContextoTenant, p: { agendaId: string } & Janela) => Promise<AgendaLida>;

/* ───────────────────────────── horários livres ─────────────────────────────
 * O caso de uso que o AGENTE precisa e a tela não precisava: "tem vaga quinta?".
 * A grade calcula o vago desenhando blocos; isso não serve para quem não tem tela.
 * Ver `dominio/vagas.ts` para o porquê de a conta ser pura. */

export type PedidoDeHorarios = {
  servicoId: string;
  /**
   * Qual profissional. Ausente ⇒ todos os que fazem esse serviço.
   *
   * Opcional porque a primeira pergunta do cliente quase nunca nomeia alguém ("tem
   * horário amanhã?"), e obrigar o agente a escolher um profissional para poder
   * perguntar faria ele escolher errado — ou pior, inventar um id.
   */
  agendaId?: string;
  /** Data civil de onde começar a varrer. */
  de: string;
  /** Quantos dias varrer a partir de `de`. Padrão 7, teto em `MAX_DIAS_VARRIDOS`. */
  dias?: number;
  /** Quantos horários devolver por dia. Padrão 3 — ver `espalhar()`. */
  porDia?: number;
};

export type HorariosOferecidos = {
  /** A duração usada na conta. Volta na resposta porque é ela que define o que é
   *  "livre", e quem exibe precisa poder dizer "40 min" sem consultar o catálogo. */
  duracaoMin: number;
  servicoNome: string;
  /** Só dias que têm ao menos um horário. Dia vazio não é resposta, é ruído. */
  dias: VagasDoDia[];
};

export type OferecerHorarios = (t: ContextoTenant, p: PedidoDeHorarios) => Promise<HorariosOferecidos>;

/* ───────────────────────────── memória do cliente ─────────────────────────────
 * Reconhecer quem está falando, e lembrar. Ver `dominio/memoria.ts`. */

export type PerfilDeCliente = {
  telefone: string;
  /** `null` quando o telefone não casa com ninguém do cadastro — um lead. */
  clienteId: string | null;
  nome: string | null;
  memoria: MemoriaCliente;
};

export type LembrarCliente = (t: ContextoTenant, telefone: string) => Promise<PerfilDeCliente>;

/**
 * Grava um FATO na memória. Note o que não está aqui: nenhum campo de favorito.
 *
 * O chamador (o agente) só pode contar o que aconteceu — o nome que o cliente disse,
 * o horário que ele marcou. Quem conclui "esse é o favorito dele" é o domínio. Se a
 * assinatura aceitasse `profissionalFavoritoId`, o modelo escreveria a própria
 * conclusão na memória, e a inferência do domínio viraria decoração.
 */
export type AnotarFato = (
  t: ContextoTenant,
  p: { telefone: string; nome?: string; escolha?: Escolha },
) => Promise<MemoriaCliente>;

/* ───────────────────────────── o cadastro ─────────────────────────────
 * "Quem eu sou, quem atende, o que eu vendo, quem são meus clientes."
 *
 * É a primeira coisa que o painel pergunta e a última que ele deveria adivinhar. Existe
 * como caso de uso — e não como quatro leituras que a rota faz na mão — porque a UI já
 * pagou o preço de não ter isto: as telas importavam `saida/demo` direto e liam fixture,
 * o que fez o app inteiro depender de um array em memória para desenhar a grade.
 *
 * Vem tudo junto de propósito. As quatro leituras falham juntas (é a mesma sessão, o mesmo
 * inquilino, a mesma conexão) e a tela não sabe desenhar nada com três das quatro: sem
 * profissional não há coluna na Agenda, sem serviço não há duração, sem cliente não há
 * quem marcar. Partir em quatro daria quatro estados de carregando para uma única tela
 * que só existe completa.
 */
export type CadastroDoNegocio = {
  negocio: Negocio;
  profissionais: Profissional[];
  servicos: Servico[];
  clientes: Cliente[];
  /**
   * As agendas que este inquilino pode operar, já filtradas pelo servidor.
   *
   * Vai no mesmo pacote porque a tela usa a lista para duas coisas (montar as colunas da
   * grade e oferecer o "conectar agenda"), e derivá-la no navegador duplicaria no cliente
   * uma regra que é de autorização. Quando as duas divergirem, a do servidor é a que
   * vale — então é a única que viaja.
   */
  agendas: string[];
};

export type LerCadastro = (t: ContextoTenant) => Promise<CadastroDoNegocio>;

/* ───────────────────────────── renomear o negócio ─────────────────────────────
 * O par de escrita do `LerCadastro`, e o menor caso de uso do app.
 *
 * Existe porque o nome do negócio SAI NA VOZ DA MAISA — vai no prompt do agente a cada
 * mensagem e no texto do lembrete — e até 14/08/2026 nenhuma tela o escrevia. Só
 * `criar_negocio()` o gravava, uma vez, e quem começasse errado ficava errado. Ver o
 * bloco em `dominio/negocio.ts` para o caso concreto que expôs isso.
 *
 * Devolve o `Negocio` inteiro, e não só o nome: a tela pinta o resultado do banco, nunca
 * o que digitou. É a mesma disciplina do `AjustarAssistente` logo abaixo, e pelo mesmo
 * motivo — a normalização acontece do outro lado.
 */
export type AjustarNegocio = (
  t: ContextoTenant,
  p: { nome: string },
) => Promise<Negocio>;

/* ───────────────────────────── o catálogo, agora com escrita ─────────────────────────────
 * Os outros dois pares de escrita do `LerCadastro`, e a mesma história do `AjustarNegocio`
 * acima repetida em escala maior: a tela de Serviços tinha "adicionar" e "editar" desde
 * sempre, e os dois mexiam em `svcNovos`/`svcEdit` — estado do NAVEGADOR. O dono ajustava
 * o preço, via a lista mudar, dava F5, e o preço voltava. Não havia rota nem porta.
 *
 * ⚠️ ISTO BLOQUEIA O ONBOARDING, e é por isso que veio antes do wizard. A etapa "confirme
 * o que você faz" existe justamente para o dono ajustar o catálogo que `criar_negocio()`
 * semeou — cinco serviços com preço de chute. Um wizard que não grava é pior que wizard
 * nenhum: ele ensina, no primeiro minuto de uso, que o app perde o que você digita.
 *
 * Os dois devolvem a entidade INTEIRA depois de gravada, e não um `ok`. A tela pinta o
 * que está no banco — inclusive os campos derivados (`profissionalIds`, `atendimentosMes`)
 * que ela não mandou e não sabe calcular.
 */
export type AjustarServico = (t: ContextoTenant, p: RascunhoDeServico) => Promise<Servico>;
export type AjustarProfissional = (
  t: ContextoTenant,
  p: RascunhoDeProfissional,
) => Promise<Profissional>;

/**
 * Apagar serviço existe; apagar profissional não — e a assimetria vem do ESQUEMA:
 * `atendimentos.servico_id` é snapshot sem FK, mas `atendimentos.profissional_id` tem
 * `on delete cascade`. Apagar a pessoa levaria o histórico dela junto. O porquê inteiro
 * está no cabeçalho de `RepositorioNegocio`.
 */
export type RemoverServico = (t: ContextoTenant, id: string) => Promise<void>;

/* ───────────────────────────── quanto já está de pé ─────────────────────────────
 * O que o wizard usa para saber onde retomar, e o que a `FluxoHoje` usa para mostrar o
 * que falta. Derivado do banco a cada leitura, nunca de uma flag — o porquê inteiro está
 * em `dominio/ativacao.ts`.
 *
 * ⚠️ Existe porque a `FluxoHoje` de um inquilino novo abre VAZIA, e o estado vazio dela é
 * comemorativo por desenho (*"se ele está vazio, a assistente está fazendo o trabalho"*).
 * Para quem acabou de entrar isso lê exatamente ao contrário: "está tudo certo" quando
 * nada está conectado.
 */
export type LerAtivacao = (t: ContextoTenant) => Promise<ProgressoDaAtivacao>;

/* ───────────────────────────── as respostas prontas ─────────────────────────────
 * As FAQs do negócio. Quatro casos de uso: três são a tela de gestão, e o quarto é o que
 * o AGENTE chama no meio de uma conversa.
 *
 * `ResponderDuvida` é o que fecha a família "configura e ignora": até 15/08/2026 o agente
 * respondia dúvida com uma fixture de demonstração, igual para todo inquilino, enquanto a
 * tabela `faqs` de cada um dormia com o que o dono cadastrou.
 *
 * ⚠️ Ele devolve LISTA, e pode devolver vazia. Vazio significa "o dono não cadastrou isto"
 * e é uma resposta legítima — o agente sabe dizer que vai verificar. Devolver sempre a FAQ
 * menos distante faria a MAISA responder qualquer coisa com aparência de fonte, que é pior
 * que não responder porque parece verificado.
 */
export type LerFaqs = (t: ContextoTenant) => Promise<Faq[]>;

export type RascunhoDeFaqPedido = {
  /** Ausente = criar. Presente = editar. */
  id?: string;
  pergunta: string;
  resposta: string;
  ativo?: boolean;
};

export type AjustarFaq = (t: ContextoTenant, p: RascunhoDeFaqPedido) => Promise<Faq>;
export type RemoverFaq = (t: ContextoTenant, id: string) => Promise<void>;
export type ResponderDuvida = (t: ContextoTenant, pergunta: string) => Promise<FaqEncontrada[]>;

/* ───────────────────────────── criar o negócio ─────────────────────────────
 * O primeiro pedido que uma conta nova faz. Antes deste caso de uso existir, a resposta
 * do app para o primeiro login de todo mundo era `"Rode criar_negocio() no Supabase"` —
 * uma instrução de desenvolvedor entregue ao cliente final.
 *
 * ⚠️ É o ÚNICO caso de uso que não recebe `ContextoTenant`, porque é o que o produz.
 * Recebe a identidade da sessão, que o adaptador de entrada tirou do cookie. A regra de
 * `dominio/tenant.ts` continua intacta: nada aqui aceita `tenantId` vindo do corpo — o
 * corpo só traz nome e vertical, e o dono é sempre `auth.uid()`.
 */
export type PedidoDeNegocio = {
  nome: string;
  vertical: Vertical;
  profissional?: string;
};

export type NegocioProvisionado = {
  tenantId: TenantId;
  /** Onde a tela deve ir depois. O painel só funciona com um negócio resolvido. */
  proximoPasso: "abrir_painel";
};

export type ProvisionarNegocio = (
  sessao: { usuarioId: string },
  p: PedidoDeNegocio,
) => Promise<NegocioProvisionado>;

/* ───────────────────────────── ajustar a assistente ─────────────────────────────
 * A tela "A MAISA", com efeito. Antes disto ela editava `localStorage`: o dono escolhia
 * o tom, e o WhatsApp respondia com a fixture global — a mesma para todo inquilino.
 *
 * `AjustarAssistente` é PARCIAL: a tela é uma lista de toggles, e virar um switch manda
 * um campo só. Devolve o estado inteiro resultante, para a tela reconciliar sem segunda
 * ida ao servidor.
 */
/* ───────────────────────────── o canal de WhatsApp ─────────────────────────────
 * O passo que faltava para o produto se vender sozinho: conectar o WhatsApp do cliente
 * sem ninguém criar instância na mão. `ConectarCanal` devolve um QR efêmero — a tela
 * pinta e recomeça o polling de `LerCanal` até virar "conectado".
 */
export type LerCanal = (t: ContextoTenant) => Promise<Canal>;
export type ConectarCanal = (t: ContextoTenant) => Promise<Pareamento>;
export type DesconectarCanal = (t: ContextoTenant) => Promise<void>;

export type LerAssistente = (t: ContextoTenant) => Promise<AjustesDaAssistente>;

export type AjustarAssistente = (
  t: ContextoTenant,
  p: AjustesParciais,
) => Promise<AjustesDaAssistente>;

/* ───────────────────────────── horário anunciado ─────────────────────────────
 * O horário EXTERNO — a frase que a MAISA responde a "que horas vocês atendem?".
 *
 * ⚠️ Não confundir com o `Expediente` do profissional, que é o que decide se cabe marcar
 * às 15h de terça. Os dois divergem na vida real e é legítimo: o negócio anuncia 8h–20h e
 * o profissional das terças entra ao meio-dia. Ver `dominio/horarios.ts`.
 *
 * `AjustarHorarios` recebe a semana INTEIRA, e não um dia — é grade, não campo. O porquê
 * está em `aplicacao/horarios.ts`. */

/* ───────────────────────────── a rotina de lembretes ─────────────────────────────
 * ⚠️ O ÚNICO CASO DE USO QUE NÃO RECEBE `ContextoTenant`, junto de `ProvisionarNegocio`
 * — e pelo motivo oposto ao dele. Aquele não recebe porque PRODUZ o inquilino; este não
 * recebe porque a pergunta é sobre TODOS eles: "quem tem lembrete para mandar agora?".
 *
 * Uma rotina agendada não tem sessão nem dono. Um `tenantId` de entrada aqui seria um
 * parâmetro por onde disparar a rotina — e o WhatsApp — de outra pessoa.
 *
 * O isolamento é refeito imediatamente depois: cada linha da fila traz o inquilino dela,
 * e o envio acontece com um `ContextoTenant` de ator `sistema`. Ver `aplicacao/lembretes.ts`.
 *
 * `agora` entra por argumento em vez de `new Date()` lá dentro porque é o que torna a
 * rotina testável sem esperar três horas. */

export type ResultadoDaRotina = {
  enviados: number;
  falhas: { atendimentoId: string; tenantId: string; motivo: string }[];
};

export type EnviarLembretes = (agora: Date) => Promise<ResultadoDaRotina>;

export type LerHorarios = (t: ContextoTenant) => Promise<SemanaAnunciada>;

export type AjustarHorarios = (
  t: ContextoTenant,
  p: SemanaAnunciada,
) => Promise<SemanaAnunciada>;

/* ───────────────────────────── conversas de WhatsApp ─────────────────────────────
 * O painel, do lado da conversa. O AGENTE não passa por aqui: para ele a conversa é o
 * telefone que acabou de escrever, e ele fala com `RepositorioHistorico` direto.
 *
 * ⚠️ `telefone` é sempre a IDENTIDADE da conversa, não um destino. Quem responde manda a
 * chave (8 dígitos, que não serve para enviar nada) e o servidor descobre o número completo
 * na thread — ver `criarResponderConversa`. É o que impede o painel de virar um jeito de
 * mandar WhatsApp para qualquer número pela instância do dono. */

export type ListarConversas = (t: ContextoTenant) => Promise<Conversa[]>;

export type LerConversa = (
  t: ContextoTenant,
  telefone: string,
) => Promise<{ conversa: Conversa; msgs: Msg[] }>;

/** Devolve a fala gravada — a tela já mostrou o texto, o que ela não sabia é que saiu. */
export type ResponderConversa = (
  t: ContextoTenant,
  p: { telefone: string; texto: string },
) => Promise<Msg>;

/** Assumir/devolver (`assumida`) e resolver/reabrir (`resolvida`). `undefined` = não mexa. */
export type MudarPosseConversa = (
  t: ContextoTenant,
  p: { telefone: string; assumida?: boolean; resolvida?: boolean },
) => Promise<void>;

/* ───────────────────────────── conexão com a agenda ───────────────────────────── */

export type ListarConexoes = (t: ContextoTenant) => Promise<Conexao[]>;
export type DesconectarAgenda = (t: ContextoTenant, p: { agendaId: string }) => Promise<{ revogado: boolean }>;

/* ───────────────────────────── nota fiscal ───────────────────────────── */

export type PedidoDeEmissao = {
  valor: number;
  discriminacao: string;
  tomador: Tomador;
  /** Semente da referência (hoje: o id do cliente). A ref final é cunhada aqui dentro. */
  origem?: string;
};

export type EmitirNota = (t: ContextoTenant, p: PedidoDeEmissao) => Promise<ResultadoDeNota>;
export type ConsultarNota = (t: ContextoTenant, ref: string) => Promise<ResultadoDeNota>;
export type CancelarNota = (t: ContextoTenant, p: { ref: string; justificativa?: string }) => Promise<ResultadoDeNota>;
