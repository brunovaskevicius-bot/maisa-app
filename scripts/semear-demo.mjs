/* ─────────────────────────────────────────────────────────────────────────────
 * SEMEAR DEMO — enche os últimos 30 dias de atendimentos pagos, para ter o que emitir.
 *
 *   npm run semear              apaga a semente anterior e planta uma nova (o normal)
 *   npm run semear -- --manter  planta sem apagar a anterior (empilha)
 *   npm run semear -- --limpar  só apaga a semente, não planta nada
 *   npm run semear -- 40        planta 40 atendimentos em vez de 24
 *
 * ── ⚠️ ISTO ESCREVE NO SUPABASE DE PRODUÇÃO ──
 *
 * Não existe banco de desenvolvimento neste projeto: o `.env.local` aponta para o Supabase real.
 * O script escreve com a `service_role`, que passa por cima do RLS. Ele se limita ao tenant do
 * `MAISA_TENANT_ID` e só apaga linhas que ele mesmo plantou — ver `MARCA`.
 *
 * ── ★ COMO ELE SABE O QUE É SEMENTE ──
 *
 * `ator_tipo = 'sistema'` + `ator_id = 'semente-demo'`, colunas que a tabela já tem para dizer
 * quem disparou a escrita. É por elas que a limpeza acontece — nunca por data, nunca por nome do
 * cliente. Apagar "tudo dos últimos 30 dias" apagaria atendimento real no dia em que existir um.
 *
 * ⚠️ E A LIMPEZA NÃO TOCA EM NADA QUE JÁ VIROU RECIBO (`recibo_id`/`lote_recibo_id` não nulos).
 * Documento fiscal emitido tem que continuar apontando para o pagamento que o originou; apagar o
 * pagamento deixaria o recibo órfão no livro-razão.
 *
 * ── ★ OS CPFs SÃO VÁLIDOS, E ISSO NÃO É DETALHE ──
 *
 * Um CPF que não fecha no dígito verificador é recusado na emissão — e no caminho do arquivo do
 * e-CAC ele faz a Receita recusar o arquivo INTEIRO por causa de uma linha. Semente com CPF
 * inventado à mão dá um teste que falha por motivo errado (foi o que aconteceu com o seed
 * anterior, onde 15 de 17 clientes reprovavam). Aqui os dígitos são calculados.
 * ────────────────────────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/* ── .env.local na mão: este script roda fora do Next, que é quem normalmente carrega isso ── */
const raiz = path.resolve(process.argv[1], "../..");
for (const linha of fs.readFileSync(path.join(raiz, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (!linha.trim() || linha.trim().startsWith("#") || corte < 0) continue;
  const chave = linha.slice(0, corte).trim();
  if (!process.env[chave]) process.env[chave] = linha.slice(corte + 1).trim().replace(/^["']|["']$/g, "");
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT = process.env.MAISA_TENANT_ID;
if (!URL || !CHAVE || !TENANT) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou MAISA_TENANT_ID no .env.local.");
  process.exit(1);
}

const MARCA = "semente-demo";
const argv = process.argv.slice(2);
const soLimpar = argv.includes("--limpar");
const manter = argv.includes("--manter");
const QUANTOS = Number(argv.find((a) => /^\d+$/.test(a)) ?? 24);
const DIAS = 30;

const db = createClient(URL, CHAVE, { auth: { persistSession: false } });

/* ── CPF com dígito verificador de verdade (módulo 11) ────────────────────────── */

function cpfComDigitos(base9) {
  const n = String(base9).padStart(9, "0").slice(0, 9).split("").map(Number);
  const dv = (arr) => {
    const peso = arr.length + 1;
    const soma = arr.reduce((a, d, i) => a + d * (peso - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n);
  const d2 = dv([...n, d1]);
  return [...n, d1, d2].join("");
}

const pontuado = (cpf) => `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;

/* ── as pessoas ───────────────────────────────────────────────────────────────
 * ⚠️ TELEFONE FALSO DE PROPÓSITO (11 9 0000-00XX). Os clientes que já estavam no banco têm TODOS
 * o número pessoal do Bruno, então qualquer aviso por WhatsApp cai no celular dele, dezenas de
 * vezes. Semente com número inexistente falha no envio em vez de tocar o telefone de alguém.
 *
 * ⚠️ Dois deles entram SEM CPF, de propósito: é o caso que a tela precisa mostrar ("fica de fora
 * até ter o CPF"), e semente que só tem o caminho felizes esconde exatamente essa linha. */
const PESSOAS = [
  { nome: "Ana Beatriz Rocha", cpfBase: 321654987 },
  { nome: "Carlos Eduardo Pinto", cpfBase: 234567890 },
  { nome: "Débora Nogueira", cpfBase: 345678901 },
  { nome: "Eduardo Salles", cpfBase: 456789012 },
  { nome: "Fernanda Prado", cpfBase: 567890123 },
  { nome: "Gustavo Rangel", cpfBase: 678901234 },
  { nome: "Helena Vasques", cpfBase: 789012345 },
  { nome: "Igor Bittencourt", cpfBase: 890123456 },
  { nome: "Juliana Marques", cpfBase: null },
  { nome: "Kleber Antunes", cpfBase: null },
];

/* Um gerador previsível: rodar duas vezes tem que dar a mesma cara de mês, senão comparar duas
 * execuções é impossível. Semente fixa, sem `Math.random`. */
let semente = 20260826;
const sorteio = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
const escolher = (arr) => arr[Math.floor(sorteio() * arr.length)];

const iso = (d) => d.toISOString();
const diaLocal = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

async function main() {
  console.log(`\ninquilino ${TENANT}\n`);

  /* ── 1 · limpeza da semente anterior ── */
  if (!manter) {
    const { data: apagaveis, error: e1 } = await db
      .from("atendimentos")
      .select("id")
      .eq("tenant_id", TENANT)
      .eq("ator_id", MARCA)
      .is("recibo_id", null)
      .is("lote_recibo_id", null);
    if (e1) throw new Error(`ler semente anterior: ${e1.message}`);

    if (apagaveis?.length) {
      const { error } = await db.from("atendimentos").delete()
        .eq("tenant_id", TENANT).in("id", apagaveis.map((a) => a.id));
      if (error) throw new Error(`apagar semente: ${error.message}`);
    }
    console.log(`apagados ${apagaveis?.length ?? 0} atendimentos da semente anterior (os que já viraram recibo ficaram)`);
  }

  if (soLimpar) { console.log("\n--limpar: nada plantado.\n"); return; }

  /* ── 2 · quem atende e o que se vende ── */
  const { data: profs, error: e2 } = await db
    .from("profissionais").select("id,nome").eq("tenant_id", TENANT).eq("ativo", true).limit(1);
  if (e2 || !profs?.length) throw new Error(`sem profissional ativo neste inquilino: ${e2?.message ?? "nenhum"}`);
  const prof = profs[0];

  const { data: servicos, error: e3 } = await db
    .from("servicos").select("id,nome,preco,duracao").eq("tenant_id", TENANT).eq("ativo", true);
  if (e3 || !servicos?.length) throw new Error(`sem serviço ativo neste inquilino: ${e3?.message ?? "nenhum"}`);

  console.log(`profissional: ${prof.nome} · ${servicos.length} serviços ativos`);

  /* ── 3 · os clientes da semente, por nome (upsert à mão: não há unique em nome) ──
   *
   * ⚠️ NENHUM CLIENTE PODE TER O CPF DO EMITENTE, e isto foi aprendido do jeito caro: a primeira
   * versão deu a um dos clientes o mesmo CPF que estava em `config_fiscal.prestador_cpf`, e a
   * emissão voltou `RECEIPT_ERROR_013 Payer CPF cannot be the same as the issuer CPF` — a Receita
   * não aceita alguém emitindo recibo para si mesmo. O erro é do CANAL, chega depois da rede, e
   * numa semente ele parece bug do app.
   *
   * Falha ruidosa e para tudo: semente que planta um dado que a Receita recusa é pior que semente
   * nenhuma, porque o teste falha por motivo errado. */
  const { data: cfg } = await db
    .from("config_fiscal").select("prestador_cpf").eq("tenant_id", TENANT).maybeSingle();
  const cpfEmitente = (cfg?.prestador_cpf ?? "").replace(/\D/g, "");

  const idPorNome = new Map();
  for (const [i, p] of PESSOAS.entries()) {
    const cpf = p.cpfBase == null ? null : pontuado(cpfComDigitos(p.cpfBase));
    if (cpf && cpf.replace(/\D/g, "") === cpfEmitente) {
      throw new Error(
        `o CPF de ${p.nome} (${cpf}) é o mesmo do emitente — a Receita recusa recibo para si `
        + `mesmo (RECEIPT_ERROR_013). Troque o \`cpfBase\` dele em PESSOAS.`,
      );
    }
    const telefone = `(11) 90000-00${String(i).padStart(2, "0")}`;

    const { data: achado } = await db
      .from("clientes").select("id").eq("tenant_id", TENANT).eq("nome", p.nome).limit(1);

    if (achado?.length) {
      const { error } = await db.from("clientes")
        .update({ cpf, telefone, ativo: true, atualizado_em: iso(new Date()) })
        .eq("tenant_id", TENANT).eq("id", achado[0].id);
      if (error) throw new Error(`atualizar cliente ${p.nome}: ${error.message}`);
      idPorNome.set(p.nome, achado[0].id);
    } else {
      const { data, error } = await db.from("clientes")
        .insert({
          tenant_id: TENANT, nome: p.nome, telefone, cpf, canal: "Presencial", ativo: true,
          desde: diaLocal(new Date(Date.now() - 200 * 86400000)),
        })
        .select("id").single();
      if (error) throw new Error(`criar cliente ${p.nome}: ${error.message}`);
      idPorNome.set(p.nome, data.id);
    }
  }
  const comCpf = PESSOAS.filter((p) => p.cpfBase != null).length;
  console.log(`${PESSOAS.length} clientes prontos (${comCpf} com CPF válido, ${PESSOAS.length - comCpf} sem CPF de propósito)`);

  /* ── 4 · os atendimentos ──
   * ⚠️ TODOS NO PASSADO. `v_a_recibar` exige `inicio < now()`: sessão futura não é pagamento, e
   * semear no futuro daria uma lista vazia com o banco cheio. */
  const agora = Date.now();
  const linhas = [];

  /* ⚠️ O QUE JÁ FOI OCUPADO NESTA RODADA — e por que isto existe.
   *
   * Até 04/09/2026 este laço sorteava hora em passos de 30 min e ignorava a DURAÇÃO: uma
   * sessão de 40 min às 14h e outra às 14:30 saíam as duas, sobrepostas, e nada checava.
   * Não incomodou ninguém enquanto a tabela era espelho do Google. Quando ela virou a
   * agenda de verdade (ADR-0009) e ganhou constraint de exclusão (migração 027), o
   * `alter table` REPROVOU contra o banco de produção por causa destas linhas.
   *
   * Um array e não um `Set` de chaves: colisão aqui é de INTERVALO, não de horário de
   * início — que é exatamente o erro que se está consertando. */
  const ocupados = [];
  const colide = (ini, fim) =>
    ocupados.some((o) => ini < o.fim && fim > o.ini);

  for (let k = 0; k < QUANTOS; k++) {
    const pessoa = escolher(PESSOAS);
    const servico = escolher(servicos);
    const dur = servico.duracao ?? 40;

    /* `horaInicio` sai daqui junto com o resto porque é a PROJEÇÃO CIVIL que a tela e o
     * fechamento fiscal leem — recalculá-la depois, a partir do instante, seria refazer a
     * conversão de fuso na leitura e abrir a chance de as duas discordarem. */
    let local, inicio, fim, horaInicio;

    /* Até 40 tentativas. Com 24 atendimentos em ~21 dias úteis × 22 faixas, achar buraco é
     * trivial — o teto existe só para o laço não ser infinito se alguém subir `QUANTOS`
     * além do que o calendário comporta. Estourar não é erro: planta menos e avisa. */
    let tentativa = 0;
    do {
      /* Espalha nos últimos 30 dias, em dia de semana e hora comercial. Domingo com sessão às 3h da
       * manhã não é dado de teste, é ruído que faz duvidar da tela. */
      let dia = new Date(agora - Math.floor(1 + sorteio() * (DIAS - 1)) * 86400000);
      const semana = dia.getDay();
      if (semana === 0) dia = new Date(dia.getTime() - 2 * 86400000);
      if (semana === 6) dia = new Date(dia.getTime() - 1 * 86400000);

      const hora = 8 + Math.floor(sorteio() * 11);          // 8h–18h
      const meia = sorteio() < 0.5 ? 0 : 30;
      local = diaLocal(dia);
      /* -03:00 é o fuso de São Paulo. Escrever o instante com o offset explícito evita que o fuso
       * da máquina de quem roda o script mude a data civil do atendimento. */
      inicio = new Date(`${local}T${String(hora).padStart(2, "0")}:${meia ? "30" : "00"}:00-03:00`);
      fim = new Date(inicio.getTime() + dur * 60000);
      horaInicio = hora + (meia ? 0.5 : 0);
      tentativa++;
    } while (colide(inicio.getTime(), fim.getTime()) && tentativa < 40);

    if (colide(inicio.getTime(), fim.getTime())) {
      console.log(`  (pulei um: não achei horário livre em ${tentativa} tentativas)`);
      continue;
    }
    ocupados.push({ ini: inicio.getTime(), fim: fim.getTime() });

    linhas.push({
      tenant_id: TENANT,
      maisa_ag: crypto.randomUUID(),
      profissional_id: prof.id,
      cliente_id: idPorNome.get(pessoa.nome),
      cliente_nome: pessoa.nome,
      cliente_tel: `(11) 90000-00${String(PESSOAS.findIndex((p) => p.nome === pessoa.nome)).padStart(2, "0")}`,
      servico_id: servico.id,
      servico_nome: servico.nome,
      servico_valor: servico.preco ?? 0,
      inicio: iso(inicio),
      fim: iso(fim),
      duracao_min: dur,
      data_local: local,
      hora_inicio: horaInicio,
      etapa: "feito",
      confirmado: true,
      situacao: "marcado",
      /* ★ A MARCA. É por ela que a limpeza sabe o que é semente. */
      ator_tipo: "sistema",
      ator_id: MARCA,
    });
  }

  const { error: e4 } = await db.from("atendimentos").insert(linhas);
  if (e4) throw new Error(`inserir atendimentos: ${e4.message}`);

  /* ── 5 · confere pela MESMA porta que a tela usa ──
   * ⚠️ Ler a tabela provaria só que o insert passou. A tela lê `v_a_recibar`, que filtra por
   * cliente ativo, sessão no passado e pagamento fora de recibo — é ela que precisa responder. */
  const { data: fila, error: e5 } = await db
    .from("v_a_recibar").select("nome,cpf,valor,data").eq("tenant_id", TENANT).order("data");
  if (e5) throw new Error(`ler v_a_recibar: ${e5.message}`);

  const total = fila.reduce((a, l) => a + Number(l.valor), 0);
  const semCpf = fila.filter((l) => !l.cpf).length;

  console.log(`\nplantados ${linhas.length} atendimentos nos últimos ${DIAS} dias`);
  console.log(`a emitir agora: ${fila.length} pagamentos · R$ ${total.toFixed(2)} · ${semCpf} sem CPF`);
  console.log(`\nprimeiros:`);
  for (const l of fila.slice(0, 5)) {
    console.log(`   ${l.data}  ${String(l.nome).padEnd(22)} ${l.cpf ?? "sem CPF".padEnd(14)}  R$ ${Number(l.valor).toFixed(2)}`);
  }
  console.log(`\nAbra a tela Fiscal. Para desfazer: npm run semear -- --limpar\n`);
}

main().catch((e) => { console.error(`\n✗ ${e.message}\n`); process.exit(1); });
