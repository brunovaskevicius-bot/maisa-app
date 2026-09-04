/* ─────────────────────────────────────────────────────────────────────────────
 * ★ O PRODUTO FUNCIONA SEM CALENDÁRIO EXTERNO.
 *
 * Este arquivo é a guarda do ADR-0009, e ele existe porque durante meses NÃO HAVIA teste
 * nenhum de `agendar-atendimento` nem de `lerAgenda` — os dois casos de uso mais centrais
 * do produto. Foi por isso que ninguém percebeu o que estava medido em 04/09/2026:
 * **nenhuma linha entrava em `atendimentos` sem Google conectado**. O caso de uso
 * consultava o provedor antes de gravar, o provedor lançava `PrecisaReconectar` para quem
 * nunca conectou, e o produto inteiro (faturamento, nota, lembrete, grade) ficava sem
 * combustível. Para o ICP que decidiu não entregar a agenda a um terceiro — terapeuta,
 * barbeiro de caderno — a MAISA simplesmente não funcionava.
 *
 * A regra que estes testes travam: **o calendário externo é ADITIVO**. Ele soma o que
 * nasceu fora e, quando não existe ou falha, soma zero. Nunca derruba.
 *
 * ⚠️ O `agendaQueQuebra` abaixo lança em TODOS os métodos, de propósito. É o inquilino
 * real mais comum, não um caso de borda — e um teste que só exercita o caminho feliz do
 * Google é o teste que não pegou este defeito.
 * ────────────────────────────────────────────────────────────────────────────── */

import { describe, expect, it, vi } from "vitest";
import { criarAgendarAtendimento } from "./agendar-atendimento";
import { criarCancelarAtendimento, criarLerAgenda } from "./agenda";
import { criarOferecerHorarios } from "./oferecer-horarios";
import { HorarioOcupado, PrecisaReconectar } from "../dominio/erros";
import type { ContextoTenant } from "../dominio/tenant";
import type { AgendaExterna } from "../portas/saida/agenda-externa";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import type {
  AtendimentoRegistrado, LinhaDeAtendimento, RegistroDeAtendimentos,
} from "../portas/saida/registro-atendimentos";

const T: ContextoTenant = { tenantId: "t-1", usuarioId: "u-1", ator: { tipo: "usuario", id: "u-1" } };

const PROF = "11111111-1111-4111-8111-111111111111";
const SERV = "22222222-2222-4222-8222-222222222222";
const CLI = "33333333-3333-4333-8333-333333333333";
const AG = "44444444-4444-4444-8444-444444444444";
const AG2 = "55555555-5555-4555-8555-555555555555";

/* A quinta-feira que estes testes usam. Data fixa: teste de agenda que depende do dia de
 * hoje quebra sozinho num domingo, e a suíte já pagou esse preço uma vez. */
const DIA = "2026-10-15";

/* ───────────────────────────── as dublês ───────────────────────────── */

function repoNegocio(): RepositorioNegocio {
  return {
    negocio: vi.fn(async () => ({ nome: "Consultório Regina" })),
    profissional: vi.fn(async (_t, id) => (id === PROF ? { id: PROF, nome: "Regina Guth" } : null)),
    servico: vi.fn(async (_t, id) =>
      id === SERV ? { id: SERV, nome: "Sessão", preco: 200, duracao: 60, profissionalIds: [PROF], ativo: true } : null,
    ),
    cliente: vi.fn(async (_t, id) => (id === CLI ? { id: CLI, nome: "Ana", telefone: "11999990000", email: "" } : null)),
    /* Quinta é dia útil (0 = segunda, então folga é sábado e domingo).
     *
     * ⚠️ Expediente CURTO de propósito: 13h–16h com serviço de 60 min dá cinco vagas
     * (13, 13:30, 14, 14:30, 15). Com um dia inteiro, `espalhar` devolveria uma amostra
     * distribuída e as asserções sobre as 14h passariam ou falhariam por sorteio. */
    expediente: vi.fn(async () => ({ folga: [5, 6], de: 13, ate: 16 })),
    agendasPermitidas: vi.fn(async () => [PROF]),
    garantirCliente: vi.fn(async () => null),
  } as unknown as RepositorioNegocio;
}

/**
 * O registro em memória — com a constraint de exclusão da migração 027 junto.
 *
 * A sobreposição é por INTERVALO (`a.inicio < b.fim && a.fim > b.inicio`), e não por
 * igualdade de horário de início. Comparar só o início é o defeito medido na agenda do
 * Smiller: às 14:30 em cima de um atendimento das 14h às 15h ele diz que está livre.
 */
function registroFake() {
  const linhas: AtendimentoRegistrado[] = [];

  const reg: RegistroDeAtendimentos = {
    async listarJanela(_t, p) {
      return linhas
        .filter((l) => l.agendaId === p.agendaId && l.situacao === "marcado" &&
                       l.dataLocal >= p.janela.de && l.dataLocal <= p.janela.ate)
        .map((l) => ({ data: l.dataLocal, inicio: l.horaInicio, fim: l.horaInicio + l.duracaoMin / 60 }));
    },
    async listar(_t, p) {
      return linhas.filter((l) => l.agendaId === p.agendaId &&
                                  l.dataLocal >= p.janela.de && l.dataLocal <= p.janela.ate);
    },
    async buscarPorAg(_t, p) {
      return linhas.find((l) => l.maisaAg === p.maisaAg) ?? null;
    },
    async registrar(_t, a: LinhaDeAtendimento) {
      const colide = linhas.some(
        (l) => l.agendaId === a.agendaId && l.situacao === "marcado" && l.maisaAg !== a.maisaAg &&
               l.inicioISO < a.fimISO && l.fimISO > a.inicioISO,
      );
      if (colide) throw new HorarioOcupado();

      const i = linhas.findIndex((l) => l.maisaAg === a.maisaAg);
      if (i >= 0) linhas[i] = { ...linhas[i], ...a };
      else linhas.push({ ...a, situacao: "marcado" });
    },
    async cancelar(_t, p) {
      linhas.forEach((l, i) => {
        const bate = p.maisaAg ? l.maisaAg === p.maisaAg : l.eventoId === p.eventoId;
        if (bate) linhas[i] = { ...l, situacao: "cancelado" };
      });
    },
  };

  return Object.assign(reg, { linhas });
}

/** O inquilino que nunca conectou nada. Todo método lança — é o estado normal dele. */
function agendaQueQuebra(): AgendaExterna {
  const morre = async () => {
    throw new PrecisaReconectar("Conecte sua agenda do Google.");
  };
  return { listar: vi.fn(morre), buscarPorAtendimento: vi.fn(morre), criar: vi.fn(morre), remarcar: vi.fn(morre), cancelar: vi.fn(morre) } as unknown as AgendaExterna;
}

/** O inquilino que conectou. `eventos` é o que ele já tem lá dentro. */
function agendaQueFunciona(eventos: unknown[] = []) {
  return {
    listar: vi.fn(async () => eventos),
    buscarPorAtendimento: vi.fn(async () => null),
    criar: vi.fn(async () => ({ eventoId: "ev-google-1", meetLink: "https://meet/x", htmlLink: "https://cal/x" })),
    remarcar: vi.fn(async () => undefined),
    cancelar: vi.fn(async () => undefined),
  } as unknown as AgendaExterna & Record<string, ReturnType<typeof vi.fn>>;
}

const pedido = (sobre: Record<string, unknown> = {}) => ({
  agendaId: PROF, maisaAg: AG, data: DIA, inicio: 14, servicoId: SERV, clienteId: CLI, ...sobre,
} as never);

/* ───────────────────────────── sem calendário nenhum ───────────────────────────── */

describe("★ sem calendário externo, o produto funciona inteiro", () => {
  it("marca o atendimento mesmo com o provedor lançando em tudo", async () => {
    const registro = registroFake();
    const marcar = criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio: repoNegocio(), registro });

    const r = await marcar(T, pedido());

    expect(r.situacao).toBe("criado");
    expect(registro.linhas).toHaveLength(1);
    expect(registro.linhas[0].situacao).toBe("marcado");
    /* Sem provedor não há evento — e a coluna é nullable justamente por isso. */
    expect(registro.linhas[0].eventoId).toBeNull();
  });

  it("devolve a chave de idempotência como identidade, e avisa que ficou fora do calendário", async () => {
    const registro = registroFake();
    const marcar = criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio: repoNegocio(), registro });

    const r = await marcar(T, pedido());

    /* Quem chamou precisa de UM id para cancelar depois. Sem evento externo, é o maisaAg. */
    expect(r.eventoId).toBe(AG);
    expect(r.foraDoCalendario).toBe(true);
  });

  it("a grade mostra o atendimento — e não uma tela vazia", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();
    await criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio, registro })(T, pedido());

    const { eventos } = await criarLerAgenda({ agenda: agendaQueQuebra(), negocio, registro })(
      T, { agendaId: PROF, de: DIA, ate: DIA },
    );

    expect(eventos).toHaveLength(1);
    expect(eventos[0].inicio).toBe(14);
    expect(eventos[0].maisa?.ag).toBe(AG);
    expect(eventos[0].titulo).toContain("Ana");
  });

  it("o horário marcado deixa de ser oferecido", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();
    const agenda = agendaQueQuebra();

    const oferecer = criarOferecerHorarios({ agenda, negocio, registro, agora: () => Date.parse(`${DIA}T06:00:00-03:00`) });

    const antes = await oferecer(T, { servicoId: SERV, de: DIA, dias: 1, porDia: 8 } as never);
    expect(antes.dias[0].horarios).toContain(14);

    await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());

    const depois = await oferecer(T, { servicoId: SERV, de: DIA, dias: 1, porDia: 8 } as never);
    expect(depois.dias[0].horarios).not.toContain(14);
    /* E o das 14:30 também some: o atendimento de 60 min vai até as 15h. */
    expect(depois.dias[0].horarios).not.toContain(14.5);
  });

  it("cancelar libera o horário de volta", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();
    const agenda = agendaQueQuebra();

    const r = await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());
    await criarCancelarAtendimento({ agenda, negocio, registro })(T, { agendaId: PROF, eventoId: r.eventoId });

    expect(registro.linhas[0].situacao).toBe("cancelado");

    const vagas = await criarOferecerHorarios({
      agenda, negocio, registro, agora: () => Date.parse(`${DIA}T06:00:00-03:00`),
    })(T, { servicoId: SERV, de: DIA, dias: 1, porDia: 8 } as never);

    expect(vagas.dias[0].horarios).toContain(14);
  });
});

/* ───────────────────────────── com calendário conectado ───────────────────────────── */

describe("com calendário conectado, ele soma", () => {
  it("cria o evento lá fora e anexa o id ao atendimento", async () => {
    const registro = registroFake();
    const agenda = agendaQueFunciona();

    const r = await criarAgendarAtendimento({ agenda, negocio: repoNegocio(), registro })(T, pedido());

    expect(agenda.criar).toHaveBeenCalledTimes(1);
    expect(r.eventoId).toBe("ev-google-1");
    expect(r.foraDoCalendario).toBe(false);
    /* Uma linha só, com o vínculo — a segunda gravação é upsert pela mesma chave. */
    expect(registro.linhas).toHaveLength(1);
    expect(registro.linhas[0].eventoId).toBe("ev-google-1");
  });

  it("NÃO varre a agenda do provedor numa criação nova", async () => {
    const registro = registroFake();
    const agenda = agendaQueFunciona();

    await criarAgendarAtendimento({ agenda, negocio: repoNegocio(), registro })(T, pedido());

    /* A idempotência agora é um índice único, não uma leitura de calendário. Esta chamada
     * era cobrada de TODA criação e só serve na retomada — ver o teste seguinte. */
    expect(agenda.buscarPorAtendimento).not.toHaveBeenCalled();
  });

  it("o compromisso pessoal do dono bloqueia horário", async () => {
    const registro = registroFake();
    /* Um evento que NÃO nasceu na MAISA: o médico, o almoço. Sem `maisa`. */
    const agenda = agendaQueFunciona([
      { eventoId: "ev-pessoal", data: DIA, inicio: 14, fim: 15, duracao: 60, titulo: "Médico", recorrente: false, aguardandoResposta: false },
    ]);

    const vagas = await criarOferecerHorarios({
      agenda, negocio: repoNegocio(), registro, agora: () => Date.parse(`${DIA}T06:00:00-03:00`),
    })(T, { servicoId: SERV, de: DIA, dias: 1, porDia: 8 } as never);

    expect(vagas.dias[0].horarios).not.toContain(14);
  });

  it("a grade não mostra o mesmo atendimento duas vezes", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();
    const agenda = agendaQueFunciona();

    await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());

    /* Agora o Google devolve o evento que a própria MAISA criou — mesmo `eventoId`. */
    (agenda.listar as ReturnType<typeof vi.fn>).mockResolvedValue([
      { eventoId: "ev-google-1", data: DIA, inicio: 14, fim: 15, duracao: 60, titulo: "[Regina] Sessão — Ana", recorrente: false, aguardandoResposta: false },
    ]);

    const { eventos } = await criarLerAgenda({ agenda, negocio, registro })(T, { agendaId: PROF, de: DIA, ate: DIA });

    expect(eventos).toHaveLength(1);
    /* E o que sobrevive é o do banco, que é o que sabe cliente e serviço. */
    expect(eventos[0].maisa?.clienteNome).toBe("Ana");
  });
});

/* ───────────────────────────── idempotência ───────────────────────────── */

describe("idempotência sem provedor", () => {
  it("a segunda chamada com a mesma chave não cria um segundo atendimento", async () => {
    const registro = registroFake();
    const marcar = criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio: repoNegocio(), registro });

    await marcar(T, pedido());
    const segunda = await marcar(T, pedido());

    expect(segunda.situacao).toBe("ja_existia");
    expect(registro.linhas).toHaveLength(1);
  });

  it("retomada: linha sem evento e provedor de volta ao ar procura antes de criar", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();

    /* 1ª tentativa: sem provedor. Grava a linha, sem evento. */
    await criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio, registro })(T, pedido());
    expect(registro.linhas[0].eventoId).toBeNull();

    /* 2ª: o provedor voltou, e JÁ TEM o evento — a tentativa anterior chegou lá e morreu
     * na volta. Criar de novo daria dois eventos para o mesmo atendimento. */
    const agenda = agendaQueFunciona();
    (agenda.buscarPorAtendimento as ReturnType<typeof vi.fn>).mockResolvedValue({ eventoId: "ev-orfao", meetLink: null, htmlLink: null });

    const r = await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());

    expect(agenda.buscarPorAtendimento).toHaveBeenCalledTimes(1);
    expect(agenda.criar).not.toHaveBeenCalled();
    expect(r.eventoId).toBe("ev-orfao");
    expect(registro.linhas[0].eventoId).toBe("ev-orfao");
  });

  it("retentar a chave de um atendimento CANCELADO não o ressuscita", async () => {
    const registro = registroFake();
    const negocio = repoNegocio();
    const agenda = agendaQueQuebra();

    const r = await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());
    await criarCancelarAtendimento({ agenda, negocio, registro })(T, { agendaId: PROF, eventoId: r.eventoId });

    const denovo = await criarAgendarAtendimento({ agenda, negocio, registro })(T, pedido());

    expect(denovo.situacao).toBe("ja_existia");
    expect(registro.linhas[0].situacao).toBe("cancelado");
  });
});

/* ───────────────────────────── conflito ───────────────────────────── */

describe("dois clientes não ficam com o mesmo horário", () => {
  it("marcar em cima de um atendimento existente é recusado", async () => {
    const registro = registroFake();
    const marcar = criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio: repoNegocio(), registro });

    await marcar(T, pedido());

    /* 14:30 dentro do atendimento das 14h às 15h. Comparar só o início não veria. */
    await expect(marcar(T, pedido({ maisaAg: AG2, inicio: 14.5 }))).rejects.toBeInstanceOf(HorarioOcupado);
    expect(registro.linhas).toHaveLength(1);
  });

  it("o calendário externo nem chega a ser chamado quando o horário já tem dono", async () => {
    const registro = registroFake();
    const agenda = agendaQueFunciona();
    const marcar = criarAgendarAtendimento({ agenda, negocio: repoNegocio(), registro });

    await marcar(T, pedido());
    (agenda.criar as ReturnType<typeof vi.fn>).mockClear();

    await expect(marcar(T, pedido({ maisaAg: AG2, inicio: 14.5 }))).rejects.toBeInstanceOf(HorarioOcupado);

    /* Abortar ANTES do efeito é o ponto de gravar no banco primeiro: nada foi criado no
     * calendário do dono para depois ter que ser desfeito. */
    expect(agenda.criar).not.toHaveBeenCalled();
  });

  it("o horário livre logo depois continua livre — a borda é aberta no fim", async () => {
    const registro = registroFake();
    const marcar = criarAgendarAtendimento({ agenda: agendaQueQuebra(), negocio: repoNegocio(), registro });

    await marcar(T, pedido());
    /* 15h em ponto, colado no fim do anterior. `[)` deixa passar; `[]` recusaria, e a
     * agenda de quem atende de hora em hora aceitaria um horário por dia. */
    await marcar(T, pedido({ maisaAg: AG2, inicio: 15 }));

    expect(registro.linhas).toHaveLength(2);
  });
});
