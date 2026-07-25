"use client";
/* MAISA — o que a Gaveta mostra.
 *
 * A regra do app: todo cartão é curto (nome, uma linha de contexto, um estado) e
 * o detalhe vive na Gaveta. Este arquivo é a tradução de um ID para esse detalhe.
 *
 * Um id → um Detalhe. O prefixo do id diz a entidade:
 *   cl…    cliente          nf-cl…  nota fiscal do cliente
 *   pr…    profissional     sv…     serviço do catálogo
 *   cv…    conversa         ag…     agendamento de hoje
 *   faq | plano | numeros   cartões da tela "Mais"
 *
 * Só existe ação aqui que o app REALMENTE executa. Nada de "Salvar alterações"
 * em formulário que não salva: onde não há edição de verdade, o bloco é leitura
 * (stats) e o rodapé traz navegação real (abrir conversa, ver na agenda, emitir). */

import * as D from "./data";
import { fmt } from "./ui";
import { useStore } from "./store";

/* ───────────────────────────── tipos de bloco ───────────────────────────── */

export type ItemLista = { id: string; nome: string; sub: string; seed?: string; onClick?: () => void };

export type Bloco =
  /** Pares label/valor em duas colunas — ficha de leitura. */
  | { tipo: "stats"; key: string; label?: string; linhas: [string, string][] }
  /** Chips de leitura; `on` destaca o que está ativo. */
  | { tipo: "chips"; key: string; label?: string; chips: { label: string; on?: boolean }[] }
  /** Parágrafo de contexto em caixa. */
  | { tipo: "texto"; key: string; label?: string; texto: string }
  | { tipo: "toggles"; key: string; label?: string; toggles: { titulo: string; desc: string; on: boolean; alternar: () => void }[] }
  /** Trecho de conversa de WhatsApp. */
  | { tipo: "msgs"; key: string; label?: string; msgs: D.Msg[] }
  | { tipo: "aviso"; key: string; texto: string; tone?: "warn" | "danger" }
  /** Prévia da NFS-e, no formato de recibo. */
  | { tipo: "recibo"; key: string; label?: string; recibo: Recibo }
  /** Lista de pessoas/itens navegáveis. */
  | { tipo: "lista"; key: string; label?: string; itens: ItemLista[] };

export type Recibo = {
  prestador: string;
  doc: string;
  linhas: [string, string][];
  total: string;
};

export type Acao = {
  label: string;
  primaria?: boolean;
  tone?: "danger";
  onClick?: () => void;
};

export type Detalhe = {
  titulo: string;
  sub: string;
  /** Semente do monograma. Ausente = cabeçalho sem avatar. */
  seed?: string;
  blocos: Bloco[];
  acoes: Acao[];
};

/* ───────────────────────────── hook ───────────────────────────── */

export function useDetalhe(id: string | null): Detalhe | null {
  const st = useStore();
  if (!id) return null;

  const fecharAcao: Acao = { label: "Fechar", primaria: true, onClick: st.fechar };

  /* Abre a conversa do cliente na tela de Conversas, se existir uma. */
  const conversaDoCliente = (clienteId: string) => D.CONVERSAS.find((c) => c.clienteId === clienteId);
  const irParaConversa = (cvId: string) => () => { st.selecionarConversa(cvId); st.irPara("conversas"); };

  /* ── nota fiscal ── */
  if (id.startsWith("nf-")) {
    const c = D.cliente(id.slice(3));
    if (!c) return null;
    const nota = st.notaDe(c.id);

    const recibo: Bloco = {
      tipo: "recibo", key: "recibo", label: "Prévia da nota",
      recibo: {
        prestador: D.PRESTADOR.nome,
        doc: D.PRESTADOR.doc,
        total: fmt(c.valor),
        linhas: [
          ["Tomador", c.nome],
          ["CPF", c.cpf],
          ["Serviço", D.nomeServico(c.servicoId)],
          ["Atendimentos no mês", String(c.atendimentos)],
          ["Competência", D.PERIODO],
          ["Número", nota.numero ?? "sai na emissão"],
        ],
      },
    };

    if (nota.status === "emitida") {
      return {
        titulo: c.nome, seed: c.id,
        sub: `Nota ${nota.numero} · emitida em ${nota.data}`,
        blocos: [
          recibo,
          {
            tipo: "texto", key: "st", label: "Situação",
            texto: nota.simulada
              ? "Emitida em modo simulado — o servidor de notas está sem credencial da prefeitura, então o número foi gerado aqui. Assim que a credencial entrar, a emissão é real sem mudar nada nesta tela."
              : "Nota autorizada pela prefeitura e enviada ao cliente pelo WhatsApp. Para corrigir algo, cancele e emita de novo.",
          },
          ...(nota.erro ? [{ tipo: "aviso", key: "er", texto: nota.erro, tone: "danger" } as Bloco] : []),
        ],
        acoes: [
          nota.pdf
            ? { label: "Baixar PDF", primaria: true, onClick: () => window.open(nota.pdf, "_blank", "noopener") }
            : fecharAcao,
          { label: "Cancelar nota", tone: "danger", onClick: () => st.cancelarNota(c.id) },
        ],
      };
    }

    if (nota.status === "processando") {
      return {
        titulo: c.nome, seed: c.id, sub: "Enviada à prefeitura",
        blocos: [
          recibo,
          { tipo: "texto", key: "st", label: "Situação", texto: "A prefeitura está processando. O número aparece aqui sozinho em alguns minutos — você não precisa fazer nada, nem manter esta gaveta aberta." },
        ],
        acoes: [fecharAcao],
      };
    }

    if (nota.status === "cancelada") {
      return {
        titulo: c.nome, seed: c.id,
        sub: nota.numero ? `Nota ${nota.numero} cancelada` : "Nota cancelada",
        blocos: [
          { tipo: "texto", key: "st", label: "Situação", texto: "Esta nota foi cancelada. O valor do mês continua fechado, então você pode emitir de novo quando quiser." },
          recibo,
        ],
        acoes: [
          { label: "Emitir de novo", primaria: true, onClick: () => { st.emitirNota(c.id); st.fechar(); } },
          { label: "Fechar", onClick: st.fechar },
        ],
      };
    }

    // pendente ou erro
    return {
      titulo: c.nome, seed: c.id, sub: `Fechamento de ${D.PERIODO}`,
      blocos: [
        {
          tipo: "stats", key: "conf", label: "Confira antes de emitir",
          linhas: [
            ["Valor da nota", fmt(c.valor)],
            ["Atendimentos", String(c.atendimentos)],
            ["CPF do tomador", c.cpf],
            ["Serviço prestado", D.nomeServico(c.servicoId)],
          ],
        },
        recibo,
        nota.status === "erro" && nota.erro
          ? { tipo: "aviso", key: "er", texto: nota.erro, tone: "danger" }
          : { tipo: "aviso", key: "av", texto: "Emitir é irreversível: a nota vai para a prefeitura na hora. Para corrigir depois, só cancelando." },
      ],
      acoes: [
        { label: nota.status === "erro" ? "Tentar de novo" : "Emitir nota", primaria: true, onClick: () => { st.emitirNota(c.id); st.fechar(); } },
        { label: "Fechar", onClick: st.fechar },
      ],
    };
  }

  /* ── cliente ── */
  const cli = D.cliente(id);
  if (cli) {
    const ativo = st.cliAtivo(cli.id);
    const nota = st.notaDe(cli.id);
    const cv = conversaDoCliente(cli.id);
    const rotuloNota: Record<D.StatusNota, string> = {
      pendente: "a emitir", processando: "processando", emitida: `emitida · ${nota.numero ?? ""}`.trim(),
      cancelada: "cancelada", erro: "com erro",
    };
    const acoes: Acao[] = [];
    if (cv) acoes.push({ label: "Abrir conversa", primaria: true, onClick: irParaConversa(cv.id) });
    if (cli.valor > 0) {
      acoes.push({
        label: "Ver a nota do mês",
        primaria: !cv,
        onClick: () => { st.irPara("faturamento"); st.abrir(`nf-${cli.id}`); },
      });
    }
    if (!acoes.length) acoes.push(fecharAcao);

    return {
      titulo: cli.nome, seed: cli.id,
      sub: `${D.nomeServico(cli.servicoId)} · ${cli.canal} · desde ${cli.desde}`,
      blocos: [
        {
          tipo: "stats", key: "ficha", label: "Ficha",
          linhas: [
            ["Telefone", cli.telefone],
            ["E-mail", cli.email],
            ["CPF", cli.cpf],
            ["Atendimento", cli.canal],
            ["Serviço principal", D.nomeServico(cli.servicoId)],
            ["Cliente desde", cli.desde],
          ],
        },
        {
          tipo: "stats", key: "mes", label: `Em ${D.PERIODO}`,
          linhas: [
            ["Atendimentos", String(cli.atendimentos)],
            ["Valor fechado", fmt(cli.valor)],
            ["Nota fiscal", cli.valor > 0 ? rotuloNota[nota.status] : "sem valor no mês"],
          ],
        },
        {
          tipo: "toggles", key: "st", label: "Situação",
          toggles: [{
            titulo: ativo ? "Em atendimento" : "Fora de atendimento",
            desc: ativo
              ? "Aparece na agenda e entra no fechamento do mês"
              : "Não entra na agenda nem no faturamento",
            on: ativo,
            alternar: () => st.alternarCli(cli.id),
          }],
        },
      ],
      acoes,
    };
  }

  /* ── profissional ── */
  const pr = D.profissional(id);
  if (pr) {
    const on = st.profAtivo(pr.id);
    const primeiro = D.primeiroNome(pr.nome);
    return {
      titulo: pr.nome, seed: pr.id, sub: `${pr.papel} · na equipe desde ${pr.desde}`,
      blocos: [
        {
          tipo: "toggles", key: "disp", label: "Disponibilidade",
          toggles: [{
            titulo: on ? "Recebendo agendamentos" : "Pausado",
            desc: on ? `A MAISA pode marcar com ${primeiro}` : `A MAISA não oferece os horários de ${primeiro}`,
            on,
            alternar: () => st.alternarProf(pr.id),
          }],
        },
        {
          tipo: "stats", key: "dados", label: "Dados do profissional",
          linhas: [["Papel", pr.papel], ["Comissão", `${pr.comissao}%`], ["Na equipe desde", pr.desde]],
        },
        {
          tipo: "stats", key: "mes", label: "No mês",
          linhas: [["Atendimentos", String(pr.atendimentosMes)], ["Avaliação", pr.avaliacao.toFixed(1)]],
        },
        {
          tipo: "lista", key: "svc", label: "Faz estes serviços",
          itens: pr.servicoIds.map((sid) => {
            const sv = D.servico(sid)!;
            return {
              id: sid, nome: sv.nome,
              sub: `${fmt(sv.preco)} · ${sv.duracao} min`,
              onClick: () => st.abrir(sid),
            };
          }),
        },
      ],
      acoes: [
        { label: "Ver na agenda", primaria: true, onClick: () => st.irPara("agenda") },
        { label: "Fechar", onClick: st.fechar },
      ],
    };
  }

  /* ── serviço ── */
  const sv = D.servico(id);
  if (sv) {
    const on = st.svcAtivo(sv.id);
    return {
      titulo: sv.nome, sub: `${sv.categoria} · ${fmt(sv.preco)} · ${sv.duracao} min`,
      blocos: [
        {
          tipo: "toggles", key: "cat", label: "No catálogo",
          toggles: [{
            titulo: on ? "Ativo" : "Fora do catálogo",
            desc: on ? "A MAISA pode oferecer e agendar este serviço" : "A MAISA não oferece este serviço",
            on,
            alternar: () => st.alternarSvc(sv.id),
          }],
        },
        {
          tipo: "stats", key: "dados", label: "Dados",
          linhas: [["Preço", fmt(sv.preco)], ["Duração", `${sv.duracao} min`], ["Categoria", sv.categoria]],
        },
        {
          tipo: "lista", key: "quem", label: "Quem faz",
          itens: sv.profissionalIds.map((pid) => {
            const p = D.profissional(pid)!;
            return {
              id: pid, nome: p.nome, seed: pid,
              sub: st.profAtivo(pid) ? "recebendo agendamentos" : "pausado",
              onClick: () => st.abrir(pid),
            };
          }),
        },
      ],
      acoes: [fecharAcao],
    };
  }

  /* ── conversa ── */
  const cv = D.conversa(id);
  if (cv) {
    const estado = st.estadoConversa(cv.id);
    const assumida = estado === "voce";
    const zap = `https://wa.me/55${cv.telefone.replace(/\D/g, "")}`;
    return {
      titulo: cv.nome, seed: cv.id, sub: `${cv.telefone} · última mensagem às ${cv.hora}`,
      blocos: [
        { tipo: "msgs", key: "th", label: "Conversa", msgs: st.threadDe(cv.id) },
        {
          tipo: "texto", key: "quem", label: "Quem está conduzindo",
          texto: assumida
            ? "Você assumiu esta conversa. A MAISA não responde mais aqui até você devolver."
            : estado === "ok"
              ? "Conversa resolvida pela MAISA. Nada pendente."
              : "A MAISA está respondendo sozinha. Assuma se quiser falar você mesmo.",
        },
      ],
      acoes: assumida
        ? [
          { label: "Responder no WhatsApp", primaria: true, onClick: () => window.open(zap, "_blank", "noopener") },
          { label: "Devolver à MAISA", onClick: () => st.devolver(cv.id) },
        ]
        : [
          { label: "Assumir conversa", primaria: true, onClick: () => { st.assumir(cv.id); st.selecionarConversa(cv.id); st.irPara("conversas"); } },
          { label: "Abrir na tela", onClick: irParaConversa(cv.id) },
        ],
    };
  }

  /* ── agendamento de hoje ── */
  const ag = st.agendamentoPorId(id);
  if (ag) {
    const cvAg = conversaDoCliente(ag.cliente.id);
    const rotulo: Record<D.Etapa, string> = {
      chegando: "Dar chegada",
      atendendo: "Concluir atendimento",
      feito: "Reabrir",
    };
    const acoes: Acao[] = [{
      label: rotulo[ag.etapa],
      primaria: true,
      onClick: () => {
        st.moverEtapa(ag.id, ag.etapa === "feito" ? "chegando" : ag.etapa === "chegando" ? "atendendo" : "feito");
        st.fechar();
      },
    }];
    if (cvAg) acoes.push({ label: "Abrir conversa", onClick: irParaConversa(cvAg.id) });
    else acoes.push({ label: "Fechar", onClick: st.fechar });

    return {
      titulo: ag.cliente.nome, seed: ag.cliente.id,
      sub: `${D.hhmm(ag.inicio)} · ${ag.servico.nome}`,
      blocos: [
        {
          tipo: "stats", key: "d", label: "Atendimento",
          linhas: [
            ["Horário", `${D.hhmm(ag.inicio)} – ${D.hhmm(ag.fim)}`],
            ["Duração", `${ag.duracao} min`],
            ["Profissional", ag.profissional.nome],
            ["Valor", fmt(ag.servico.preco)],
            ["Telefone", ag.cliente.telefone],
          ],
        },
        {
          tipo: "texto", key: "s", label: "Situação",
          texto: !ag.confirmado
            ? "Ainda não confirmou. A MAISA já mandou dois lembretes pelo WhatsApp."
            : ag.etapa === "feito"
              ? "Atendimento concluído."
              : ag.etapa === "atendendo"
                ? "Em atendimento agora."
                : "Confirmado pelo WhatsApp com a MAISA.",
        },
        ...(!ag.confirmado
          ? [{ tipo: "aviso", key: "av", texto: "Sem confirmação, o horário pode furar. Vale uma ligação se estiver perto da hora." } as Bloco]
          : []),
      ],
      acoes,
    };
  }

  /* ── cartões da tela "Mais" ── */
  if (id === "faq") {
    return {
      titulo: "Perguntas frequentes", sub: `${D.FAQS.length} respostas no ar · ${D.FAQS.reduce((a, f) => a + f.usos, 0).toLocaleString("pt-BR")} usos`,
      blocos: D.FAQS.map((f) => ({
        tipo: "texto" as const, key: f.id, label: f.pergunta,
        texto: `${f.resposta}\n\nUsada ${f.usos.toLocaleString("pt-BR")} vezes.`,
      })),
      acoes: [fecharAcao],
    };
  }

  if (id === "plano") {
    return {
      titulo: "Meu plano", sub: `${D.NEGOCIO.plano} · ${fmt(D.NEGOCIO.precoPlano)}/mês`,
      blocos: [
        {
          tipo: "stats", key: "ass", label: "Assinatura",
          linhas: [
            ["Plano", D.NEGOCIO.plano],
            ["Próxima cobrança", D.NEGOCIO.proximaCobranca],
            ["Forma de pagamento", D.NEGOCIO.cartao],
            ["Conversas", D.NEGOCIO.conversasPlano],
          ],
        },
        { tipo: "stats", key: "fat", label: "Últimas faturas", linhas: D.FATURAS },
      ],
      acoes: [fecharAcao],
    };
  }

  if (id === "numeros") {
    return {
      titulo: "Números do mês", sub: D.NUMEROS_MES.periodo,
      blocos: [
        { tipo: "stats", key: "res", label: "Resultado", linhas: D.NUMEROS_MES.resultado },
        { tipo: "stats", key: "mai", label: "A MAISA no mês", linhas: D.NUMEROS_MES.maisa },
      ],
      acoes: [fecharAcao],
    };
  }

  return null;
}
