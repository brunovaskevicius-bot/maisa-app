/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE DEMONSTRAÇÃO — a guarda do comprovante, em memória.
 *
 * ★ ELE PROVA QUE A PORTA É PORTA: o caso de uso que fecha o recibo passa a ser testável sem
 * bucket, sem service role e sem uma URL de verdade para baixar.
 *
 * ── ⚠️ ELE NÃO BAIXA NADA, E É POR ISSO QUE SERVE ──
 *
 * O adaptador real corre contra uma presigned URL de cinco minutos. Reproduzir isso num demo
 * exigiria rede — e teste que depende de rede não roda no CI. Então aqui `arquivar` guarda a URL
 * recebida num mapa e devolve um caminho fabricado: o que fica exercitado é o **contrato**
 * (arquivou? devolveu caminho? o caso de uso gravou esse caminho?), que é o que quebra na prática.
 *
 * `falharNaProxima()` existe porque o caminho de falha é o que importa mais neste port: a cópia
 * pode não acontecer, e o recibo tem que fechar de qualquer jeito. Ver o cabeçalho da porta.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  ComprovanteArquivado, GuardaDeComprovante,
} from "@/nucleo/portas/saida/guarda-de-comprovante";

/** caminho → a URL de onde ele veio. Vive enquanto o processo viver, como os outros demos. */
const guardados = new Map<string, string>();
let falharUmaVez = false;

/**
 * A próxima `arquivar` devolve `null`, como se o bucket tivesse recusado ou a URL vencido.
 *
 * ⚠️ É O CENÁRIO QUE PRECISA DE TESTE, não uma curiosidade: se a falha da cópia impedisse o
 * `fechar`, o callback seria respondido com erro e reentregue para sempre — e a linha ficaria
 * `pendente` eternamente por causa de um PDF, que é o menos importante dos dois dados.
 */
export function falharNaProximaGuardaDemo(): void {
  falharUmaVez = true;
}

/** Zera o estado. Só para teste — cada arquivo começa do zero sem herdar o anterior. */
export function limparGuardaDemo(): void {
  guardados.clear();
  falharUmaVez = false;
}

/** O que foi arquivado até agora. Para o teste conferir sem espiar o mapa. */
export function comprovantesGuardadosNoDemo(): string[] {
  return [...guardados.keys()];
}

export const guardaDeComprovanteDemo: GuardaDeComprovante = {
  async arquivar(t, p): Promise<ComprovanteArquivado | null> {
    if (falharUmaVez) {
      falharUmaVez = false;
      return null;
    }
    /* Mesmo formato de caminho do adaptador real, inquilino no primeiro segmento — é o que a
     * política do bucket confere, e um demo com outra forma esconderia erro de prefixo. */
    const caminho = `${t.tenantId}/${p.protocolo}.pdf`;
    guardados.set(caminho, p.urlTemporaria);
    return { caminho, bytes: 1024 };
  },

  async linkParaBaixar(t, p): Promise<string | null> {
    /* A mesma checagem de prefixo do real: com service role a RLS não roda, e um caminho vindo
     * de fora leria o comprovante de outro negócio. O demo repete a regra para que um teste que
     * passe aqui signifique algo lá. */
    if (!p.caminho.startsWith(`${t.tenantId}/`)) return null;
    if (!guardados.has(p.caminho)) return null;
    return `https://demo.local/comprovantes/${p.caminho}?expira=${p.segundos}`;
  },
};
