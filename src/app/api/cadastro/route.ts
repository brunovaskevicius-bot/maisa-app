import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, sessaoOuDemo } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// O CADASTRO DO NEGÓCIO — o que a tela precisa saber antes de desenhar qualquer coisa.
//
// GET /api/cadastro  →  { negocio, profissionais, servicos, clientes, agendas }
//
// ── POR QUE UMA ROTA SÓ, E NÃO QUATRO ──
//
// Porque o painel não tem uso para três das quatro isoladamente: o rail mostra o nome do
// negócio, a grade da Agenda precisa dos profissionais para montar as colunas, o select do
// rascunho precisa dos clientes e o catálogo precisa dos serviços — tudo na primeira
// pintura. Quatro rotas seriam quatro idas de rede, quatro estados de carregando e quatro
// chances de a tela abrir pela metade.
//
// É a mesma regra de `/api/agenda` ser separada de `/api/atendimentos`: a fronteira
// de uma rota é a UNIDADE DE CONSEQUÊNCIA, não a tabela. Lá, ler e criar falham com
// significados diferentes e merecem rotas diferentes. Aqui as leituras falham juntas e se
// consertam juntas — é um pedido só. A justificativa está no caso de uso `LerCadastro`.
//
// ⚠️ Isto é LEITURA. Escrever cadastro (editar serviço, cadastrar cliente) não entra aqui:
// cada escrita tem validação e consequência próprias, então pede rota própria.
//
// `sessaoOuDemo` e não `exigirSessao`, ao contrário do que a leitura de agenda faz: esta
// rota não toca credencial de ninguém, e num ambiente sem Supabase ela é justamente a
// única forma de a tela receber o cadastro de demonstração. Barrar aqui deixaria o painel
// em branco exatamente no modo que existe para poder desenvolver sem banco.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const porteiro = await sessaoOuDemo();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const cadastro = await app.lerCadastro(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...cadastro });
  } catch (e) {
    return falha("cadastro", e);
  }
}
