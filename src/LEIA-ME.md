# `src/` — o código do app

Mapa geral e as regras da arquitetura: [`../ARQUITETURA.md`](../ARQUITETURA.md).

## Pastas

| Pasta | Papel | Pode importar |
|---|---|---|
| `nucleo/` | O hexágono: domínio, portas, casos de uso | só a si mesmo |
| `adaptadores/saida/` | O que o app chama (Google, Focus, Supabase, fixtures) | núcleo |
| `adaptadores/entrada/` | Quem chama o app (HTTP hoje, WhatsApp amanhã) | núcleo, composição |
| `app/` | Roteamento do Next: páginas, LPs e route handlers | tudo |
| `ui/` | O painel em React — adaptador de entrada humano | núcleo, `saida/demo` (dívida), `ds` |
| `ds/` | Design system vendorado (CSS + ícones) | nada |

## Arquivos na raiz

| Arquivo | O que é |
|---|---|
| `composicao.ts` | **Raiz de composição.** Escolhe qual adaptador cumpre cada porta e monta o objeto `app` com todos os casos de uso prontos. Um lugar só para trocar Google→Outlook, fixtures→Supabase, real→dublê de teste. ⚠️ Só servidor. |
| `middleware.ts` | Porta de entrada de toda requisição: renova a sessão do Supabase e barra quem não está logado. Delega para `adaptadores/saida/supabase/sessao.ts`. |

## Onde NÃO existe mais

Depois da reorganização de 11/08/2026, `src/lib/` e `src/components/` deixaram de
existir. Se você achou um import antigo, o destino é:

| Antes | Agora |
|---|---|
| `@/lib/data` | `@/adaptadores/saida/demo` (fixtures) + `@/nucleo/dominio/*` (tipos e regras) |
| `@/lib/store` | `@/ui/estado/store` |
| `@/lib/ui` | `@/ui/primitivos` |
| `@/lib/detalhe` | `@/ui/detalhe` |
| `@/lib/useIsMobile` | `@/ui/useIsMobile` |
| `@/lib/google/*` | `@/adaptadores/saida/google/*` (`integracoes.ts` virou `conexoes.ts`) |
| `@/lib/google/datas` | `@/nucleo/dominio/tempo` (era puro; virou domínio) |
| `@/lib/nf/*` | `@/adaptadores/saida/focus/*` |
| `@/lib/supabase/*` | `@/adaptadores/saida/supabase/*` (`middleware.ts` virou `sessao.ts`) |
| `@/components/*` | `@/ui/componentes/*` |
| `@/components/screens/*` | `@/ui/telas/*` |
