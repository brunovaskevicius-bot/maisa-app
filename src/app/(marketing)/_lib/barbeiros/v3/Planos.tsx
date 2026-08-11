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
 * O card da maisa na <Duelo> mostra R$ 147 — o preço DESTE plano, não o mais barato
 * do catálogo. Era R$ 97 até 07/08/2026, e virou isca no instante em que esta seção
 * passou a mostrar os três: o leitor comparava com um preço e encontrava outro dois
 * blocos abaixo. Os dois números são a mesma afirmação e mudam juntos — está escrito
 * no dados.ts, nos dois lugares.
 *
 * ── SEM TARJA "RECOMENDADO", DE NOVO ─────────────────────────────────────
 * O catálogo antigo (`../PlanosBarbeiros.tsx`) usa uma pílula dourada com estrela. A
 * pílula é exatamente o recurso que o cliente reprovou nesta página em 06/08, e a
 * <Duelo> já tinha decidido não repô-la. O plano do meio se distingue por brilho,
 * borda azul e um respiro maior — o mesmo trio de lá.
 *
 * ── O BOTÃO PODE MUDAR DE DESTINO SEM MUDAR ESTE ARQUIVO ─────────────────
 * `linkPlano()` devolve o checkout do Stripe quando existe e o WhatsApp enquanto não
 * existe. Em 07/08/2026 não existe produto de barbearia no Stripe, então os três
 * botões vão para o WhatsApp — que é o caminho real do funil de barbeiros hoje. Ver
 * a nota do `CHECKOUT` no dados.ts: a razão de não haver URL de placeholder é que
 * link de pagamento errado não quebra build, não aparece em teste, e só falha com o
 * cartão na mão.
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

              <ul className="lp3-p-itens">
                {plano.itens.map((item) => (
                  <li className="lp3-p-item" key={item}>
                    {/* O mesmo ponto das outras seções — cheio no plano em destaque,
                        vazado nos outros. Nenhum ícone, como no resto da página. */}
                    <span className="lp3-p-ponto" aria-hidden="true" />
                    <span className="lp3-p-txt">{item}</span>
                  </li>
                ))}
              </ul>

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
