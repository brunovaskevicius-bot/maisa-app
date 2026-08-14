/* ─────────────────────────────────────────────────────────────────────────────
 * NEGÓCIO — o assinante da MAISA, visto por dentro.
 *
 * Genérico de propósito: o MESMO app atende terapeutas e barbeiros, e a diferença
 * entre os dois vive nas landing pages e no catálogo de serviços, nunca aqui.
 *
 * ── EMENDA (13/08/2026): a vertical passou a existir no domínio ──
 *
 * O parágrafo acima dizia "nunca aqui" e continua valendo para COMPORTAMENTO. O que
 * mudou é que provisionar um negócio precisa escolher um catálogo de partida, e essa
 * escolha é um dado do negócio — está em `negocios.vertical` desde `002_multitenant.sql`.
 * Ignorá-la no TypeScript não a fazia sumir: fazia o app não saber pedir.
 *
 * O LIMITE, que é o que importa: `Vertical` só pode decidir o que o banco SEMEIA na
 * criação (catálogo, expediente, tom da assistente, FAQs). Nenhum `if (vertical === …)`
 * pode aparecer em caso de uso, adaptador ou tela. No instante em que aparecer, cada
 * cliente novo vira um ramo de código — que é exatamente o modo de falha que este
 * produto precisa evitar, porque ele é vendido com modificações pontuais por cliente.
 * Variação por cliente é LINHA NO BANCO. Se um dia não puder ser, é decisão consciente,
 * escrita aqui, não um `if` que alguém escreveu com pressa.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * As verticais que o provisionamento sabe semear.
 *
 * ⚠️ Espelha o `check` de `provisionar_negocio` (`supabase/005_provisionar.sql:108`).
 * Acrescentar uma vertical é DOIS lugares: esta lista e aquele `check` — e mais os
 * blocos de seed da mesma função. Está duplicado de propósito: o banco precisa recusar
 * lixo mesmo se alguém chamar a RPC por fora do app, e o app precisa recusar antes de
 * gastar uma ida ao banco. Duas guardas, não uma repetida por descuido.
 */
export const VERTICAIS = ["terapeutas", "barbeiros", "generico"] as const;

export type Vertical = (typeof VERTICAIS)[number];

export const ehVertical = (v: unknown): v is Vertical =>
  typeof v === "string" && (VERTICAIS as readonly string[]).includes(v);

export type Negocio = {
  nome: string;
  plano: string;
  precoPlano: number;
  proximaCobranca: string;
  cartao: string;
  conversasPlano: string;
};

/** Dados fiscais do prestador — cabeçalho do recibo de NFS-e. */
export type Prestador = {
  nome: string;
  doc: string;
};
