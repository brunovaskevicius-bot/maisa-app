import { APP_URL } from "./icp";

/* ----------------------------------------------------------------------------
 * "Entrar" — a porta do app no canto das LPs.
 *
 * Até 15/08/2026 as três landing pages não tinham UM link para o produto. Quem já
 * pagava e digitava o endereço da LP de memória (que é o endereço que ele conhece,
 * porque foi por onde comprou) chegava numa página de venda sem saída para o painel.
 *
 * ── POR QUE ELE É PEQUENO, E POR QUE ISSO NÃO É TIMIDEZ ──
 *
 * A regra desta LP está escrita no `barbeiros/page.tsx`: *"numa one-pager isso é fuga:
 * o único botão da dobra tirava a pessoa da página antes do preço"*. Foi um conserto
 * deliberado de 10/08 — os quatro CTAs foram repontados para um destino só. Um "Entrar"
 * grande no topo desfaria exatamente esse conserto, porque competiria com o CTA da dobra
 * na única região da tela onde o leitor ainda decide se fica.
 *
 * Então ele é o oposto de um CTA: texto pequeno, sem preenchimento, peso normal. Quem
 * não está procurando não vê; quem está procurando acha onde todo SaaS põe. É a mesma
 * conta que faz "Entrar" ser discreto na Netflix e no Spotify.
 *
 * ── MONTADO PELO `<World>`, IGUAL À `StickyMobileCta` ──
 *
 * As duas LPs de barbearia NÃO renderizam `<MarketingNav>` nem `<Footer>` — os dois
 * componentes existem no `_lib` e nenhuma página os importa. Pendurar o link em
 * qualquer um deles seria escrever código que nunca roda, que é precisamente o defeito
 * que o estudo do Smiller catalogou lá (`wizard/ServicesSection.tsx`, importado por
 * ninguém). O `<World>` é o único ponto por onde as duas passam.
 *
 * ⚠️ A LP OFICIAL DE TERAPEUTAS NÃO USA ESTE COMPONENTE. Ela é HTML estático servido de
 * `public/lp/` e não importa nada deste repositório — o link dela é escrito à mão em
 * `lp/terapeutas/index.html`. Dois lugares, mesmo destino: mudar `APP_URL` exige mexer
 * lá também. É a mesma advertência que o `WHATSAPP_NUMERO` já carrega neste arquivo.
 * -------------------------------------------------------------------------- */
export function EntrarNoApp() {
  return (
    <a href={APP_URL} className="mk-entrar mk-focus">
      Entrar
    </a>
  );
}
