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

import * as D from "@/adaptadores/saida/demo";
import { fmt } from "@/ui/primitivos";
import { useStore } from "@/ui/estado/store";
import { rotuloDeISO, horaDeISO } from "@/nucleo/dominio/tempo";

/* ───────────────────────────── tipos de bloco ───────────────────────────── */

export type ItemLista = { id: string; nome: string; sub: string; seed?: string; onClick?: () => void };

/** Campo editável da Gaveta. Sem botão "Salvar": grava a cada mudança, como os ajustes da MAISA
 *  já fazem. Um save que só pisca um check é exatamente o botão morto que este app evita. */
export type Campo = {
  id: string;
  label: string;
  valor: string;
  /** `numero` recebe inputMode numérico; `select` exige `opcoes`. */
  tipo?: "texto" | "numero" | "select";
  opcoes?: string[];
  hint?: string;
  /** Rótulo visível de cada opção do select (o valor é o id). */
  rotuloOpcao?: (v: string) => string;
  prefixo?: string;
  sufixo?: string;
  onChange: (v: string) => void;
};

export type Bloco =
  /** Pares label/valor em duas colunas — ficha de leitura. */
  | { tipo: "stats"; key: string; label?: string; linhas: [string, string][] }
  /** Campos editáveis — grava direto, sem botão de salvar. */
  | { tipo: "campos"; key: string; label?: string; campos: Campo[] }
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
  /** Desabilita a ação — usada quando falta preencher algo. */
  desabilitada?: boolean;
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

  /* Abre a conversa do cliente na tela de Conversas, se existir uma. Do store: hoje é uma
     conversa de WhatsApp de verdade, e quem tem uma é quem já escreveu. */
  const conversaDoCliente = (clienteId: string) => st.conversas.find((c) => c.clienteId === clienteId);
  const irParaConversa = (cvId: string) => () => { st.selecionarConversa(cvId); st.irPara("conversas"); };

  /* ── um compromisso da agenda do Google que não é atendimento ──
   * Vem ANTES de todo o resto por causa do prefixo: `bloq:` é o único id do app com
   * dois-pontos, e a cascata abaixo despacha por "tenta até dar verdadeiro". Um
   * `bloq:abc` cairia lá embaixo em `agendamentoPorId`, não acharia nada e abriria a
   * gaveta vazia. Prefixo explícito, decidido no topo. */
  if (id.startsWith("bloq:")) {
    const b = st.bloqueioPorId(id);
    if (!b) return null;
    return {
      titulo: b.titulo,
      sub: `${D.rotuloLongo(b.data)}, ${D.hhmm(b.inicio)} – ${D.hhmm(b.fim)}`,
      blocos: [
        {
          tipo: "stats", key: "d", label: "Compromisso",
          linhas: [
            ["Quando", `${D.rotuloDia(b.data)}, ${D.hhmm(b.inicio)} – ${D.hhmm(b.fim)}`],
            ["Duração", `${b.duracao} min`],
            ["Origem", "sua agenda do Google"],
            ...(b.recorrente ? ([["Repetição", "evento que se repete"]] as [string, string][]) : []),
          ],
        },
        {
          tipo: "texto", key: "o", label: "Por que está aqui",
          // O usuário precisa entender por que um bloco que ele não criou ocupa a agenda,
          // e por que ele não consegue arrastar. Sem esta frase, "não mexe" lê como bug.
          texto: "Este horário está ocupado na sua agenda do Google, então a MAISA não o oferece a nenhum cliente. Ele é só leitura aqui — para mudar ou apagar, use o Google Calendar.",
        },
      ],
      acoes: [
        ...(b.meetLink
          ? [{ label: "Entrar no Meet", primaria: true, onClick: () => window.open(b.meetLink!, "_blank", "noopener") } as Acao]
          : []),
        ...(b.htmlLink
          ? [{ label: "Abrir no Google Calendar", primaria: !b.meetLink, onClick: () => window.open(b.htmlLink!, "_blank", "noopener") } as Acao]
          : []),
        { label: "Fechar", onClick: st.fechar },
      ],
    };
  }

  /* ── nota fiscal ── */
  if (id.startsWith("nf-")) {
    const c = st.clienteDe(id.slice(3));
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
          ["Serviço", st.nomeServico(c.servicoId)],
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
            ["Serviço prestado", st.nomeServico(c.servicoId)],
          ],
        },
        recibo,
        nota.status === "erro" && nota.erro
          ? { tipo: "aviso", key: "er", texto: nota.erro, tone: "danger" }
          : c.teste
            ? {
              tipo: "aviso", key: "av",
              texto: `Tomador de teste da integração fiscal. A nota é emitida de verdade na prefeitura e cancelada automaticamente ${Math.round(D.TESTE_CANCELA_APOS_MS / 1000)}s depois — nunca fica documento em pé.`,
            }
            : { tipo: "aviso", key: "av", texto: "Emitir é irreversível: a nota vai para a prefeitura na hora. Para corrigir depois, só cancelando." },
      ],
      acoes: [
        { label: nota.status === "erro" ? "Tentar de novo" : "Emitir nota", primaria: true, onClick: () => { st.emitirNota(c.id); st.fechar(); } },
        { label: "Fechar", onClick: st.fechar },
      ],
    };
  }

  /* ── cliente ── */
  const cli = st.clienteDe(id);
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
      sub: `${st.nomeServico(cli.servicoId)} · ${cli.canal} · desde ${cli.desde}`,
      blocos: [
        {
          tipo: "stats", key: "ficha", label: "Ficha",
          linhas: [
            ["Telefone", cli.telefone],
            ["E-mail", cli.email],
            ["CPF", cli.cpf],
            ["Atendimento", cli.canal],
            ["Serviço principal", st.nomeServico(cli.servicoId)],
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
  const pr = st.profissionalDe(id);
  if (pr) {
    const on = st.profAtivo(pr.id);
    const primeiro = D.primeiroNome(pr.nome);

    /* Conexão com o Google Calendar — uma agenda por profissional, então é aqui que
     * ela mora: o botão fica ao lado da pessoa de quem é a agenda, não numa tela de
     * configurações distante. */
    const conexao = st.googleDe(pr.id);
    const ocupado = st.googleOcupado(pr.id);
    const blocoGoogle: Bloco = conexao
      ? {
        tipo: "texto", key: "gcal", label: "Google Calendar",
        texto: `Conectado como ${conexao.googleEmail}. Os atendimentos de ${primeiro} podem virar evento nesta agenda, com link do Meet.`,
      }
      : st.google.status === "nao_configurado"
        ? {
          tipo: "aviso", key: "gcal", tone: "warn",
          texto: `Google Calendar não configurado neste ambiente. Falta: ${st.google.faltando.join(", ")}.`,
        }
        : st.google.status === "carregando"
          ? { tipo: "texto", key: "gcal", label: "Google Calendar", texto: "Verificando a conexão…" }
          : {
            tipo: "texto", key: "gcal", label: "Google Calendar",
            texto: st.google.status === "ok"
              ? `A agenda de ${primeiro} ainda não está conectada. Conectando, cada atendimento pode virar um evento com link do Meet para mandar no WhatsApp.`
              : "Entre na sua conta para conectar uma agenda do Google.",
          };

    const acoesGoogle: Acao[] = [];
    if (st.google.status === "ok") {
      acoesGoogle.push(
        conexao
          ? { label: ocupado ? "Desconectando…" : "Desconectar do Google", desabilitada: ocupado, onClick: () => st.desconectarGoogle(pr.id) }
          : { label: "Conectar agenda do Google", onClick: () => st.conectarGoogle(pr.id) },
      );
    }

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
        blocoGoogle,
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
          // Espelho do "Quem faz" do serviço, e com a mesma correção: um id órfão
          // sai da lista em vez de derrubar a gaveta.
          itens: pr.servicoIds.flatMap((sid) => {
            const sv = st.servicoDe(sid);
            if (!sv) return [];
            return [{
              id: sid, nome: sv.nome,
              sub: `${fmt(sv.preco)} · ${sv.duracao} min`,
              onClick: () => st.abrir(sid),
            }];
          }),
        },
      ],
      acoes: [
        ...acoesGoogle,
        { label: "Ver na agenda", primaria: !acoesGoogle.length, onClick: () => st.irPara("agenda") },
        { label: "Fechar", onClick: st.fechar },
      ],
    };
  }

  /* ── novo atendimento (rascunho) ──
   * A Agenda tinha 40 zonas de soltura que só aceitavam arrasto: marcar um horário — a ação nº1 de
   * uma agenda — não existia. Clicar num vago abre aqui, com horário e profissional já resolvidos
   * pelo próprio clique; falta escolher quem e o quê. */
  if (st.rascunho && st.rascunho.id === id) {
    const r = st.rascunho;
    const disponiveis = st.servicos.filter((sv) => st.svcAtivo(sv.id));
    const svEscolhido = r.servicoId ? st.servicoDe(r.servicoId) : undefined;
    const completo = !!r.clienteId && !!r.servicoId;
    const { enviando, erro } = st.rascunhoEstado;
    const contaAg = st.googleDe(r.profissionalId);
    return {
      titulo: "Novo atendimento",
      sub: `${r.data === D.HOJE.iso ? "hoje" : D.rotuloLongo(r.data)}, ${D.hhmm(r.inicio)}, com ${D.primeiroNome(st.nomeDoProfissional(r.profissionalId))}`,
      blocos: [
        {
          tipo: "campos", key: "quem", label: "Quem e o quê",
          campos: [
            {
              id: "cliente", label: "Cliente", valor: r.clienteId, tipo: "select",
              opcoes: ["", ...st.cadastro.clientes.filter((c) => st.cliAtivo(c.id)).map((c) => c.id)],
              rotuloOpcao: (v) => (v ? st.nomeDoCliente(v) : "Escolha o cliente"),
              onChange: (v) => st.editarRascunho({ clienteId: v }),
            },
            {
              id: "servico", label: "Serviço", valor: r.servicoId, tipo: "select",
              opcoes: ["", ...disponiveis.map((sv) => sv.id)],
              rotuloOpcao: (v) => {
                const sv = disponiveis.find((x) => x.id === v);
                return sv ? `${sv.nome} · ${sv.duracao} min · ${fmt(sv.preco)}` : "Escolha o serviço";
              },
              hint: svEscolhido ? `Ocupa a agenda até ${D.hhmm(r.inicio + svEscolhido.duracao / 60)}.` : "A duração vem do serviço.",
              onChange: (v) => st.editarRascunho({ servicoId: v }),
            },
          ],
        },
        /* Onde isto vai parar, dito ANTES de acontecer. Marcar deixou de ser uma anotação
         * no navegador e virou um evento na agenda de verdade — com link do Meet, e visível
         * para quem mais tenha acesso àquela conta. Quem clica precisa saber disso pelo
         * botão, não pelo resultado. */
        ...(completo && !erro
          ? [{
            tipo: "texto" as const, key: "onde", label: "Onde vai ser criado",
            texto: contaAg
              ? `Na agenda do Google de ${D.primeiroNome(st.nomeDoProfissional(r.profissionalId))} (${contaAg.googleEmail}), com link do Meet. O cliente NÃO é convidado por e-mail.`
              : `Na agenda do Google de ${D.primeiroNome(st.nomeDoProfissional(r.profissionalId))}, com link do Meet.`,
          }]
          : []),
        ...(completo
          ? []
          : [{ tipo: "aviso" as const, key: "falta", tone: "warn" as const, texto: "Escolha o cliente e o serviço para marcar." }]),
        /* A falha fica NA GAVETA, não num toast. O toast some sozinho e leva embora a única
         * explicação de por que o bloco não apareceu na grade — e aqui ela vem ao lado do
         * botão que vai ser clicado de novo. */
        ...(erro
          ? [{ tipo: "aviso" as const, key: "erro", tone: "danger" as const, texto: erro }]
          : []),
      ],
      acoes: [
        { label: "Descartar", onClick: () => st.descartarRascunho() },
        {
          label: enviando ? "Criando no Google…" : erro ? "Tentar de novo" : "Marcar atendimento",
          primaria: true,
          desabilitada: !completo || enviando,
          onClick: () => st.confirmarRascunho(),
        },
      ],
    };
  }

  /* ── serviço ──
   * Era leitura pura, com um chip prometendo "abrir e editar" e a gaveta oferecendo só um toggle
   * e três linhas de stats. Preço e duração são a razão de existir de uma tela de catálogo: agora
   * são campos, e gravam direto (sem botão de salvar, como os ajustes da MAISA). */
  const sv = st.servicoDe(id);
  if (sv) {
    const on = st.svcAtivo(sv.id);
    return {
      titulo: sv.nome, sub: `${sv.categoria} · ${fmt(sv.preco)} · ${sv.duracao} min`,
      blocos: [
        {
          tipo: "campos", key: "dados", label: "Dados do serviço",
          campos: [
            {
              id: "nome", label: "Nome", valor: sv.nome,
              onChange: (v) => st.editarServico(sv.id, { nome: v }),
            },
            {
              id: "preco", label: "Preço", valor: String(sv.preco), tipo: "numero", prefixo: "R$",
              hint: "O que o cliente paga por este serviço.",
              onChange: (v) => st.editarServico(sv.id, { preco: Math.max(0, Number(v) || 0) }),
            },
            {
              id: "duracao", label: "Duração", valor: String(sv.duracao), tipo: "numero", sufixo: "min",
              hint: "Quanto tempo a MAISA reserva na agenda.",
              onChange: (v) => st.editarServico(sv.id, { duracao: Math.max(5, Number(v) || 5) }),
            },
            {
              id: "categoria", label: "Categoria", valor: sv.categoria, tipo: "select",
              opcoes: [...D.CATEGORIAS],
              onChange: (v) => st.editarServico(sv.id, { categoria: v as D.CategoriaServico }),
            },
          ],
        },
        {
          tipo: "toggles", key: "cat", label: "No catálogo",
          toggles: [{
            titulo: on ? "Ativo" : "Fora do catálogo",
            desc: on ? "A MAISA pode oferecer e agendar este serviço" : "A MAISA não oferece este serviço",
            on,
            alternar: () => st.alternarSvc(sv.id),
          }],
        },
        ...(sv.preco === 0
          ? [{ tipo: "aviso" as const, key: "sem-preco", tone: "warn" as const, texto: "Sem preço, este serviço não entra no faturamento. Preencha antes de colocar no catálogo." }]
          : []),
        {
          tipo: "lista", key: "quem", label: "Quem faz",
          // flatMap e não map: o `!` de antes derrubava a gaveta inteira quando o
          // serviço citava alguém fora da equipe — e sv4/sv5/sv6 eram exatamente esse
          // caso. Sumir da lista é infinitamente melhor que tela branca.
          itens: sv.profissionalIds.flatMap((pid) => {
            const p = st.profissionalDe(pid);
            if (!p) return [];
            return [{
              id: pid, nome: p.nome, seed: pid,
              sub: st.profAtivo(pid) ? "recebendo agendamentos" : "pausado",
              onClick: () => st.abrir(pid),
            }];
          }),
        },
      ],
      /* ⚠️ EXCLUIR VALE PARA QUALQUER SERVIÇO DESDE 15/08/2026, e a mudança é de FATO, não
       * de política. Até aqui só aparecia para o que o usuário tinha criado, com a
       * justificativa de que "serviço do catálogo de partida pode ter agendamento
       * histórico apontando para ele".
       *
       * Conferido no esquema, e a justificativa estava errada: `atendimentos.servico_id`
       * NÃO tem FK — é snapshot, ao lado de `servico_nome` e `servico_valor`
       * (`002_multitenant.sql`). Apagar um serviço não toca faturamento fechado.
       *
       * E manter a condição antiga viraria um botão morto: com o catálogo persistido,
       * TODO serviço passou a existir no cadastro, então `novo` seria sempre falso e o
       * "Excluir" nunca apareceria — inclusive para o "Novo serviço" criado por engano,
       * que é justamente quem mais precisa dele.
       *
       * `ativo: false` (o toggle acima) continua sendo o certo para "não faço mais isso". */
      acoes: [
        { label: "Excluir serviço", tone: "danger", onClick: () => void st.excluirServico(sv.id) },
        fecharAcao,
      ],
    };
  }

  /* ── conversa ──
   * `st.conversaDe` e não `D.conversa`: a lista vem do servidor. E o `id` de uma conversa agora
   * é a chave do telefone (8 dígitos), não `cv1` — quem abre esta gaveta é a fila "Precisa de
   * você" ou a paleta, e as duas já passam esse id. */
  const cv = st.conversaDe(id);
  if (cv) {
    const estado = cv.estado;
    const assumida = estado === "voce";
    // O número já vem com DDI do WhatsApp; o `55` fixo daqui era para o telefone do fixture.
    const zap = `https://wa.me/${cv.telefone}`;
    return {
      titulo: cv.nome, seed: cv.id,
      sub: `${D.telefoneBonito(cv.telefone || cv.id)} · última mensagem às ${D.horaDeISO(cv.atualizadaEm)}`,
      blocos: [
        { tipo: "msgs", key: "th", label: "Conversa", msgs: st.threadDe(cv.id) },
        {
          tipo: "texto", key: "quem", label: "Quem está conduzindo",
          /* Quatro estados, quatro frases. `espera` é NOVO e é o que mais importa: significa que
             o cliente falou e a MAISA não respondeu — ela escalou, está desligada, ou tentou
             marcar e não conseguiu. Antes esse caso vinha escrito no fixture como se fosse
             sobre encaixe de horário; agora é a situação real, e a única com urgência. */
          texto: assumida
            ? "Você assumiu esta conversa. A MAISA não responde mais aqui até você devolver."
            : estado === "espera"
              ? "O cliente escreveu e a MAISA não respondeu — é a sua vez. Assuma para falar você mesmo."
              : estado === "ok"
                ? "Conversa marcada como resolvida. Nada pendente."
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

  /* ── um atendimento ──
   * Já foi "o atendimento de hoje". Com a Agenda em semana e mês, a gaveta abre qualquer um dos
   * ~150 do mês, e duas coisas passaram a importar: DIZER de que dia ele é (dois atendimentos das
   * 10:00 em dias diferentes ficavam idênticos na tela) e não oferecer "Dar chegada" para alguém
   * que só vem daqui a duas semanas. Dar chegada é uma ação do balcão: ela existe no dia. */
  const ag = st.agendamentoPorId(id);
  if (ag) {
    const cvAg = conversaDoCliente(ag.cliente.id);
    const ehHoje = ag.data === D.HOJE.iso;
    const passado = ag.data < D.HOJE.iso;
    const rotulo: Record<D.Etapa, string> = {
      chegando: "Dar chegada",
      atendendo: "Concluir atendimento",
      feito: "Reabrir",
    };
    const acoes: Acao[] = [];
    if (ehHoje) {
      acoes.push({
        label: rotulo[ag.etapa],
        primaria: true,
        onClick: () => {
          st.moverEtapa(ag.id, ag.etapa === "feito" ? "chegando" : ag.etapa === "chegando" ? "atendendo" : "feito");
          st.fechar();
        },
      });
    }

    /* ── Google Calendar + Meet ──
     * Não há mais "criar evento": o atendimento JÁ É o evento. O que existe aqui é o que
     * se faz com um evento que existe — mandar o link, abrir no Google, cancelar. */
    const conexaoAg = st.googleDe(ag.profissionalId);
    const ocupadoAg = st.googleOcupado(ag.id);
    const pedindoCancelar = st.cancelarPedido === ag.id;

    if (ag.meetLink) {
      const link = ag.meetLink;
      // wa.me com texto pronto: abre o WhatsApp (app ou web) com a mensagem digitada,
      // faltando só apertar enviar. É o envio REAL possível hoje — a MAISA que dispara
      // sozinha depende da API oficial, que este protótipo ainda não tem.
      const msg = `Oi, ${D.primeiroNome(ag.cliente.nome)}! Seu ${ag.servico.nome.toLowerCase()} com ${D.primeiroNome(ag.profissional.nome)} é ${D.rotuloLongo(ag.data)}, às ${D.hhmm(ag.inicio)}. Link para entrar: ${link}`;
      const zapAg = `https://wa.me/55${ag.cliente.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      acoes.push({
        label: "Enviar link no WhatsApp",
        primaria: !ehHoje,
        // Cliente vindo do evento e não do catálogo pode estar sem telefone.
        desabilitada: !ag.cliente.telefone,
        onClick: () => window.open(zapAg, "_blank", "noopener"),
      });
    }
    if (ag.htmlLink) {
      const link = ag.htmlLink;
      acoes.push({ label: "Abrir no Google Calendar", onClick: () => window.open(link, "_blank", "noopener") });
    }

    /* Cancelar em DOIS toques, na própria gaveta.
     *
     * É a única ação do app que apaga algo numa agenda real — e, se houver convidado, o
     * Google dispara um aviso de cancelamento por e-mail. Um clique só, num botão que fica
     * ao lado de "Dar chegada", é acidente esperando acontecer. O segundo toque troca o
     * rótulo e acende o aviso logo abaixo; sair da gaveta desfaz o pedido. */
    acoes.push({
      label: ocupadoAg ? "Cancelando…" : pedindoCancelar ? "Confirmar cancelamento" : "Cancelar atendimento",
      tone: "danger",
      desabilitada: ocupadoAg,
      onClick: () => (pedindoCancelar ? st.cancelarAtendimento(ag.id) : st.pedirCancelamento(ag.id)),
    });

    if (cvAg) acoes.push({ label: "Abrir conversa", onClick: irParaConversa(cvAg.id), primaria: !ehHoje && !acoes.length });

    const quando = ehHoje ? "hoje" : D.rotuloDia(ag.data);

    /* Bloco do Google. Dia e hora saem do PRÓPRIO evento, lido na última busca — não há
     * mais previsão a conferir contra o que está lá. Se alguém remarcar direto no Google
     * Calendar, é isto aqui que muda na leitura seguinte. */
    const blocoGoogle: Bloco = {
      tipo: "stats", key: "gcal", label: "No Google Calendar",
      linhas: [
        ["Agenda de", conexaoAg ? `${ag.profissional.nome} (${conexaoAg.googleEmail})` : ag.profissional.nome],
        ["Google Meet", ag.meetLink ? "link criado" : "sem link"],
        ...(ag.recorrente ? ([["Repetição", "evento que se repete"]] as [string, string][]) : []),
      ],
    };

    return {
      titulo: ag.cliente.nome, seed: ag.cliente.id,
      sub: `${quando}, ${D.hhmm(ag.inicio)} · ${ag.servico.nome}`,
      blocos: [
        {
          tipo: "stats", key: "d", label: "Atendimento",
          linhas: [
            ["Dia", `${D.rotuloLongo(ag.data)}${ehHoje ? " (hoje)" : ""}`],
            ["Horário", `${D.hhmm(ag.inicio)} – ${D.hhmm(ag.fim)}`],
            ["Duração", `${ag.duracao} min`],
            ["Profissional", ag.profissional.nome],
            ["Valor", fmt(ag.servico.preco)],
            ["Telefone", ag.cliente.telefone || "—"],
          ],
        },
        {
          tipo: "texto", key: "s", label: "Situação",
          texto: passado
            ? "Atendimento concluído."
            : !ehHoje
              ? !ag.confirmado
                ? "Ainda não confirmou. A MAISA continua cobrando pelo WhatsApp até o dia chegar."
                : "Confirmado pelo WhatsApp com a MAISA."
              : !ag.confirmado
                ? "Ainda não confirmou. A MAISA já mandou dois lembretes pelo WhatsApp."
                : ag.etapa === "feito"
                  ? "Atendimento concluído."
                  : ag.etapa === "atendendo"
                    ? "Em atendimento agora."
                    : "Confirmado pelo WhatsApp com a MAISA.",
        },
        blocoGoogle,
        /* Serviço ou cliente que este navegador não conhece — os dados vieram gravados no
         * próprio evento. Sem esta linha, o preço "R$ 0,00" de um serviço criado noutro
         * aparelho pareceria um erro de cadastro em vez do que é: informação que ficou do
         * outro lado. */
        ...(ag.soltoDoCatalogo
          ? [{ tipo: "texto", key: "solto", label: "Fora do catálogo deste aparelho", texto:
              "Este atendimento foi marcado com um serviço (ou cliente) que só existe no navegador em que foi criado. O que aparece aqui é o que ficou gravado no evento do Google — nome, duração e valor da época. Ele funciona normalmente; só não está ligado ao catálogo." } as Bloco]
          : []),
        ...(!ag.confirmado && !passado
          ? [{ tipo: "aviso", key: "av", texto: ehHoje
              ? "Sem confirmação, o horário pode furar. Vale uma ligação se estiver perto da hora."
              : "Sem confirmação ainda. Falta tempo — a MAISA cobra sozinha até lá." } as Bloco]
          : []),
        ...(pedindoCancelar
          ? [{ tipo: "aviso", key: "canc", tone: "danger", texto:
              `Cancelar apaga o evento de ${D.rotuloLongo(ag.data)}, ${D.hhmm(ag.inicio)}, da agenda do Google${ag.meetLink ? " (o link do Meet para de funcionar)" : ""}. Se houver convidado, ele recebe o aviso de cancelamento. Não dá para desfazer.` } as Bloco]
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
      titulo: "Meu plano", sub: `${st.cadastro.negocio.plano} · ${fmt(st.cadastro.negocio.precoPlano)}/mês`,
      blocos: [
        {
          tipo: "stats", key: "ass", label: "Assinatura",
          linhas: [
            ["Plano", st.cadastro.negocio.plano],
            ["Próxima cobrança", st.cadastro.negocio.proximaCobranca],
            ["Forma de pagamento", st.cadastro.negocio.cartao],
            ["Conversas", st.cadastro.negocio.conversasPlano],
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
