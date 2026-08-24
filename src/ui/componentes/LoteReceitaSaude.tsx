"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * O LOTE DO RECEITA SAÚDE — o arquivo do mês, para quem atende como pessoa física.
 *
 * ★ ESTA TELA NÃO TEM BOTÃO "EMITIR", E A AUSÊNCIA É O PRODUTO.
 *
 * Quem atende como PF emite o Recibo Eletrônico de Serviços de Saúde dentro do e-CAC, com o
 * gov.br dela. Não existe API. A MAISA monta o CSV e tira a digitação dupla — 40 sessões que
 * ela redigitaria no site da Receita. Um botão "emitir" prometeria, num verbo, o que o
 * produto não faz.
 *
 * O fluxo é de três passos, e a tela mostra os três: gerar aqui → importar no e-CAC → voltar
 * e dizer o que aconteceu ("importei" fecha o mês; "desisti" devolve as sessões).
 *
 * ── ★ A LISTA VEM ANTES DO BOTÃO, E FOI ISSO QUE O LANÇAMENTO AVULSO OBRIGOU ──
 *
 * "Nem tudo vai estar registrado automaticamente, a MAISA cobre a maioria dos casos, mas não
 * todos" (Bruno, 21/08/2026). Com pagamento digitado à mão, um formulário sem lista seria um
 * campo que engole o dado: clica em lançar, nada muda, e no recarregar da página ninguém sabe
 * se salvou. Então a tela mostra **o que vai no arquivo** — de onde veio cada linha, quem está
 * sem CPF, e quanto isso soma — antes de existir arquivo nenhum.
 *
 * ── ⚠️ OS AVISOS VÊM ANTES DO DOWNLOAD ──
 *
 * Um arquivo com 8 de 12 sessões e nenhum aviso faz o dono assinar achando que fechou o mês.
 * Por isso a rota devolve JSON com `avisos` e o download é montado aqui, e não um `text/csv`
 * que engoliria a única informação que evita isso.
 * ────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useState } from "react";
import { s, Btn, Card, Icon, SectionTitle, StatTile } from "@/ui/primitivos";
import { useStore } from "@/ui/estado/store";
import { cpfValido } from "@/nucleo/dominio/clientes";
import {
  LINK_ECAC, checklistDoRecibo, faltaNoChecklist, seAindaRecusar,
  type ItemDoChecklist,
} from "@/nucleo/dominio/checklist-recibo";
import { hojeISO } from "@/nucleo/dominio/tempo";
import type { ConfigFiscal } from "@/nucleo/dominio/fiscal";
import { mensagemDaFalha } from "@/ui/falhas";
import type { PagamentoPendente, RecibosPendentes } from "@/nucleo/portas/entrada/casos-de-uso";

/**
 * O caminho no e-CAC, em link.
 *
 * ⚠️ ESTE COMENTÁRIO JÁ DEFENDEU UM DEEP LINK PARA `/carneleao/escrituracao`, POR ALGUMAS HORAS
 * EM 24/08/2026. O deep link saiu quando alguém finalmente mediu: ele responde 302 para
 * `/autenticacao/login` **sem parâmetro de retorno**, exatamente como `/ecac/`. Deslogada, ela
 * cai no mesmo login pelos dois caminhos e chega na home logada de qualquer jeito.
 *
 * Ou seja, o atalho não encurtava nada — e ainda deu um jeito novo de a viagem terminar torta.
 * Ver `LINK_ECAC`, que guarda a medição inteira.
 */
const CARNE_LEAO = LINK_ECAC;

/**
 * Uma linha do "pronto para emitir?".
 *
 * ⚠️ TRÊS ESTADOS, TRÊS DESENHOS, e o terceiro NÃO é cinza de "desligado": é o item que está
 * do outro lado do muro. Pintá-lo de verde ou de vermelho seria afirmar algo que a gente não
 * sabe — e ela sairia da tela achando que está tudo certo, para descobrir no e-CAC, sozinha.
 * Então ele vira instrução, com seta em vez de selo.
 */
function ItemChecklist({ item }: { item: ItemDoChecklist }) {
  const cor =
    item.estado === "pronto" ? "var(--ok, var(--brand))"
    : item.estado === "falta" ? "var(--warn)"
    : "var(--muted)";
  const icone =
    item.estado === "pronto" ? "check"
    : item.estado === "falta" ? "alert"
    : "link";

  return (
    <div style={s("display:flex;gap:10px;align-items:flex-start;padding:9px 14px")}>
      <span style={s(`color:${cor};margin-top:2px;flex-shrink:0`)}>
        <Icon name={icone} size={16} sw={2.3} />
      </span>
      <div style={s("display:grid;gap:5px;min-width:0;flex:1")}>
        <strong style={s("font-size:var(--t-sm);color:var(--ink)")}>{item.titulo}</strong>
        {/* O `**negrito**` do domínio vira <strong> aqui: a frase é escrita por quem conhece a
            regra, e a ênfase faz parte dela. Renderizar como texto cru perderia o que importa. */}
        <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.55")}>
          {negritar(item.detalhe)}
        </span>

        {item.passos && (
          <ol style={s("margin:2px 0 0;padding-left:17px;display:grid;gap:4px;font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
            {item.passos.map((passo) => <li key={passo}>{passo}</li>)}
          </ol>
        )}

        {item.link && (
          <div style={s("display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:3px")}>
            <a
              href={item.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="m-press m-focus"
              style={s("display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-size:var(--t-label);font-weight:var(--w-title);text-decoration:none")}
            >
              <Icon name="link" size={13} sw={2.2} />
              {item.link.rotulo}
            </a>
            {/* ⚠️ A REDE DE SEGURANÇA DO DEEP LINK. Se ela não estiver logada, o e-CAC devolve
                para o login e pode não voltar — sem esta saída, "não abriu" vira "não
                funciona". Discreto de propósito: só quem precisou é que procura. */}
            {item.linkAlternativo && (
              <a
                href={item.linkAlternativo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="m-focus"
                style={s("font-size:var(--t-label);color:var(--muted);text-decoration:underline")}
              >
                {item.linkAlternativo.rotulo}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** `**assim**` → <strong>. Um `split` basta: a ênfase é o único markup que as frases usam. */
function negritar(texto: string): React.ReactNode[] {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
    i % 2 === 1 ? <strong key={i} style={s("color:var(--ink)")}>{parte}</strong> : <span key={i}>{parte}</span>,
  );
}

type Lote = {
  loteId: string;
  competencia: string;
  csv: string;
  arquivo: string;
  linhas: number;
  valor: number;
  avisos: string[];
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const diaMes = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Só dígitos com a pontuação de CPF, para o campo não parecer senha. */
const mascaraCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

const CAMPO = "font-family:inherit;font-size:var(--t-sm);padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg);color:var(--ink);width:100%";

export function LoteReceitaSaude() {
  /**
   * A lista de clientes sai do store, e não de uma rota nova.
   *
   * ★ POR QUE ESCOLHER CLIENTE É O CAMINHO PRINCIPAL DO FORMULÁRIO, e não um atalho: quem
   * pagou fora da agenda quase sempre JÁ É cadastro — a sessão que não entrou é que é a
   * exceção, não a pessoa. Fazer o dono redigitar nome e CPF de alguém que a MAISA já conhece
   * é pedir para ele errar um dígito num documento fiscal.
   *
   * ⚠️ Nome e CPF continuam sendo GRAVADOS no lançamento, mesmo com cliente escolhido, e a
   * view lê `coalesce(cadastro, digitado)`. Ou seja: o cadastro manda, e o digitado é a
   * lembrança de quem era a pessoa no dia — que é o que sobra se o cliente for apagado depois.
   */
  const st = useStore();
  const clientes = st.cadastro.clientes;
  /* `null` = ainda não sabemos o caminho; `false` = não é este negócio. Os dois somem da tela,
   * e piscar o cartão antes de saber seria oferecer recibo a um barbeiro MEI. */
  const [ehRecibo, setEhRecibo] = useState<boolean | null>(null);
  const [falta, setFalta] = useState<string[]>([]);
  const [cpfEmissor, setCpfEmissor] = useState<string | null>(null);
  /* A config inteira, para o checklist. Já vinha na mesma resposta — só era descartada. */
  const [config, setConfig] = useState<ConfigFiscal | null>(null);
  const [checklistAberto, setChecklistAberto] = useState(false);
  const [pendentes, setPendentes] = useState<RecibosPendentes | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  /* Marcada por padrão: avisar é o que quase todo mundo quer, e é o valor do produto. Quem não
   * quer desmarca — a caixa fica ao lado do botão justamente para isso ser um clique. */
  const [avisar, setAvisar] = useState(true);
  const [placar, setPlacar] = useState<{ avisados: number; semTelefone: number; falhas: number } | null>(null);

  /* o formulário do avulso */
  const [abrindo, setAbrindo] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState(hojeSP);
  const [valor, setValor] = useState("");
  const [cpfPagador, setCpfPagador] = useState("");
  const [clienteId, setClienteId] = useState("");

  const lerPendentes = useCallback(async () => {
    try {
      const r = await fetch("/api/recibos", { cache: "no-store" }).then((x) => x.json());
      if (r?.ok) setPendentes(r as RecibosPendentes);
    } catch {
      /* Silêncio: a lista é informação, e o botão de gerar continua funcionando sem ela. */
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/fiscal", { cache: "no-store" }).then((x) => x.json());
        if (!vivo) return;
        const recibo = r?.caminho === "recibo_saude";
        setEhRecibo(recibo);
        setFalta(Array.isArray(r?.falta) ? r.falta : []);
        setCpfEmissor(typeof r?.config?.prestadorCpf === "string" ? r.config.prestadorCpf : null);
        setConfig(r?.config ?? null);
        if (recibo) void lerPendentes();
      } catch {
        if (vivo) setEhRecibo(false);
      }
    })();
    return () => { vivo = false; };
  }, [lerPendentes]);

  const gerar = useCallback(async () => {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch("/api/recibos/lote", { method: "POST" }).then((x) => x.json());
      if (!r?.ok) throw new Error(mensagemDaFalha(r, "Não consegui gerar o arquivo."));
      setLote(r as Lote);
      baixar(r as Lote);
      void lerPendentes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui gerar o arquivo.");
    } finally {
      setOcupado(false);
    }
  }, [lerPendentes]);

  /* O download é montado no navegador: o CSV nunca fica em disco nosso, e o nome carrega CPF
   * e competência — importar o mês errado duas vezes é o erro mais fácil de cometer.
   * O `﻿` é o BOM: sem ele, nome com acento chega torto em quem abre no Windows. */
  const baixar = (l: Lote) => {
    const blob = new Blob(["﻿" + l.csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = l.arquivo;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fechar = useCallback(async (situacao: "importado" | "descartado") => {
    if (!lote) return;
    setOcupado(true);
    try {
      const r = await fetch("/api/recibos/lote", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        /* ⚠️ `avisar` SÓ NO `importado`. Descartar é desistir do arquivo: não existe recibo,
         * então não existe notícia para dar. O caso de uso também barra isso — a tela não é a
         * única guarda, e nenhuma das duas deveria ser. */
        body: JSON.stringify({
          loteId: lote.loteId,
          situacao,
          avisar: situacao === "importado" && avisar,
        }),
      });
      const j = await r.json().catch(() => null);
      setLote(null);
      /* O placar do disparo sobrevive ao lote sumir da tela: é a única confirmação de que as
       * mensagens saíram, e ela precisa ficar legível depois do clique. */
      if (situacao === "importado" && avisar) {
        setPlacar({
          avisados: Number(j?.avisados ?? 0),
          semTelefone: Number(j?.semTelefone ?? 0),
          falhas: Number(j?.falhas ?? 0),
        });
      }
      void lerPendentes();
    } finally {
      setOcupado(false);
    }
  }, [lote, avisar, lerPendentes]);

  /**
   * Escolher um cliente preenche nome e CPF — e deixa os dois EDITÁVEIS.
   *
   * ⚠️ Travar os campos seria pior no caso que mais acontece: cliente cadastrado **sem CPF**.
   * Aí o dono precisa digitar o CPF ali mesmo, no meio do lançamento, em vez de abandonar o
   * fluxo, ir na tela de Clientes e voltar. O que ele digita fica no lançamento; o cadastro
   * continua sem CPF (e é a tela de Clientes que conserta isso de verdade).
   */
  const escolherCliente = (id: string) => {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setNome(c.nome);
    setCpf(mascaraCpf(c.cpf ?? ""));
  };

  const limparForm = () => {
    setNome(""); setCpf(""); setValor(""); setCpfPagador("");
    setClienteId(""); setData(hojeSP());
  };

  const lancar = useCallback(async () => {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch("/api/recibos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, cpf, data, cpfPagador,
          /* Vazio vira `null` na rota: lançamento de quem não é cadastro é caso de primeira
           * classe, não erro de preenchimento. */
          clienteId: clienteId || null,
          /* Vírgula vira ponto AQUI, e não no servidor: quem digita "250,50" está certo, e a
           * rota recusa NaN de propósito em vez de gravar 250. */
          valor: Number(valor.replace(",", ".")),
        }),
      }).then((x) => x.json());
      if (!r?.ok) throw new Error(mensagemDaFalha(r, "Não consegui lançar."));
      limparForm();
      setAbrindo(false);
      void lerPendentes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui lançar.");
    } finally {
      setOcupado(false);
    }
  }, [nome, cpf, data, valor, cpfPagador, clienteId, lerPendentes]);

  const excluir = useCallback(async (id: string) => {
    setOcupado(true);
    try {
      await fetch(`/api/recibos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      void lerPendentes();
    } finally {
      setOcupado(false);
    }
  }, [lerPendentes]);

  /**
   * Trocar o tipo de documento — a saída de quem escolheu errado.
   *
   * ⚠️ RECARREGA A PÁGINA no sucesso, e é escolha, não preguiça. Este cartão e o
   * `LigarNotaFiscal` são componentes independentes, cada um com o seu `fetch` de
   * `/api/fiscal`. Desligar aqui esconderia este sem acordar o outro, e a tela ficaria sem
   * nenhum dos dois. No dia em que o estado fiscal morar no store, isto vira um `setEstado`.
   */
  const trocar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      const r = await fetch("/api/fiscal", { method: "DELETE" }).then((x) => x.json());
      if (!r?.ok) throw new Error(mensagemDaFalha(r, "Não consegui trocar agora."));
      window.location.reload();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui trocar agora.");
      setOcupado(false);
    }
  };

  if (!ehRecibo) return null;

  /* ── ⚠️ A VALIDAÇÃO DO CPF ACONTECE AQUI, E NÃO SÓ NO SERVIDOR ──
   *
   * O caso de uso recusa CPF que não fecha no módulo 11 (a Receita recusa, ver `cpfValido`).
   * Só que a recusa chegava como uma frase no PÉ do cartão, longe do campo e longe do botão —
   * e o efeito era o pior possível: "cliquei em lançar e não lançou".
   *
   * Pior ainda no caminho principal: escolher um cliente **sem CPF cadastrado** (que é o caso
   * do primeiro cliente de qualquer negócio) preenchia o nome e deixava o CPF vazio. O botão
   * continuava clicável, o POST ia, e a resposta morria embaixo da dobra.
   *
   * Agora o botão diz a verdade antes de ser clicado, e o motivo fica embaixo do campo.
   */
  const digitosCpf = cpf.replace(/\D/g, "");
  const digitosPagador = cpfPagador.replace(/\D/g, "");
  const cpfOk = cpfValido(digitosCpf);
  const pagadorOk = !digitosPagador || cpfValido(digitosPagador);
  const valorNum = Number(valor.replace(",", "."));
  const podeLancar = nome.trim().length > 1 && cpfOk && pagadorOk && valorNum > 0;

  /** O que falta, na ordem em que se resolve. Vazio = pode lançar. */
  const faltaNoForm = !nome.trim()
    ? "o nome de quem foi atendido"
    : !digitosCpf
      ? "o CPF de quem foi atendido"
      : !cpfOk
        ? "um CPF válido — esse não fecha, confira os dígitos"
        : !pagadorOk
          ? "um CPF válido de quem pagou"
          : !(valorNum > 0)
            ? "o valor recebido"
            : "";

  /* Calculado na hora: é função pura sobre a config que já está em memória. Não vale uma rota
   * nem um estado — e um `useMemo` aqui só esconderia que a conta é de três `if`. */
  const checklist = config ? checklistDoRecibo(config, hojeISO()) : [];
  const pendencias = faltaNoChecklist(checklist);

  return (
    <Card style={{ display: "grid", gap: 14 }}>
      <SectionTitle
        title="Recibos do mês — Receita Saúde"
        sub="A MAISA monta o arquivo. Quem emite e assina é você, no e-CAC."
      />

      {/* ── ★ O "PRONTO PARA EMITIR?" ──
          Existe porque o e-CAC recusa DEPOIS da viagem, em vocabulário de Receita. Os dois
          erros mais comuns ("Ocupação não cadastrada", "Registro profissional não informado
          pelo conselho") nascem do cadastro dela no Carnê-Leão — que a gente não alcança e não
          pode fingir que checou. Ver `checklistDoRecibo`. */}
      {checklist.length > 0 && (
        <div style={s("display:grid;gap:0;border:1px solid var(--border);border-radius:12px;overflow:hidden")}>
          <button
            type="button"
            onClick={() => setChecklistAberto((v) => !v)}
            className="m-press m-focus"
            style={s("display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:0;background:var(--bg);color:var(--ink);cursor:pointer;text-align:left;font-size:var(--t-sm);font-weight:var(--w-title)")}
          >
            <Icon name={pendencias > 0 ? "alert" : "check"} size={17} sw={2.3} />
            <span style={s("flex:1")}>
              Pronto para emitir?
              {pendencias > 0 && (
                <span style={s("color:var(--warn);font-weight:var(--w-body)")}>
                  {" "}· {pendencias} {pendencias === 1 ? "item" : "itens"} para você preencher
                </span>
              )}
            </span>
            {/* `arrow-right` rotacionado: não existe `up`/`down` no conjunto de ícones,
                e inventar um SVG solto aqui furaria o design system por uma seta. */}
            <span style={s(`display:inline-flex;transition:transform .15s;transform:rotate(${checklistAberto ? 90 : 0}deg)`)}>
              <Icon name="arrow-right" size={15} />
            </span>
          </button>

          {checklistAberto && (
            <div style={s("display:grid;gap:2px;padding:4px 0 10px;border-top:1px solid var(--border)")}>
              {checklist.map((i) => <ItemChecklist key={i.id} item={i} />)}

              {/* A escada do "e se recusar mesmo com tudo certo?". O último degrau é um e-mail
                  da Receita que quase ninguém sabe que existe — sem ele, a profissional com
                  registro ativo e recusa persistente conclui que o produto está quebrado. */}
              <details style={s("margin:6px 14px 0;font-size:var(--t-label);color:var(--muted)")}>
                <summary style={s("cursor:pointer;font-weight:var(--w-title);color:var(--ink)")}>
                  E se o e-CAC recusar mesmo com tudo certo?
                </summary>
                <ol style={s("margin:8px 0 0;padding-left:18px;display:grid;gap:6px;line-height:1.55")}>
                  {seAindaRecusar(config?.ocupacaoSaude ?? null).map((passo) => (
                    <li key={passo}>{passo}</li>
                  ))}
                </ol>
              </details>
            </div>
          )}
        </div>
      )}

      {falta.length > 0 ? (
        <div style={s("display:flex;gap:10px;align-items:flex-start;color:var(--warn)")}>
          <Icon name="alert" size={18} />
          <span style={s("font-size:var(--t-sm)")}>Antes de gerar, falta {falta.join(", ")}.</span>
        </div>
      ) : !lote ? (
        <>
          {/* ── o que vai no arquivo ── */}
          {pendentes && pendentes.pagamentos.length > 0 && (
            <div style={s("display:grid;gap:8px")}>
              <div style={s("display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap")}>
                <strong style={s("font-size:var(--t-sm);color:var(--ink)")}>
                  {pendentes.pagamentos.length === 1 ? "1 pagamento" : `${pendentes.pagamentos.length} pagamentos`} sem recibo
                </strong>
                <span style={s("font-size:var(--t-sm);color:var(--muted)")}>{brl(pendentes.total)} vai no arquivo</span>
              </div>

              <div style={s("display:grid;gap:4px")}>
                {pendentes.pagamentos.map((p: PagamentoPendente) => (
                  <div key={p.id} style={s(`display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:10px;background:${p.cpf ? "var(--surface-2, var(--bg))" : "var(--warn-soft)"}`)}>
                    <span style={s("font-size:var(--t-label);color:var(--muted);min-width:38px")}>{diaMes(p.data)}</span>
                    <span style={s("font-size:var(--t-sm);color:var(--ink);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
                      {p.nome}
                      {/* De onde a linha veio. O dono precisa distinguir o que ele digitou do
                          que a agenda trouxe — é a diferença entre conferir e confiar. */}
                      {p.fonte === "avulso" && (
                        <span style={s("margin-left:7px;font-size:var(--t-label);color:var(--muted)")}>· avulso</span>
                      )}
                    </span>
                    {!p.cpf && (
                      <span style={s("font-size:var(--t-label);color:var(--warn)")}>sem CPF</span>
                    )}
                    <span style={s("font-size:var(--t-sm);color:var(--ink)")}>{brl(p.valor)}</span>
                    {p.podeExcluir && (
                      <button
                        onClick={() => excluir(p.id)}
                        disabled={ocupado}
                        title="Apagar este lançamento"
                        className="m-focus"
                        style={s("background:none;border:none;padding:2px;cursor:pointer;display:flex;color:var(--muted)")}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pendentes.semCpf > 0 && (
                <span style={s("font-size:var(--t-label);color:var(--warn)")}>
                  {pendentes.semCpf === 1 ? "1 pagamento fica" : `${pendentes.semCpf} pagamentos ficam`} de fora
                  até ter o CPF de quem foi atendido — a Receita exige.
                </span>
              )}
            </div>
          )}

          {/* ── ★ lançar o que a agenda não pegou ── */}
          {!abrindo ? (
            <Btn variant="ghost" icon="plus" onClick={() => setAbrindo(true)}>
              Lançar um pagamento que não está na agenda
            </Btn>
          ) : (
            <div style={s("display:grid;gap:9px;padding:14px;border-radius:13px;border:1px dashed var(--border)")}>
              <span style={s("font-size:var(--t-label);color:var(--muted)")}>
                Sessão marcada por fora, pacote pago adiantado, paciente que voltou. Entra no
                mesmo arquivo.
              </span>

              {/* O caminho principal: quem pagou quase sempre já é cadastro. A opção em
                  branco continua existindo para quem não é — e não é exceção escondida. */}
              <select
                value={clienteId}
                onChange={(e) => escolherCliente(e.target.value)}
                className="n m-focus"
                style={s(CAMPO)}
              >
                <option value="">Quem foi atendido? Escolha ou digite abaixo</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}{c.cpf ? "" : " — sem CPF"}
                  </option>
                ))}
              </select>

              <input value={nome} onChange={(e) => { setNome(e.target.value); setClienteId(""); }} placeholder="Nome de quem foi atendido" className="n m-focus" style={s(CAMPO)} />
              <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
                <input value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="CPF de quem foi atendido" className="n m-focus" style={s(`${CAMPO};flex:2;min-width:170px`)} />
                <input value={data} onChange={(e) => setData(e.target.value)} type="date" max={hojeSP()} className="n m-focus" style={s(`${CAMPO};flex:1;min-width:130px`)} />
                <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor" className="n m-focus" style={s(`${CAMPO};flex:1;min-width:90px`)} />
              </div>
              {digitosCpf.length === 11 && !cpfOk && (
                <span style={s("font-size:var(--t-label);color:var(--warn)")}>
                  Esse CPF não fecha na conta do dígito verificador — a Receita recusa o arquivo
                  inteiro por causa de uma linha.
                </span>
              )}
              {clienteId && !digitosCpf && (
                <span style={s("font-size:var(--t-label);color:var(--warn)")}>
                  Esse cliente está sem CPF no cadastro. Digite aqui para este recibo — e
                  complete a ficha dele depois, em Clientes.
                </span>
              )}

              {/* Opcional, e o rótulo diz PARA QUE serve: quem paga é quem deduz no IRPF e
                  pede reembolso — mãe que paga a terapia do filho precisa do recibo no CPF
                  dela. Vazio significa "pagou por si". */}
              <input value={cpfPagador} onChange={(e) => setCpfPagador(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="CPF de quem pagou — só se for outra pessoa" className="n m-focus" style={s(CAMPO)} />
              <div style={s("display:flex;gap:9px;align-items:center;flex-wrap:wrap")}>
                {/* `button` cru e não `Btn`: o primitivo não aceita `disabled`, e um botão
                    clicável que sempre falha é o bug que este bloco existe para matar. */}
                <button
                  onClick={lancar}
                  disabled={ocupado || !podeLancar}
                  className="m-press m-focus"
                  style={s(`display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;border:none;background:var(--primary);color:var(--on-primary);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);cursor:${ocupado || !podeLancar ? "default" : "pointer"};opacity:${ocupado || !podeLancar ? 0.5 : 1}`)}
                >
                  <Icon name="check" size={14} sw={2.4} stroke="var(--on-primary)" />
                  {ocupado ? "Lançando…" : "Lançar"}
                </button>
                <button onClick={() => { setAbrindo(false); setErro(null); limparForm(); }} className="m-focus" style={s("background:none;border:none;padding:0;font-family:inherit;font-size:var(--t-label);color:var(--muted);cursor:pointer;text-decoration:underline")}>
                  cancelar
                </button>
                {faltaNoForm && (
                  <span style={s("font-size:var(--t-label);color:var(--muted)")}>falta {faltaNoForm}</span>
                )}
              </div>

              {/* O erro do servidor TAMBÉM aqui, e não só no pé do cartão: é aqui que o olho
                  está depois de clicar em "Lançar". */}
              {erro && (
                <div style={s("display:flex;gap:8px;color:var(--danger);font-size:var(--t-label)")}>
                  <Icon name="alert" size={16} />
                  <span>{erro}</span>
                </div>
              )}
            </div>
          )}

          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            Uma linha por pagamento, com data, valor e o CPF de quem pagou. Você importa em
            <strong> Carnê-Leão → Escrituração → Importar</strong>, e a própria Receita valida o
            arquivo antes de emitir nada.
          </p>
          <Btn icon="download" onClick={gerar} full>
            {ocupado ? "Montando…" : "Gerar arquivo do mês"}
          </Btn>
        </>
      ) : (
        <>
          <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px")}>
            <StatTile label="pagamentos no arquivo" value={lote.linhas} icon="receipt" />
            <StatTile label="valor" value={brl(lote.valor)} icon="card" tone="success" />
          </div>

          {/* ⚠️ Nunca escondido e nunca resumido a um número: é aqui que ela descobre de quem
              falta CPF antes de assinar o mês achando que fechou. */}
          {lote.avisos.length > 0 && (
            <div style={s("display:grid;gap:6px")}>
              {lote.avisos.map((a) => (
                <div key={a} style={s("display:flex;gap:8px;color:var(--warn);font-size:var(--t-label)")}>
                  <Icon name="alert" size={16} />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          <p style={s("margin:0;font-size:var(--t-label);color:var(--muted);line-height:1.55")}>
            <strong>{lote.arquivo}</strong> foi baixado. Importe no e-CAC e volte para dizer o
            que aconteceu — é isso que impede a MAISA de pedir os mesmos recibos no mês que vem.
          </p>

          {/* O passo a passo dentro do link porque é onde ele é lido: quem acabou de baixar o
              arquivo está com a pasta de Downloads aberta, não com o manual da Receita. */}
          <a
            href={CARNE_LEAO}
            target="_blank"
            rel="noopener noreferrer"
            className="m-press m-focus"
            style={s("display:flex;align-items:center;gap:8px;align-self:flex-start;padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-size:var(--t-sm);font-weight:var(--w-title);text-decoration:none")}
          >
            <Icon name="link" size={15} sw={2.2} />
            Abrir o e-CAC
          </a>
          {/* ⚠️ A FRASE ANTERIOR PROMETIA QUE O LINK CAÍA "direto na escrituração". Não cai — o
              e-CAC manda para o login e depois para a home. Promessa de navegação que não se
              cumpre é pior que navegação nenhuma: ela procura uma tela que não apareceu e conclui
              que clicou errado. Agora a frase descreve a viagem inteira. */}
          <span style={s("font-size:var(--t-label);color:var(--muted)")}>
            Entre com a conta gov.br e vá em <strong>Declarações e Demonstrativos → Acessar
            Carnê-Leão</strong>. Lá: <strong>Importar Escrituração → Analisar Arquivo</strong> —
            a análise aponta linha e campo de qualquer erro{" "}
            <strong>sem emitir nada</strong>. Só depois, Importar.
          </span>

          {/* ★ O AVISO NO WHATSAPP, E POR QUE ELE É UMA CAIXA E NÃO UM COMPORTAMENTO.
              A MAISA fala pelo número PESSOAL de quem a usa. Trinta mensagens saindo porque
              alguém clicou em "Importei" sem esperar isso não tem desfazer — mensagem entregue
              não se apaga. Então a caixa aparece marcada (é o que quase todo mundo quer) e
              visível ao lado do botão (para quem não quer, desmarcar custa um clique). */}
          <label style={s("display:flex;gap:10px;align-items:flex-start;cursor:pointer;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg)")}>
            <input
              type="checkbox"
              checked={avisar}
              onChange={(e) => setAvisar(e.target.checked)}
              style={s("margin-top:2px;width:16px;height:16px;accent-color:var(--brand)")}
            />
            <span style={s("display:grid;gap:3px")}>
              <span style={s("font-size:var(--t-sm);font-weight:var(--w-title)")}>
                Avisar {lote.linhas} paciente(s) no WhatsApp
              </span>
              <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
                Uma mensagem por recibo, com a data e o valor — <strong>sem o nome do
                serviço</strong>. A MAISA avisa que o recibo saiu e que ele já vai aparecer na
                declaração pré-preenchida; o PDF não vem no lote, é a Receita que guarda.
              </span>
            </span>
          </label>

          <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
            <Btn icon="check" onClick={() => fechar("importado")}>Importei no e-CAC</Btn>
            <Btn variant="ghost" icon="download" onClick={() => baixar(lote)}>Baixar de novo</Btn>
            <Btn variant="ghost" icon="undo" onClick={() => fechar("descartado")}>
              Desisti — devolver as sessões
            </Btn>
          </div>
        </>
      )}

      {/* ★ O PLACAR DO DISPARO. Fica depois de o lote sair da tela porque é a única prova de
          que as mensagens saíram — e porque `semTelefone` é acionável: são pacientes com recibo
          emitido e sem aviso, que se resolve pondo o telefone no cadastro. */}
      {placar && (
        <div style={s("display:grid;gap:6px;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg)")}>
          <div style={s("display:flex;gap:8px;align-items:center;font-size:var(--t-sm);font-weight:var(--w-title)")}>
            <Icon name="check" size={16} sw={2.4} />
            <span>{placar.avisados} paciente(s) avisados no WhatsApp</span>
          </div>
          {placar.semTelefone > 0 && (
            <span style={s("font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
              {placar.semTelefone} ficaram sem aviso por não ter telefone no cadastro. O recibo
              deles saiu igual — a Receita já notificou no app deles.
            </span>
          )}
          {placar.falhas > 0 && (
            <span style={s("display:flex;gap:8px;font-size:var(--t-label);color:var(--warn);line-height:1.5")}>
              <Icon name="alert" size={15} />
              <span>
                {placar.falhas} mensagem(ns) não saíram — número trocado, ou o WhatsApp
                desconectou. Os recibos foram emitidos do mesmo jeito.
              </span>
            </span>
          )}
        </div>
      )}

      {erro && (
        <div style={s("display:flex;gap:8px;color:var(--danger);font-size:var(--t-label)")}>
          <Icon name="alert" size={16} />
          <span>{erro}</span>
        </div>
      )}

      {/* O rodapé responde "sob qual CPF isso vai sair?" sem ninguém abrir configuração — e é
          a única informação desta tela que, errada, faz o arquivo inteiro ser recusado no
          e-CAC (tem que ser o mesmo CPF que acessa o Carnê-Leão). */}
      <div style={s("display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-top:4px;border-top:1px solid var(--border)")}>
        <span style={s("font-size:var(--t-label);color:var(--muted)")}>
          {cpfEmissor
            ? `Recibos no CPF ${cpfEmissor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`
            : "Recibos do Receita Saúde"}
        </span>
        <button
          onClick={trocar}
          disabled={ocupado}
          className="m-focus"
          style={s(`background:none;border:none;padding:0;font-family:inherit;font-size:var(--t-label);color:var(--muted);cursor:${ocupado ? "default" : "pointer"};text-decoration:underline`)}
        >
          Trocar o tipo de documento
        </button>
      </div>
    </Card>
  );
}
