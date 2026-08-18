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
| `config/` | Configuração que o **middleware** precisa ler. Existe separada de `composicao.ts` por uma restrição de runtime, não por gosto: o middleware do Next roda no Edge, e importar a raiz de composição de lá derruba o build (ela instancia Anthropic, Supabase, Evolution). Hoje: `endereco.ts` — a URL canônica do produto e o 301 do host antigo. | nada |

## Arquivos na raiz

| Arquivo | O que é |
|---|---|
| `composicao.ts` | **Raiz de composição.** Escolhe qual adaptador cumpre cada porta e monta o objeto `app` com todos os casos de uso prontos. Um lugar só para trocar Google→Outlook, fixtures→Supabase, real→dublê de teste. ⚠️ Só servidor. |
| `middleware.ts` | Porta de entrada de toda requisição. Duas coisas, nesta ordem: resolve o host canônico (301 do endereço antigo, via `config/endereco.ts`) e renova a sessão do Supabase, barrando quem não está logado (via `adaptadores/saida/supabase/sessao.ts`). A ordem importa — 301 antes da sessão não gasta chamada de rede num host que a pessoa vai abandonar. ⚠️ Roda no **Edge**: nada de `node:` nem de `composicao.ts` aqui dentro. |

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
