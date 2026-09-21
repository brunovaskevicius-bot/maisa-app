import React from "react";
import {
  ANCORA_PLANOS,
  PLANOS,
  PLANOS_GARANTIAS,
  PLANOS_LEAD,
  PLANOS_NOTA,
  PLANOS_TITULO,
  linkPlano,
} from "./dados";

/* ----------------------------------------------------------------------------
 * A QUARTA E ÚLTIMA SEÇÃO — os planos, e o fim da página.
 *
 * ELA FECHA UMA LACUNA DEIXADA POR ESCRITO. Até 07/08/2026 a page.tsx dizia: "NÃO
 * TEM CTA NO FIM, e isso é uma lacuna deixada de propósito (…) preencher esse bloco
 * é decisão de quem escreve a oferta, e a regra desta LP é perguntar antes de encher
 * espaço vazio". Perguntado e respondido: três planos, Profissional em destaque,
 * botão para checkout.
 *
 * ── O QUE ESTA SEÇÃO NÃO REPETE DA <Duelo>, E POR QUÊ ─────────────────────
 * Duas seções seguidas com cartão de preço lado a lado é a armadilha óbvia aqui. O
 * que as separa não é enfeite, é FUNÇÃO:
 *
 *   · a <Duelo> compara a maisa com OUTRA COISA (contratar alguém) — dois cartões,
 *     um escuro e um claro, e o escuro ganha;
 *   · esta compara a maisa COM ELA MESMA — três cartões do mesmo material, e o do
 *     meio ganha.
 *
 * Daí as escolhas: aqui NÃO há card escuro (o preto já foi usado, uma vez, para
 * dizer "é este" contra o mundo lá fora), NÃO há dobradiça "vs" (não há duelo), e o
 * destaque do plano do meio é o MESMO brilho azul da <Duelo>, para o olho reconhecer
 * o sinal em vez de aprender um segundo vocabulário no fim da página.
 *
 * ── O DESTAQUE É O PROFISSIONAL, E ELE AMARRA COM A SEÇÃO ANTERIOR ────────
 * O card da maisa na <Duelo> mostra o preço DESTE plano, não o mais barato do catálogo:
 * o mais barato ali virava isca, porque o leitor comparava com um preço e encontrava
 * outro dois blocos abaixo. Desde 21/09/2026 os dois LEEM o mesmo campo de
 * `_lib/planos.ts` em vez de repetir o número — eram duas strings, e elas divergiram.
 *
 * ── A LISTA VIROU TABELA (21/09/2026) ────────────────────────────────────
 * Eram bullets: "Tudo do Essencial", e depois o que o plano tinha A MAIS. Isso vende
 * recurso e falha em vender CAPACIDADE — em nenhum lugar da página estava escrito
 * quantos profissionais e quantos agendamentos cabem em cada plano, que é a única
 * coisa que de fato muda entre eles. Agora cada cartão mostra as mesmas linhas, na
 * mesma ordem, com o valor à direita: o olho varre as três colunas numa passada e a
 * comparação acontece sem tabela de verdade nem scroll horizontal no celular.
 *
 * O EXCEDENTE É UMA DESSAS LINHAS, e não letra miúda no pé. Um limite de agendamentos
 * sem o preço do que passa dele é a pegadinha que só aparece na fatura.
 *
 * ── SEM TARJA "RECOMENDADO", DE NOVO ─────────────────────────────────────
 * O catálogo antigo (`../PlanosBarbeiros.tsx`) usa uma pílula dourada com estrela. A
 * pílula é exatamente o recurso que o cliente reprovou nesta página em 06/08, e a
 * <Duelo> já tinha decidido não repô-la. O plano do meio se distingue por brilho,
 * borda azul e um respiro maior — o mesmo trio de lá.
 *
 * ── O BOTÃO PODE MUDAR DE DESTINO SEM MUDAR ESTE ARQUIVO ─────────────────
 * `linkPlano()` decide: **Essencial e Profissional vão para `/assinar/<plano>`**, o
 * pré-cadastro; o **Escala vai para o WhatsApp**, porque a §19 do documento de
 * precificação o põe sob proposta e ali a venda É conversa.
 *
 * Nunca para um link de pagamento, e isso foi medido em 21/09/2026: a conta live tinha 21
 * clientes (três com o mesmo e-mail, criados em segundos) e 14 assinaturas sem
 * `metadata`, nenhuma atribuível a inquilino — era o link antigo sendo clicado de novo,
 * criando ficha nova a cada clique. Link de pagamento cobra sem saber de quem é.
 *
 * ZERO JAVASCRIPT, como as outras três. Sai inteira do servidor.
 * -------------------------------------------------------------------------- */

export function Planos() {
  return (
    /* O `id` É O DESTINO DE TODA A PÁGINA, e ele vem do dados.ts em vez de digitado
       aqui: são quatro botões apontando para esta seção (dobra, telas, duelo e o
       menu de nada, que não existe). Ver a nota do `ANCORA_PLANOS`. O respiro do
       pouso mora no `scroll-margin-top` de `#planos`, no v3.css — sem ele o título
       encosta na borda de cima da janela. */
    <section className="lp3-p" id={ANCORA_PLANOS} aria-labelledby="lp3-p-titulo">
      <header className="lp3-p-cab">
        <h2 className="lp3-p-titulo" id="lp3-p-titulo">
          {PLANOS_TITULO}
        </h2>
        <span className="lp3-p-filete" aria-hidden="true" />
        <p className="lp3-p-lead">{PLANOS_LEAD}</p>
      </header>

      <div className="lp3-p-grade">
        {PLANOS.map((plano) => {
          const { href, externo } = linkPlano(plano);
          return (
            <article
              className="lp3-p-cartao"
              key={plano.chave}
              data-destaque={plano.destaque ? "sim" : undefined}
            >
              <h3 className="lp3-p-nome">{plano.nome}</h3>
              <p className="lp3-p-resumo">{plano.resumo}</p>

              <p className="lp3-p-preco">
                {plano.preco}
                <span className="lp3-p-periodo">{plano.periodo}</span>
              </p>

              {/* Rótulo à esquerda, valor à direita — a mesma forma da LP de terapeutas,
                  de propósito: é o mesmo produto e a mesma tabela, e quem vir as duas
                  páginas tem de reconhecer o mesmo objeto. O `<dl>` é o elemento certo
                  para par rótulo/valor, e é ele que faz o leitor de tela anunciar "até
                  10 profissionais" em vez de duas palavras soltas. */}
              <dl className="lp3-p-specs">
                {plano.specs.map((spec) => (
                  <div className="lp3-p-linha" key={spec.rotulo}>
                    <dt className="lp3-p-rotulo">{spec.rotulo}</dt>
                    <dd className="lp3-p-valor">{spec.valor}</dd>
                  </div>
                ))}
              </dl>

              {/* `rel="noopener"` mesmo sem `target`: o WhatsApp abre em aba nova
                  (externo), o Stripe abre na mesma. O atributo só existe quando há
                  target, então ele acompanha a condição em vez de ficar solto. */}
              <a
                className="lp3-p-cta"
                href={href}
                {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {plano.cta}
              </a>
            </article>
          );
        })}
      </div>

      <ul className="lp3-p-garantias">
        {PLANOS_GARANTIAS.map((g) => (
          <li className="lp3-p-garantia" key={g}>
            <span className="lp3-p-check" aria-hidden="true" />
            {g}
          </li>
        ))}
      </ul>

      <p className="lp3-p-nota">{PLANOS_NOTA}</p>
    </section>
  );
}
