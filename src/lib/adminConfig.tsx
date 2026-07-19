"use client";
/* Contexto compartilhado — MAISA modular.
 * <AdminConfigProvider> + useAdmin() → { features, isOn, toggle, profissao, setProfissao, t, data }.
 * `data` ESPELHA os exports de mock.ts (mesmos nomes), já RESOLVIDOS pela profissão ativa. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as mock from "@/lib/mock";
import type { Barbeiro, Servico, Agendamento, AgFixo, Conversa, Pagamento, FAQ, Campanha, ConfigSecao } from "@/lib/mock";
import {
  FEATURE_REGISTRY,
  PROFISSAO_LABELS,
  PROFISSOES,
  type FeatureId,
  type Profissao,
  type Terms,
  type ExemploMsg,
} from "@/lib/profiles";

/* ────────────────────────────── DADOS RESOLVIDOS ────────────────────────────── */
// Espelha os exports de mock.ts com os MESMOS nomes, resolvidos pela profissão ativa.
export type ResolvedData = {
  shop: typeof mock.shop;
  assistant: typeof mock.assistant;
  equipe: Barbeiro[];
  servicos: Servico[];
  agendaHoje: Agendamento[];
  agendaFixa: AgFixo[];
  conversas: Conversa[];
  pagamentos: Pagamento[];
  faqs: FAQ[];
  faqsSugeridos: string[];
  campanhas: Campanha[];
  configSecoes: ConfigSecao[];
  mensagensExemplo: ExemploMsg[];
  kpis: typeof mock.kpis;
  horarios: typeof mock.horarios;
  // helpers (substituem barbeiroNome / servicosDoBarbeiro / barbeirosDoServico):
  nomeDoProfissional: (id: string) => string;
  servicosDoProfissional: (bid: string) => Servico[];
  profissionaisDoServico: (sid: string) => Barbeiro[];
};

/* ────────────────────────────── RESOLVER ────────────────────────────── */
// barbearia devolve o mock intocado (o spec de barbearia = base). Demais profissões sobrepõem a base.
function resolve(prof: Profissao): ResolvedData {
  const spec = PROFISSOES[prof];
  const t = spec.terms;

  // 1) catálogo por índice (mantém id / ativo / barbeiroIds da base)
  const servicos: Servico[] = mock.servicos.map((sv, i) => ({
    ...sv,
    nome: spec.servicos[i].nome,
    categoria: spec.servicos[i].categoria,
    preco: spec.servicos[i].preco,
    duracao: spec.servicos[i].duracao,
  }));

  // 2) remap do campo `servico` (string) por ÍNDICE estável do catálogo base
  const baseNomes = mock.servicos.map((sv) => sv.nome);
  const remap = (nome: string) => {
    const idx = baseNomes.indexOf(nome);
    return idx >= 0 ? servicos[idx].nome : nome; // fallback: mantém original
  };
  const agendaHoje: Agendamento[] = mock.agendaHoje.map((a) => ({ ...a, servico: remap(a.servico) }));
  const agendaFixa: AgFixo[] = mock.agendaFixa.map((a) => ({ ...a, servico: remap(a.servico) }));
  const pagamentos: Pagamento[] = mock.pagamentos.map((p) => ({ ...p, servico: remap(p.servico) }));

  // 3) equipe: só a especialidade muda (nomes de pessoas FICAM)
  const equipe: Barbeiro[] = mock.equipe.map((b, i) => ({ ...b, especialidade: spec.equipeEspecialidades[i] }));

  // 4) shop / assistant
  const shop = { ...mock.shop, nome: t.negocioNome };
  const assistant = { ...mock.assistant, saudacao: t.saudacao };

  // 5) campanhas: nome/tipo por índice (status/enviados/conversao/data FICAM)
  const campanhas: Campanha[] = mock.campanhas.map((c, i) => ({ ...c, nome: spec.campanhas[i].nome, tipo: spec.campanhas[i].tipo }));

  // 6) blocos textuais próprios da profissão
  const faqs: FAQ[] = spec.faqs;                    // ids f1..f5
  const configSecoes: ConfigSecao[] = spec.configSecoes; // personalidade.bot já = t.saudacao
  const mensagensExemplo: ExemploMsg[] = spec.mensagensExemplo;
  const faqsSugeridos: string[] = spec.faqsSugeridos;

  // 7) pass-through agnóstico + conversas (nomes/mensagens de clientes ficam)
  const { conversas, kpis, horarios } = mock;

  // helpers
  const nomeDoProfissional = (id: string) => equipe.find((b) => b.id === id)?.nome || "—";
  const servicosDoProfissional = (bid: string) => servicos.filter((sv) => sv.barbeiroIds.includes(bid));
  const profissionaisDoServico = (sid: string) => {
    const sv = servicos.find((x) => x.id === sid);
    return sv ? equipe.filter((b) => sv.barbeiroIds.includes(b.id)) : [];
  };

  return {
    shop, assistant, equipe, servicos, agendaHoje, agendaFixa, conversas, pagamentos,
    faqs, faqsSugeridos, campanhas, configSecoes, mensagensExemplo, kpis, horarios,
    nomeDoProfissional, servicosDoProfissional, profissionaisDoServico,
  };
}

/* ────────────────────────────── ESTADO / DEFAULTS ────────────────────────────── */
const DEFAULT_FEATURES: Record<FeatureId, boolean> = Object.fromEntries(
  FEATURE_REGISTRY.filter((f) => !f.fixo).map((f) => [f.id, f.defaultOn])
) as Record<FeatureId, boolean>;

const LS_FEATURES = "maisa.features";
const LS_PROFISSAO = "maisa.profissao";

function isProfissao(v: unknown): v is Profissao {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PROFISSAO_LABELS, v);
}

/* ────────────────────────────── CONTEXTO ────────────────────────────── */
export type AdminContextValue = {
  features: Record<FeatureId, boolean>; // superadm NÃO está aqui (é fixo)
  isOn: (id: FeatureId) => boolean;     // isOn("superadm") === true sempre
  toggle: (id: FeatureId) => void;      // no-op para features com fixo
  profissao: Profissao;
  setProfissao: (p: Profissao) => void;
  t: Terms;                             // terms da profissão ativa
  data: ResolvedData;                   // dataset resolvido (espelha mock.ts)
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminConfigProvider({ children }: { children: React.ReactNode }) {
  // 1º render (SSR + hidratação): SEMPRE defaults — nada de localStorage no useState inicial.
  const [profissao, setProfissaoState] = useState<Profissao>("barbearia");
  const [features, setFeatures] = useState<Record<FeatureId, boolean>>(DEFAULT_FEATURES);

  // Ler localStorage pós-mount (evita mismatch de hidratação).
  useEffect(() => {
    try {
      const pf = localStorage.getItem(LS_PROFISSAO);
      if (isProfissao(pf)) setProfissaoState(pf);
      const ff = localStorage.getItem(LS_FEATURES);
      if (ff) {
        const parsed = JSON.parse(ff) as Partial<Record<FeatureId, boolean>>;
        setFeatures((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* localStorage indisponível — segue nos defaults */
    }
  }, []);

  const setProfissao = useCallback((p: Profissao) => {
    setProfissaoState(p);
    try { localStorage.setItem(LS_PROFISSAO, p); } catch { /* noop */ }
  }, []);

  const toggle = useCallback((id: FeatureId) => {
    const def = FEATURE_REGISTRY.find((f) => f.id === id);
    if (def?.fixo) return; // fixo => no-op
    setFeatures((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(LS_FEATURES, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const isOn = useCallback(
    (id: FeatureId) => {
      const def = FEATURE_REGISTRY.find((f) => f.id === id);
      if (def?.fixo) return true;
      return !!features[id];
    },
    [features]
  );

  const t = PROFISSOES[profissao].terms;
  const data = useMemo(() => resolve(profissao), [profissao]);

  const value = useMemo<AdminContextValue>(
    () => ({ features, isOn, toggle, profissao, setProfissao, t, data }),
    [features, isOn, toggle, profissao, setProfissao, t, data]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin() precisa estar dentro de <AdminConfigProvider>.");
  return ctx;
}
