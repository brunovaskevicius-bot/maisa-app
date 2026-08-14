/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // A LP oficial de terapeutas é um bundle estático servido de public/lp
      // (ver scripts/espelha-lp.mjs). O Next casa arquivo de public por caminho
      // exato, então /lp/terapeutas sem o "/index.html" daria 404 — daí o rewrite.
      { source: "/lp/terapeutas", destination: "/lp/terapeutas/index.html" },
    ];
  },

  /* As LPs de barbearia deixaram de ser "versões" em 14/08/2026: a v3 virou `/barbeiros`
   * e a v4 (a variante com a dobra filmada) virou `/barbeiro`.
   *
   * Os caminhos antigos redirecionam em vez de sumir. Uma LP existe para ser
   * COMPARTILHADA — o link já foi para conversa de WhatsApp, anúncio e mensagem de
   * prospecção, e nada disso pode ser editado depois de enviado. Um 404 aqui não é um
   * caminho quebrado, é um cliente que clicou e desistiu.
   *
   * `permanent: true` (301) porque a mudança é definitiva e é o que faz o buscador
   * transferir o histórico da URL antiga para a nova, em vez de tratá-la como desvio
   * temporário e continuar mostrando a que morreu. */
  async redirects() {
    return [
      { source: "/barbeiros/v3", destination: "/barbeiros", permanent: true },
      { source: "/barbeiros/v4", destination: "/barbeiro", permanent: true },

      /* As quatro rotas Next de terapeutas foram apagadas em 14/08/2026 — sobrou a LP
       * oficial, o bundle estático de `public/lp`. `/terapeutas` estava PÚBLICA e no ar,
       * então é a que mais tem chance de ter link solto por aí; as outras três eram
       * níveis de um funil que não se usa mais. Todas caem na LP que ficou.
       *
       * `:path*` cobre âncoras e qualquer nível que tenha existido, inclusive os que eu
       * não conheça — vale mais que quatro linhas exatas que envelhecem uma a uma. */
      { source: "/terapeutas", destination: "/lp/terapeutas", permanent: true },
      { source: "/terapeutas/:path*", destination: "/lp/terapeutas", permanent: true },
    ];
  },
};

export default nextConfig;
