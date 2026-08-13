/* ─────────────────────────────────────────────────────────────────────────────
 * RAIZ DE COMPOSIÇÃO — onde as portas encontram os adaptadores. ⚠️ SÓ SERVIDOR.
 *
 * É o único arquivo do repositório que conhece os dois lados ao mesmo tempo. O núcleo
 * nunca importa adaptador (seria a seta apontando para dentro do hexágono, e é
 * exatamente o que a arquitetura proíbe); os adaptadores não se conhecem entre si.
 * Eles se encontram aqui, uma vez, e o resto do app usa `app.*`.
 *
 * TROCAR UMA IMPLEMENTAÇÃO É MEXER SÓ NESTE ARQUIVO:
 *   • fixtures → Supabase ....... `negocio: repositorioSupabase`
 *   • Google → Outlook .......... `agenda: agendaOutlook`
 *   • Focus → outro emissor ..... `emissor: emissorX`
 *   • teste .................... monte um `app` com dublês; nada mais muda.
 *
 * ⚠️ Nunca importe este arquivo de um componente "use client": ele puxa o token da
 * Focus, o client secret do Google e a chave de cifra. Só `app/api/**` entra aqui.
 * (Quem quiser que isso vire erro de build em vez de convenção: `npm i server-only` e
 * um `import "server-only"` no topo. Hoje é convenção, e o `import { randomUUID } from
 * "crypto"` abaixo já quebraria qualquer tentativa de puxar isto para o navegador.)
 * ────────────────────────────────────────────────────────────────────────────── */

import { randomUUID } from "crypto";

import { criarAgendarAtendimento } from "@/nucleo/aplicacao/agendar-atendimento";
import {
  criarCancelarAtendimento, criarDesconectarAgenda, criarLerAgenda, criarListarConexoes,
} from "@/nucleo/aplicacao/agenda";
import { criarOferecerHorarios } from "@/nucleo/aplicacao/oferecer-horarios";
import { criarLerCadastro } from "@/nucleo/aplicacao/cadastro";
import { criarProvisionarNegocio } from "@/nucleo/aplicacao/provisionar";
import { criarAjustarAssistente, criarLerAssistente } from "@/nucleo/aplicacao/assistente";
import { criarConectarCanal, criarDesconectarCanal, criarLerCanal } from "@/nucleo/aplicacao/canal";
import { criarAnotarFato, criarLembrarCliente } from "@/nucleo/aplicacao/memoria";
import {
  criarLerConversa, criarListarConversas, criarMudarPosseConversa, criarResponderConversa,
} from "@/nucleo/aplicacao/conversas";
import { criarCancelarNota, criarConsultarNota, criarEmitirNota } from "@/nucleo/aplicacao/notas";

import { agendaGoogle, conexoesGoogle } from "@/adaptadores/saida/google/agenda-google";
import { isGoogleConfigured } from "@/adaptadores/saida/google/config";
import { emissorFocus } from "@/adaptadores/saida/focus/emissor-focus";
import { repositorioDemo } from "@/adaptadores/saida/demo/repositorio";
import { repositorioSupabase } from "@/adaptadores/saida/supabase/repositorio";
import { provisionadorDemo } from "@/adaptadores/saida/demo/provisionador";
import { provisionadorSupabase } from "@/adaptadores/saida/supabase/provisionador";
import { assistenteDemo } from "@/adaptadores/saida/demo/assistente-repo";
import { assistenteSupabase } from "@/adaptadores/saida/supabase/assistente";
import { canalSupabase } from "@/adaptadores/saida/supabase/canal";
import { canalDemoRepo, provisionamentoDemo } from "@/adaptadores/saida/demo/canal";
import { provisionamentoEvolution } from "@/adaptadores/saida/evolution/provisionamento-evolution";
import { SEGREDO as WHATSAPP_SEGREDO } from "@/adaptadores/entrada/whatsapp/contexto";
import { NaoConfigurado, PrecisaReconectar } from "@/nucleo/dominio/erros";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { registroSupabase } from "@/adaptadores/saida/supabase/atendimentos";
import { registroDemo } from "@/adaptadores/saida/demo/atendimentos";
import { isSupabaseConfigured } from "@/adaptadores/saida/supabase/config";
import { canalDemo, conversasDemo, historicoDemo, memoriaDemo } from "@/adaptadores/saida/demo/memoria";
import {
  conversasSupabase, historicoSupabase, memoriaSupabase,
} from "@/adaptadores/saida/supabase/memoria";
import { agendaDemo, conexoesDemo } from "@/adaptadores/saida/demo/agenda";
import { criarCanalEvolution } from "@/adaptadores/saida/evolution/canal-evolution";
import { isEvolutionConfigured } from "@/adaptadores/saida/evolution/config";

/* As implementações escolhidas HOJE. Uma linha por decisão. */

/**
 * A agenda. Google quando configurado; sem credencial, uma agenda em memória.
 *
 * O fallback não é comodidade — é o que faz o agente ser TESTÁVEL. Sem ele,
 * `oferecerHorarios` estoura num ambiente sem Google, a MAISA escala para humano em
 * toda tentativa de marcar, e o fluxo que mais precisa de iteração (marcar horário
 * conversando) é justamente o único que não roda. Ver `saida/demo/agenda.ts`.
 */
const agenda = isGoogleConfigured ? agendaGoogle : agendaDemo;
const conexoes = isGoogleConfigured ? conexoesGoogle : conexoesDemo;
const emissor = emissorFocus;
/**
 * O cadastro: quem atende, o que se vende, quem é cliente.
 *
 * Supabase quando configurado; sem chave, os fixtures em memória. Era esta a linha que a
 * dívida do repositório apontava ("é a peça que falta trocar para o app ser
 * multi-inquilino de verdade"), e é literalmente uma linha — que era a aposta da porta.
 *
 * O fallback NÃO é comodidade, pela mesma razão da agenda logo acima: sem ele, um ambiente
 * sem banco não desenha nem a primeira tela (sem profissional não há coluna na grade, sem
 * serviço não há duração) e o fluxo de afinar a MAISA por `curl` — o único que não precisa
 * de banco nem de número contratado — deixa de existir.
 *
 * ⚠️ A diferença entre os dois modos deixou de ser invisível: com Supabase, `tenantId` é o
 * uuid de `negocios` e os ids de profissional/serviço/cliente são uuid; com fixture, são
 * `"pr1"`, `"sv1"`, `"cl1"`. Nada no núcleo se importa — mas um dado copiado de um modo
 * para o outro não casa.
 */
const negocio = isSupabaseConfigured ? repositorioSupabase : repositorioDemo;
const provisionador = isSupabaseConfigured ? provisionadorSupabase : provisionadorDemo;

/**
 * Os ajustes da MAISA. Segue o cadastro pela mesma razão que `registro` e `memoria`: as
 * duas leituras acontecem no mesmo turno de conversa, e um par banco/fixture misturado
 * daria um agente que sabe o catálogo real do inquilino e responde com o tom de outro.
 */
const assistente = isSupabaseConfigured ? assistenteSupabase : assistenteDemo;

/**
 * O CANAL DE WHATSAPP, por inquilino.
 *
 * Duas portas, dois critérios diferentes — e essa diferença é a decisão:
 *   • o REPOSITÓRIO segue o Supabase, como todo o resto do cadastro;
 *   • o PROVISIONAMENTO segue a Evolution, porque é ela que cria a instância.
 *
 * Separados porque as duas metades falham por motivos independentes. Um ambiente com
 * banco e sem Evolution (o do desenvolvimento) precisa conseguir desenhar a tela de
 * conectar com um QR de mentira; um com Evolution e sem banco não precisa existir.
 */
const canalRepo = isSupabaseConfigured ? canalSupabase : canalDemoRepo;
const provisionamento = isEvolutionConfigured ? provisionamentoEvolution : provisionamentoDemo;

/**
 * Para onde a Evolution deve entregar as mensagens deste deploy.
 *
 * ⚠️ TEM QUE SER ALCANÇÁVEL PELA INTERNET. A Evolution roda em outro servidor: apontar
 * para `localhost` faz ela aceitar a configuração, tentar entregar, falhar do lado dela —
 * e daqui parece ter dado certo. É a falha mais cara de diagnosticar do produto, então
 * falha ALTO aqui, antes de criar a instância, em vez de silenciosamente depois.
 *
 * A URL vem de env própria e não do `origin` do request (que é como
 * `/api/whatsapp/conexao` faz) porque este caminho é chamado por um botão do painel: o
 * `origin` seria o domínio que o USUÁRIO está usando, e um cliente que abrisse o painel
 * por um domínio alternativo apontaria o webhook do canal dele para lá.
 */
function webhookDoAgente(): { url: string; segredo: string } {
  /* ⚠️ O fallback é `VERCEL_PROJECT_PRODUCTION_URL`, NÃO `VERCEL_URL`.
   *
   * `VERCEL_URL` é o endereço do DEPLOY (`maisa-app-a1b2c3.vercel.app`) e muda a cada
   * publicação. Um webhook apontado para ele fica preso ao deploy que estava no ar no dia
   * em que o cliente pareou — e para de receber mensagem no próximo `git push`, sem nada
   * quebrar visivelmente. `VERCEL_PROJECT_PRODUCTION_URL` é o domínio estável do projeto.
   *
   * Mesmo assim, `MAISA_PUBLIC_URL` vem primeiro: quando houver domínio próprio, é ele
   * que deve estar no webhook, e não o `.vercel.app`. */
  const base = (
    process.env.MAISA_PUBLIC_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")
  ).trim();
  const faltando: string[] = [];
  if (!base) faltando.push("MAISA_PUBLIC_URL (a URL pública deste deploy, ex: https://app.maisa.com.br)");
  if (!WHATSAPP_SEGREDO) faltando.push("WHATSAPP_WEBHOOK_SECRET");
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(base)) {
    faltando.push("MAISA_PUBLIC_URL (a Evolution não alcança localhost — use um túnel ou o domínio do deploy)");
  }
  if (faltando.length) throw new NaoConfigurado(faltando);

  return { url: `${base.replace(/\/+$/, "")}/api/whatsapp`, segredo: WHATSAPP_SEGREDO };
}
/**
 * O ESPELHO do que a MAISA marcou — a tabela `atendimentos`.
 *
 * ⚠️ Não é a agenda. A verdade dos horários continua sendo o provedor conectado, e a
 * porta (`portas/saida/registro-atendimentos.ts`) escreve a invariante em voz alta: não
 * desenhe tela de agenda a partir daqui, porque evento criado direto no Google não passa
 * por esta linha. Ele serve a três coisas que o Google não responde — idempotência sem
 * varrer a agenda, soma do faturamento por competência, e auditoria de quem marcou
 * (painel ou IA).
 *
 * Segue `isSupabaseConfigured` junto com o cadastro, e não uma env própria, porque as duas
 * metades precisam concordar: `atendimentos.cliente_id` é FK para `clientes`, então gravar
 * o espelho num banco onde o cadastro não mora deixaria toda linha com cliente nulo.
 */
const registro = isSupabaseConfigured ? registroSupabase : registroDemo;
/**
 * MEMÓRIA, THREAD E POSSE das conversas.
 *
 * Estas três linhas eram `memoriaDemo` e `historicoDemo` fixos, com um aviso em cima: "memória
 * de PROCESSO: morre no redeploy e não é compartilhada entre instâncias. A tabela existe em
 * `supabase/007_memoria_agente.sql`; falta o adaptador". O adaptador existe
 * (`saida/supabase/memoria.ts`), e a dívida fechou do jeito que a porta prometia — aqui.
 *
 * O que a troca destrava, além do óbvio: **o painel passa a ver a conversa.** A tela roda em
 * outro processo que o webhook, então um `Map` de módulo era invisível para ela por
 * construção. Era a razão de fundo de a tela de Conversas ter vivido de fixture.
 *
 * Seguem `isSupabaseConfigured` junto com o cadastro, e não uma env própria, porque as três
 * casam com `clientes` pelo telefone: memória num banco onde o cadastro não mora daria
 * conversa sem nome e cliente sem histórico. O fallback em memória continua existindo pelo
 * mesmo motivo dos outros — é o que faz o `/laboratorio` rodar sem banco, e agente que só
 * roda com a infra de pé é agente que ninguém afina antes de pagar.
 */
const memoria = isSupabaseConfigured ? memoriaSupabase : memoriaDemo;
const historico = isSupabaseConfigured ? historicoSupabase : historicoDemo;
const conversas = isSupabaseConfigured ? conversasSupabase : conversasDemo;
/**
 * Por onde a MAISA FALA. A escolha é automática, e é a única do arquivo que não é uma
 * decisão de deploy: com Evolution configurada, manda WhatsApp de verdade; sem, escreve
 * no log e a rota devolve as bolhas no corpo da resposta.
 *
 * O fallback existe para uma coisa específica: afinar o tom da MAISA por `curl`, sem
 * número contratado. Um agente que só roda com a integração de pé é um agente que
 * ninguém testa antes de pagar — e o tom é justamente o que precisa de mais iteração.
 */
/**
 * QUAL INSTÂNCIA ATENDE ESTE INQUILINO.
 *
 * ⚠️ FALHA FECHADA, e é a decisão mais importante deste arquivo. Inquilino sem canal
 * próprio NÃO cai na `EVOLUTION_INSTANCIA` do ambiente. Cair seria o pior defeito
 * possível do produto: a resposta ao cliente de um negócio sairia pelo WhatsApp de
 * outro — número errado, nome errado, e uma conversa privada aterrissando num terceiro.
 *
 * `PrecisaReconectar` e não `NaoConfigurado` porque existe uma AÇÃO que resolve, e a UI
 * já sabe oferecer botão para esse status (é o mesmo que a agenda do Google usa): abrir
 * a tela e conectar o WhatsApp. "Não configurado" mandaria procurar variável de ambiente.
 */
const instanciaDoInquilino = async (t: ContextoTenant): Promise<string> => {
  const c = await canalRepo.ler(t);
  if (!c?.instancia) {
    throw new PrecisaReconectar(
      "Este negócio ainda não tem um WhatsApp conectado. Conecte na tela do canal para a MAISA poder responder.",
    );
  }
  return c.instancia;
};

const canal = isEvolutionConfigured ? criarCanalEvolution({ instanciaDe: instanciaDoInquilino }) : canalDemo;

/** Tudo que o app sabe fazer, já montado. */
export const app = {
  agendarAtendimento: criarAgendarAtendimento({ agenda, negocio, registro }),
  cancelarAtendimento: criarCancelarAtendimento({ agenda, negocio, registro }),
  lerAgenda: criarLerAgenda({ agenda, negocio }),
  /** Nasceu para o agente: a tela calculava o vago desenhando a grade. */
  oferecerHorarios: criarOferecerHorarios({ agenda, negocio }),

  /** Nasceu para a TELA: é por aqui que o painel para de importar fixture. */
  lerCadastro: criarLerCadastro({ negocio }),

  /**
   * CRIAR O NEGÓCIO — o único caso de uso que não recebe inquilino, porque o produz.
   *
   * Segue `isSupabaseConfigured` como o resto, mas por uma razão diferente das outras
   * linhas deste arquivo: as outras escolhem ONDE ler; esta escolhe se o cadastro é real
   * ou encenado. Sem banco, `provisionadorDemo` devolve um uuid de mentira para que o
   * fluxo inteiro seja percorrível por `curl` antes de existir tela.
   */
  provisionarNegocio: criarProvisionarNegocio({ provisionador }),

  /**
   * OS AJUSTES DA MAISA — a mesma linha que o agente lê para montar o prompt.
   *
   * `assistente` aqui e `assistente.ler(t)` no `configuracaoDoAgente` abaixo são a MESMA
   * porta, de propósito: é isso que garante que salvar na tela muda o que o cliente
   * recebe no WhatsApp na mensagem seguinte. Duas fontes aqui seriam uma tela que salva
   * e um agente que não lê — que é exatamente o estado de que este passo saiu.
   */
  /**
   * O CANAL — conectar o WhatsApp do cliente sem ninguém criar instância na mão.
   *
   * As três recebem o mesmo trio de dependências porque são a mesma conversa com o
   * provedor vista de três ângulos, e porque `conectar` precisa saber o que `ler` sabe
   * (qual instância já é deste inquilino) para não gerar um nome novo a cada clique.
   */
  lerCanal: criarLerCanal({ provisionamento, canal: canalRepo, webhook: webhookDoAgente }),
  conectarCanal: criarConectarCanal({ provisionamento, canal: canalRepo, webhook: webhookDoAgente }),
  desconectarCanal: criarDesconectarCanal({ provisionamento, canal: canalRepo, webhook: webhookDoAgente }),

  lerAssistente: criarLerAssistente({ assistente }),
  ajustarAssistente: criarAjustarAssistente({ assistente }),

  lembrarCliente: criarLembrarCliente({ negocio, memoria }),
  anotarFato: criarAnotarFato({ negocio, memoria }),

  /**
   * AS CONVERSAS DO PAINEL — a mesma thread que o agente escreve, lida do outro lado.
   *
   * Os quatro recebem as MESMAS portas que o agente de WhatsApp recebe logo abaixo
   * (`historico`, `conversas`, `canal`). Não é economia de digitação: é o que garante que
   * responder pelo painel e responder pela MAISA caem na mesma thread, no mesmo número, com o
   * mesmo canal. Duas fontes aqui seriam duas conversas para o cliente e uma só para ele.
   */
  listarConversas: criarListarConversas({ historico, conversas, canal }),
  lerConversa: criarLerConversa({ historico, conversas, canal }),
  responderConversa: criarResponderConversa({ historico, conversas, canal }),
  mudarPosseConversa: criarMudarPosseConversa({ historico, conversas, canal }),

  listarConexoes: criarListarConexoes({ conexoes }),
  desconectarAgenda: criarDesconectarAgenda({ conexoes }),

  emitirNota: criarEmitirNota({ emissor, novoId: randomUUID }),
  consultarNota: criarConsultarNota({ emissor }),
  cancelarNota: criarCancelarNota({ emissor }),
};

/** Exposto para as rotas relatarem configuração (o que falta, qual ambiente fiscal). */
export const servicos = { emissor, negocio };

/* ─────────────────────────────────────────────────────────────────────────────
 * O AGENTE DE WHATSAPP.
 *
 * Montado à parte e SOB DEMANDA, por um motivo concreto: construir o cliente de um
 * provedor de IA estoura sem credencial, e este arquivo é importado por TODA rota de
 * API. Construí-lo no topo faria a agenda e a nota fiscal pararem de funcionar num
 * ambiente sem chave de IA — quebrando o app inteiro por causa de uma feature que
 * aquele ambiente talvez nem use.
 *
 * A configuração do agente vem dos fixtures. É aqui que ela pode vir, e não dentro do
 * adaptador: adaptador não conhece adaptador (`ARQUITETURA.md` §6), e é neste arquivo
 * que os dois lados se encontram. Quando a tela "A MAISA" gravar no banco, muda esta
 * linha e nada mais.
 * ────────────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️ HISTÓRIA DE UM BUG QUE MATOU A FEATURE INTEIRA — leia antes de mexer no resolvedor.
 *
 * Até aqui, `agenteWhatsapp()` montava a config do agente com os FIXTURES (`SERVICOS`,
 * `EQUIPE`, `EXPEDIENTE`) enquanto `negocio` (acima) já era `repositorioSupabase`. As duas
 * metades deste arquivo discordavam sobre o que é um id, e a cadeia era esta:
 *
 *   1. `persona.ts` imprimia no prompt "(id: sv1)", e `ferramentas.ts` chegava a ensinar o
 *      formato na descrição da tool ("ex.: sv1");
 *   2. o modelo devolvia, corretamente, `servico_id: "sv1"`;
 *   3. `oferecer-horarios.ts` chamava `negocio.servico(t, "sv1")`;
 *   4. o adaptador Supabase consultava `v_servicos` por `id`, que é coluna `uuid`, e a
 *      guarda `PARECE_UUID` devolvia `null` → `NaoEncontrado`.
 *
 * RESULTADO: a MAISA conversava, entendia, e escalava para humano em 100% das tentativas de
 * marcar. Fail-safe (nunca marcou no negócio errado) e falha total da feature ao mesmo tempo.
 *
 * O CONSERTO é o `configuracaoDoAgente` abaixo: a config virou `(t) => Promise<…>`, resolvida
 * do MESMO repositório que os casos de uso usam. É por isso que ela não pode voltar a ser um
 * objeto — um objeto estático aqui é, por construção, a config de um inquilino só.
 * ═══════════════════════════════════════════════════════════════════════════════ */

import { criarAgente, type ResolvedorDeConfiguracao } from "@/adaptadores/entrada/whatsapp/agente";
import { modeloGemini } from "@/adaptadores/saida/gemini/modelo-gemini";
import { GEMINI, isGeminiConfigured } from "@/adaptadores/saida/gemini/config";
import { criarModeloAnthropic } from "@/adaptadores/saida/anthropic/modelo-anthropic";
/* Negócio, equipe, serviços e expediente NÃO são importados aqui de propósito: era
 * justamente esse import que criava o bug de id descrito acima. Eles chegam pelo
 * `repositorioDemo`, que é o fallback do `negocio` quando não há banco — pela porta, como
 * tudo o mais. Só sobrou o que ainda não tem tela que grave. */
import { FAQS } from "@/adaptadores/saida/demo/conversas";
import { ASSISTENTE_PADRAO, CFG_PADRAO } from "@/adaptadores/saida/demo/assistente";

/**
 * QUEM RESPONDE. Gemini quando há chave dele; senão, Anthropic.
 *
 * ⚠️ A chave do Gemini em uso hoje é de TESTE e será revogada na ida para produção.
 * Trocar de volta é apagar `GEMINI_API_KEY` do ambiente — nenhuma linha de código, e
 * nada no agente sabe a diferença (ele fala `ModeloDeConversa`, não fala provedor).
 * É para isso que a porta existe.
 *
 * Gemini primeiro, e não o contrário, porque é a decisão de HOJE: com as duas chaves
 * presentes, quem responde é o barato. Inverter a ordem em produção é mover esta linha.
 */
export const modeloEmUso = () =>
  isGeminiConfigured ? GEMINI.modelo : process.env.ANTHROPIC_API_KEY ? "claude-opus-5" : null;

/** A rota checa isto para devolver 503 explicando o que falta, em vez de estourar. */
export const agenteConfigurado = () => isGeminiConfigured || !!process.env.ANTHROPIC_API_KEY;

/**
 * O que a MAISA sabe do negócio, resolvido do MESMO repositório que os casos de uso usam.
 *
 * É esta linha que faz o id no prompt e o id no banco serem o mesmo id. Ver o bloco acima.
 *
 * ⚠️ O QUE AINDA VEM DE FIXTURE, e por quê: `faqs`, e só. A tabela existe
 * (`002_multitenant.sql`), o provisionamento a semeia por vertical, mas nenhuma tela
 * grava nela e `RepositorioNegocio` não tem método de FAQ — então trocar agora daria a
 * mesma FAQ genérica com cara de conteúdo próprio. É o passo seguinte, e é uma porta
 * nova, não uma linha aqui.
 *
 * ── `assistente` E `cfg` SAÍRAM DA FIXTURE EM 13/08/2026 ──
 *
 * Enquanto a tela "A MAISA" vivia no `localStorage`, ler do banco daria a MESMA
 * assistente para todo inquilino — e era esse o argumento para manter a fixture. Com
 * `PATCH /api/assistente` a tela passa a gravar, e a linha de `assistente` já nasce
 * preenchida no provisionamento, com o tom variando por vertical
 * (`005_provisionar.sql:209`). Manter a fixture agora seria o contrário do que era: uma
 * configuração que o cliente escreve, salva, e que o agente ignora.
 *
 * `Promise.all` porque as quatro falham juntas e ninguém sabe atender com três de quatro:
 * sem serviço não há duração, sem profissional não há agenda, sem negócio não há nome, sem
 * assistente não há tom. Em série custaria quatro round-trips no caminho quente de cada
 * mensagem.
 *
 * O expediente sai de `profissionais` em vez de uma quinta consulta: `Profissional` já
 * carrega o dele (ver `paraProfissional` no adaptador Supabase), então pedir de novo seria
 * pagar duas vezes pela mesma linha.
 */
const configuracaoDoAgente: ResolvedorDeConfiguracao = async (t) => {
  const [dados, servicos, profissionais, ajustes] = await Promise.all([
    negocio.negocio(t),
    negocio.servicos(t),
    negocio.profissionais(t),
    assistente.ler(t),
  ]);

  /* Linha ausente NÃO derruba a conversa. Aqui o `?? padrão` é a escolha certa, e é o
   * oposto da que `criarLerAssistente` faz: a tela de ajustes precisa saber que a linha
   * sumiu (404), o cliente que acabou de mandar "oi" no WhatsApp não. Responder com o tom
   * padrão é degradar; estourar no meio do turno é sumir.
   *
   * O `warn` existe para isso não virar silêncio permanente: um inquilino provisionado
   * pela RPC sempre tem a linha, então cair aqui é anomalia que merece investigação. */
  if (!ajustes) {
    console.warn(`[composicao] sem linha em 'assistente' para o inquilino ${t.tenantId} — usando o padrão`);
  }

  return {
    negocio: dados,
    servicos,
    profissionais,
    expedientes: Object.fromEntries(profissionais.map((p) => [p.id, p.expediente])),
    assistente: ajustes?.assistente ?? ASSISTENTE_PADRAO,
    faqs: FAQS,
    cfg: ajustes?.cfg ?? CFG_PADRAO,
  };
};

/* O agente em si continua sendo um só por processo: o que era por-inquilino saiu de dentro
 * dele (a config) e virou argumento resolvido a cada mensagem. O que sobra aqui — o cliente
 * do provedor de IA, as definições de ferramenta — é igual para todo mundo. */
let _agente: ReturnType<typeof criarAgente> | null = null;

export function agenteWhatsapp() {
  if (!_agente) {
    _agente = criarAgente({
      modelo: isGeminiConfigured ? modeloGemini : criarModeloAnthropic(),
      config: configuracaoDoAgente,
      // As MESMAS funções que o painel usa. É o teste de que a arquitetura funcionou:
      // marcar horário pelo WhatsApp e pela tela é literalmente a mesma chamada.
      oferecerHorarios: app.oferecerHorarios,
      agendarAtendimento: app.agendarAtendimento,
      cancelarAtendimento: app.cancelarAtendimento,
      lerAgenda: app.lerAgenda,
      lembrarCliente: app.lembrarCliente,
      anotarFato: app.anotarFato,
      historico,
      /* Ele só LÊ daqui, e o que lê é uma pergunta: "esta conversa é do dono?". Se for, cala.
       * Ver o passo 1d de `agente.ts` — é o que faz o botão "Assumir" do painel parar de
       * prometer silêncio e não entregar. */
      conversas,
      canal,
    });
  }
  return _agente;
}
