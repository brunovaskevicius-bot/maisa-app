import type { Metadata } from "next";
import { PaginaJuridica, CONTATO } from "../_lib/Juridico";

/* ─────────────────────────────────────────────────────────────────────────────
 * POLÍTICA DE PRIVACIDADE — e ela é ESPECÍFICA de propósito.
 *
 * O revisor do Google procura três coisas que uma política genérica não tem:
 *   1. os ESCOPOS pedidos, nomeados, e o que o app faz com cada um;
 *   2. a declaração de Uso Limitado (Limited Use) para dados de escopo sensível;
 *   3. como o usuário APAGA os dados dele, com passo a passo que existe de verdade.
 *
 * Política de modelo, com "podemos compartilhar com parceiros", é reprovação — porque
 * contradiz o Uso Limitado. Cada frase aqui foi conferida contra o código: os escopos
 * saem de `saida/google/config.ts`, as chamadas de `calendario.ts`, e a cifra de
 * `cripto.ts`. Se o app mudar o que faz, ESTA PÁGINA MUDA JUNTO — descrever a mais é tão
 * reprovável quanto descrever a menos.
 * ────────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Política de Privacidade · maisa",
  description:
    "Como a MAISA trata os dados do seu negócio, dos seus clientes e da sua agenda do Google.",
};

export default function Privacidade() {
  return (
    <PaginaJuridica
      titulo="Política de Privacidade"
      resumo="Em uma frase: a MAISA usa os seus dados para atender os seus clientes e marcar na sua agenda — e para mais nada. Não vendemos, não usamos para anúncios e não treinamos modelo de IA com o conteúdo das suas conversas."
    >
      <section>
        <h2>Quem somos</h2>
        <p>
          A MAISA é uma assistente de atendimento que responde os clientes de um negócio pelo
          WhatsApp e marca os atendimentos na agenda do dono. Ela é operada por Bruno
          Vaskevicius, no contexto do núcleo de inovação da Poli Júnior. O contato para
          qualquer assunto de dados é <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>
      </section>

      <section>
        <h2>Que dados a MAISA guarda</h2>
        <ul>
          <li>
            <strong>Do negócio:</strong> nome, tipo de negócio, serviços, preços, horário de
            atendimento, profissionais e, quando o dono liga a nota fiscal, os dados fiscais
            necessários para emiti-la.
          </li>
          <li>
            <strong>Da conta:</strong> e-mail e senha (a senha é guardada pelo Supabase, nosso
            provedor de autenticação, e nunca em texto legível).
          </li>
          <li>
            <strong>Das conversas:</strong> as mensagens trocadas entre a MAISA e os clientes
            do negócio, com o telefone de quem escreveu. É isso que permite ao dono acompanhar
            e assumir a conversa quando quiser.
          </li>
          <li>
            <strong>Dos contatos:</strong> se o dono escolher importar a agenda do WhatsApp
            dele, guardamos nome e telefone dos contatos. Serve para a MAISA chamar as pessoas
            pelo nome e para o dono marcar quem ela deve ou não atender.
          </li>
          <li>
            <strong>Da agenda do Google:</strong> descrito na seção seguinte, que é a que
            trata disso em detalhe.
          </li>
        </ul>
      </section>

      <section>
        <h2>Dados da sua conta Google</h2>
        <p>
          Conectar a agenda do Google é opcional. Sem ela a MAISA conversa, mas não consegue
          marcar horário. Quando você conecta, pedimos exatamente estes acessos:
        </p>
        <ul>
          <li>
            <code>calendar.events</code> — ver, criar, alterar e cancelar <strong>eventos</strong>{" "}
            da sua agenda. Pedimos este e não o acesso amplo ao Google Agenda: ele não deixa a
            MAISA mexer nas configurações da sua conta nem na lista de calendários.
          </li>
          <li>
            <code>userinfo.email</code> e <code>openid</code> — saber qual conta Google foi
            conectada, para mostrar na tela e evitar que você conecte a errada sem perceber.
          </li>
        </ul>

        <h3>O que fazemos com eles</h3>
        <ul>
          <li>
            <strong>Ler os horários já ocupados</strong> na sua agenda, para a MAISA não
            oferecer ao cliente um horário em que você já tem compromisso.
          </li>
          <li>
            <strong>Criar o evento</strong> do atendimento marcado, com o nome do cliente, o
            serviço e — se você pedir — um link do Google Meet.
          </li>
          <li>
            <strong>Alterar ou cancelar</strong> esse evento quando o atendimento é remarcado
            ou desmarcado.
          </li>
        </ul>
        <p>
          A MAISA <strong>não lê o conteúdo dos seus outros compromissos</strong> para nenhuma
          finalidade além de saber que aquele horário está ocupado, e não copia esses eventos
          para o nosso banco.
        </p>

        <h3>Uso Limitado</h3>
        {/* Declaração de Limited Use. O revisor do Google procura por ela; a ausência é
            reprovação, e a presença tem que ser verdadeira sobre o app inteiro. */}
        <p>
          O uso que a MAISA faz das informações recebidas das APIs do Google obedece à{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado. Em termos práticos, isso significa que
          esses dados <strong>não são</strong> vendidos, <strong>não são</strong> usados para
          publicidade, <strong>não são</strong> usados para treinar modelos de inteligência
          artificial, e <strong>não são</strong> lidos por pessoas — exceto se você pedir
          suporte e autorizar, ou se a lei exigir.
        </p>

        <h3>Como desconectar e apagar</h3>
        <p>
          No painel, em <strong>Ajustes da MAISA → Agenda</strong>, existe o botão{" "}
          <strong>Desconectar</strong>. Ele apaga o token de acesso do nosso banco na hora, e a
          MAISA perde o acesso à sua agenda imediatamente. Você também pode revogar pelo{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            painel de permissões da sua Conta Google
          </a>
          . Os eventos que já foram criados na sua agenda continuam lá — eles são seus.
        </p>
      </section>

      <section>
        <h2>Como os dados são protegidos</h2>
        <ul>
          <li>
            Os tokens de acesso ao Google são <strong>cifrados</strong> antes de ir para o
            banco (AES-256-GCM), com chave que vive só no servidor. Quem tivesse uma cópia do
            banco não conseguiria usá-los.
          </li>
          <li>
            Os dados de cada negócio ficam isolados no banco por regras aplicadas pelo próprio
            Postgres, não só por código nosso — um negócio não alcança os dados de outro.
          </li>
          <li>Todo o tráfego é por HTTPS.</li>
        </ul>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <p>
          Só com quem é necessário para o serviço funcionar, e sempre no papel de operador:
          Supabase (banco e login), Vercel (hospedagem), Evolution API (ponte com o WhatsApp),
          Google (agenda, quando você conecta), Google Gemini (o modelo que redige as
          respostas) e Focus NFe (emissão de nota, quando você liga). Nenhum deles recebe seus
          dados para uso próprio, e não há venda de dado a ninguém, em nenhuma hipótese.
        </p>
      </section>

      <section>
        <h2>Por quanto tempo guardamos</h2>
        <p>
          Enquanto sua conta existir. As mensagens das conversas são apagadas
          automaticamente depois de 180 dias. Se você encerrar a conta, apagamos os dados do
          negócio, das conversas e dos contatos, guardando apenas o que a lei obriga a manter
          — notas fiscais emitidas, por exemplo, têm prazo legal próprio.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Pela LGPD você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados,
          e revogar consentimentos. Escreva para{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a> e respondemos em até 15 dias.
        </p>
        <p>
          <strong>Sobre os clientes do seu negócio:</strong> os telefones e mensagens deles são
          dados de que <em>você</em> é o controlador — a MAISA os trata a seu pedido, para
          atender essas pessoas. Se um cliente seu pedir exclusão, fale com a gente que
          apagamos.
        </p>
      </section>

      <section>
        <h2>Mudanças</h2>
        <p>
          Se esta política mudar de forma relevante, avisamos por e-mail antes de a mudança
          valer. A data de vigência no topo diz qual versão está no ar.
        </p>
      </section>
    </PaginaJuridica>
  );
}
