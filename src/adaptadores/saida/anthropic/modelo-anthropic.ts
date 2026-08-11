/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — `ModeloDeConversa` servido pela Anthropic.
 *
 * Era o corpo do `agente.ts` até o Gemini entrar. Está aqui, e não apagado, porque a
 * chave do Gemini em uso é de TESTE e será revogada na ida para produção: manter os
 * dois adaptadores faz a decisão "quem responde em produção" ser uma linha em
 * `composicao.ts`, e não uma reescrita do loop sob pressão de prazo.
 *
 * Fábrica, e não constante exportada: `new Anthropic()` estoura sem credencial, e
 * `composicao.ts` é importado por toda rota de API. Só quem escolhe este adaptador
 * paga por construí-lo.
 * ────────────────────────────────────────────────────────────────────────────── */

import Anthropic from "@anthropic-ai/sdk";

import type {
  ChamadaDeFerramenta, ModeloDeConversa, PedidoAoModelo, RespostaDoModelo, TurnoDeConversa,
} from "@/nucleo/portas/saida/modelo-conversa";

/**
 * ⚠️ Modelo fixo no código, e de propósito: trocar o modelo INVALIDA o cache de prompt
 * (cache é por modelo), então ele não pode variar por requisição sem jogar fora o
 * desconto do prefixo estável. Mudança de modelo é deploy, não configuração.
 */
const MODELO = "claude-opus-5";

/**
 * `effort: "low"` — decisão de produto embutida numa string. Cada segundo é o cliente
 * olhando "digitando..." no WhatsApp, e a parte difícil aqui não é raciocínio: é seguir
 * instrução e chamar a ferramenta certa. Se a MAISA se perder, o degrau é `medium`.
 *
 * Pensamento fica LIGADO (padrão do Opus 5): com ele desligado o modelo às vezes
 * escreve a chamada de ferramenta como texto visível — o turno "dá certo", a ferramenta
 * nunca roda, e o cliente recebe a intenção em vez do agendamento.
 */
const ESFORCO = "low" as const;

function paraMensagens(turnos: TurnoDeConversa[]): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];

  for (const t of turnos) {
    if (t.papel === "cliente") {
      msgs.push({ role: "user", content: t.texto });
    } else if (t.papel === "assistente") {
      msgs.push({ role: "assistant", content: t.texto });
    } else if (t.papel === "assistente_ferramentas") {
      const blocos: Anthropic.ContentBlockParam[] = [];
      if (t.texto?.trim()) blocos.push({ type: "text", text: t.texto });
      for (const c of t.chamadas) {
        blocos.push({ type: "tool_use", id: c.id, name: c.nome, input: c.argumentos });
      }
      msgs.push({ role: "assistant", content: blocos });
    } else {
      /* TODOS os resultados numa única mensagem de usuário. Espalhar em várias ensina o
       * modelo a parar de pedir ferramentas em paralelo. */
      msgs.push({
        role: "user",
        content: t.resultados.map<Anthropic.ToolResultBlockParam>((r) => ({
          type: "tool_result",
          tool_use_id: r.id,
          content: r.texto,
          is_error: r.erro,
        })),
      });
    }
  }

  // A primeira mensagem tem que ser do usuário, ou a API recusa o request.
  while (msgs.length && msgs[0].role === "assistant") msgs.shift();
  return msgs;
}

export function criarModeloAnthropic(): ModeloDeConversa {
  const cliente = new Anthropic();

  return {
    nome: `anthropic:${MODELO}`,

    async conversar(p: PedidoAoModelo): Promise<RespostaDoModelo> {
      const resposta = await cliente.messages.create({
        model: MODELO,
        max_tokens: p.maxTokens,
        thinking: { type: "adaptive" },
        output_config: { effort: ESFORCO },
        system: [
          /* O breakpoint no bloco estável cacheia ele E as ferramentas, que renderizam
           * antes. O volátil (data de hoje, memória do cliente) vem depois e fica fora
           * — se a data estivesse no topo, o prefixo mudaria à meia-noite e o catálogo
           * inteiro seria reprocessado a preço cheio a cada mensagem. */
          { type: "text", text: p.sistemaEstavel, cache_control: { type: "ephemeral" } },
          { type: "text", text: p.sistemaVolatil },
        ],
        tools: p.ferramentas.map((f) => ({
          name: f.nome,
          description: f.descricao,
          input_schema: (f.parametros ?? { type: "object", properties: {} }) as Anthropic.Tool.InputSchema,
        })),
        messages: paraMensagens(p.turnos),
      });

      /* Recusa dos classificadores: HTTP 200, `content` vazio ou parcial. Não é erro de
       * código e não se resolve tentando de novo. */
      if (resposta.stop_reason === "refusal") return { texto: "", chamadas: [], recusou: true };

      const texto = resposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
        .trim();

      const chamadas: ChamadaDeFerramenta[] = resposta.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => ({ id: b.id, nome: b.name, argumentos: (b.input ?? {}) as Record<string, unknown> }));

      return { texto, chamadas, recusou: false };
    },
  };
}
