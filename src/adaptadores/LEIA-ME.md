# `src/adaptadores/` — a borda do hexágono

Tudo que fala com o mundo. Adaptador importa núcleo; núcleo nunca importa adaptador.

## Duas direções, e a diferença importa

```
   ENTRADA ──▶  [ núcleo ]  ──▶ SAÍDA
   quem manda               quem obedece
```

| | `entrada/` | `saida/` |
|---|---|---|
| Quem começa a conversa | o mundo | o app |
| Cumpre | as portas de **entrada** (chama os casos de uso) | as portas de **saída** (é chamado por eles) |
| Exemplos | rota HTTP, webhook do WhatsApp, cron | Google Calendar, Focus NFe, Supabase, fixtures |
| Se sumir | o app fica sem quem o acione | o caso de uso não tem como cumprir o pedido |

## O que tem em cada uma

### `entrada/`
| Pasta | Estado | O que faz |
|---|---|---|
| [`http/`](entrada/http/LEIA-ME.md) | ativo | Sessão do Supabase → `ContextoTenant`; erro de domínio → status HTTP. Usado por todo `app/api/**`. |
| [`whatsapp/`](entrada/whatsapp/LEIA-ME.md) | ativo | O agente de IA: envelope da Evolution/Cloud API → `ContextoTenant`, e o loop de conversa (Claude + ferramentas + memória). Responde por [`saida/evolution/`](saida/evolution/LEIA-ME.md). |

> O painel React (`src/ui/`) também é um adaptador de entrada. Ele mora fora desta
> pasta por tamanho e porque o Next espera os componentes perto do `app/`.

### `saida/`
| Pasta | Cumpre | Segredo envolvido |
|---|---|---|
| [`google/`](saida/google/LEIA-ME.md) | `AgendaExterna`, `ConexoesDeAgenda` | client secret, chave de cifra dos tokens |
| [`focus/`](saida/focus/LEIA-ME.md) | `EmissorFiscal` | token da Focus NFe |
| [`evolution/`](saida/evolution/LEIA-ME.md) | `CanalDeMensagens` | token da instância Evolution (manda WhatsApp pelo número do negócio) |
| [`supabase/`](saida/supabase/LEIA-ME.md) | infraestrutura de sessão (não é porta) | anon key (pública, protegida por RLS) |
| [`demo/`](saida/demo/LEIA-ME.md) | `RepositorioNegocio` | nenhum |

## Regras

1. **Um adaptador não conhece outro.** Se `focus` precisou de algo do `google`, esse
   algo é do domínio. (Exceção declarada: `google/conexoes.ts` usa o cliente do
   `supabase` porque é lá que os tokens moram — é infraestrutura, não regra.)
2. **Adaptador de saída traduz vocabulário.** `"processando_autorizacao"` da prefeitura
   vira `"processando"` nosso ANTES de sair daqui. O núcleo nunca vê string de terceiro.
3. **Adaptador de entrada traduz protocolo.** Corpo do request → objeto do caso de uso;
   erro do domínio → status. Nenhuma decisão de negócio.
4. **Segredo não vaza.** Nada de `saida/google`, `saida/focus` ou `composicao.ts` pode
   ser importado de um componente `"use client"`.
