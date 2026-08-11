# `saida/supabase/` — auth, sessão e acesso ao banco

Infraestrutura, não porta. Ninguém no núcleo declara uma interface "Supabase" — o que o
núcleo declara é `RepositorioNegocio` e `ConexoesDeAgenda`. Isto aqui é o encanamento
que outros adaptadores usam (hoje, `google/conexoes.ts`) e que o middleware usa para
renovar sessão.

## Arquivos

| Arquivo | Onde roda | O que faz |
|---|---|---|
| `config.ts` | ambos | Lê `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Expõe `isSupabaseConfigured`. |
| `client.ts` | navegador | Cliente para login, `signOut`, `getUser` no client. |
| `server.ts` | servidor | Cliente para Server Components e route handlers. Lê/escreve sessão via cookies. |
| `sessao.ts` | middleware | `updateSession()`: renova o token e redireciona quem não está logado. Era `lib/supabase/middleware.ts`. |

## Duas decisões estruturais

**Sem chaves, o app roda como demonstração aberta.** `isSupabaseConfigured` falso ⇒ o
middleware não bloqueia nada e as rotas fiscais usam o `TENANT_DEMO`. As rotas de agenda
NÃO aceitam isso: gravar token do Google sem dono seria pior do que não conectar.

**Anon key + RLS, nunca service key.** O isolamento é imposto pelo Postgres, não pelo
código da aplicação. É deliberado: com service key (que ignora RLS), um filtro esquecido
numa rota vira vazamento entre inquilinos — foi exatamente assim que a auditoria do
projeto de onde esta integração veio encontrou IDOR em cinco rotas. Aqui, um filtro
esquecido não vaza nada.

## Rotas públicas (não exigem login)

Definidas em `sessao.ts`: `/login`, `/auth`, `/api` (cada rota faz a própria checagem e
responde 401 em JSON), `/barbeiros`, `/terapeutas` (as landing pages são públicas por
natureza).

## Schema

`supabase/` na raiz do repositório. Hoje: `001_google_integracoes.sql`.
O desenho multi‑inquilino (`negocios`, `membros`, `tenant_id` em tudo) ainda não existe
— ver a seção "O que ficou faltando" em [`ARQUITETURA.md`](../../../../ARQUITETURA.md).
