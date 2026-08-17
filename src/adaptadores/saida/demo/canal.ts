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
import type { Canal, EstadoDoCanal, Pareamento } from "@/nucleo/dominio/canal";
import type { ProvisionamentoDeCanal } from "@/nucleo/portas/saida/provisionamento-canal";
import type { RepositorioCanal } from "@/nucleo/portas/saida/repositorio-canal";

/** Quanto tempo o "cliente" leva para apontar a câmera. */
const SEGUNDOS_ATE_PAREAR = 6;

/** Um PNG 1x1 transparente. A tela precisa de algo que `<img>` aceite, não de um QR real. */
const QR_FALSO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Oito caracteres, como os do WhatsApp — e legíveis como falsos, para não virarem
 *  screenshot de venda. O formato importa: a tela quebra em dois blocos de quatro. */
const CODIGO_FALSO = "MAISADEM";

/** Quando cada instância terminou de "parear". Chave = nome da instância. */
const pareiaEm = new Map<string, number>();

export const provisionamentoDemo: ProvisionamentoDeCanal = {
  faltando: () => [],

  async estado(instancia: string): Promise<EstadoDoCanal> {
    const quando = pareiaEm.get(instancia);
    if (quando === undefined) return { status: "desconectado", numero: null };
    /* Número de demonstração fixo, e propositalmente reconhecível como falso: o ponto de
     * devolvê-lo é exercitar a tela mostrando "+55 11 99999-0000" depois do pareamento,
     * que é o comportamento que ficou anos sem existir. Um número plausível aqui acabaria
     * num screenshot de venda como se fosse cliente real. */
    return Date.now() >= quando
      ? { status: "conectado", numero: "5511999990000" }
      : { status: "pareando", numero: null };
  },

  async conectar(p): Promise<Pareamento> {
    const quando = pareiaEm.get(p.instancia);
    if (quando !== undefined && Date.now() >= quando) {
      return { qrcode: null, codigo: null, status: "conectado", instancia: p.instancia };
    }
    pareiaEm.set(p.instancia, Date.now() + SEGUNDOS_ATE_PAREAR * 1000);
    console.info(
      `[demo/canal] instância "${p.instancia}" pareando${p.numero ? ` por CÓDIGO (${p.numero})` : " por QR"} — ` +
      `vira "conectado" em ${SEGUNDOS_ATE_PAREAR}s. Webhook seria apontado para ${p.urlWebhook}`,
    );
    /* Devolve os DOIS quando pediram código, igual à Evolution: é o que permite afinar na
     * demonstração a tela que oferece "prefiro ler o QR" depois de já ter mostrado o
     * código. Sem isso, esse botão só seria exercitável contra o servidor de verdade —
     * que é exatamente o pareamento manual com o celular na mão que este arquivo evita. */
    return {
      qrcode: QR_FALSO,
      codigo: p.numero ? CODIGO_FALSO : null,
      status: "pareando",
      instancia: p.instancia,
    };
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
