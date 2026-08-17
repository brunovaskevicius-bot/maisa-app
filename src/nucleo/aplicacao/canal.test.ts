/* ─────────────────────────────────────────────────────────────────────────────
 * CONECTAR / CONSULTAR / DESCONECTAR o canal — com fakes nas duas portas.
 *
 * Nem Evolution, nem Supabase, nem sessão. É a prova de que a arquitetura entrega o que
 * promete: as regras que decidem se o WhatsApp de um cliente cai ou não podem ser
 * exercitadas com dois objetos literais.
 *
 * ⚠️ Vários destes testes existem por causa de incidentes reais, não de hipóteses. Os
 * comentários dizem qual — apagar o teste sem entender o comentário é reabrir o incidente.
 * ────────────────────────────────────────────────────────────────────────────── */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoDoCanal, Pareamento } from "@/nucleo/dominio/canal";
import type { ContextoTenant } from "@/nucleo/dominio/tenant";
import type { ProvisionamentoDeCanal } from "@/nucleo/portas/saida/provisionamento-canal";
import type { RepositorioCanal } from "@/nucleo/portas/saida/repositorio-canal";
import { criarConectarCanal, criarDesconectarCanal, criarLerCanal } from "./canal";

const t: ContextoTenant = {
  tenantId: "tenant-uuid-1",
  usuarioId: "u1",
  ator: { tipo: "usuario", id: "u1" },
};

/** O mundo do fake, remontado a cada teste. */
function montar(inicial: { linha?: Awaited<ReturnType<RepositorioCanal["ler"]>>; estado?: EstadoDoCanal } = {}) {
  let linha = inicial.linha ?? null;
  let estado: EstadoDoCanal = inicial.estado ?? { status: "desconectado", numero: null };
  let quebrado = false;
  const chamadas: string[] = [];

  const provisionamento: ProvisionamentoDeCanal = {
    faltando: () => [],
    async estado(instancia) {
      chamadas.push(`estado(${instancia})`);
      if (quebrado) throw new Error("evolution fora do ar");
      return estado;
    },
    async conectar(p): Promise<Pareamento> {
      chamadas.push(`conectar(${p.instancia},${p.numero ?? "sem-numero"})`);
      if (estado.status === "conectado") {
        return { qrcode: null, codigo: null, status: "conectado", instancia: p.instancia };
      }
      estado = { status: "pareando", numero: null };
      /* Espelha a Evolution: com `numero` vêm os dois (o QR é a rede de segurança para o
       * pairing code que falha), sem `numero` vem só o QR. */
      return {
        qrcode: "data:image/png;base64,QQ==",
        codigo: p.numero ? "WZYEH1YY" : null,
        status: "pareando",
        instancia: p.instancia,
      };
    },
    async desconectar(instancia) {
      chamadas.push(`desconectar(${instancia})`);
      estado = { status: "desconectado", numero: null };
    },
  };

  const canal: RepositorioCanal = {
    async ler() { return linha; },
    async salvar(_t, p) {
      chamadas.push(`salvar(${p.instancia},${p.status},${p.numero ?? "null"})`);
      linha = {
        instancia: p.instancia,
        status: p.status,
        numero: p.numero ?? null,
        conectadoEm: p.status === "conectado" ? "2026-08-13T21:38:07Z" : null,
      };
      return linha;
    },
  };

  const webhook = () => ({ url: "https://app.maisa.com.br/api/whatsapp", segredo: "s3gr3d0" });
  const deps = { provisionamento, canal, webhook };

  return {
    chamadas,
    ler: criarLerCanal(deps),
    conectar: criarConectarCanal(deps),
    desconectar: criarDesconectarCanal(deps),
    get linha() { return linha; },
    provedorCai: () => { quebrado = true; },
    provedorVolta: () => { quebrado = false; },
    provedorDiz: (e: EstadoDoCanal) => { estado = e; },
  };
}

describe("lerCanal", () => {
  it("cliente que nunca conectou não vira pergunta ao provedor", async () => {
    const m = montar();
    const c = await m.ler(t);

    expect(c.status).toBe("desconectado");
    /* Perguntar por uma instância inexistente devolve 404, que o cliente traduz para
     * `PrecisaReconectar` — e "reconectar" é a palavra errada para quem nunca conectou. */
    expect(m.chamadas).toEqual([]);
  });

  it("auto-conserta o cache quando o provedor discorda", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "pareando", numero: null, conectadoEm: null },
      estado: { status: "conectado", numero: "5511994294906" },
    });

    const c = await m.ler(t);

    expect(c.status).toBe("conectado");
    expect(m.linha?.status).toBe("conectado");
  });

  /* O bug de 13/08/2026: a coluna `numero` ficava `null` para sempre porque o caso de uso
   * gravava o valor que já estava lá. Um cache que só se compara consigo mesmo nunca se
   * corrige — e a tela dizia "Número conectado" sem saber qual. */
  it("grava o número que veio do provedor, mesmo com o status igual", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "conectado", numero: null, conectadoEm: "ontem" },
      estado: { status: "conectado", numero: "5511994294906" },
    });

    const c = await m.ler(t);

    expect(c.numero).toBe("5511994294906");
    expect(m.chamadas).toContain("salvar(FAQ,conectado,5511994294906)");
  });

  it("não grava nada quando provedor e cache já concordam", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "conectado", numero: "5511994294906", conectadoEm: "ontem" },
      estado: { status: "conectado", numero: "5511994294906" },
    });

    await m.ler(t);

    expect(m.chamadas.filter((c) => c.startsWith("salvar"))).toEqual([]);
  });

  it("provedor fora do ar devolve o último status conhecido, não um erro", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "conectado", numero: "5511994294906", conectadoEm: "ontem" },
    });
    m.provedorCai();

    const c = await m.ler(t);

    /* O sintoma de errar aqui é uma tela em branco no lugar de um aviso. */
    expect(c.status).toBe("conectado");
    expect(c.numero).toBe("5511994294906");
  });
});

describe("conectarCanal", () => {
  it("primeira conexão nomeia a instância com o tenantId e devolve o QR", async () => {
    const m = montar();

    const p = await m.conectar(t);

    expect(p.qrcode).toBeTruthy();
    expect(p.status).toBe("pareando");
    expect(p.instancia).toBe("tenant-uuid-1");
  });

  /* Se gravássemos só ao concluir, existiria uma janela em que a instância existe na
   * Evolution e o nosso banco não sabe o nome dela — e toda mensagem que chegasse nessa
   * janela cairia num webhook incapaz de resolver o inquilino. */
  it("grava ANTES de devolver o QR", async () => {
    const m = montar();

    await m.conectar(t);

    expect(m.chamadas).toContain("salvar(tenant-uuid-1,pareando,null)");
  });

  /* A recusa mora no servidor de propósito: é o que impede um clique derrubar o WhatsApp
   * de um negócio que está atendendo. Nenhuma tela pode contorná-la. */
  it("já conectado NÃO recria — não devolve QR e não apaga nada", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "conectado", numero: "5511994294906", conectadoEm: "ontem" },
      estado: { status: "conectado", numero: "5511994294906" },
    });

    const p = await m.conectar(t);

    expect(p.qrcode).toBeNull();
    expect(p.status).toBe("conectado");
    expect(m.chamadas.some((c) => c.startsWith("desconectar"))).toBe(false);
  });

  /* O inquilino do Bruno chama-se "FAQ", de antes da regra "nome = tenantId". Renomear
   * deixaria a instância antiga órfã no servidor, com o webhook ainda apontado para nós. */
  it("nome de instância já gravado sempre ganha do nome novo", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "desconectado", numero: null, conectadoEm: null },
    });

    const p = await m.conectar(t);

    expect(p.instancia).toBe("FAQ");
  });

  /* Este é o incidente de 13/08/2026 congelado em teste: `MAISA_PUBLIC_URL` faltava, o
   * webhook não montava, e o canal do cliente ficou fora do ar. A ordem importa — se o
   * webhook fosse resolvido DEPOIS de falar com o provedor, a instância seria apagada
   * antes de descobrirmos que não daria para recriá-la. */
  it("falha de configuração acontece ANTES de tocar no provedor", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "desconectado", numero: null, conectadoEm: null },
    });
    const conectar = criarConectarCanal({
      provisionamento: {
        faltando: () => [],
        estado: vi.fn(async () => ({ status: "desconectado", numero: null }) as EstadoDoCanal),
        conectar: vi.fn(),
        desconectar: vi.fn(),
      } as unknown as ProvisionamentoDeCanal,
      canal: { async ler() { return m.linha; }, async salvar(_t, p) { return { ...p, numero: p.numero ?? null, conectadoEm: null }; } } as RepositorioCanal,
      webhook: () => { throw new Error("falta MAISA_PUBLIC_URL"); },
    });

    await expect(conectar(t)).rejects.toThrow("MAISA_PUBLIC_URL");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * PAREAMENTO POR CÓDIGO — o caminho de quem conecta pelo próprio celular.
 *
 * O QR pressupõe dois aparelhos, um mostrando e outro fotografando. Quem abre a MAISA no
 * celular onde o WhatsApp do negócio está instalado não tem o segundo, e o passo não
 * termina — sem nenhum sinal do lado de cá, porque é indistinguível de um QR que ninguém
 * leu. Estes testes protegem a saída.
 * ────────────────────────────────────────────────────────────────────────────── */
describe("conectarCanal por código", () => {
  it("com número, pede o código e devolve os dois caminhos", async () => {
    const m = montar();

    const p = await m.conectar(t, { numero: "(11) 99429-4906" });

    expect(p.codigo).toBe("WZYEH1YY");
    /* O QR volta junto de propósito: é a saída de quem tem um segundo aparelho quando o
     * pairing code falha depois de emitido. Ver `provisionamento-evolution.ts`. */
    expect(p.qrcode).toBeTruthy();
  });

  it("normaliza o que o dono digitou antes de mandar ao provedor", async () => {
    const m = montar();

    await m.conectar(t, { numero: "(11) 99429-4906" });

    /* O provedor exige E.164 sem `+`. Mandar a máscara faria o WhatsApp emitir um código
     * para um número que não existe — e o sintoma seria um código que nunca chega. */
    expect(m.chamadas).toContain("conectar(tenant-uuid-1,5511994294906)");
  });

  it("sem número, segue pelo QR e não inventa código", async () => {
    const m = montar();

    const p = await m.conectar(t);

    expect(p.codigo).toBeNull();
    expect(m.chamadas).toContain("conectar(tenant-uuid-1,sem-numero)");
  });

  /* Um `<input>` em branco manda `""`. Tratá-lo como erro faria a tela recusar um clique
   * em "conectar por QR" — o caminho que sempre funcionou. */
  it("número em branco é o mesmo que não ter número", async () => {
    const m = montar();

    const p = await m.conectar(t, { numero: "   " });

    expect(p.codigo).toBeNull();
    expect(m.chamadas).toContain("conectar(tenant-uuid-1,sem-numero)");
  });

  /* ⚠️ MESMA CLASSE DO INCIDENTE DE 13/08/2026: o passo seguinte APAGA a instância.
   * Validar depois de falar com o provedor deixaria o cliente sem canal por causa de um
   * dígito a menos. */
  it("número inválido falha ANTES de tocar no provedor", async () => {
    const m = montar({
      linha: { instancia: "FAQ", status: "desconectado", numero: null, conectadoEm: null },
    });

    await expect(m.conectar(t, { numero: "99999" })).rejects.toThrow(/telefone/i);
    expect(m.chamadas.some((c) => c.startsWith("conectar"))).toBe(false);
    expect(m.chamadas.some((c) => c.startsWith("desconectar"))).toBe(false);
  });

  /* A regra que o pareamento por código NÃO pode revogar: quem escreve a coluna `numero`
   * é o `ownerJid` do provedor. Gravar o digitado faria a tela mostrar para sempre um
   * número que talvez nunca tenha pareado — o bug de 13/08/2026 pela porta oposta. */
  it("o número DIGITADO não vira o número gravado", async () => {
    const m = montar();

    await m.conectar(t, { numero: "11994294906" });

    expect(m.linha?.numero).toBeNull();
    expect(m.chamadas).toContain("salvar(tenant-uuid-1,pareando,null)");
  });
});

describe("desconectarCanal", () => {
  let m: ReturnType<typeof montar>;

  beforeEach(() => {
    m = montar({
      linha: { instancia: "FAQ", status: "conectado", numero: "5511994294906", conectadoEm: "ontem" },
      estado: { status: "conectado", numero: "5511994294906" },
    });
  });

  it("apaga no provedor mas MANTÉM a linha e o nome da instância", async () => {
    await m.desconectar(t);

    expect(m.chamadas).toContain("desconectar(FAQ)");
    /* Apagar a linha faria o próximo `conectar` gerar um nome novo e deixar a instância
     * antiga órfã no servidor, com o webhook ainda apontado para nós. */
    expect(m.linha?.instancia).toBe("FAQ");
    expect(m.linha?.status).toBe("desconectado");
  });

  it("zera o número, porque ele deixou de ser verdade", async () => {
    await m.desconectar(t);
    expect(m.linha?.numero).toBeNull();
  });

  it("sem nunca ter conectado, não chama o provedor nem grava", async () => {
    const vazio = montar();
    await vazio.desconectar(t);
    expect(vazio.chamadas).toEqual([]);
  });
});
