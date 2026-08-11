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
import { criarAnotarFato, criarLembrarCliente } from "@/nucleo/aplicacao/memoria";
import { criarCancelarNota, criarConsultarNota, criarEmitirNota } from "@/nucleo/aplicacao/notas";

import { agendaGoogle, conexoesGoogle } from "@/adaptadores/saida/google/agenda-google";
import { isGoogleConfigured } from "@/adaptadores/saida/google/config";
import { emissorFocus } from "@/adaptadores/saida/focus/emissor-focus";
import { repositorioDemo } from "@/adaptadores/saida/demo/repositorio";
import { canalDemo, historicoDemo, memoriaDemo } from "@/adaptadores/saida/demo/memoria";
import { agendaDemo, conexoesDemo } from "@/adaptadores/saida/demo/agenda";
import { canalEvolution } from "@/adaptadores/saida/evolution/canal-evolution";
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
/** ⚠️ Fixtures em memória, um negócio só. É a peça que falta trocar para o app ser
 *  multi-inquilino de verdade — ver adaptadores/saida/demo/repositorio.ts. */
const negocio = repositorioDemo;
/** ⚠️ Memória de PROCESSO: morre no redeploy e não é compartilhada entre instâncias.
 *  A tabela existe em `supabase/007_memoria_agente.sql`; falta o adaptador. */
const memoria = memoriaDemo;
const historico = historicoDemo;
/**
 * Por onde a MAISA FALA. A escolha é automática, e é a única do arquivo que não é uma
 * decisão de deploy: com Evolution configurada, manda WhatsApp de verdade; sem, escreve
 * no log e a rota devolve as bolhas no corpo da resposta.
 *
 * O fallback existe para uma coisa específica: afinar o tom da MAISA por `curl`, sem
 * número contratado. Um agente que só roda com a integração de pé é um agente que
 * ninguém testa antes de pagar — e o tom é justamente o que precisa de mais iteração.
 */
const canal = isEvolutionConfigured ? canalEvolution : canalDemo;

/** Tudo que o app sabe fazer, já montado. */
export const app = {
  agendarAtendimento: criarAgendarAtendimento({ agenda, negocio }),
  cancelarAtendimento: criarCancelarAtendimento({ agenda, negocio }),
  lerAgenda: criarLerAgenda({ agenda, negocio }),
  /** Nasceu para o agente: a tela calculava o vago desenhando a grade. */
  oferecerHorarios: criarOferecerHorarios({ agenda, negocio }),

  lembrarCliente: criarLembrarCliente({ negocio, memoria }),
  anotarFato: criarAnotarFato({ negocio, memoria }),

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

import { criarAgente } from "@/adaptadores/entrada/whatsapp/agente";
import { modeloGemini } from "@/adaptadores/saida/gemini/modelo-gemini";
import { GEMINI, isGeminiConfigured } from "@/adaptadores/saida/gemini/config";
import { criarModeloAnthropic } from "@/adaptadores/saida/anthropic/modelo-anthropic";
import { NEGOCIO } from "@/adaptadores/saida/demo/negocio";
import { EQUIPE, EXPEDIENTE } from "@/adaptadores/saida/demo/equipe";
import { SERVICOS } from "@/adaptadores/saida/demo/catalogo";
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

let _agente: ReturnType<typeof criarAgente> | null = null;

export function agenteWhatsapp() {
  if (!_agente) {
    _agente = criarAgente({
      modelo: isGeminiConfigured ? modeloGemini : criarModeloAnthropic(),
      config: {
        negocio: NEGOCIO,
        assistente: ASSISTENTE_PADRAO,
        servicos: SERVICOS,
        profissionais: EQUIPE,
        expedientes: EXPEDIENTE,
        faqs: FAQS,
        cfg: CFG_PADRAO,
      },
      // As MESMAS funções que o painel usa. É o teste de que a arquitetura funcionou:
      // marcar horário pelo WhatsApp e pela tela é literalmente a mesma chamada.
      oferecerHorarios: app.oferecerHorarios,
      agendarAtendimento: app.agendarAtendimento,
      cancelarAtendimento: app.cancelarAtendimento,
      lerAgenda: app.lerAgenda,
      lembrarCliente: app.lembrarCliente,
      anotarFato: app.anotarFato,
      historico,
      canal,
    });
  }
  return _agente;
}
