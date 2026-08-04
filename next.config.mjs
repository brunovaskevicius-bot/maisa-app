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
};

export default nextConfig;
