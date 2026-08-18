import type { Metadata } from "next";
import { PaginaJuridica, CONTATO } from "../_lib/Juridico";

/* ─────────────────────────────────────────────────────────────────────────────
 * TERMOS DE USO.
 *
 * O Google pede a URL de termos junto com a de privacidade na tela de configuração do
 * consentimento. Ela é tecnicamente opcional em alguns fluxos e, na prática, um app sem
 * termos parece inacabado para quem revisa — e "parecer inacabado" é o que faz um revisor
 * olhar com mais atenção para o resto.
 *
 * Escrito curto e sem cláusula abusiva de propósito. O leitor real é um dono de barbearia,
 * e o que ele precisa saber é o que acontece com a agenda dele, quem responde se a MAISA
 * errar um horário, e como ele sai.
 * ────────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Termos de Uso · maisa",
  description: "As regras de uso da MAISA: o que ela faz, o que você garante, e como cancelar.",
};

export default function Termos() {
  return (
    <PaginaJuridica
      titulo="Termos de Uso"
      resumo="Em uma frase: a MAISA atende seus clientes e marca na sua agenda; você continua responsável pelo seu negócio e pode sair quando quiser, levando seus dados."
    >
      <section>
        <h2>O que a MAISA faz</h2>
        <p>
          A MAISA responde mensagens dos seus clientes no WhatsApp, oferece horários com base
          na sua agenda e no seu horário de atendimento, marca, remarca e cancela
          atendimentos, e — se você ligar — emite nota fiscal. Quando ela não consegue
          resolver, chama você.
        </p>
        <p>
          Ela é uma assistente automatizada, e o texto das respostas é gerado por um modelo de
          linguagem. Isso significa que ela pode errar. Você mantém acesso a todas as conversas
          e pode assumir qualquer uma a qualquer momento.
        </p>
      </section>

      <section>
        <h2>O que você garante</h2>
        <ul>
          <li>
            Que o número de WhatsApp conectado é seu ou do seu negócio, e que você pode
            responder por ele.
          </li>
          <li>
            Que você tem base legal para tratar os dados dos seus clientes que passar para a
            MAISA — inclusive a lista de contatos, se importar.
          </li>
          <li>
            Que não vai usar a MAISA para mensagem não solicitada em massa, conteúdo ilegal ou
            qualquer coisa que viole os termos do WhatsApp.
          </li>
        </ul>
        <p>
          Sobre o WhatsApp: a MAISA se conecta ao seu WhatsApp como um aparelho vinculado. Nós
          não somos afiliados ao WhatsApp nem à Meta, e o uso continuado depende dos termos
          deles.
        </p>
      </section>

      <section>
        <h2>Sua agenda do Google</h2>
        <p>
          Conectar é opcional e reversível a qualquer momento pelo painel. Enquanto conectada,
          a MAISA cria e altera eventos na sua agenda — é para isso que ela serve. Os detalhes
          de quais acessos pedimos e o que fazemos com eles estão na{" "}
          <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </section>

      <section>
        <h2>Responsabilidade</h2>
        <p>
          A MAISA é uma ferramenta de apoio ao seu atendimento, e você continua sendo o
          responsável pelo seu negócio: pelos serviços prestados, pelos preços anunciados, pelo
          cumprimento dos horários marcados e pelas obrigações fiscais.
        </p>
        <p>
          Fazemos o possível para o serviço ficar no ar, mas ele depende de terceiros — WhatsApp,
          Google, provedores de nuvem — e não podemos garantir disponibilidade ininterrupta. Não
          respondemos por lucro cessante decorrente de indisponibilidade.
        </p>
      </section>

      <section>
        <h2>Preço e cancelamento</h2>
        <p>
          O valor e a periodicidade são os informados no momento da contratação. Você pode
          cancelar quando quiser, sem multa: escreva para{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a>. O acesso continua até o fim do período já
          pago. Ao encerrar, você pode pedir uma cópia dos seus dados antes da exclusão.
        </p>
      </section>

      <section>
        <h2>Encerramento pela nossa parte</h2>
        <p>
          Podemos encerrar uma conta que esteja usando a MAISA para as coisas listadas em
          &ldquo;O que você garante&rdquo;, avisando antes por e-mail sempre que for possível.
        </p>
      </section>

      <section>
        <h2>Foro e lei</h2>
        <p>
          Estes termos são regidos pela lei brasileira, e fica eleito o foro da comarca de São
          Paulo/SP para o que não puder ser resolvido conversando.
        </p>
      </section>
    </PaginaJuridica>
  );
}
