import { NextResponse } from "next/server";
import { app } from "@/composicao";
import { barrou, exigirSessao } from "@/adaptadores/entrada/http/contexto";
import { falha } from "@/adaptadores/entrada/http/respostas";

// ─────────────────────────────────────────────────────────────────────────────
// LIGAR A NOTA FISCAL — o nosso maior diferencial, em uma pergunta.
//
// GET   /api/fiscal            →  { config, caminho, falta, provedorFaltando }
// GET   /api/fiscal?cnpj=…     →  { cadastro }   prévia na Receita, não grava nada
// POST  /api/fiscal            →  { …estado }    liga: consulta o CNPJ e cria a empresa
// POST  /api/fiscal  { cpf }    →  { …estado }    liga o caminho do RECIBO (pessoa física)
// PUT   /api/fiscal            →  { …estado }    instala o certificado A1
// PATCH /api/fiscal            →  { …estado }    vira a chave para produção
// DELETE /api/fiscal           →  { …estado }    desliga o caminho do RECIBO e volta à pergunta
//
// ── ⚠️ `exigirSessao`, NUNCA `sessaoOuDemo` ──
//
// Aqui se cadastra um CNPJ numa conta de emissor fiscal, o que gera custo e cria uma
// empresa cobrada. Um inquilino de demonstração recebendo esta escrita significaria que um
// ambiente sem Supabase pode criar empresa de verdade na Focus — e o `empresaId` morreria
// no processo, deixando CNPJ duplicado lá. O `E` da composição já previne; este porteiro é
// o segundo cinto.
//
// ── ⚠️ O QUE NUNCA SAI DESTA ROTA ──
//
// Token da Focus e arquivo de certificado. O token nem chega ao núcleo (ver
// `portas/saida/cadastro-de-emissor.ts`), e o `.pfx` entra no PUT, é repassado e some. O
// GET devolve `certificadoValidoAte` — metadado, não credencial.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Criar empresa valida certificado do lado da Focus e consulta a Receita. Os 10s padrão da
 * Vercel são apertados em dia de pico, e estourar no meio de `POST` é o caso ruim: a empresa
 * pode ter sido criada com o `empresaId` não gravado. Ver a ordem em `criarLigarNotaFiscal`. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  /* ⚠️ `cnpj` na query é o DOCUMENTO consultado, não identidade — o inquilino continua
   * vindo do cookie. Consultar o CNPJ de outra pessoa devolve dado público da Receita, o
   * mesmo que qualquer site de consulta mostra; não é vazamento, e é o que faz a tela
   * mostrar o nome antes de o dono confirmar. */
  const cnpj = new URL(request.url).searchParams.get("cnpj");

  try {
    if (cnpj) {
      const cadastro = await app.consultarCnpj(porteiro.tenant, cnpj);
      return NextResponse.json({ ok: true, status: "ok", cadastro });
    }
    const estado = await app.lerEstadoFiscal(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...estado });
  } catch (e) {
    return falha("fiscal", e);
  }
}

export async function POST(request: Request) {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  const corpo = await request.json().catch(() => null) as
    {
      cnpj?: unknown; cpf?: unknown; ocupacao?: unknown; registro?: unknown; email?: unknown;
      procurador?: unknown; procuracaoAte?: unknown; procuracaoAceitaEm?: unknown;
    } | null;

  try {
    /* ── ⚠️ A BIFURCAÇÃO DO ONBOARDING FISCAL MORA AQUI, E É UM CAMPO ──
     *
     * `cpf` no corpo = quem atende como pessoa física, e o documento dele é o Recibo
     * Eletrônico de Serviços de Saúde, não nota fiscal. Nada de provedor, nada de
     * certificado. `cnpj` = o caminho de sempre.
     *
     * Um campo e não uma rota nova porque a pergunta da tela é UMA ("como você atende?") e
     * as duas respostas terminam no mesmo lugar: `EstadoFiscal`. Duas rotas fariam a tela
     * escolher URL, e o dia em que aparecer o terceiro regime seriam três telas. */
    if (typeof corpo?.cpf === "string" && corpo.cpf.replace(/\D/g, "").length > 0) {
      /* Só repassa a chave que veio. Ver o comentário de `LigarReciboSaude`: ausente não mexe,
       * `null` apaga — e a rota não pode inventar nenhum dos dois. */
      const texto = (v: unknown) => (typeof v === "string" ? v : null);
      const estado = await app.ligarReciboSaude(porteiro.tenant, {
        cpf: corpo.cpf,
        ocupacao: String(corpo.ocupacao ?? "") as never,
        registro: typeof corpo.registro === "string" ? corpo.registro : null,
        ...("procurador" in corpo ? { procurador: texto(corpo.procurador) } : {}),
        ...("procuracaoAte" in corpo ? { procuracaoAte: texto(corpo.procuracaoAte) } : {}),
        ...("procuracaoAceitaEm" in corpo ? { procuracaoAceitaEm: texto(corpo.procuracaoAceitaEm) } : {}),
      });
      return NextResponse.json({ ok: true, status: "ok", ...estado });
    }

    const estado = await app.ligarNotaFiscal(porteiro.tenant, {
      cnpj: String(corpo?.cnpj ?? ""),
      /* Para onde o emissor manda aviso de nota. Opcional: quem avisa o cliente é a MAISA,
       * pelo WhatsApp — o e-mail aqui é só para o dono receber cópia se quiser. */
      email: typeof corpo?.email === "string" && corpo.email.trim() ? corpo.email.trim() : null,
    });
    return NextResponse.json({ ok: true, status: "ok", ...estado });
  } catch (e) {
    return falha("fiscal", e);
  }
}

export async function PUT(request: Request) {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  const corpo = await request.json().catch(() => null);

  try {
    const estado = await app.enviarCertificado(porteiro.tenant, {
      /* O navegador manda o `.pfx` em base64 porque JSON não carrega binário. A validação
       * de tamanho é no núcleo, não aqui: é regra ("um A1 tem alguns KB"), e regra em rota
       * é bug de camada. */
      pfxBase64: String((corpo as { pfx?: unknown } | null)?.pfx ?? ""),
      senha: String((corpo as { senha?: unknown } | null)?.senha ?? ""),
    });
    return NextResponse.json({ ok: true, status: "ok", ...estado });
  } catch (e) {
    return falha("fiscal", e);
  }
}

export async function PATCH() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    /* Sem corpo de propósito: não há nada a escolher. A única transição possível é
     * homologação → produção, e ela é irreversível na prática — nota autorizada em produção
     * não se apaga, cancela-se na prefeitura. Um corpo com `{ ambiente }` convidaria a
     * mandar "producao" antes de estar pronto; quem recusa é o caso de uso. */
    const estado = await app.liberarProducaoFiscal(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...estado });
  } catch (e) {
    return falha("fiscal", e);
  }
}


/**
 * Desliga o caminho do recibo.
 *
 * ⚠️ SÓ O DO RECIBO, e a assimetria é deliberada: o caminho do CNPJ não se desliga por aqui
 * porque a empresa cadastrada no provedor continua existindo (e cobrada). "Apagar a
 * configuração" daria ao dono a impressão de ter desfeito algo que continua lá.
 *
 * O caso de uso recusa quando já existe lote importado — a partir daí não é preferência de
 * tela, é histórico de documento emitido.
 */
export async function DELETE() {
  const porteiro = await exigirSessao();
  if (barrou(porteiro)) return porteiro.barrado;

  try {
    const estado = await app.desligarReciboSaude(porteiro.tenant);
    return NextResponse.json({ ok: true, status: "ok", ...estado });
  } catch (e) {
    return falha("fiscal", e);
  }
}
