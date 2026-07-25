"use client";
/* MAISA — store central do app.
 *
 * Uma fonte de verdade para tudo que o usuário muda: etapa do kanban, posição na
 * agenda, quem conduz cada conversa, toggles do catálogo/equipe, ajustes da MAISA
 * e o ciclo de vida das notas fiscais.
 *
 * Persistência: localStorage, chave "maisa.app.v2". Só o que é DECISÃO do usuário
 * persiste — estado de navegação (tela, gaveta aberta, filtro, drag) é volátil de
 * propósito: recarregar cai no Fluxo de hoje limpo, não no meio de um arrasto.
 *
 * A emissão de nota é a única ação que sai do navegador: ela chama /api/nf/*, que
 * valida a sessão e fala com a Focus NFe do lado do servidor. Sem token da Focus a
 * rota responde "simulado" e o fluxo roda inteiro igual — inclusive o polling. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as D from "./data";
import { toast } from "./ui";

/* ───────────────────────────── tipos ───────────────────────────── */

export type TelaId =
  | "fluxo" | "conversas" | "agenda" | "clientes" | "faturamento"
  | "equipe" | "servicos" | "assistente" | "mais";

export type AbaConversa = "todas" | "espera" | "maisa" | "ok";

export type Assistente = { nome: string; tom: D.Tom; saudacao: string; ativa: boolean };

/** Agendamento com tudo já resolvido — o que as telas consomem. */
export type AgendamentoVivo = {
  id: string;
  inicio: number;
  fim: number;
  duracao: number;
  profissionalId: string;
  profissional: D.Profissional;
  servico: D.Servico;
  cliente: D.Cliente;
  confirmado: boolean;
  etapa: D.Etapa;
};

/** O que sobrevive a um F5. */
type Persistido = {
  etapas: Record<string, D.Etapa>;
  posicoes: Record<string, { profissionalId: string; inicio: number }>;
  profAtivo: Record<string, boolean>;
  svcAtivo: Record<string, boolean>;
  cliAtivo: Record<string, boolean>;
  assumidas: Record<string, boolean>;
  resolvidos: Record<string, boolean>;
  enviadas: Record<string, D.Msg[]>;
  notas: Record<string, D.Nota>;
  proximoNumero: number;
  assistente: Assistente;
  dias: D.Dia[];
  cfg: Record<D.ChaveCfg, boolean>;
};

const CHAVE = "maisa.app.v2";

const INICIAL: Persistido = {
  etapas: {},
  posicoes: {},
  profAtivo: {},
  svcAtivo: {},
  cliAtivo: {},
  assumidas: {},
  resolvidos: {},
  enviadas: {},
  notas: {},
  proximoNumero: D.PROXIMO_NUMERO,
  assistente: {
    nome: "MAISA",
    tom: "amigável",
    saudacao: `Olá! Aqui é a MAISA, assistente do ${D.NEGOCIO.nome}. Como posso te ajudar hoje?`,
    ativa: true,
  },
  dias: D.DIAS_PADRAO,
  cfg: D.CFG_PADRAO,
};

/* ───────────────────────────── contexto ───────────────────────────── */

export type StoreValue = {
  /* navegação */
  tela: TelaId;
  irPara: (t: TelaId) => void;
  /** id aberto na Gaveta (cliente, agendamento, conversa, serviço, seção…). */
  sel: string | null;
  abrir: (id: string) => void;
  fechar: () => void;

  /* fluxo de hoje + agenda (mesma lista) */
  agendamentos: AgendamentoVivo[];
  agendamentoPorId: (id: string) => AgendamentoVivo | undefined;
  moverEtapa: (id: string, etapa: D.Etapa) => void;
  avancarEtapa: (id: string) => void;
  reposicionar: (id: string, profissionalId: string, inicio: number) => void;
  /** Itens da fila "Precisa de você" que ainda não foram resolvidos. */
  fila: D.ItemFila[];
  resolverFila: (alvo: string) => void;

  /* arrasto (compartilhado por kanban e agenda) */
  arrastando: string | null;
  alvoSolta: string | null;
  iniciarArrasto: (id: string) => void;
  encerrarArrasto: () => void;
  marcarAlvo: (alvo: string | null) => void;

  /* conversas */
  convSel: string;
  selecionarConversa: (id: string) => void;
  abaConv: AbaConversa;
  setAbaConv: (a: AbaConversa) => void;
  estadoConversa: (id: string) => D.EstadoConversa;
  threadDe: (id: string) => D.Msg[];
  assumir: (id: string) => void;
  devolver: (id: string) => void;
  enviar: (id: string, txt: string) => void;

  /* catálogo, equipe, clientes */
  profAtivo: (id: string) => boolean;
  alternarProf: (id: string) => void;
  svcAtivo: (id: string) => boolean;
  alternarSvc: (id: string) => void;
  cliAtivo: (id: string) => boolean;
  alternarCli: (id: string) => void;
  filtroSvc: string;
  setFiltroSvc: (f: string) => void;
  filtroCli: string;
  setFiltroCli: (f: string) => void;

  /* nota fiscal */
  notaDe: (clienteId: string) => D.Nota;
  emitirNota: (clienteId: string) => void;
  emitirPendentes: () => void;
  cancelarNota: (clienteId: string) => void;
  /** Clientes com valor fechado no mês — a base do Faturamento. */
  fechamento: D.Cliente[];

  /* ajustes da MAISA */
  secAtiva: string | null;
  abrirSecao: (id: string) => void;
  assistente: Assistente;
  setAssistente: (patch: Partial<Assistente>) => void;
  dias: D.Dia[];
  alternarDia: (nome: string) => void;
  setHorario: (nome: string, campo: "de" | "ate", valor: string) => void;
  cfg: Record<D.ChaveCfg, boolean>;
  alternarCfg: (chave: D.ChaveCfg) => void;
  salvo: boolean;
  salvar: () => void;

  /* rail */
  railAberto: boolean;
  setRailAberto: (v: boolean) => void;
};

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore() precisa estar dentro de <StoreProvider>.");
  return c;
}

/* ───────────────────────────── provider ───────────────────────────── */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  /* --- persistido --- */
  const [db, setDb] = useState<Persistido>(INICIAL);
  const hidratado = useRef(false);

  // Ler depois do mount: o 1º render precisa bater com o HTML do servidor.
  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (cru) {
        const p = JSON.parse(cru) as Partial<Persistido>;
        setDb((prev) => ({
          ...prev,
          ...p,
          // `dias` é array de tamanho fixo: só aceita se vier íntegro, senão o padrão.
          dias: Array.isArray(p.dias) && p.dias.length === D.DIAS_PADRAO.length ? p.dias : prev.dias,
          assistente: { ...prev.assistente, ...(p.assistente ?? {}) },
          cfg: { ...prev.cfg, ...(p.cfg ?? {}) },
        }));
      }
    } catch {
      /* localStorage indisponível — segue nos defaults */
    }
    hidratado.current = true;
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* noop */ }
  }, [db]);

  const patch = useCallback((f: (d: Persistido) => Partial<Persistido>) => {
    setDb((d) => ({ ...d, ...f(d) }));
  }, []);

  /* --- volátil --- */
  const [tela, setTela] = useState<TelaId>("fluxo");
  const [sel, setSel] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvoSolta, setAlvoSolta] = useState<string | null>(null);
  const [convSel, setConvSel] = useState<string>(D.CONVERSAS[0].id);
  const [abaConv, setAbaConv] = useState<AbaConversa>("todas");
  const [filtroSvc, setFiltroSvc] = useState("Todos");
  const [filtroCli, setFiltroCli] = useState("Ativos");
  const [secAtiva, setSecAtiva] = useState<string | null>("personalidade");
  const [salvo, setSalvo] = useState(false);
  const [railAberto, setRailAberto] = useState(false);

  /* ── navegação ── */
  const irPara = useCallback((t: TelaId) => { setTela(t); setSel(null); }, []);
  const abrir = useCallback((id: string) => setSel(id), []);
  const fechar = useCallback(() => setSel(null), []);

  // Esc fecha a gaveta — atalho único, vale nas duas formas (modal e folha).
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  /* ── agendamentos do dia ── */
  const agendamentos = useMemo<AgendamentoVivo[]>(() => {
    return D.AGENDAMENTOS.map((a) => {
      const pos = db.posicoes[a.id];
      const profissionalId = pos?.profissionalId ?? a.profissionalId;
      const inicio = pos?.inicio ?? a.inicio;
      const sv = D.servico(a.servicoId)!;
      return {
        id: a.id,
        inicio,
        duracao: sv.duracao,
        fim: inicio + sv.duracao / 60,
        profissionalId,
        profissional: D.profissional(profissionalId)!,
        servico: sv,
        cliente: D.cliente(a.clienteId)!,
        confirmado: a.confirmado,
        etapa: db.etapas[a.id] ?? a.etapaInicial,
      };
    }).sort((x, y) => x.inicio - y.inicio);
  }, [db.posicoes, db.etapas]);

  const agendamentoPorId = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id),
    [agendamentos],
  );

  const moverEtapa = useCallback((id: string, etapa: D.Etapa) => {
    patch((d) => ({ etapas: { ...d.etapas, [id]: etapa } }));
    setArrastando(null);
    setAlvoSolta(null);
  }, [patch]);

  const avancarEtapa = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.etapas[id] ?? D.agendamento(id)?.etapaInicial ?? "chegando";
      const i = D.ETAPAS.indexOf(atual);
      const prox = D.ETAPAS[Math.min(i + 1, D.ETAPAS.length - 1)];
      if (prox === atual) return d;
      return { ...d, etapas: { ...d.etapas, [id]: prox } };
    });
  }, []);

  const reposicionar = useCallback((id: string, profissionalId: string, inicio: number) => {
    patch((d) => ({ posicoes: { ...d.posicoes, [id]: { profissionalId, inicio } } }));
    setArrastando(null);
    setAlvoSolta(null);
    const a = D.agendamento(id);
    if (a) toast(`${D.nomeCliente(a.clienteId)} → ${D.hhmm(inicio)} com ${D.primeiroNome(D.nomeProfissional(profissionalId))}`);
  }, [patch]);

  /* ── fila "precisa de você" ──
   * A fila esvazia sozinha conforme você age em qualquer lugar do app: assumir a
   * conversa resolve o item dela, e dar chegada resolve a cobrança de confirmação
   * daquele horário. Sem isso o painel viraria uma lista que nunca zera. */
  const fila = useMemo(() => D.FILA.filter((f) => {
    if (db.resolvidos[f.alvo] || db.assumidas[f.alvo]) return false;
    if (f.alvo.startsWith("ag")) {
      const etapa = db.etapas[f.alvo] ?? D.agendamento(f.alvo)?.etapaInicial;
      return etapa === "chegando";
    }
    return true;
  }), [db.resolvidos, db.assumidas, db.etapas]);
  const resolverFila = useCallback((alvo: string) => {
    patch((d) => ({ resolvidos: { ...d.resolvidos, [alvo]: true } }));
  }, [patch]);

  /* ── arrasto ── */
  const iniciarArrasto = useCallback((id: string) => setArrastando(id), []);
  const encerrarArrasto = useCallback(() => { setArrastando(null); setAlvoSolta(null); }, []);
  const marcarAlvo = useCallback((alvo: string | null) => {
    setAlvoSolta((a) => (a === alvo ? a : alvo));
  }, []);

  /* ── conversas ── */
  const estadoConversa = useCallback((id: string): D.EstadoConversa => {
    if (db.assumidas[id]) return "voce";
    return D.conversa(id)?.estado ?? "maisa";
  }, [db.assumidas]);

  const threadDe = useCallback(
    (id: string) => [...(D.THREADS[id] ?? []), ...(db.enviadas[id] ?? [])],
    [db.enviadas],
  );

  const selecionarConversa = useCallback((id: string) => setConvSel(id), []);

  const assumir = useCallback((id: string) => {
    patch((d) => ({
      assumidas: { ...d.assumidas, [id]: true },
      resolvidos: { ...d.resolvidos, [id]: true },
    }));
    toast("Conversa assumida — a MAISA não responde mais aqui");
  }, [patch]);

  const devolver = useCallback((id: string) => {
    setDb((d) => {
      const a = { ...d.assumidas };
      delete a[id];
      return { ...d, assumidas: a };
    });
    toast("Devolvida à MAISA");
  }, []);

  const enviar = useCallback((id: string, txt: string) => {
    const t = txt.trim();
    if (!t) return;
    patch((d) => ({ enviadas: { ...d.enviadas, [id]: [...(d.enviadas[id] ?? []), { de: "voce", txt: t }] } }));
  }, [patch]);

  /* ── toggles ── */
  const profAtivo = useCallback(
    (id: string) => db.profAtivo[id] ?? D.profissional(id)?.ativo ?? false,
    [db.profAtivo],
  );
  const alternarProf = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.profAtivo[id] ?? D.profissional(id)?.ativo ?? false;
      return { ...d, profAtivo: { ...d.profAtivo, [id]: !atual } };
    });
  }, []);

  const svcAtivo = useCallback(
    (id: string) => db.svcAtivo[id] ?? D.servico(id)?.ativo ?? false,
    [db.svcAtivo],
  );
  const alternarSvc = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.svcAtivo[id] ?? D.servico(id)?.ativo ?? false;
      return { ...d, svcAtivo: { ...d.svcAtivo, [id]: !atual } };
    });
  }, []);

  const cliAtivo = useCallback(
    (id: string) => db.cliAtivo[id] ?? D.cliente(id)?.ativo ?? false,
    [db.cliAtivo],
  );
  const alternarCli = useCallback((id: string) => {
    setDb((d) => {
      const atual = d.cliAtivo[id] ?? D.cliente(id)?.ativo ?? false;
      return { ...d, cliAtivo: { ...d.cliAtivo, [id]: !atual } };
    });
  }, []);

  /* ── nota fiscal ── */
  const notaDe = useCallback(
    (clienteId: string): D.Nota => db.notas[clienteId] ?? D.NOTAS_INICIAIS[clienteId] ?? { status: "pendente" },
    [db.notas],
  );

  const setNota = useCallback((clienteId: string, nota: D.Nota) => {
    patch((d) => ({ notas: { ...d.notas, [clienteId]: nota } }));
  }, [patch]);

  /** Número local, usado quando a emissão é simulada (sem token da Focus). */
  const numeroLocal = useCallback((clienteId: string, ref?: string) => {
    setDb((d) => ({
      ...d,
      proximoNumero: d.proximoNumero + 1,
      notas: {
        ...d.notas,
        [clienteId]: {
          status: "emitida",
          numero: `2026/${String(d.proximoNumero).padStart(6, "0")}`,
          data: D.HOJE.data,
          ref,
          simulada: true,
        },
      },
    }));
  }, []);

  // Timers de polling ativos — limpos no unmount para não vazar.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const agendar = useCallback((f: () => void, ms: number) => {
    timers.current.push(setTimeout(f, ms));
  }, []);

  const cancelarNota = useCallback(async (clienteId: string) => {
    const n = notaDe(clienteId);
    // Notas históricas (as que já vinham emitidas) não têm ref na Focus — cancela só aqui.
    if (!n.ref) { setNota(clienteId, { ...n, status: "cancelada" }); toast("Nota cancelada"); return; }
    try {
      const r = await fetch("/api/nf/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: n.ref }),
      }).then((x) => x.json());
      if (r.status === "cancelado") { setNota(clienteId, { ...n, status: "cancelada" }); toast("Nota cancelada"); return; }
      setNota(clienteId, { ...n, erro: r.erros?.[0]?.mensagem ?? "Não foi possível cancelar." });
    } catch {
      setNota(clienteId, { ...n, erro: "Sem conexão para cancelar a nota." });
    }
  }, [notaDe, setNota]);

  /**
   * Nota de cliente de teste se cancela sozinha.
   *
   * A NFS-e só autoriza de verdade em produção, então validar a integração exige
   * emitir uma nota real. Deixá-la de pé seria um documento fiscal indevido — o
   * cancelamento automático é o que torna o teste seguro de repetir.
   */
  const agendarCancelamentoDeTeste = useCallback((clienteId: string) => {
    if (!D.cliente(clienteId)?.teste) return;
    const seg = Math.round(D.TESTE_CANCELA_APOS_MS / 1000);
    toast(`Nota de teste emitida — cancelando em ${seg}s`);
    agendar(() => { void cancelarNota(clienteId); }, D.TESTE_CANCELA_APOS_MS);
  }, [agendar, cancelarNota]);

  /** Acompanha a emissão assíncrona até sair número (ou erro). */
  const acompanhar = useCallback((clienteId: string, ref: string, tentativa = 0) => {
    if (tentativa > 20) {
      setNota(clienteId, { status: "processando", ref });
      return;
    }
    agendar(async () => {
      try {
        const r = await fetch(`/api/nf/status?ref=${encodeURIComponent(ref)}`).then((x) => x.json());
        if (r.status === "autorizado") {
          setNota(clienteId, { status: "emitida", numero: r.numero, data: D.HOJE.data, ref, pdf: r.pdf });
          agendarCancelamentoDeTeste(clienteId);
          return;
        }
        if (r.status === "cancelado") { setNota(clienteId, { status: "cancelada", ref }); return; }
        if (r.status === "simulado") { numeroLocal(clienteId, ref); agendarCancelamentoDeTeste(clienteId); return; }
        if (r.status === "erro") {
          setNota(clienteId, { status: "erro", ref, erro: r.erros?.[0]?.mensagem ?? "A prefeitura rejeitou a nota." });
          return;
        }
        acompanhar(clienteId, ref, tentativa + 1);
      } catch {
        acompanhar(clienteId, ref, tentativa + 1);
      }
    }, tentativa === 0 ? 1400 : 3000);
  }, [agendar, setNota, numeroLocal, agendarCancelamentoDeTeste]);

  const emitirNota = useCallback(async (clienteId: string) => {
    const c = D.cliente(clienteId);
    if (!c || c.valor <= 0) return;
    if (notaDe(clienteId).status === "processando") return;

    setNota(clienteId, { status: "processando" });
    try {
      const r = await fetch("/api/nf/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pid: clienteId,
          valor: c.valor,
          discriminacao: `${D.nomeServico(c.servicoId)} — ${c.atendimentos} atendimentos · ${D.PERIODO}`,
          tomador: {
            cpf: c.cpf.replace(/\D/g, ""),
            nome: c.nome,
            email: c.email,
            telefone: c.telefone.replace(/\D/g, ""),
          },
        }),
      }).then((x) => x.json());

      if (r.status === "simulado") { numeroLocal(clienteId, r.ref); agendarCancelamentoDeTeste(clienteId); return; }
      if (r.status === "autorizado") {
        setNota(clienteId, { status: "emitida", numero: r.numero, data: D.HOJE.data, ref: r.ref, pdf: r.pdf });
        agendarCancelamentoDeTeste(clienteId);
        return;
      }
      if (r.status === "processando") { setNota(clienteId, { status: "processando", ref: r.ref }); acompanhar(clienteId, r.ref); return; }
      if (r.status === "config_incompleta") {
        setNota(clienteId, { status: "erro", erro: `Faltam dados fiscais: ${(r.faltando ?? []).join(", ")}.` });
        return;
      }
      if (r.status === "nao_autenticado") {
        setNota(clienteId, { status: "erro", erro: "Sua sessão expirou. Entre de novo para emitir." });
        return;
      }
      setNota(clienteId, { status: "erro", ref: r.ref, erro: r.erros?.[0]?.mensagem ?? r.info ?? "Não foi possível emitir." });
    } catch {
      setNota(clienteId, { status: "erro", erro: "Sem conexão com o servidor de notas." });
    }
  }, [notaDe, setNota, numeroLocal, acompanhar, agendarCancelamentoDeTeste]);

  const fechamento = useMemo(
    () => D.CLIENTES.filter((c) => cliAtivo(c.id) && c.valor > 0),
    [cliAtivo],
  );

  const emitirPendentes = useCallback(() => {
    const pend = fechamento.filter((c) => {
      // Tomador de teste fica FORA do lote de propósito: em produção ele emite
      // uma nota real, e um botão de fechar o mês não deveria disparar isso sem
      // que alguém pedisse. Ele emite só pela própria gaveta, um a um.
      if (c.teste) return false;
      const st = notaDe(c.id).status;
      return st === "pendente" || st === "erro";
    });
    if (!pend.length) return;
    toast(`Enviando ${pend.length} ${pend.length === 1 ? "nota" : "notas"} à prefeitura`);
    // Escalonado: emissão em lote não deve disparar N requisições no mesmo tick.
    pend.forEach((c, i) => agendar(() => { void emitirNota(c.id); }, i * 300));
  }, [fechamento, notaDe, emitirNota, agendar]);

  /* ── ajustes da MAISA ── */
  const abrirSecao = useCallback((id: string) => {
    setSecAtiva((s) => (s === id ? null : id));
  }, []);

  const setAssistente = useCallback((p: Partial<Assistente>) => {
    patch((d) => ({ assistente: { ...d.assistente, ...p } }));
  }, [patch]);

  const alternarDia = useCallback((nome: string) => {
    patch((d) => ({
      dias: d.dias.map((x) => {
        if (x.nome !== nome) return x;
        const aberto = !x.aberto;
        // Dia fechado guarda "—" nos horários; ao abrir precisa de hora válida,
        // senão o <input type="time"> recebe um valor que ele não sabe exibir.
        const semHora = x.de === "—" || x.ate === "—";
        return aberto && semHora ? { ...x, aberto, de: "09:00", ate: "18:00" } : { ...x, aberto };
      }),
    }));
  }, [patch]);

  const setHorario = useCallback((nome: string, campo: "de" | "ate", valor: string) => {
    patch((d) => ({ dias: d.dias.map((x) => (x.nome === nome ? { ...x, [campo]: valor } : x)) }));
  }, [patch]);

  const alternarCfg = useCallback((chave: D.ChaveCfg) => {
    patch((d) => ({ cfg: { ...d.cfg, [chave]: !d.cfg[chave] } }));
  }, [patch]);

  const salvar = useCallback(() => {
    setSalvo(true);
    agendar(() => setSalvo(false), 2200);
  }, [agendar]);

  /* ── valor ── */
  const value = useMemo<StoreValue>(() => ({
    tela, irPara, sel, abrir, fechar,
    agendamentos, agendamentoPorId, moverEtapa, avancarEtapa, reposicionar,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, setAbaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    filtroSvc, setFiltroSvc, filtroCli, setFiltroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento,
    secAtiva, abrirSecao,
    assistente: db.assistente, setAssistente,
    dias: db.dias, alternarDia, setHorario,
    cfg: db.cfg, alternarCfg,
    salvo, salvar,
    railAberto, setRailAberto,
  }), [
    tela, irPara, sel, abrir, fechar,
    agendamentos, agendamentoPorId, moverEtapa, avancarEtapa, reposicionar,
    fila, resolverFila,
    arrastando, alvoSolta, iniciarArrasto, encerrarArrasto, marcarAlvo,
    convSel, selecionarConversa, abaConv, estadoConversa, threadDe, assumir, devolver, enviar,
    profAtivo, alternarProf, svcAtivo, alternarSvc, cliAtivo, alternarCli,
    filtroSvc, filtroCli,
    notaDe, emitirNota, emitirPendentes, cancelarNota, fechamento,
    secAtiva, abrirSecao,
    db.assistente, setAssistente,
    db.dias, alternarDia, setHorario,
    db.cfg, alternarCfg,
    salvo, salvar,
    railAberto,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
