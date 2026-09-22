import type { Metadata } from "next";
import Link from "next/link";
import { LinhaLegal } from "../_lib/LinhaLegal";
import { planoPiso } from "../_lib/planos";

/* ─────────────────────────────────────────────────────────────────────────────
 * A HOME PÚBLICA — a porta do produto, e a página que o Google abre.
 *
 * ★ POR QUE ELA EXISTE (21/09/2026).
 *
 * O produto não tinha uma. A raiz `/` é o APP, atrás do login: medido, ela responde 307
 * para o `/login`. As LPs são públicas, mas cada uma é de um ICP — mandar um revisor para
 * `/barbeiros` é pedir que ele avalie um pedido de acesso à agenda olhando uma página
 * sobre barbearia.
 *
 * O Google exige, para verificar um app que pede escopo sensível, uma **home page
 * acessível que descreva o app** e que linke a política de privacidade. `calendar.events`
 * é sensível. Sem isso a verificação não sai, e sem verificação a tela de consentimento
 * trava em 100 usuários — ou seja, o 101º cliente não conecta a agenda dele.
 *
 * ── PARA QUEM ELA ESCREVE ──
 *
 * Para duas pessoas, e as duas estão desconfiadas:
 *
 *   • o revisor do Google, que precisa entender em um minuto o que o app faz e por que
 *     ele pede acesso a uma agenda;
 *   • quem clicou em "app não verificado" e veio ler quem está pedindo.
 *
 * Por isso a seção da agenda é a mais longa da página, e por isso ela diz o que a MAISA
 * **não** faz. O "não" é o que responde o medo real — mesma escolha do `/autorizar`.
 *
 * ── NEUTRA DE ICP, DE PROPÓSITO ──
 *
 * Não usa o `<World>`: ele exige um `icp` e monta a barra fixa de conversão daquele
 * mundo. Esta página não vende para um público; ela apresenta o produto. Por isso está na
 * lista `NAO_SAO_LP` do `juridico.test.ts`, com a tira legal montada à mão pela
 * `<LinhaLegal>` — a guarda cobra o RESULTADO, e o resultado está aqui.
 *
 * ⚠️ Rota nova exige entrada em `PUBLIC_PREFIXES` (`saida/supabase/sessao.ts`). A checagem
 * é por segmento e `/sobre` não herda de nada. Uma home atrás do login seria a piada
 * perfeita: a página que existe para provar que o app é acessível, pedindo senha.
 *
 * ⚠️ O PREÇO NÃO É DIGITADO AQUI. Vem de `planoPiso()`, a mesma tabela das LPs. Um quarto
 * lugar com preço escrito à mão é exatamente o defeito que `_lib/planos.ts` matou.
 * ────────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "MAISA — a secretária de IA que marca horários pelo WhatsApp",
  description:
    "A MAISA atende seus clientes no WhatsApp, marca, remarca e cancela na sua agenda, " +
    "manda lembrete e emite a nota de cada atendimento.",
  /* Esta é a única página do produto que DEVE ser indexada: é a porta. As LPs vivem de
   * tráfego dirigido, e as telas de app são `noindex`. */
  robots: { index: true, follow: true },
};

/** O que ela faz, em frases que descrevem comportamento — não recursos. */
const O_QUE_FAZ = [
  {
    titulo: "Atende no WhatsApp que você já usa",
    texto:
      "Seu cliente manda mensagem no mesmo número de sempre. A MAISA responde, entende o " +
      "que ele quer e oferece os horários que cabem na sua agenda.",
  },
  {
    titulo: "Marca, remarca e cancela sozinha",
    texto:
      "Horário combinado vira compromisso na agenda na hora, sem ninguém digitar. " +
      "Remarcação e cancelamento também — e o horário livre volta a ser oferecido.",
  },
  {
    titulo: "Lembra o cliente antes",
    texto:
      "Um lembrete por atendimento, algumas horas antes. É o que derruba falta, que é o " +
      "prejuízo silencioso de quem trabalha com hora marcada.",
  },
  {
    titulo: "Emite a nota do atendimento",
    texto:
      "Quando o atendimento fecha, o documento fiscal sai pelo mesmo caminho — nota de " +
      "serviço ou recibo, conforme o que você emite.",
  },
];

export default function Sobre() {
  const piso = planoPiso();

  return (
    <main className="lp-tuto">
      <div className="lp-tuto-topo">
        {/* A marca NÃO aponta para `/`: a raiz é o app, atrás do login, e mandar um
            visitante desta página para um formulário de senha é o oposto do que ela faz. */}
        <span className="lp-tuto-marca">maisa</span>
        <Link className="lp-tuto-voltar" href="/login">
          Entrar
        </Link>
      </div>

      <header className="lp-tuto-cabecalho">
        <p className="lp-tuto-sobrancelha">Secretária de IA no WhatsApp</p>
        <h1>A MAISA marca os horários do seu negócio</h1>
        <p className="lp-tuto-resumo">
          Ela conversa com seus clientes no <strong>WhatsApp que você já usa</strong>,
          oferece os horários livres, marca na sua agenda, lembra a pessoa antes e emite a
          nota depois. Você não troca de número, não troca de agenda e não instala nada.
        </p>

        <div className="lp-tuto-requisitos">
          <span><strong>Para quem:</strong></span>
          <span>negócios de hora marcada</span>
          <span>a partir de {piso.preco}{piso.periodo}</span>
        </div>
      </header>

      <section className="lp-tuto-secao">
        <h2>O que ela faz</h2>
        <div className="lp-tuto-passos">
          {O_QUE_FAZ.map((item) => (
            <div key={item.titulo} className="lp-tuto-lista">
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ★ A SEÇÃO QUE O REVISOR ABRE. Ver o cabeçalho do arquivo: é por causa dela que
          esta página existe, e é por isso que ela é a mais longa. */}
      <section className="lp-tuto-secao">
        <h2>A conexão com o Google Agenda</h2>
        <p>
          Conectar a agenda do Google é <strong>opcional</strong>. Sem ela a MAISA conversa
          e responde, mas não consegue marcar nada — o compromisso precisa existir em algum
          lugar que você já olha todo dia.
        </p>

        <div className="lp-tuto-alcance">
          <div className="lp-tuto-pode">
            <h3>O que ela faz na sua agenda</h3>
            <ul>
              <li>Ler os horários já ocupados, para não oferecer um horário que não existe</li>
              <li>Criar o evento do atendimento que ela acabou de combinar</li>
              <li>Alterar o evento quando o cliente remarca</li>
              <li>Cancelar o evento quando o cliente desmarca</li>
            </ul>
          </div>

          <div className="lp-tuto-nao-pode">
            <h3>O que ela não faz</h3>
            <ul>
              <li>Não lê seus e-mails, arquivos, contatos ou qualquer outro serviço Google</li>
              <li>Não mexe em eventos que não foram criados por ela</li>
              <li>Não compartilha sua agenda com ninguém</li>
              <li>Não usa seus dados para treinar modelo de IA nenhum</li>
            </ul>
          </div>
        </div>

        <p className="lp-tuto-ressalva">
          A MAISA pede o acesso mais estreito que resolve o problema — eventos, e não a
          conta inteira do Google. Os escopos exatos, o que é feito com cada um e a
          declaração de Uso Limitado estão na{" "}
          <Link href="/privacidade">política de privacidade</Link>. Você pode desconectar
          quando quiser, pelo app ou pela própria página de permissões da sua conta Google.
        </p>
      </section>

      <section className="lp-tuto-secao">
        <h2>Como começar</h2>
        <p>
          Você cria a conta, diz o nome do negócio e o que você faz, conecta o WhatsApp
          lendo um QR code e define o horário que a MAISA pode anunciar. Leva cerca de meia
          hora, e é tudo pela tela.
        </p>
        <div className="lp-tuto-links">
          <Link className="lp-tuto-botao" href="/cadastro">
            Criar minha conta
          </Link>
          <Link href="/login">Já tenho conta</Link>
        </div>
      </section>

      <footer className="lp-tuto-rodape">
        <LinhaLegal />
      </footer>
    </main>
  );
}
