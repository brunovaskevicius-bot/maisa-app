"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * O WIZARD — de conta criada a negócio de pé.
 *
 * Até 15/08/2026 o primeiro login de todo mundo terminava numa frase: o app respondia 409
 * `sem_negocio` e a tela dizia *"Esta conta ainda não tem um negócio. Rode criar_negocio()
 * no Supabase"*. Instrução de desenvolvedor entregue ao cliente final. A rota
 * `POST /api/negocio` existia desde 13/08 e nenhuma tela a chamava.
 *
 * ── POR QUE É ROTA PRÓPRIA E NÃO UM MODAL NO PAINEL ──
 *
 * Porque o `AppShell` precisa de inquilino para montar: o store abre pedindo
 * `GET /api/cadastro`, que devolve 409 para exatamente esta pessoa. Um modal por cima
 * teria como pano de fundo um painel quebrado, com toda tela em estado de erro — e o
 * primeiro minuto de uso é o pior momento possível para o produto parecer avariado.
 *
 * ── POR QUE ELE NÃO USA O `StoreProvider` ──
 *
 * Mesma razão, levada a sério: o store é a máquina do painel (agenda, conversas, notas,
 * Google) e nada disso responde antes de existir negócio. O wizard fala com as rotas
 * direto — são quatro `fetch` — e o painel assume depois, já com inquilino.
 *
 * ── O QUE ELE DELIBERADAMENTE NÃO PERGUNTA ──
 *
 * CNPJ, CPF de cliente, dados fiscais, equipe inteira. `negocios` nem tem coluna de CNPJ:
 * ele é `config_fiscal.prestador_cnpj` e só importa na hora de emitir nota. Perguntar
 * adiantado é a forma mais comum de matar onboarding — e o que não é perguntado aqui vira
 * cartão da jornada no painel, feito quando a pessoa precisar.
 *
 * ⚠️ SÓ A ETAPA 1 É OBRIGATÓRIA, porque é a única que CRIA alguma coisa. Todas as outras
 * têm "Pular" — e pular não é abandono: o passo continua contado em `/api/ativacao`, que
 * lê o mundo em vez de uma flag.
 * ────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { s, Icon, Toggle, toast, Toaster } from "@/ui/primitivos";
import type { CategoriaServico, PassoDeAtivacao, Servico, Vertical } from "@/nucleo/dominio";

/* ───────────────────────────── as etapas ───────────────────────────── */

type EtapaId = "negocio" | "catalogo" | "whatsapp" | "pronto";

const ETAPAS: { id: EtapaId; titulo: string; sub: string }[] = [
  { id: "negocio", titulo: "Seu negócio", sub: "Como ele se chama e o que você faz" },
  { id: "catalogo", titulo: "O que você faz", sub: "Confira preços e quem atende" },
  { id: "whatsapp", titulo: "Conectar o WhatsApp", sub: "Um QR code e a MAISA entra no ar" },
  { id: "pronto", titulo: "Pronto", sub: "Seu painel está esperando" },
];

const VERTICAIS: { id: Vertical; rotulo: string; desc: string; icone: string }[] = [
  { id: "barbeiros", rotulo: "Barbearia ou salão", desc: "Corte, barba, pacotes", icone: "scissors" },
  { id: "terapeutas", rotulo: "Consultório ou clínica", desc: "Sessões, retornos, pacotes", icone: "stethoscope" },
  { id: "generico", rotulo: "Outro tipo", desc: "Começa com um catálogo neutro", icone: "sparkle" },
];

/* De quanto em quanto se pergunta se o QR já foi lido, e por quanto tempo. Os mesmos
 * números do painel (`store.tsx`): 3s × 40 ≈ 2 min, mais que a validade de um QR. */
const INTERVALO_PAREAMENTO = 3000;
const TENTATIVAS_PAREAMENTO = 40;

const CAMPO =
  "width:100%;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);color:var(--ink);outline:none";

/* ───────────────────────────── peças ───────────────────────────── */

function Trilha({ atual }: { atual: EtapaId }) {
  const i = ETAPAS.findIndex((e) => e.id === atual);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {ETAPAS.map((e, j) => (
        <React.Fragment key={e.id}>
          {/* Bolinha com NÚMERO e não só cor: a etapa cumprida vira ✓, a atual mostra o
              número, e a futura fica apagada. Cor sozinha é o sinal mais frágil que existe
              — é a mesma regra que o rail do painel já segue. */}
          <span
            aria-current={j === i ? "step" : undefined}
            style={s(`display:flex;align-items:center;justify-content:center;width:26px;height:26px;flex-shrink:0;border-radius:999px;font-size:var(--t-micro);font-weight:var(--w-title);${
              j < i
                ? "background:var(--success);color:var(--surface)"
                : j === i
                  ? "background:var(--primary);color:var(--on-primary)"
                  : "background:var(--line);color:var(--muted)"
            }`)}
          >
            {j < i ? <Icon name="check" size={14} sw={2.6} stroke="var(--surface)" /> : j + 1}
          </span>
          {j < ETAPAS.length - 1 && (
            <span style={s(`flex:1;height:2px;border-radius:2px;background:${j < i ? "var(--success)" : "var(--line)"}`)} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Botao({
  children, onClick, ocupado, variante = "primary", full,
}: {
  children: React.ReactNode; onClick: () => void; ocupado?: boolean;
  variante?: "primary" | "ghost"; full?: boolean;
}) {
  /* `<button>` cru e não o `Btn` do painel: o `Btn` não tem `disabled`, e um wizard sem
   * botão travado dispara o mesmo POST duas vezes com um duplo clique — que na etapa 1
   * significa DOIS negócios criados. Criar um `disabled` no primitivo mexeria num
   * componente usado por toda a aplicação por causa desta tela. */
  const primaria = variante === "primary";
  return (
    <button
      onClick={ocupado ? undefined : onClick}
      disabled={ocupado}
      className={`${primaria ? "m-hov-primary" : "m-hov-bg"} m-press m-focus`}
      style={s(`display:inline-flex;align-items:center;justify-content:center;gap:9px;height:48px;padding:0 22px;border-radius:12px;font-family:inherit;font-weight:var(--w-title);font-size:var(--t-body);cursor:${ocupado ? "not-allowed" : "pointer"};opacity:${ocupado ? ".55" : "1"};${
        primaria
          ? "border:none;background:var(--primary);color:var(--on-primary)"
          : "border:1px solid var(--border);background:var(--surface);color:var(--muted)"
      };${full ? "width:100%" : ""}`)}
    >
      {ocupado && (
        <span style={{ ...s("width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:currentColor;border-radius:50%"), animation: "mspin .7s linear infinite" }} />
      )}
      {children}
    </button>
  );
}

/* ───────────────────────────── etapa 1 · o negócio ───────────────────────────── */

function EtapaNegocio({ aoCriar }: { aoCriar: () => void }) {
  const [nome, setNome] = useState("");
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const criar = useCallback(async () => {
    if (!vertical) { setErro("Escolha o tipo do seu negócio."); return; }
    setErro(null);
    setOcupado(true);
    try {
      const r = await fetch("/api/negocio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, vertical }),
      }).then((x) => x.json());

      if (!r?.ok) {
        /* A frase do SERVIDOR: "O nome precisa ter pelo menos uma letra ou número" é o
         * que diz o que corrigir. O caso de uso `provisionar.ts` tem uma para cada
         * recusa, inclusive o teto de negócios por conta. */
        setErro(r?.info ?? "Não foi possível criar seu negócio.");
        setOcupado(false);
        return;
      }
      aoCriar();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
      setOcupado(false);
    }
  }, [nome, vertical, aoCriar]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>
          Nome do negócio
        </span>
        <input
          autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder="Barbearia do Zé" className="m-focus" style={s(CAMPO)}
          onKeyDown={(e) => { if (e.key === "Enter" && nome.trim() && vertical) void criar(); }}
        />
        {/* Diz a CONSEQUÊNCIA, não a regra. Este campo entra no prompt do agente a cada
            mensagem e no texto de todo lembrete — foi assim que um negócio de teste passou
            três dias se apresentando como "bruno.vaskevicius" no WhatsApp dos clientes. */}
        <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.45")}>
          É como a MAISA vai se apresentar: “Aqui é a MAISA, assistente do {nome.trim() || "…"}”.
        </span>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>
          Que tipo de negócio é?
        </span>
        <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.45;margin-bottom:2px")}>
          Serve para já deixar seus serviços e horários preenchidos — dá para mudar tudo depois.
        </span>
        {VERTICAIS.map((v) => {
          const on = vertical === v.id;
          return (
            <button
              key={v.id} onClick={() => { setVertical(v.id); setErro(null); }}
              className="m-press m-focus"
              style={s(`display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;border:1.5px solid ${on ? "var(--primary)" : "var(--border)"};background:${on ? "var(--primary-soft)" : "var(--surface)"}`)}
            >
              <Icon name={v.icone} size={22} sw={1.9} stroke={on ? "var(--primary-dark)" : "var(--muted)"} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={s("display:block;font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>{v.rotulo}</span>
                <span style={s("display:block;font-size:var(--t-label);color:var(--muted);margin-top:2px")}>{v.desc}</span>
              </span>
              {on && <Icon name="check" size={18} sw={2.4} stroke="var(--primary-dark)" />}
            </button>
          );
        })}
      </div>

      {erro && (
        <div style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--danger);background:var(--danger-soft);padding:11px 13px;border-radius:10px;line-height:1.45")}>
          {erro}
        </div>
      )}

      <Botao onClick={() => void criar()} ocupado={ocupado} full>
        Criar meu negócio
      </Botao>
    </div>
  );
}

/* ───────────────────────────── etapa 2 · o catálogo ───────────────────────────── */

const CATEGORIAS: CategoriaServico[] = ["Recorrente", "Pacote", "Extra"];

function LinhaServico({ sv, aoMudar }: { sv: Servico; aoMudar: (p: Partial<Servico>) => void }) {
  return (
    <div style={s(`display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);opacity:${sv.ativo ? "1" : ".6"}`)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          value={sv.nome} onChange={(e) => aoMudar({ nome: e.target.value })}
          className="m-focus"
          style={s("flex:1;min-width:0;height:38px;padding:0 11px;border-radius:10px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink);outline:none")}
        />
        <Toggle on={sv.ativo} onChange={(v) => aoMudar({ ativo: v })} rotulo={`${sv.nome} ativo`} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={s("font-size:var(--t-micro);color:var(--muted);font-weight:var(--w-title)")}>Preço (R$)</span>
          {/* `type="text"` e `inputMode="decimal"`: o `type="number"` do Chrome recusa a
              vírgula no teclado brasileiro, e o caso de uso já aceita "59,90". */}
          <input
            type="text" inputMode="decimal" value={String(sv.preco)}
            onChange={(e) => aoMudar({ preco: e.target.value as unknown as number })}
            className="m-focus n"
            style={s("width:100%;height:38px;padding:0 11px;border-radius:10px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);color:var(--ink);outline:none")}
          />
        </label>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={s("font-size:var(--t-micro);color:var(--muted);font-weight:var(--w-title)")}>Duração (min)</span>
          <input
            type="text" inputMode="numeric" value={String(sv.duracao)}
            onChange={(e) => aoMudar({ duracao: e.target.value as unknown as number })}
            className="m-focus n"
            style={s("width:100%;height:38px;padding:0 11px;border-radius:10px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);color:var(--ink);outline:none")}
          />
        </label>
        <label style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={s("font-size:var(--t-micro);color:var(--muted);font-weight:var(--w-title)")}>Tipo</span>
          <select
            value={sv.categoria} onChange={(e) => aoMudar({ categoria: e.target.value as CategoriaServico })}
            className="m-focus"
            style={s("width:100%;height:38px;padding:0 8px;border-radius:10px;border:1px solid var(--border-field);background:var(--surface);font-family:inherit;font-size:var(--t-sm);color:var(--ink);outline:none")}
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function EtapaCatalogo({ aoSeguir }: { aoSeguir: () => void }) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissional, setProfissional] = useState<{ id: string; nome: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/cadastro")
      .then((r) => r.json())
      .then((r) => {
        if (!vivo) return;
        if (r?.ok) {
          setServicos(r.servicos ?? []);
          const p = (r.profissionais ?? [])[0];
          if (p) setProfissional({ id: p.id, nome: p.nome });
        }
      })
      .catch(() => {})
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, []);

  const mudar = useCallback((id: string, p: Partial<Servico>) => {
    setServicos((atual) => atual.map((sv) => (sv.id === id ? { ...sv, ...p } : sv)));
  }, []);

  /**
   * Grava tudo de uma vez, no botão.
   *
   * ⚠️ SEM DEBOUNCE POR TECLA, ao contrário da tela de Serviços do painel. Aqui o dono
   * está revisando cinco linhas de uma vez, e um PUT por tecla mandaria dezenas de
   * pedidos — cada um com chance própria de recusar um estado INTERMEDIÁRIO ("R$ 6"
   * enquanto se digita "R$ 60"). Um botão explícito é o certo quando a edição é em lote.
   *
   * Sequencial e não `Promise.all`: se a terceira linha for recusada, as duas primeiras
   * já estão salvas e a frase aponta a que falhou. Em paralelo, o dono veria um erro sem
   * saber de qual linha ele é.
   */
  const salvar = useCallback(async () => {
    setOcupado(true);
    setErro(null);
    try {
      for (const sv of servicos) {
        const r = await fetch("/api/servicos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sv.id, nome: sv.nome, categoria: sv.categoria,
            preco: sv.preco, duracao: sv.duracao, ativo: sv.ativo,
          }),
        }).then((x) => x.json());

        if (!r?.ok) {
          setErro(`“${sv.nome}”: ${r?.info ?? "não foi possível salvar."}`);
          setOcupado(false);
          return;
        }
      }

      if (profissional && profissional.nome.trim()) {
        const r = await fetch("/api/equipe", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: profissional.id, nome: profissional.nome }),
        }).then((x) => x.json());
        if (!r?.ok) { setErro(r?.info ?? "Não foi possível salvar quem atende."); setOcupado(false); return; }
      }

      aoSeguir();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
      setOcupado(false);
    }
  }, [servicos, profissional, aoSeguir]);

  if (carregando) {
    return <div style={s("padding:40px 0;text-align:center;color:var(--muted);font-size:var(--t-sm)")}>Carregando seu catálogo…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={s("font-size:var(--t-sm);color:var(--muted);line-height:1.5;margin:0")}>
        Já deixamos preenchido com o comum do seu ramo. <strong style={s("color:var(--ink);font-weight:var(--w-title)")}>Ajuste os preços</strong> e
        desligue o que você não faz — é isso que a MAISA vai oferecer aos seus clientes.
      </p>

      {profissional && (
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--ink)")}>Quem atende</span>
          <input
            value={profissional.nome}
            onChange={(e) => setProfissional({ ...profissional, nome: e.target.value })}
            className="m-focus" style={s(CAMPO)}
          />
          {/* Este campo quase sempre chega errado, e o motivo está em `005_provisionar.sql`:
              sem nome no cadastro do usuário, a RPC usa o que vem antes do @ do e-mail. */}
          <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.45")}>
            Adivinhamos pelo seu e-mail. A MAISA fala esse nome ao confirmar um horário.
          </span>
        </label>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {servicos.map((sv) => (
          <LinhaServico key={sv.id} sv={sv} aoMudar={(p) => mudar(sv.id, p)} />
        ))}
      </div>

      {erro && (
        <div style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--danger);background:var(--danger-soft);padding:11px 13px;border-radius:10px;line-height:1.45")}>
          {erro}
        </div>
      )}

      <Botao onClick={() => void salvar()} ocupado={ocupado} full>
        Salvar e continuar
      </Botao>
    </div>
  );
}

/* ───────────────────────────── etapa 3 · o WhatsApp ───────────────────────────── */

function EtapaWhatsApp({ aoSeguir }: { aoSeguir: () => void }) {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [status, setStatus] = useState<"parado" | "gerando" | "pareando" | "conectado">("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tentativas = useRef(0);

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  /* ⚠️ O `clearInterval` no desmonte não é higiene, é conserto de vazamento: sem ele, sair
   * do wizard com o QR na tela deixa um GET de 3 em 3 segundos rodando para sempre. */
  useEffect(() => parar, [parar]);

  const conectar = useCallback(async () => {
    setErro(null);
    setStatus("gerando");
    try {
      const r = await fetch("/api/canal", { method: "POST" }).then((x) => x.json());
      if (!r?.ok) {
        const falta = r?.faltando?.length ? ` Falta: ${r.faltando.join(", ")}.` : "";
        setErro((r?.info ?? "Não foi possível gerar o QR code.") + falta);
        setStatus("parado");
        return;
      }
      setQrcode(r.pareamento?.qrcode ?? null);
      if (r.pareamento?.status === "conectado") { setStatus("conectado"); return; }
      setStatus("pareando");

      tentativas.current = 0;
      parar();
      timer.current = setInterval(async () => {
        tentativas.current += 1;
        if (tentativas.current > TENTATIVAS_PAREAMENTO) {
          parar();
          setStatus("parado");
          setQrcode(null);
          setErro("O QR code venceu. Gere outro para tentar de novo.");
          return;
        }
        try {
          const c = await fetch("/api/canal").then((x) => x.json());
          if (c?.ok && c.canal?.status === "conectado") {
            parar();
            setNumero(c.canal.numero ?? null);
            setQrcode(null);
            setStatus("conectado");
          }
        } catch { /* uma falha de rede no meio do polling não cancela o pareamento */ }
      }, INTERVALO_PAREAMENTO);
    } catch {
      setErro("Sem conexão com o servidor.");
      setStatus("parado");
    }
  }, [parar]);

  if (status === "conectado") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
        <div style={s("display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:var(--success-soft)")}>
          <Icon name="check" size={28} sw={2.4} stroke="var(--success)" />
        </div>
        <div>
          <p style={s("font-size:var(--t-body);font-weight:var(--w-title);color:var(--ink);margin:0")}>WhatsApp conectado</p>
          {numero && <p style={s("font-size:var(--t-sm);color:var(--muted);margin:4px 0 0")}>+{numero}</p>}
        </div>
        <Botao onClick={aoSeguir} full>Continuar</Botao>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={s("font-size:var(--t-sm);color:var(--muted);line-height:1.5;margin:0")}>
        Use o WhatsApp <strong style={s("color:var(--ink);font-weight:var(--w-title)")}>do negócio</strong> — é
        o número que seus clientes já conhecem. A MAISA responde por ele; você continua vendo tudo.
      </p>

      {qrcode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URI vinda da Evolution */}
          <img
            src={qrcode} alt="QR code para conectar o WhatsApp"
            style={s("width:232px;height:232px;border-radius:14px;border:1px solid var(--border);background:var(--surface);padding:8px")}
          />
          <ol style={s("margin:0;padding-left:18px;font-size:var(--t-sm);color:var(--muted);line-height:1.7")}>
            <li>Abra o WhatsApp no celular do negócio</li>
            <li>Toque em <strong style={s("color:var(--ink)")}>Aparelhos conectados</strong></li>
            <li>Toque em <strong style={s("color:var(--ink)")}>Conectar aparelho</strong> e aponte para o código</li>
          </ol>
          <span style={s("font-size:var(--t-label);color:var(--muted)")}>Esperando você ler o código…</span>
        </div>
      ) : (
        <Botao onClick={() => void conectar()} ocupado={status === "gerando"} full>
          <Icon name="whatsapp" size={19} sw={2} stroke="var(--on-primary)" />
          Gerar QR code
        </Botao>
      )}

      {erro && (
        <div style={s("font-size:var(--t-sm);font-weight:var(--w-title);color:var(--danger);background:var(--danger-soft);padding:11px 13px;border-radius:10px;line-height:1.45")}>
          {erro}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── etapa 4 · pronto ───────────────────────────── */

function EtapaPronto({ feitos }: { feitos: PassoDeAtivacao[] }) {
  const router = useRouter();
  const conectado = feitos.includes("whatsapp_conectado");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
      <div style={s("display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:999px;background:var(--primary-soft)")}>
        <Icon name="sparkle" size={30} sw={2} stroke="var(--primary-dark)" />
      </div>
      <div>
        <p style={s("font-size:var(--t-title);font-weight:var(--w-title);color:var(--ink);margin:0")}>
          Seu negócio está de pé
        </p>
        <p style={s("font-size:var(--t-sm);color:var(--muted);margin:8px 0 0;line-height:1.55")}>
          {conectado
            ? "A MAISA já responde no seu WhatsApp. O que faltar aparece no painel, como tarefa — nada trava."
            : "Falta conectar o WhatsApp para a MAISA atender. Dá para fazer no painel, quando quiser."}
        </p>
      </div>
      <Botao onClick={() => { router.push("/"); router.refresh(); }} full>
        Abrir meu painel
      </Botao>
    </div>
  );
}

/* ───────────────────────────── o wizard ───────────────────────────── */

export default function Comecar() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<EtapaId | null>(null);
  const [feitos, setFeitos] = useState<PassoDeAtivacao[]>([]);

  /**
   * Onde retomar — perguntado ao MUNDO, não a uma flag.
   *
   * 409 `sem_negocio` significa etapa 1. Qualquer outra resposta significa que o inquilino
   * existe, e aí o passo cumprido decide: quem já conectou o WhatsApp não vê a tela do QR
   * de novo. É o mesmo princípio de `dominio/ativacao.ts` — quem fez a coisa por outro
   * caminho não é obrigado a repetir.
   */
  useEffect(() => {
    let vivo = true;
    fetch("/api/ativacao")
      .then(async (r) => ({ status: r.status, corpo: await r.json().catch(() => null) }))
      .then(({ status, corpo }) => {
        if (!vivo) return;
        if (status === 409) { setEtapa("negocio"); return; }
        if (status === 401) { router.push("/login?next=%2Fcomecar"); return; }
        const f: PassoDeAtivacao[] = corpo?.feitos ?? [];
        setFeitos(f);
        setEtapa(f.includes("whatsapp_conectado") ? "pronto" : f.includes("catalogo_ajustado") ? "whatsapp" : "catalogo");
      })
      .catch(() => vivo && setEtapa("negocio"));
    return () => { vivo = false; };
  }, [router]);

  const avancar = useCallback((proxima: EtapaId) => {
    setEtapa(proxima);
    /* Rerreleitura do progresso a cada avanço: é ela que faz a etapa "Pronto" saber se o
     * WhatsApp ficou conectado, sem que o wizard precise carregar esse estado na mão. */
    fetch("/api/ativacao")
      .then((r) => r.json())
      .then((r) => { if (r?.feitos) setFeitos(r.feitos); })
      .catch(() => {});
  }, []);

  if (etapa === null) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  const meta = ETAPAS.find((e) => e.id === etapa)!;
  const podePular = etapa === "catalogo" || etapa === "whatsapp";

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px 48px", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(60% 55% at 25% 12%, var(--primary-soft) 0%, transparent 60%), radial-gradient(55% 55% at 88% 92%, var(--warm-soft) 0%, transparent 58%)" }} />
      <Toaster />

      <div className="m-enter" style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={s("display:inline-flex;align-items:center;justify-content:center;padding:10px 20px;background:var(--nav);border:1px solid var(--nav-line);border-radius:16px")}>
            <span style={{ ...s("font-size:var(--t-body);font-weight:var(--w-title);color:var(--warm);line-height:1"), textShadow: "0 1.5px 0 var(--warm-line)" }}>maisa</span>
          </div>
          <div style={{ width: "100%", maxWidth: 320 }}><Trilha atual={etapa} /></div>
          <div style={{ textAlign: "center" }}>
            <h1 style={s("font-size:var(--t-title);font-weight:var(--w-title);color:var(--ink);margin:0")}>{meta.titulo}</h1>
            <p style={s("font-size:var(--t-sm);color:var(--muted);margin:4px 0 0")}>{meta.sub}</p>
          </div>
        </div>

        <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);padding:24px 22px")}>
          {etapa === "negocio" && <EtapaNegocio aoCriar={() => avancar("catalogo")} />}
          {etapa === "catalogo" && <EtapaCatalogo aoSeguir={() => avancar("whatsapp")} />}
          {etapa === "whatsapp" && <EtapaWhatsApp aoSeguir={() => avancar("pronto")} />}
          {etapa === "pronto" && <EtapaPronto feitos={feitos} />}
        </div>

        {/* ⚠️ "Pular" NÃO aparece na etapa 1, e é a única assimetria da tela: as outras três
            configuram, esta CRIA. Sem inquilino não há o que pular para — o painel
            responde 409 em toda rota. */}
        {podePular && (
          <button
            onClick={() => { toast("Você pode fazer isso depois, pelo painel"); avancar(etapa === "catalogo" ? "whatsapp" : "pronto"); }}
            className="m-focus"
            style={s("align-self:center;background:none;border:none;font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);color:var(--muted);cursor:pointer;padding:8px 12px")}
          >
            Pular por agora
          </button>
        )}
      </div>
    </div>
  );
}
