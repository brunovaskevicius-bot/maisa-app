/* ─────────────────────────────────────────────────────────────────────────────
 * PORTA DE SAÍDA — quem guarda a nossa cópia do PDF do recibo.
 *
 * ★ ELA EXISTE POR UMA MEDIÇÃO, NÃO POR UM GOSTO DE ARQUITETURA. O sandbox da Rebots respondeu
 * em 25/08/2026 que a `file_url` do comprovante é uma presigned S3 de **cinco minutos**
 * (`X-Amz-Expires=300`), e que a API deles não tem **nenhum GET**. As duas coisas juntas dizem
 * algo bem específico: o PDF oficial existe durante a chamada do callback e não existe depois.
 *
 * Antes disso o código guardava a URL e acreditava que ela durava 48h. Guardar a URL de algo que
 * dura cinco minutos não é uma política de retenção conservadora — é perder o documento e
 * registrar na tela que ele está disponível.
 *
 * ── ⚠️ POR QUE É UM PORT, E NÃO UM `fetch` NA ROTA DO CALLBACK ──
 *
 * Porque "buscar bytes numa URL de terceiro e pôr num bucket" é mundo externo duas vezes, e o
 * caso de uso que fecha o recibo precisa ser testável sem rede nem bucket. O núcleo pede
 * "arquive isto"; quem sabe o que é presigned URL, o que é bucket e o que é service role é o
 * adaptador.
 *
 * ── ⚠️ O QUE ESTA PORTA NÃO FAZ: FALHAR RUIDOSAMENTE ──
 *
 * `arquivar` devolve `null` em vez de lançar quando não conseguiu. É de propósito, e é a decisão
 * mais importante do arquivo: **perder o PDF é ruim, perder o desfecho é pior.** Se a cópia
 * estourasse, o caso de uso não chegaria ao `fechar`, e o callback — que é a única cópia do
 * desfecho que existe no mundo, porque não há consulta — seria respondido com erro e reentregue
 * até o canal desistir. A linha ficaria `pendente` para sempre por causa de um bucket cheio.
 *
 * Então: tenta, e se não der, o recibo fecha sem comprovante. `pdfDisponivel` esconde o botão, e
 * o documento continua no e-CAC da dona, que é onde ele sempre esteve.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "../../dominio/tenant";

/** Onde a cópia ficou. `caminho` é chave no nosso bucket, **nunca uma URL pronta**. */
export type ComprovanteArquivado = {
  caminho: string;
  /** Quantos bytes vieram. Serve para a linha de log distinguir "PDF" de "página de erro". */
  bytes: number;
};

export interface GuardaDeComprovante {
  /**
   * Baixa o comprovante da URL temporária do canal e guarda a nossa cópia.
   *
   * ⚠️ **TEM QUE SER CHAMADA DENTRO DA JANELA DO CALLBACK.** Cinco minutos, e sem consulta para
   * pedir de novo. Não existe "arquivo isto mais tarde" — mais tarde é tarde.
   *
   * Devolve `null` quando não deu: URL vencida, rede fora, bucket recusando. Nunca lança —
   * ver o cabeçalho.
   */
  arquivar(t: ContextoTenant, p: {
    /** O protocolo do recibo. Compõe o nome do arquivo, para a cópia ser rastreável até a linha. */
    protocolo: string;
    urlTemporaria: string;
  }): Promise<ComprovanteArquivado | null>;

  /**
   * Um link assinado para a dona baixar a nossa cópia.
   *
   * ⚠️ ASSINADO E CURTO, nunca uma URL permanente. O arquivo é um recibo com CPF de paciente: o
   * bucket é privado, e o que se entrega para a tela é um link que morre. `null` quando o
   * caminho não existe mais ou o serviço não respondeu.
   */
  linkParaBaixar(t: ContextoTenant, p: {
    caminho: string;
    /** Validade do link. Curta de propósito — é para clicar agora, não para colar num e-mail. */
    segundos: number;
  }): Promise<string | null>;
}
