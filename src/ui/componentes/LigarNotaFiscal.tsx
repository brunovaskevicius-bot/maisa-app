"use client";
/* ─────────────────────────────────────────────────────────────────────────────
 * LIGAR A NOTA FISCAL — uma pergunta, e um arquivo.
 *
 * ★ A REGRA QUE DESENHOU ESTA TELA, na palavra do Bruno (17/08/2026):
 *   "quanto menos perguntas no onboarding sempre melhor."
 *
 * Então ela tem UM campo: o CNPJ. Razão social, município, CNAE e — o que decide por onde a
 * nota sai — `optante_mei` vêm da Receita. Nada de endereço, nada de inscrição municipal,
 * nada de regime tributário, nada de escolher ambiente.
 *
 * Depois vem o certificado digital, que não é pergunta: é entrega. É o único ponto do
 * produto onde o cliente precisa trazer algo de fora, e por isso ele é o passo mais bem
 * explicado da tela inteira.
 *
 * ── A PRÉVIA ANTES DE GRAVAR, E POR QUE ELA NÃO É ENFEITE ──
 *
 * Digitar o CNPJ mostra o nome da empresa ANTES de criar nada. O motivo é concreto:
 * `criarEmpresa` não é idempotente e a Focus não deduplica por CNPJ — um dígito trocado que
 * por azar exista cria uma empresa cobrada no CNPJ de um estranho, e isso só se desfaz à mão
 * no painel dela. Ver o nome próprio antes de confirmar é a barreira mais barata que existe.
 *
 * ── ⚠️ O ARQUIVO NÃO FICA COM A GENTE, E A TELA DIZ ISSO ──
 *
 * Um e-CNPJ assina contrato e abre o e-CAC da empresa. Pedir esse arquivo sem explicar para
 * onde ele vai é pedir demais — a frase sobre "não guardamos" está na tela porque é verdade
 * do código (ver `portas/saida/cadastro-de-emissor.ts`) e porque é ela que faz alguém clicar.
 * ────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { s, Icon } from "@/ui/primitivos";
import type { CadastroDoCnpj, ConfigFiscal } from "@/nucleo/dominio/fiscal";

type Estado = {
  config: ConfigFiscal;
  caminho: "nacional" | "municipal" | "recibo_saude";
  falta: string[];
  provedorFaltando: string[];
};

/** 14 dígitos com a pontuação que todo mundo espera ver. */
function mascaraCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** 11 dígitos com pontuação. */
function mascaraCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/**
 * As seis profissões que o Receita Saúde aceita, com o nome que a pessoa usa.
 *
 * ⚠️ A LISTA É FECHADA PELA RECEITA, e as ausências são clientes que este caminho não atende:
 * nutricionista não está na tabela de ocupações do lote, e terapeuta holístico/massoterapeuta
 * não são profissionais de saúde para a IN 2.240. Inventar uma opção "outra" aqui geraria
 * arquivo que a Receita recusa na análise.
 */
const PROFISSOES = [
  ["psicologo", "Psicólogo(a)"],
  ["fisioterapeuta", "Fisioterapeuta"],
  ["fonoaudiologo", "Fonoaudiólogo(a)"],
  ["terapeuta_ocupacional", "Terapeuta ocupacional"],
  ["medico", "Médico(a)"],
  ["odontologo", "Dentista"],
] as const;

/** Base64 puro, sem o `data:...;base64,` que o FileReader prefixa. */
function paraBase64(f: File): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result ?? "").replace(/^data:[^;]*;base64,/, ""));
    r.onerror = () => erro(new Error("Não consegui ler o arquivo."));
    r.readAsDataURL(f);
  });
}

export function LigarNotaFiscal() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cnpj, setCnpj] = useState("");
  const [previa, setPrevia] = useState<CadastroDoCnpj | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [senha, setSenha] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);

  /* A bifurcação. `null` = ninguém escolheu ainda, e é aí que a pergunta aparece. */
  const [modo, setModo] = useState<"cnpj" | "cpf" | null>(null);
  const [cpf, setCpf] = useState("");
  const [ocupacao, setOcupacao] = useState<string>("psicologo");
  const [registro, setRegistro] = useState("");

  const ler = useCallback(async () => {
    try {
      const r = await fetch("/api/fiscal", { cache: "no-store" });
      const d = await r.json();
      if (d?.ok) setEstado(d as Estado);
    } catch {
      /* Silêncio: esta tela é configuração, não operação. Uma faixa de erro por causa de uma
       * leitura que falhou competiria com o faturamento do mês, que é o que importa aqui. */
    }
  }, []);

  useEffect(() => { void ler(); }, [ler]);

  /* Prévia com debounce. Só dispara com os 14 dígitos completos — consultar a Receita a cada
   * tecla é ruído para ela e piscada de nome errado para quem digita. */
  useEffect(() => {
    const d = cnpj.replace(/\D/g, "");
    if (d.length !== 14) { setPrevia(null); return; }
    let vivo = true;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/fiscal?cnpj=${d}`, { cache: "no-store" });
        const j = await r.json();
        if (vivo && j?.ok) { setPrevia(j.cadastro ?? null); setErro(j.cadastro ? null : "Não encontrei esse CNPJ na Receita."); }
      } catch { /* a confirmação chama a rota de novo; falhar a prévia não impede nada */ }
    }, 450);
    return () => { vivo = false; clearTimeout(timer); };
  }, [cnpj]);

  async function chamar(metodo: "POST" | "PUT" | "PATCH", corpo?: unknown) {
    setOcupado(true); setErro(null);
    try {
      const r = await fetch("/api/fiscal", {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo ?? {}),
      });
      const d = await r.json();
      if (!d?.ok) { setErro(d?.mensagem ?? d?.erro ?? "Não deu. Tente de novo."); return; }
      setEstado(d as Estado);
    } catch {
      setErro("Não consegui falar com o servidor.");
    } finally {
      setOcupado(false);
    }
  }

  if (!estado) return null;

  const { config, caminho, falta, provedorFaltando } = estado;
  const ligado = config.empresaId != null;
  const pronto = falta.length === 0;

  /* Já é pessoa física: quem manda na tela é o cartão do lote (`LoteReceitaSaude`), que
   * mostra o arquivo do mês. Repetir aqui um "recibo ligado" seria dois cartões dizendo o
   * mesmo em cima do outro. */
  if (caminho === "recibo_saude") return null;

  /* ── ⚠️ EMISSOR SEM CONFIGURAÇÃO NÃO ESCONDE MAIS A TELA INTEIRA ──
   *
   * Antes um `return null` seco: sem `FOCUS_NFE_TOKEN` não há como ligar nota fiscal, e cobrar
   * do dono um passo que só nós destravamos é checklist que mente.
   *
   * Só que o caminho do RECIBO não usa o provedor — nem token, nem certificado, nem custo por
   * documento. Esconder tudo tirava do ar justamente a opção que sempre funciona, e o efeito
   * era o pior possível: a etapa fiscal do onboarding sumia para uma psicóloga que poderia ter
   * ligado o Receita Saúde em três campos. */
  const soRecibo = provedorFaltando.length > 0;
  if (soRecibo && ligado) return null;

  const caixa = "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow-card)";

  return (
    <section aria-label="Nota fiscal" style={s(`flex-shrink:0;${caixa}`)}>
      <div style={s("display:flex;align-items:center;gap:11px")}>
        <span aria-hidden style={s(`display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;border-radius:99px;background:${pronto ? "var(--success-soft)" : "var(--primary-soft)"}`)}>
          <Icon name={pronto ? "check" : "receipt"} size={16} sw={pronto ? 2.6 : 2} stroke={pronto ? "var(--success)" : "var(--primary-dark)"} />
        </span>
        <h2 style={s("margin:0;font-size:var(--t-body);font-weight:var(--w-title);color:var(--ink)")}>
          {pronto && ligado
            ? "Nota fiscal ligada"
            : ligado
              ? "Falta o certificado"
              : modo === "cpf"
                ? "Recibos do Receita Saúde"
                : modo === "cnpj"
                  ? "Ligar a nota fiscal"
                  : "Nota fiscal ou recibo?"}
        </h2>
        {/* ⚠️ O ambiente é a informação mais importante desta tela quando está tudo pronto:
            é a diferença entre um teste e um documento com validade fiscal. */}
        {ligado && (
          <span className="n" style={s(`margin-left:auto;font-size:var(--t-label);padding:2px 9px;border-radius:99px;background:${config.ambiente === "producao" ? "var(--success-soft)" : "var(--warn-soft)"};color:${config.ambiente === "producao" ? "var(--success)" : "var(--warn)"}`)}>
            {config.ambiente === "producao" ? "valendo" : "modo teste"}
          </span>
        )}
      </div>

      {/* ── ★ passo 0 · A PERGUNTA QUE DECIDE TUDO ──
           Duas respostas, e a diferença entre elas não é de regime tributário: é de
           DOCUMENTO. Quem tem CNPJ emite nota fiscal; quem atende como pessoa física emite o
           Recibo Eletrônico de Serviços de Saúde, no e-CAC, obrigatório desde 01/01/2025.
           Não dá para derivar dos dados — não existe CNPJ para consultar na Receita quando a
           resposta é "pessoa física". É a única pergunta que este fluxo não conseguiu matar. */}
      {!ligado && modo === null && (
        <>
          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            {soRecibo
              ? "Você atende como pessoa física, com CPF e registro no conselho? Então seu documento é o recibo do Receita Saúde — e eu monto o arquivo do mês para você."
              : "Como você atende? Isso decide o documento que sai depois de cada atendimento — e são documentos diferentes, não jeitos diferentes do mesmo."}
          </p>

          <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
            {!soRecibo && (
              <button
                onClick={() => setModo("cnpj")}
                className="m-press m-focus"
                style={s("display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;flex:1;min-width:200px;padding:14px 16px;border-radius:14px;border:1px solid var(--border);background:var(--bg);cursor:pointer;font-family:inherit")}
              >
                <strong style={s("font-size:var(--t-sm);color:var(--ink)")}>Tenho CNPJ</strong>
                <span style={s("font-size:var(--t-label);color:var(--muted)")}>Nota fiscal de serviço. Precisa de certificado digital.</span>
              </button>
            )}
            <button
              onClick={() => setModo("cpf")}
              className="m-press m-focus"
              style={s("display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;flex:1;min-width:200px;padding:14px 16px;border-radius:14px;border:1px solid var(--border);background:var(--bg);cursor:pointer;font-family:inherit")}
            >
              <strong style={s("font-size:var(--t-sm);color:var(--ink)")}>Atendo como pessoa física</strong>
              <span style={s("font-size:var(--t-label);color:var(--muted)")}>Recibo do Receita Saúde. Sem certificado, sem CNPJ.</span>
            </button>
          </div>
        </>
      )}

      {/* ── passo 1-B · três campos, e acabou ── */}
      {!ligado && modo === "cpf" && (
        <>
          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            Todo mês eu monto o arquivo com as sessões atendidas e você importa no
            <strong style={s("color:var(--ink)")}> e-CAC → Carnê-Leão → Escrituração</strong>.
            A Receita valida o arquivo antes de emitir qualquer coisa.
          </p>

          <label style={s("display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-size:var(--t-label);color:var(--muted)")}>Seu CPF — o mesmo que você usa no e-CAC</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(mascaraCpf(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="n m-focus"
              style={s("font-family:inherit;font-size:var(--t-body);padding:11px 13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink)")}
            />
          </label>

          <label style={s("display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-size:var(--t-label);color:var(--muted)")}>Sua profissão</span>
            <select
              value={ocupacao}
              onChange={(e) => setOcupacao(e.target.value)}
              className="n m-focus"
              style={s("font-family:inherit;font-size:var(--t-body);padding:11px 13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink)")}
            >
              {PROFISSOES.map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select>
          </label>

          {/* ⚠️ NÃO BLOQUEIA, E A FRASE DIZ ISSO — o campo 16 do arquivo aceita vazio (manual
              2.1, pergunta 25). Marcar como obrigatório impediria de fechar o mês por um dado
              que a Receita nem exige.

              Mas ele importa por dois motivos que a frase precisa carregar: é o que o plano de
              saúde exige para reembolsar o paciente, e é o número que **tem que estar também no
              Carnê-Leão dela** — que é de onde vem o erro "Registro profissional não informado
              pelo conselho profissional". A Receita cruza CPF ↔ base do conselho; digitar aqui
              não substitui o cadastro lá. Ver `checklistDoRecibo`. */}
          <label style={s("display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-size:var(--t-label);color:var(--muted)")}>
              Seu registro no conselho — é ele que o plano de saúde exige para reembolsar
            </span>
            <input
              value={registro}
              onChange={(e) => setRegistro(e.target.value.slice(0, 15))}
              placeholder="CRP 06/123456"
              className="n m-focus"
              style={s("font-family:inherit;font-size:var(--t-body);padding:11px 13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink)")}
            />
            {!registro.trim() && (
              <span style={s("display:flex;gap:7px;align-items:flex-start;font-size:var(--t-label);color:var(--warn);line-height:1.5")}>
                <Icon name="alert" size={14} />
                <span>
                  Dá para deixar em branco, mas o mesmo número precisa estar cadastrado no seu
                  Carnê-Leão — senão a Receita recusa o arquivo com{" "}
                  <em>&ldquo;registro profissional não informado pelo conselho&rdquo;</em>. Depois
                  de salvar, veja o passo a passo em <strong>Pronto para emitir?</strong>
                </span>
              </span>
            )}
          </label>

          <div style={s("display:flex;gap:10px;align-items:center;flex-wrap:wrap")}>
            <button
              onClick={() => chamar("POST", { cpf, ocupacao, registro })}
              disabled={ocupado || cpf.replace(/\D/g, "").length !== 11}
              className="m-press m-focus"
              style={s(`display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;border:none;background:var(--primary);color:var(--on-primary);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);cursor:${ocupado ? "default" : "pointer"};opacity:${ocupado || cpf.replace(/\D/g, "").length !== 11 ? 0.55 : 1}`)}
            >
              <Icon name="check" size={15} sw={2.4} stroke="var(--on-primary)" />
              {ocupado ? "Salvando…" : "Ligar os recibos"}
            </button>
            {!soRecibo && (
              <button
                onClick={() => setModo(null)}
                className="m-press m-focus"
                style={s("background:none;border:none;padding:0;font-family:inherit;font-size:var(--t-label);color:var(--muted);cursor:pointer;text-decoration:underline")}
              >
                Na verdade eu tenho CNPJ
              </button>
            )}
          </div>
        </>
      )}

      {/* ── passo 1 · a única pergunta ── */}
      {!ligado && modo === "cnpj" && (
        <>
          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            Digite o CNPJ e eu busco o resto na Receita. Você não vai preencher endereço,
            inscrição municipal nem código de serviço.
          </p>

          <label style={s("display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-size:var(--t-label);color:var(--muted)")}>CNPJ</span>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(mascaraCnpj(e.target.value))}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="n m-focus"
              style={s("font-family:inherit;font-size:var(--t-body);padding:11px 13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink)")}
            />
          </label>

          {previa && (
            <div style={s("display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:12px;background:var(--primary-soft)")}>
              <strong style={s("font-size:var(--t-sm);color:var(--ink)")}>{previa.razaoSocial ?? "—"}</strong>
              <span style={s("font-size:var(--t-label);color:var(--muted)")}>
                {[previa.municipio, previa.uf].filter(Boolean).join(" · ")}
                {previa.optanteMei ? " · MEI" : previa.optanteSimples ? " · Simples Nacional" : ""}
              </span>
              {/* Quem é MEI emite pelo Ambiente Nacional obrigatoriamente. Dizer isso aqui
                  transforma uma regra invisível em confirmação de que acertamos o caminho. */}
              {previa.optanteMei && (
                <span style={s("font-size:var(--t-label);color:var(--muted)")}>
                  Sua nota sai pelo Ambiente Nacional, como o MEI exige.
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => chamar("POST", { cnpj })}
            disabled={ocupado || cnpj.replace(/\D/g, "").length !== 14}
            className="m-press m-focus"
            style={s(`align-self:flex-start;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;border:none;background:var(--primary);color:var(--on-primary);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);cursor:${ocupado ? "default" : "pointer"};opacity:${ocupado || cnpj.replace(/\D/g, "").length !== 14 ? 0.55 : 1}`)}
          >
            <Icon name="check" size={15} sw={2.4} stroke="var(--on-primary)" />
            {ocupado ? "Cadastrando…" : "É esse, pode cadastrar"}
          </button>
        </>
      )}

      {/* ── passo 2 · o certificado, que é entrega e não pergunta ── */}
      {ligado && !config.certificadoValidoAte && (
        <>
          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            <strong style={s("color:var(--ink)")}>{config.razaoSocial ?? config.cnpj}</strong> já
            está cadastrada. Falta o certificado digital <strong style={s("color:var(--ink)")}>A1
            do CNPJ</strong> (arquivo <code className="n">.pfx</code> ou <code className="n">.p12</code>)
            — é ele que assina a nota.
          </p>
          {/* ⚠️ Esta frase é o que faz alguém subir um e-CNPJ. Ela é verdade do código, não
              copy: o arquivo é repassado e descartado, e nada no sistema pode tocá-lo depois. */}
          <p style={s("margin:0;font-size:var(--t-label);color:var(--muted);line-height:1.5")}>
            O arquivo passa por aqui e vai direto para o emissor. Não guardamos ele nem a
            senha — do certificado, fica só a data de vencimento.
          </p>

          <div style={s("display:flex;flex-direction:column;gap:10px")}>
            <input ref={arquivo} type="file" accept=".pfx,.p12" className="m-focus"
              style={s("font-family:inherit;font-size:var(--t-sm);color:var(--ink)")} />
            <input
              value={senha} onChange={(e) => setSenha(e.target.value)}
              type="password" placeholder="Senha do certificado" className="m-focus"
              style={s("font-family:inherit;font-size:var(--t-body);padding:11px 13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--ink)")}
            />
            <button
              onClick={async () => {
                const f = arquivo.current?.files?.[0];
                if (!f) { setErro("Escolha o arquivo do certificado."); return; }
                try {
                  await chamar("PUT", { pfx: await paraBase64(f), senha });
                  setSenha("");
                } catch { setErro("Não consegui ler esse arquivo."); }
              }}
              disabled={ocupado}
              className="m-press m-focus"
              style={s(`align-self:flex-start;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;border:none;background:var(--primary);color:var(--on-primary);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);cursor:${ocupado ? "default" : "pointer"};opacity:${ocupado ? 0.55 : 1}`)}
            >
              <Icon name="check" size={15} sw={2.4} stroke="var(--on-primary)" />
              {ocupado ? "Instalando…" : "Instalar certificado"}
            </button>
          </div>
        </>
      )}

      {/* ── passo 3 · o que ainda falta, e a virada de chave ── */}
      {ligado && config.certificadoValidoAte && (
        <>
          <p style={s("margin:0;font-size:var(--t-sm);color:var(--muted);line-height:1.55")}>
            <strong style={s("color:var(--ink)")}>{config.razaoSocial ?? config.cnpj}</strong>
            {" · "}certificado vale até{" "}
            <span className="n">{config.certificadoValidoAte.split("-").reverse().join("/")}</span>
            {caminho === "nacional" ? " · Ambiente Nacional" : " · nota da prefeitura"}
          </p>

          {falta.length > 0 && (
            <p style={s("margin:0;font-size:var(--t-sm);color:var(--warn);line-height:1.55")}>
              Ainda falta {falta.join(", ")}.
            </p>
          )}

          {/* Virar a chave é irreversível na prática: nota autorizada em produção não se
              apaga, cancela-se na prefeitura. Por isso o botão só existe quando nada falta —
              e o caso de uso recusa de novo do outro lado. */}
          {pronto && config.ambiente !== "producao" && (
            <button
              onClick={() => chamar("PATCH")}
              disabled={ocupado}
              className="m-press m-focus"
              style={s(`align-self:flex-start;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font-family:inherit;font-size:var(--t-sm);font-weight:var(--w-title);cursor:${ocupado ? "default" : "pointer"}`)}
            >
              <Icon name="sparkle" size={15} sw={2.2} stroke="var(--primary-dark)" />
              {ocupado ? "Liberando…" : "Emitir valendo a partir de agora"}
            </button>
          )}
        </>
      )}

      {erro && (
        <p role="alert" style={s("margin:0;font-size:var(--t-sm);color:var(--danger);line-height:1.5")}>{erro}</p>
      )}
    </section>
  );
}
