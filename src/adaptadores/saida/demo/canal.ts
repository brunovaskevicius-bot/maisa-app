/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADORES DE DEMONSTRAÇÃO — canal de WhatsApp sem Evolution e sem banco.
 *
 * O fluxo de conectar é o mais caro de afinar: envolve QR na tela, polling e um estado
 * que muda sozinho. Depender de um servidor Evolution de verdade para ver a tela mudar
 * de "pareando" para "conectado" transformaria cada ajuste de UI num pareamento manual
 * com o celular na mão.
 *
 * Aqui o pareamento CONCLUI SOZINHO depois de `SEGUNDOS_ATE_PAREAR`, simulando alguém
 * apontando a câmera. É o único jeito de exercitar o polling da tela — inclusive o caso
 * que mais quebra na prática: a resposta que chega DEPOIS de o usuário sair da tela.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { Canal, Pareamento, StatusDoCanal } from "@/nucleo/dominio/canal";
import type { ProvisionamentoDeCanal } from "@/nucleo/portas/saida/provisionamento-canal";
import type { RepositorioCanal } from "@/nucleo/portas/saida/repositorio-canal";

/** Quanto tempo o "cliente" leva para apontar a câmera. */
const SEGUNDOS_ATE_PAREAR = 6;

/** Um PNG 1x1 transparente. A tela precisa de algo que `<img>` aceite, não de um QR real. */
const QR_FALSO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Quando cada instância terminou de "parear". Chave = nome da instância. */
const pareiaEm = new Map<string, number>();

export const provisionamentoDemo: ProvisionamentoDeCanal = {
  faltando: () => [],

  async estado(instancia: string): Promise<StatusDoCanal> {
    const quando = pareiaEm.get(instancia);
    if (quando === undefined) return "desconectado";
    return Date.now() >= quando ? "conectado" : "pareando";
  },

  async conectar(p): Promise<Pareamento> {
    const quando = pareiaEm.get(p.instancia);
    if (quando !== undefined && Date.now() >= quando) {
      return { qrcode: null, status: "conectado", instancia: p.instancia };
    }
    pareiaEm.set(p.instancia, Date.now() + SEGUNDOS_ATE_PAREAR * 1000);
    console.info(
      `[demo/canal] instância "${p.instancia}" pareando — vira "conectado" em ${SEGUNDOS_ATE_PAREAR}s. ` +
      `Webhook seria apontado para ${p.urlWebhook}`,
    );
    return { qrcode: QR_FALSO, status: "pareando", instancia: p.instancia };
  },

  async desconectar(instancia: string): Promise<void> {
    pareiaEm.delete(instancia);
  },
};

const linhas = new Map<string, Canal>();

export const canalDemoRepo: RepositorioCanal = {
  async ler(t: ContextoTenant): Promise<Canal | null> {
    return linhas.get(t.tenantId) ?? null;
  },

  async salvar(t, p): Promise<Canal> {
    const canal: Canal = {
      instancia: p.instancia,
      status: p.status,
      /* O número só existe depois de parear de verdade. Na demonstração ele aparece
       * junto com o "conectado", que é o que a tela precisa para mostrar algo no lugar
       * do "—". */
      numero: p.status === "conectado" ? (p.numero ?? "5511999990000") : (p.numero ?? null),
      conectadoEm: p.status === "conectado" ? new Date().toISOString() : null,
    };
    linhas.set(t.tenantId, canal);
    return canal;
  },
};
