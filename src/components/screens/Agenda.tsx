"use client";
/* MAISA — Agenda.
 *
 * A forma vem do calendário do Psico Manager: UM cartão de calendário com a barra
 * de navegação dentro dele (‹ · Hoje · › · rótulo do período · seletor de visão ·
 * ação primária) e um TRILHO de 340px à direita resumindo o período visível. O
 * token `--rail-side` já existia em globals.css descrevendo exatamente esse
 * layout ("Agenda/Calendário: conteúdo + trilho direito") e nunca tinha sido
 * usado por ninguém; agora é.
 *
 * A lógica de interação vem do InteractiveCalendar (ln-dev7/visualize-booking):
 *  • o contador de atendimentos do dia MORFA de selo de canto para disco central
 *    quando o mouse entra na célula — é um `layoutId` compartilhado entre os dois,
 *    então o motion interpola posição e tamanho em vez de trocar um pelo outro;
 *  • passar o mouse num dia FAZ AQUELE DIA SUBIR ao topo do trilho, com as linhas
 *    reordenando por `layout`. É o `sortedDays` do original: o calendário e a
 *    lista são duas vistas do mesmo hover;
 *  • o seletor de visão tem o indicador que DESLIZA por baixo dos rótulos, e não
 *    um fundo que pisca de um botão para o outro.
 *
 * O que NÃO veio do Psico Manager, de propósito:
 *  • a faixa `border-left:3px` colorida no bloco. É ban explícito do sistema
 *    ("nunca borda colorida só de um lado"); aqui o estado é tint de fundo +
 *    aresta inteira, como já era;
 *  • o creme e o papel. globals.css conta que essa paleta veio deste mesmo Psico
 *    Manager e SAIU — o navy é o sistema agora. Só a estrutura atravessou.
 *
 * Três coisas que o calendário de origem não tem e que ficam:
 *  • arrastar remarca de verdade — e agora atravessa o dia, não só a hora e o
 *    profissional;
 *  • passo de 30 min: cada hora tem duas zonas de soltura;
 *  • blocos sobrepostos escalonam para a direita em vez de um cobrir o outro. */

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { s, Icon, Monogram, Btn, IconBtn, Badge, EmptyState } from "@/lib/ui";
import { useIsMobile } from "@/lib/useIsMobile";
import * as D from "@/lib/data";
import { useStore, type AgendamentoVivo } from "@/lib/store";

const LINHA = 64;   // altura de 1 hora, em px
const PASSO = 0.5;  // granularidade de remarcação, em horas
const CEL_MES = 84; // altura MÍNIMA da célula do mês — a linha cresce para preencher o cartão

type Visao = "dia" | "semana" | "mes";

const VISOES: [Visao, string][] = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]];
const SEG_W = 78; // largura fixa do segmento — é o que deixa o indicador deslizar por cálculo

/** Aparência do bloco conforme onde o atendimento está no dia.
 *  A semântica estava INVERTIDA: "atendendo" usava a cor de aviso (--warn-soft/--warm) e o
 *  não-confirmado — que é o aviso de verdade, porque é quem pode não aparecer — ficava em
 *  --surface neutro, com o âmbar como único portador do estado. E o âmbar sobre superfície clara
 *  dá 1,66:1: era um estado invisível. Agora "em atendimento" é atividade (primário) e
 *  "não confirmado" é aviso (warn). O âmbar saiu: ele tem dois empregos no app, marca e ação
 *  primária, e estado não é um deles. */
function tomDoBloco(ag: AgendamentoVivo): { bg: string; ac: string; fg: string } {
  if (ag.etapa === "feito") return { bg: "var(--success-soft)", ac: "var(--success)", fg: "var(--success)" };
  if (ag.etapa === "atendendo") return { bg: "var(--primary-soft)", ac: "var(--primary)", fg: "var(--primary-dark)" };
  if (!ag.confirmado) return { bg: "var(--warn-soft)", ac: "var(--warn)", fg: "var(--warn)" };
  return { bg: "var(--surface-2)", ac: "var(--border)", fg: "var(--ink)" };
}

/** O primeiro horário do dia em que ALGUÉM está de expediente, e quem é.
 *  `null` num dia em que a casa não abre. */
function primeiroVago(dia: number): { pid: string; inicio: number } | null {
  for (let i = 0; i < D.AGENDA_HORAS / PASSO; i++) {
    const inicio = D.AGENDA_INICIO + i * PASSO;
    const pid = D.COLUNAS_AGENDA.find((p) => D.podeComecar(p, dia, inicio));
    if (pid) return { pid, inicio };
  }
  return null;
}

/** Quantos blocos anteriores da coluna ainda estão em curso — define o recuo. */
function escalonar(blocos: AgendamentoVivo[]): Map<string, number> {
  const ordem = new Map<string, number>();
  const anteriores: AgendamentoVivo[] = [];
  for (const b of [...blocos].sort((x, y) => x.inicio - y.inicio)) {
    ordem.set(b.id, anteriores.filter((a) => a.fim > b.inicio).length);
    anteriores.push(b);
  }
  return ordem;
}

/* ───────────────────────────── peças compartilhadas ───────────────────────────── */

/** Régua de horas da esquerda. Uma só, para Dia e Semana não divergirem em altura. */
function Regua() {
  const horas = Array.from({ length: D.AGENDA_HORAS }, (_, i) => D.AGENDA_INICIO + i);
  return (
    <div style={s("display:flex;flex-direction:column")}>
      {horas.map((h) => (
        <div key={h} className="n" style={s(`height:${LINHA}px;font-size:var(--t-micro);color:var(--muted);text-align:right;padding-right:12px`)}>
          {D.hhmm(h)}
        </div>
      ))}
    </div>
  );
}

/** As zonas de soltura de uma coluna — uma a cada 30 min.
 *  São <button> e não <div>: as 20 zonas só aceitavam `onDrop`, então MARCAR um horário — a ação
 *  nº1 de uma agenda — não existia em lugar nenhum do app. Clicar num vago abre a gaveta com dia,
 *  hora e profissional já resolvidos pelo próprio clique. Como <button>, também entram na ordem de
 *  Tab: é o único caminho de teclado que esta grade tem. */
function Vagos({ dia, profissionalId, chaveCol }: { dia: number; profissionalId?: string; chaveCol: string }) {
  const st = useStore();
  const fatias = D.AGENDA_HORAS / PASSO;
  return (
    <>
      {Array.from({ length: fatias }, (_, i) => {
        const inicio = D.AGENDA_INICIO + i * PASSO;
        const chave = `${chaveCol}@${inicio}`;
        const alvo = st.alvoSolta === chave && !!st.arrastando;
        const horaCheia = i % 2 === 0;
        // Na coluna de um PROFISSIONAL (visão de Dia) quem marca é ele. Na coluna de um DIA
        // (visão de Semana) o clique tem que ESCOLHER alguém — antes caía sempre em
        // COLUNAS_AGENDA[0], então toda marcação da semana ia para o Rafael, inclusive num
        // horário em que ele já tinha ido embora, e Diego e Léo eram inagendáveis por ali.
        const dono = profissionalId ?? D.COLUNAS_AGENDA.find((pid) => D.podeComecar(pid, dia, inicio));
        const livre = !!dono && D.podeComecar(dono, dia, inicio);
        const risco = s(`width:100%;height:${LINHA * PASSO}px;padding:0;border:none;border-bottom:1px ${horaCheia ? "dotted" : "solid"} var(--line)`);

        // Fora do expediente de todo mundo: continua aceitando SOLTURA (arrastar é uma decisão
        // consciente sua, e encaixe fora de hora existe), mas não convida com um clique que
        // criaria um atendimento sem ninguém para atender.
        if (!livre) {
          return (
            <div
              key={chave}
              onDragOver={(e) => { e.preventDefault(); st.marcarAlvo(chave); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || st.arrastando;
                const prof = profissionalId ?? (id ? st.agendamentoPorId(id)?.profissionalId : undefined);
                if (id && prof) st.reposicionar(id, prof, inicio, dia);
              }}
              style={{ ...risco, background: alvo ? "var(--primary-soft)" : "var(--surface-2)", opacity: alvo ? 1 : 0.5, transition: "background-color var(--dur-fast) var(--ease-out)" }}
            />
          );
        }

        return (
          <button
            key={chave}
            onDragOver={(e) => { e.preventDefault(); st.marcarAlvo(chave); }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || st.arrastando;
              if (!id) return;
              // Quem foi arrastado mantém o profissional dele quando a coluna é um dia.
              const prof = profissionalId ?? st.agendamentoPorId(id)?.profissionalId;
              if (prof) st.reposicionar(id, prof, inicio, dia);
            }}
            onClick={() => st.novoAgendamento(dono, inicio, dia)}
            aria-label={`Marcar atendimento dia ${dia} às ${D.hhmm(inicio)} com ${D.primeiroNome(D.nomeProfissional(dono))}`}
            className="m-focus"
            style={{ ...risco, background: alvo ? "var(--primary-soft)" : "transparent", cursor: "pointer", transition: "background-color var(--dur-fast) var(--ease-out)" }}
          />
        );
      })}
    </>
  );
}

/** Um atendimento posicionado na grade de tempo. */
function Bloco({ ag, recuo, mostrarProf }: { ag: AgendamentoVivo; recuo: number; mostrarProf?: boolean }) {
  const st = useStore();
  const tom = tomDoBloco(ag);
  const alto = ag.duracao >= 40;
  return (
    <div
      draggable
      // Ver comentário em FluxoHoje: o id do arrasto vai no payload do evento; o estado
      // só serve para o realce visual.
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ag.id); st.iniciarArrasto(ag.id); }}
      onDragEnd={st.encerrarArrasto}
      onClick={() => st.abrir(ag.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.abrir(ag.id); } }}
      aria-label={`${ag.cliente.nome}, ${D.hhmm(ag.inicio)}, ${ag.servico.nome}, ${D.primeiroNome(ag.profissional.nome)}`}
      className="m-drag m-focus m-lift"
      style={{
        // borda COMPLETA na cor do tom, não faixa lateral: `border-left:3px` como acento colorido
        // é ban explícito, e o elemento acumulava dois (side-stripe + ghost-card). O estado agora
        // vem do tint de fundo + a aresta inteira.
        ...s(`position:absolute;border-radius:12px;padding:8px 11px;overflow:hidden;background:${tom.bg};border:1px solid ${tom.ac};box-shadow:var(--shadow-card)`),
        top: (ag.inicio - D.AGENDA_INICIO) * LINHA + 3,
        height: Math.max((ag.duracao / 60) * LINHA - 6, 42),
        left: 6 + recuo * 12,
        right: 6,
        zIndex: 5 + recuo,
        opacity: st.arrastando === ag.id ? 0.4 : 1,
      }}
    >
      <div style={s(`font-size:var(--t-sm);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${tom.fg};line-height:1.25`)}>
        {ag.cliente.nome}
      </div>
      {alto && (
        <div className="n" style={s(`font-size:var(--t-micro);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${tom.fg};opacity:.85;margin-top:1px`)}>
          {D.hhmm(ag.inicio)} · {mostrarProf ? D.primeiroNome(ag.profissional.nome) : ag.servico.nome}
        </div>
      )}
    </div>
  );
}

/** Cabeçalho de uma coluna-dia (Semana). */
function CabecalhoDia({ dia, onClick }: { dia: number; onClick: () => void }) {
  const hoje = dia === D.HOJE.num;
  return (
    <button
      onClick={onClick}
      aria-label={`Ver ${D.DOW_LONGO[D.dowDoDia(dia)]} ${dia}`}
      className="m-hov-bg m-focus"
      style={s(`display:flex;flex-direction:column;align-items:center;gap:1px;padding:9px 4px;border:none;border-left:1px solid var(--line);background:${hoje ? "var(--primary-soft)" : "transparent"};cursor:pointer`)}
    >
      <span style={s(`font-size:var(--t-micro);font-weight:var(--w-title);letter-spacing:var(--ls-caps);color:${hoje ? "var(--primary-dark)" : "var(--muted)"}`)}>
        {D.DOW_CURTO[D.dowDoDia(dia)]}
      </span>
      <span className="n" style={s(`font-size:var(--t-lg);font-weight:var(--w-emph);letter-spacing:var(--ls-lg);color:${hoje ? "var(--primary)" : "var(--ink)"}`)}>{dia}</span>
    </button>
  );
}

/* ───────────────────────────── visão: dia ─────────────────────────────
 * Hora × profissional, que é a pergunta que o dono faz olhando o dia de hoje:
 * quem está livre agora. */

function GradeDia({ dia }: { dia: number }) {
  const st = useStore();
  const doDia = st.agendamentosDoDia(dia);
  const colunas = `58px repeat(${D.COLUNAS_AGENDA.length},minmax(0,1fr))`;

  return (
    <div style={s("flex:1;min-height:0;overflow-y:auto;padding:0 16px 16px")}>
      <div style={s(`display:grid;grid-template-columns:${colunas};position:sticky;top:0;background:var(--surface);z-index:8;padding-top:12px`)}>
        <div />
        {D.COLUNAS_AGENDA.map((pid) => {
          const p = D.profissional(pid)!;
          const on = st.profAtivo(pid);
          // Folga do dia visível — coisa diferente de "pausado", que é você ter desligado a pessoa
          // no app. Sem esta marca a coluna do Léo num sábado lia como o horário mais vazio da
          // casa, e a tela de Equipe, na mesma sessão, dizia que ele folga sábado.
          const folga = !D.atende(pid, dia);
          return (
            <div key={pid} style={s(`display:flex;align-items:center;gap:9px;padding:0 10px 12px;opacity:${on && !folga ? "1" : "0.55"}`)}>
              <Monogram name={p.nome} id={pid} size={28} radius={9} />
              <span style={s("font-size:var(--t-sm);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{D.primeiroNome(p.nome)}</span>
              {folga
                ? <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);color:var(--muted);background:var(--line);padding:2px 7px;border-radius:999px;flex-shrink:0")}>folga</span>
                : !on && <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);color:var(--muted);background:var(--line);padding:2px 7px;border-radius:999px;flex-shrink:0")}>pausado</span>}
            </div>
          );
        })}
      </div>

      <div style={s(`display:grid;grid-template-columns:${colunas}`)}>
        <Regua />
        {D.COLUNAS_AGENDA.map((pid) => {
          const blocos = doDia.filter((a) => a.profissionalId === pid);
          const recuo = escalonar(blocos);
          return (
            <div key={pid} style={s("position:relative;border-left:1px solid var(--line)")}>
              <Vagos dia={dia} profissionalId={pid} chaveCol={`${dia}:${pid}`} />
              {blocos.map((ag) => <Bloco key={ag.id} ag={ag} recuo={recuo.get(ag.id) ?? 0} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── visão: semana ─────────────────────────────
 * Hora × dia, seg–sáb. Domingo não entra: a casa não abre, e uma coluna vazia
 * fixa custaria 1/7 da largura para não dizer nada.
 * Aqui a coluna é o DIA, então o bloco mostra o profissional no lugar do
 * serviço — é a informação que muda de coluna para coluna. */

function GradeSemana({ dia, onAbrirDia }: { dia: number; onAbrirDia: (d: number) => void }) {
  const st = useStore();
  const dias = D.semanaDoDia(dia);
  const colunas = `52px repeat(${dias.length},minmax(0,1fr))`;

  return (
    <div style={s("flex:1;min-height:0;overflow-y:auto;padding:0 16px 16px")}>
      <div style={s(`display:grid;grid-template-columns:${colunas};position:sticky;top:0;background:var(--surface);z-index:8;padding-top:6px;border-bottom:1px solid var(--line)`)}>
        <div />
        {dias.map((d) => <CabecalhoDia key={d} dia={d} onClick={() => onAbrirDia(d)} />)}
      </div>

      <div style={s(`display:grid;grid-template-columns:${colunas}`)}>
        <Regua />
        {dias.map((d) => {
          const blocos = st.agendamentosDoDia(d);
          const recuo = escalonar(blocos);
          const hoje = d === D.HOJE.num;
          return (
            <div key={d} style={s(`position:relative;border-left:1px solid var(--line);background:${hoje ? "var(--primary-soft)" : "transparent"}`)}>
              <Vagos dia={d} chaveCol={`sem:${d}`} />
              {blocos.map((ag) => <Bloco key={ag.id} ag={ag} recuo={recuo.get(ag.id) ?? 0} mostrarProf />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── visão: mês ─────────────────────────────
 * Aqui mora a lógica do InteractiveCalendar. Cada célula carrega o contador do
 * dia num `layoutId`; ao entrar o mouse, o MESMO nó é remontado no centro da
 * célula, maior — o motion interpola o caminho entre as duas posições. É o
 * gesto que o componente de origem existe para fazer, e é o que transforma uma
 * grade de números numa coisa que responde. */

function CelulaMes({
  dia, qtd, aberto, onHover, onAbrir, reduzido,
}: {
  dia: number | null;
  qtd: number;
  aberto: boolean;
  onHover: (d: number | null) => void;
  onAbrir: () => void;
  reduzido: boolean;
}) {
  // Preenchimento antes do dia 1 / depois do 31: existe para a grade fechar em sete colunas,
  // e não recebe número nem foco. É o '-3'/'+1' do componente de origem.
  if (dia === null) {
    return <div aria-hidden style={s("height:100%;border-radius:12px;background:var(--surface-2);opacity:.45")} />;
  }

  const domingo = D.fechado(dia);
  const hoje = dia === D.HOJE.num;
  const passado = dia < D.HOJE.num;

  if (domingo) {
    return (
      <div style={s("height:100%;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);padding:8px;display:flex;flex-direction:column;gap:4px;opacity:.6")}>
        <span className="n" style={s("font-size:var(--t-label);font-weight:var(--w-data);color:var(--muted)")}>{dia}</span>
        <span style={s("font-size:var(--t-micro);color:var(--muted);margin-top:auto")}>fechado</span>
      </div>
    );
  }

  return (
    <motion.button
      onMouseEnter={() => onHover(dia)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(dia)}
      onBlur={() => onHover(null)}
      onClick={onAbrir}
      aria-label={`${D.DOW_LONGO[D.dowDoDia(dia)]} ${dia}: ${qtd === 1 ? "1 atendimento" : `${qtd} atendimentos`}`}
      // `.m-lift` em vez de um `whileHover` com sombra escrita à mão: a classe já existe em
      // globals.css com esses valores, e um `border:1px` acompanhado de sombra larga inventada
      // aqui seria o "ghost-card" que o próprio arquivo bane.
      className="m-focus m-lift"
      style={{
        ...s("position:relative;height:100%;border-radius:12px;padding:8px;text-align:left;cursor:pointer;overflow:hidden;display:block;width:100%"),
        border: `1px solid ${hoje ? "var(--primary)" : "var(--border)"}`,
        background: hoje ? "var(--primary-soft)" : "var(--surface)",
        opacity: passado ? 0.72 : 1,
      }}
    >
      <span className="n" style={s(`font-size:var(--t-label);font-weight:${hoje ? "var(--w-emph)" : "var(--w-data)"};color:${hoje ? "var(--primary)" : "var(--ink)"}`)}>
        {dia}
      </span>

      {qtd > 0 && !aberto && (
        <motion.span
          layoutId={`dia-${dia}-contagem`}
          className="n"
          style={{
            ...s("position:absolute;right:8px;bottom:8px;display:flex;align-items:center;justify-content:center;font-weight:var(--w-title);color:var(--on-primary);background:var(--primary)"),
            width: 22, height: 22, borderRadius: 999, fontSize: "var(--t-micro)",
          }}
          transition={{ duration: reduzido ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {qtd}
        </motion.span>
      )}

      {/* Sem AnimatePresence: os dois selos são exclusivos (`aberto` / `!aberto`) e trocam no MESMO
          commit, que é exatamente o que o layoutId precisa para interpolar. Envolver este em
          AnimatePresence adiaria a remoção do outro e deixaria o mesmo layoutId montado duas vezes
          — aí o motion escolhe um líder qualquer e o selo pisca em vez de voltar para o canto. */}
      {qtd > 0 && aberto && (
        <span style={s("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none")}>
          <motion.span
            layoutId={`dia-${dia}-contagem`}
            className="n"
            style={{
              ...s("display:flex;align-items:center;justify-content:center;font-weight:var(--w-title);color:var(--on-primary);background:var(--primary)"),
              width: 42, height: 42, borderRadius: 999, fontSize: "var(--t-body)",
            }}
            transition={{ duration: reduzido ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {qtd}
          </motion.span>
        </span>
      )}

      {qtd === 0 && (
        <span style={s("position:absolute;left:8px;bottom:8px;font-size:var(--t-micro);color:var(--muted)")}>livre</span>
      )}
    </motion.button>
  );
}

function GradeMes({ onHover, aberto, onAbrirDia }: { onHover: (d: number | null) => void; aberto: number | null; onAbrirDia: (d: number) => void }) {
  const st = useStore();
  const reduzido = !!useReducedMotion();
  // A grade do mês é a mesma 35 células sempre; recalcular a lista a cada hover era lixo puro.
  const celulas = React.useMemo(() => D.celulasDoMes(), []);

  return (
    // As linhas dividem a altura disponível (`grid-auto-rows: minmax(84px,1fr)`) em vez de terem
    // altura fixa: com 96px cravados sobrava um terço do cartão em branco embaixo, e um mês que
    // não preenche o próprio cartão lê como se faltasse conteúdo.
    <div style={s("flex:1;min-height:0;display:flex;flex-direction:column;padding:0 16px 16px;overflow-y:auto")}>
      <div style={s("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;flex-shrink:0;padding:10px 0 8px")}>
        {D.DOW_CURTO.map((d) => (
          <span key={d} style={s("text-align:center;font-size:var(--t-micro);font-weight:var(--w-title);letter-spacing:var(--ls-caps);color:var(--muted)")}>{d}</span>
        ))}
      </div>
      <div style={{ ...s("flex:1;min-height:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px"), gridAutoRows: `minmax(${CEL_MES}px, 1fr)` }}>
        {celulas.map((c) => (
          <CelulaMes
            key={c.chave}
            dia={c.dia}
            qtd={c.dia === null ? 0 : st.agendamentosDoDia(c.dia).length}
            aberto={c.dia !== null && c.dia === aberto}
            onHover={onHover}
            onAbrir={() => { if (c.dia !== null) onAbrirDia(c.dia); }}
            reduzido={reduzido}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── trilho da direita ─────────────────────────────
 * A outra metade da lógica do InteractiveCalendar: o dia sob o mouse SOBE para o
 * topo, e as linhas reordenam por `layout` em vez de sumir e reaparecer. Sem
 * isso a lista seria só um resumo; com isso ela é a segunda vista do mesmo hover. */

function Trilho({ dias, destaque, rotulo }: { dias: number[]; destaque: number | null; rotulo: string }) {
  const st = useStore();
  const reduzido = !!useReducedMotion();
  // A dependência é a FUNÇÃO, não o `st` inteiro: `st` troca de identidade a cada aba, filtro,
  // gaveta e — pior aqui — a cada `alvoSolta` durante um arrasto, o que refazia o agrupamento do
  // mês inteiro a cada meia hora que o mouse cruzava. `agendamentosDoDia` só muda quando os
  // atendimentos mudam.
  const { agendamentosDoDia } = st;

  // O dia sob o mouse vai para o topo. É o `sortedDays` do InteractiveCalendar: um `sort` estável
  // que só promove o destacado, para o resto da lista não embaralhar junto.
  const { ordenados, total } = React.useMemo(() => {
    const grupos = dias
      .map((d) => ({ dia: d, itens: agendamentosDoDia(d) }))
      .filter((g) => g.itens.length > 0);
    const ord = destaque === null
      ? grupos
      : [...grupos].sort((a, b) => (a.dia === destaque ? -1 : b.dia === destaque ? 1 : 0));
    return { ordenados: ord, total: grupos.reduce((n, g) => n + g.itens.length, 0) };
  }, [destaque, dias, agendamentosDoDia]);

  return (
    <div style={s("background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:18px;display:flex;flex-direction:column;min-height:0;max-height:100%")}>
      <h2 style={s("font-size:var(--t-lg);font-weight:var(--w-title);letter-spacing:var(--ls-lg)")}>Quem vem</h2>
      <span style={s("font-size:var(--t-label);color:var(--muted);margin-top:2px")}>{rotulo}</span>

      <div style={s("display:flex;align-items:baseline;gap:8px;margin-top:12px")}>
        <span className="n" style={s("font-size:var(--t-data);font-weight:var(--w-emph);letter-spacing:var(--ls-data);line-height:var(--lh-tight)")}>{total}</span>
        <span style={s("font-size:var(--t-sm);color:var(--muted)")}>{total === 1 ? "atendimento" : "atendimentos"}</span>
      </div>

      <div style={s("height:1px;background:var(--line);margin:14px 0")} />

      <div style={s("display:flex;flex-direction:column;gap:12px;overflow-y:auto;min-height:0;flex:1;margin:0 -6px;padding:0 6px")}>
        {ordenados.map((g) => {
          const marcado = g.dia === destaque;
          return (
            <motion.div
              key={g.dia}
              layout={!reduzido}
              transition={{ duration: reduzido ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={s("display:flex;flex-direction:column;gap:6px")}
            >
              <div style={s("display:flex;align-items:center;gap:8px;padding:0 2px")}>
                <span style={s(`font-size:var(--t-micro);font-weight:var(--w-title);letter-spacing:var(--ls-caps);color:${marcado ? "var(--primary)" : "var(--muted)"}`)}>
                  {D.DOW_CURTO[D.dowDoDia(g.dia)]}
                </span>
                <span className="n" style={s(`font-size:var(--t-sm);font-weight:var(--w-data);color:${marcado ? "var(--primary)" : "var(--ink)"}`)}>{g.dia}</span>
                {g.dia === D.HOJE.num && <span style={s("font-size:var(--t-micro);font-weight:var(--w-title);color:var(--primary-dark);background:var(--primary-soft);padding:2px 8px;border-radius:999px")}>hoje</span>}
                <span className="n" style={s("font-size:var(--t-micro);color:var(--muted);margin-left:auto")}>{g.itens.length}</span>
              </div>

              {g.itens.map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => st.abrir(ag.id)}
                  // O nome acessível não sai sozinho do conteúdo: o Monogram vem antes e o leitor
                  // anunciava as iniciais. Escrito, o item diz quem, quando e com quem.
                  aria-label={`${ag.cliente.nome}, dia ${g.dia} às ${D.hhmm(ag.inicio)}, ${ag.servico.nome}, ${D.primeiroNome(ag.profissional.nome)}`}
                  className="m-hov-bg m-press m-focus"
                  style={s("display:flex;align-items:center;gap:10px;text-align:left;padding:7px 8px;border:none;border-radius:12px;background:transparent;cursor:pointer;width:100%")}
                >
                  <Monogram name={ag.cliente.nome} id={ag.cliente.id} size={30} radius={10} />
                  <span style={s("flex:1;min-width:0")}>
                    <span style={s("display:block;font-size:var(--t-sm);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ag.cliente.nome}</span>
                    <span style={s("display:block;font-size:var(--t-micro);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px")}>
                      {ag.servico.nome} · {D.primeiroNome(ag.profissional.nome)}
                    </span>
                  </span>
                  <span className="n" style={s(`flex-shrink:0;font-size:var(--t-label);font-weight:var(--w-data);color:${ag.confirmado ? "var(--muted)" : "var(--warn)"}`)}>
                    {D.hhmm(ag.inicio)}
                  </span>
                </button>
              ))}
            </motion.div>
          );
        })}

        {!ordenados.length && (
          <div style={s("font-size:var(--t-sm);color:var(--muted);text-align:center;padding:22px 8px")}>
            Nada marcado no período. A MAISA avisa aqui assim que alguém chamar no WhatsApp.
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── barra do calendário ───────────────────────────── */

function Seletor({ visoes, visao, onTrocar, reduzido }: { visoes: [Visao, string][]; visao: Visao; onTrocar: (v: Visao) => void; reduzido: boolean }) {
  const i = visoes.findIndex(([v]) => v === visao);
  return (
    // O indicador DESLIZA por baixo dos rótulos (é o toggle do InteractiveCalendar). Por isso os
    // segmentos têm largura fixa: sem ela o deslocamento dependeria da métrica da fonte, e o
    // indicador pararia meio pixel fora do rótulo em qualquer fallback de família.
    <div role="tablist" aria-label="Visão do calendário" style={s("position:relative;display:flex;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:3px;flex-shrink:0")}>
      <motion.span
        aria-hidden
        animate={{ x: Math.max(i, 0) * SEG_W }}
        transition={{ duration: reduzido ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{ ...s("position:absolute;top:3px;left:3px;background:var(--primary)"), width: SEG_W, height: "calc(100% - 6px)", borderRadius: 7 }}
      />
      {visoes.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={v === visao}
          onClick={() => onTrocar(v)}
          className="m-focus"
          style={{ ...s(`position:relative;z-index:1;border:none;background:transparent;cursor:pointer;padding:6px 0;font-size:var(--t-label);font-weight:var(--w-title);color:${v === visao ? "var(--on-primary)" : "var(--muted)"};transition:color var(--dur-fast) var(--ease-out)`), width: SEG_W }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────── mobile ─────────────────────────────
 * A grade sai: arrastar não existe no toque e seis colunas num celular são
 * ilegíveis. Vira linha do tempo do dia escolhido. */

function LinhaDoTempo({ dia }: { dia: number }) {
  const st = useStore();
  const itens = st.agendamentosDoDia(dia);
  if (!itens.length) {
    return (
      <EmptyState
        icon="calendar"
        title={dia === D.HOJE.num ? "Dia livre" : `Nada no dia ${dia}`}
        sub="A MAISA marca sozinha pelo WhatsApp — quando entrar algo, aparece aqui."
      />
    );
  }
  return (
    <div style={s("display:flex;flex-direction:column;gap:10px;padding:16px")}>
      {itens.map((ag) => {
        const tom = tomDoBloco(ag);
        return (
          <button
            key={ag.id}
            onClick={() => st.abrir(ag.id)}
            className="m-press m-focus"
            style={s(`display:flex;align-items:center;gap:12px;text-align:left;padding:14px;border-radius:16px;background:${tom.bg};border:1px solid ${tom.ac};cursor:pointer;box-shadow:var(--shadow-card)`)}
          >
            <span style={s("flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;width:44px")}>
              <span className="n" style={s("font-size:var(--t-sm);font-weight:var(--w-data)")}>{D.hhmm(ag.inicio)}</span>
              <span className="n" style={s("font-size:var(--t-micro);color:var(--muted)")}>{ag.duracao}min</span>
            </span>
            <span style={s("flex:1;min-width:0")}>
              <span style={s("display:block;font-size:var(--t-body);font-weight:var(--w-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{ag.cliente.nome}</span>
              <span style={s("display:block;font-size:var(--t-label);color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {ag.servico.nome} · {D.primeiroNome(ag.profissional.nome)}
              </span>
            </span>
            {!ag.confirmado && (
              <span style={s("flex-shrink:0;font-size:var(--t-micro);font-weight:var(--w-title);color:var(--warn);background:var(--warn-soft);padding:3px 8px;border-radius:999px")}>a confirmar</span>
            )}
            <Monogram name={ag.profissional.nome} id={ag.profissionalId} size={30} radius={10} />
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── tela ───────────────────────────── */

export default function Agenda() {
  const mobile = useIsMobile();
  const reduzido = !!useReducedMotion();
  const st = useStore();
  const [escolhida, setVisao] = React.useState<Visao>("dia");
  const [destaque, setDestaque] = React.useState<number | null>(null);

  // No celular a Semana sai do seletor: seis colunas de blocos posicionados a 375px não se leem,
  // e um controle que troca a visão para outra coisa ilegível é um controle morto. Mês FICA — a
  // grade de contadores é justamente a visão que cabe num celular. `escolhida` vs `visao` existe
  // porque o usuário pode estar em Semana e girar o aparelho: a visão cai para Dia sozinha em vez
  // de renderizar uma tela que o seletor já não sabe apontar.
  const visoes = mobile ? VISOES.filter(([v]) => v !== "semana") : VISOES;
  const visao: Visao = mobile && escolhida === "semana" ? "dia" : escolhida;

  const dia = st.diaSel;
  const hoje = dia === D.HOJE.num;

  // Os dias que a visão atual cobre. É a mesma lista para a grade e para o trilho — o resumo da
  // direita não pode falar de um período diferente do que está desenhado à esquerda.
  const visiveis = React.useMemo<number[]>(() => {
    if (visao === "dia") return [dia];
    if (visao === "semana") return D.semanaDoDia(dia);
    return Array.from({ length: D.MES_AGENDA.dias }, (_, i) => i + 1).filter((d) => !D.fechado(d));
  }, [visao, dia]);

  const rotulo =
    visao === "dia" ? `${dia} de ${D.MES_AGENDA.nome} de ${D.MES_AGENDA.ano}`
    : visao === "semana" ? `${visiveis[0]} – ${visiveis[visiveis.length - 1]} de ${D.MES_AGENDA.nome}`
    : `${D.MES_AGENDA.nome} de ${D.MES_AGENDA.ano}`;

  /** Abre um dia específico. Trocar `diaSel` NÃO basta: em Semana e em Mês nada na tela é
   *  desenhado a partir do dia selecionado, então clicar numa célula do mês mudava o estado e não
   *  mudava um pixel — um controle que promete "quinta 23: 5 atendimentos" e não abre nada.
   *  Clicar num dia agora desce para ele. */
  const abrirDia = (d: number) => { st.verDia(d); setVisao("dia"); };

  /** ‹ e › andam no PASSO DA VISÃO: um dia ou uma semana. O mês não tem para onde ir — só existe
   *  julho no protótipo —, então ali os botões desabilitam em vez de fingir que navegam. */
  const navegar = (dir: number) => {
    if (visao === "semana") {
      // Ancorado na SEMANA, não no dia. Com `dia + 7` a semana 27–31 era inalcançável a partir de
      // sábado 25 (32 estoura o mês e a seta não fazia nada), e a semana 1–4 era inalcançável a
      // partir de segunda 6. Agora ando de segunda a segunda e só recuso quando a semana inteira
      // cai fora do mês.
      const proximaSegunda = dia - D.dowDoDia(dia) + dir * 7;
      const primeiro = Math.max(proximaSegunda, 1);
      const ultimo = Math.min(proximaSegunda + 5, D.MES_AGENDA.dias); // seg..sáb
      if (primeiro > ultimo) return;
      st.verDia(primeiro);
      return;
    }
    let alvo = dia + dir;
    // pula domingo: clicar › no sábado tem que cair na segunda, não numa tela "fechado"
    while (alvo >= 1 && alvo <= D.MES_AGENDA.dias && D.fechado(alvo)) alvo += dir;
    if (alvo < 1 || alvo > D.MES_AGENDA.dias) return;
    st.verDia(alvo);
  };
  const podeNavegar = visao !== "mes";

  const calendario = (
    <section style={s("background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);box-shadow:var(--shadow-card);overflow:hidden;display:flex;flex-direction:column;min-height:0")}>
      <div style={s("flex-shrink:0;display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap")}>
        <div style={s("display:flex;align-items:center;gap:4px")}>
          <IconBtn icon="chevron-left" size="sm" disabled={!podeNavegar} onClick={() => navegar(-1)} title={visao === "semana" ? "Semana anterior" : "Dia anterior"} />
          <Btn variant="secondary" size="sm" onClick={() => abrirDia(D.HOJE.num)} style={{ height: 30, padding: "0 12px", borderRadius: 8 }}>Hoje</Btn>
          <IconBtn icon="chevron-right" size="sm" disabled={!podeNavegar} onClick={() => navegar(1)} title={visao === "semana" ? "Próxima semana" : "Próximo dia"} />
        </div>

        <span style={s("font-size:var(--t-body);font-weight:var(--w-title);letter-spacing:var(--ls-body)")}>{rotulo}</span>
        {!hoje && visao !== "mes" && <Badge>hoje é {D.HOJE.num}</Badge>}

        <div style={s("margin-left:auto;display:flex;align-items:center;gap:10px")}>
          <Seletor visoes={visoes} visao={visao} onTrocar={setVisao} reduzido={reduzido} />
          {!mobile && (
            // Abre o rascunho no primeiro horário do dia que tenha alguém de expediente — e não no
            // primeiro da lista às 09:00, que na segunda-feira era o Diego, que folga segunda.
            <Btn size="sm" icon="plus" onClick={() => { const p = primeiroVago(dia); if (p) st.novoAgendamento(p.pid, p.inicio, dia); }}>
              Marcar
            </Btn>
          )}
        </div>
      </div>

      {visao === "mes" ? (
        <GradeMes onHover={setDestaque} aberto={destaque} onAbrirDia={abrirDia} />
      ) : mobile ? (
        // Sem `overflow-y` próprio: no celular quem rola é a PÁGINA. Com scroll interno o cartão
        // ficava preso na altura da viewport e cortava o terceiro atendimento no meio.
        <LinhaDoTempo dia={dia} />
      ) : visao === "dia" ? (
        <GradeDia dia={dia} />
      ) : (
        <GradeSemana dia={dia} onAbrirDia={abrirDia} />
      )}

      {!mobile && visao !== "mes" && (
        <div style={s("flex-shrink:0;display:flex;align-items:center;gap:8px;padding:9px 16px;border-top:1px solid var(--line);font-size:var(--t-label);color:var(--muted)")}>
          <Icon name="clock" size={15} sw={1.9} />
          arraste para remarcar · clique num vago para marcar
        </div>
      )}
    </section>
  );

  // No celular, em Dia, o trilho seria a MESMA lista que a linha do tempo logo acima — os mesmos
  // nomes, nas mesmas horas, duas vezes na mesma rolagem. Ele só ganha função quando a grade não
  // mostra nomes: no Mês.
  const comTrilho = !mobile || visao === "mes";

  return (
    <div
      className="m-enter"
      style={{
        ...s(`flex:1;min-height:0;height:100%;display:grid;grid-template-columns:${comTrilho ? "var(--rail-side)" : "minmax(0,1fr)"};gap:16px;padding:16px 20px 20px;background:var(--bg);overflow-y:auto;align-content:start`),
        // No desktop a linha ocupa a altura da tela e cada cartão rola por dentro — é o que faz a
        // grade de horas ficar sob a barra fixa. No celular isso vira uma armadilha: a linha
        // travava em 614px e o cartão, que é `overflow:hidden`, cortava o atendimento das 15:30 no
        // meio, sem barra de rolagem nenhuma. `max-content` devolve a rolagem para a PÁGINA.
        gridAutoRows: mobile ? "max-content" : undefined,
      }}
    >
      {calendario}
      {comTrilho && <Trilho dias={visiveis} destaque={destaque} rotulo={rotulo} />}
    </div>
  );
}
