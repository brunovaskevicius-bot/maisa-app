/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a nossa cópia do PDF do recibo, no Storage. ⚠️ SÓ SERVIDOR.
 *
 * Bucket e políticas em `supabase/023_recibo_numero_e_comprovante.sql` — o arquivo é a verdade,
 * não esta prosa. Lá também está escrito por que guardar o binário passou a ser aceitável, e
 * dentro de quais limites.
 *
 * ── ⚠️ ESTE ADAPTADOR CORRE CONTRA UM RELÓGIO DE CINCO MINUTOS ──
 *
 * A `file_url` que ele recebe é uma presigned S3 da Rebots com `X-Amz-Expires=300`. Não há
 * segunda chance: a API deles não tem consulta, então o arquivo não é pedível de novo. Por isso
 * o timeout aqui é curto e a falha é silenciosa — ver `arquivar`.
 *
 * ── ⚠️ E ELE NUNCA DEVOLVE URL PERMANENTE ──
 *
 * O conteúdo é um recibo com CPF de paciente. O bucket é privado, `linkParaBaixar` assina na
 * hora, e o link expira. Uma URL pública aqui seria dado de paciente num endereço que não morre —
 * e o dia em que ela aparecer num histórico de navegador ou num print de WhatsApp não tem volta.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  ComprovanteArquivado, GuardaDeComprovante,
} from "@/nucleo/portas/saida/guarda-de-comprovante";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import { clienteDoContexto } from "./contexto-cliente";

/** O bucket do 023. Privado — conferido pela própria migração a cada execução. */
const BUCKET = "comprovantes-recibo";

/**
 * Teto do download. Um recibo do Receita Saúde tem uma página.
 *
 * ⚠️ EXISTE PORQUE A URL VEM DE FORA. Sem teto, um endpoint que respondesse um arquivo gigante
 * (por bug deles, ou por uma URL trocada) faria a função serverless do callback estourar memória
 * — e o callback é justamente o que não pode falhar, porque carrega a única cópia do desfecho.
 */
const TETO_BYTES = 5 * 1024 * 1024;

/** Curto de propósito: é uma URL que já está viva há alguns segundos quando chegamos nela. */
const TIMEOUT_MS = 15_000;

/**
 * O caminho da cópia.
 *
 * ⚠️ O `tenantId` É O PRIMEIRO SEGMENTO, e não é estética: a política de leitura do 023 confere
 * `storage.foldername(name)[1]` contra os negócios do usuário. Mudar a forma deste caminho sem
 * mudar a política lá transforma o bucket em pasta compartilhada entre inquilinos.
 */
const caminhoDo = (t: ContextoTenant, protocolo: string) =>
  `${t.tenantId}/${String(protocolo).replace(/[^\w.-]/g, "_")}.pdf`;

export const guardaDeComprovanteSupabase: GuardaDeComprovante = {
  async arquivar(t: ContextoTenant, p): Promise<ComprovanteArquivado | null> {
    const caminho = caminhoDo(t, p.protocolo);

    try {
      const ctrl = new AbortController();
      const relogio = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let bytes: Uint8Array;
      try {
        const r = await fetch(p.urlTemporaria, { signal: ctrl.signal });
        if (!r.ok) {
          /* 403 aqui quer dizer, quase sempre, que os cinco minutos passaram. */
          console.error(
            `[supabase/guarda-de-comprovante] o canal respondeu ${r.status} ao baixar o `
            + `comprovante ${p.protocolo}. A URL vale 5 minutos e não há como pedir de novo.`,
          );
          return null;
        }
        const buffer = await r.arrayBuffer();
        if (buffer.byteLength === 0 || buffer.byteLength > TETO_BYTES) {
          console.error(
            `[supabase/guarda-de-comprovante] comprovante ${p.protocolo} com `
            + `${buffer.byteLength} bytes — fora do aceitável. Não guardei.`,
          );
          return null;
        }
        bytes = new Uint8Array(buffer);
      } finally {
        clearTimeout(relogio);
      }

      const supabase = clienteDoContexto(t);
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, bytes, {
        contentType: "application/pdf",
        /* ⚠️ `upsert` LIGADO. A reentrega do mesmo callback é rotina, e a segunda passada traz o
         * mesmo documento: recusar por "já existe" faria um erro aparecer no log a cada
         * reentrega, e erro que aparece sempre é erro que ninguém lê. */
        upsert: true,
      });

      if (error) {
        /* ⚠️ NÃO LANÇA. Ver o cabeçalho da porta: perder o PDF é ruim, perder o desfecho é pior.
         * Se isto estourasse, o `fechar` não aconteceria e o callback seria reentregue para
         * sempre — a linha `pendente` eternamente por causa de um bucket que falta criar. */
        console.error(
          `[supabase/guarda-de-comprovante] não guardei o comprovante ${p.protocolo}: `
          + `${error.message}. Se o bucket não existe, rode `
          + "`supabase/023_recibo_numero_e_comprovante.sql`.",
        );
        return null;
      }

      return { caminho, bytes: bytes.byteLength };
    } catch (e) {
      console.error(
        `[supabase/guarda-de-comprovante] falha ao arquivar o comprovante ${p.protocolo}: `
        + (e instanceof Error ? e.message : String(e)),
      );
      return null;
    }
  },

  async linkParaBaixar(t: ContextoTenant, p): Promise<string | null> {
    try {
      const supabase = clienteDoContexto(t);
      /* ⚠️ O CAMINHO TEM QUE COMEÇAR PELO INQUILINO DESTE CONTEXTO. Com service role a RLS não
       * roda, e sem esta linha um caminho vindo de fora leria o comprovante de outro negócio.
       * É a mesma regra do `admin.ts`: quando a RLS sai, o filtro no código é a única proteção. */
      if (!p.caminho.startsWith(`${t.tenantId}/`)) return null;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p.caminho, p.segundos);

      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },
};
