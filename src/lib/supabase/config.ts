// Config do Supabase Auth. As chaves vêm de env (Vercel + .env.local).
// A URL e a anon key são públicas (protegidas por RLS no Supabase) → NEXT_PUBLIC_.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Enquanto as chaves não estão setadas, o auth fica INATIVO e o app roda como
// demo aberta (o middleware não bloqueia nada). Assim que as chaves entram, tranca.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
