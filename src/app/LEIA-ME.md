# `src/app/` — o roteamento do Next

Duas coisas moram aqui, e elas quase não se falam: o **painel** (o produto) e as
**landing pages** (o que vende o produto).

## Painel

| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `page.tsx` | Monta o `StoreProvider` + `AppShell`. Protegida pelo middleware. |
| `/login` | `login/page.tsx` | Entrada por e‑mail (Supabase Auth). |
| `/auth/callback` | `auth/callback/route.ts` | Volta do login social / confirmação por e‑mail. Todo erro carrega um MOTIVO — "tente de novo" é conselho inútil quando a causa é o provedor estar desligado. |
| — | `layout.tsx`, `globals.css`, `manifest.ts`, `apple-icon.tsx` | Casca, fontes, PWA. |

## API — o adaptador de entrada HTTP

Todas são **finas**: traduzem HTTP para um caso de uso e a resposta de volta. Se um `if`
de regra aparecer aqui, ele está no lugar errado — o lugar é
[`nucleo/aplicacao/`](../nucleo/aplicacao/LEIA-ME.md).

| Rota | Método | Caso de uso | Respostas |
|---|---|---|---|
| `/api/google/agenda` | GET | `lerAgenda` | `ok` + `de`/`ate`/`eventos`; `reconectar` 409; `limite` 429 |
| `/api/google/evento` | POST | `agendarAtendimento` | `criado` \| `ja_existia` + `eventoId`, `meetLink`, `inicioISO`, `semMeet` |
| `/api/google/evento` | DELETE | `cancelarAtendimento` | `cancelado` |
| `/api/google/conectar` | GET | — (protocolo OAuth) | **redirect** para o consent do Google |
| `/api/google/conectar` | DELETE | `desconectarAgenda` | `{ ok, revogado }` |
| `/api/google/callback` | GET | — (protocolo OAuth) | **redirect** com `?google=ok` ou `?google=erro&motivo=…` |
| `/api/google/status` | GET | `listarConexoes` | sempre 200 com `status` dentro — é a rota que RELATA o estado |
| `/api/nf/emitir` | POST | `emitirNota` | `simulado` \| `processando` \| `autorizado` \| `config_incompleta` \| `erro` |
| `/api/nf/status` | GET | `consultarNota` | idem, para o polling |
| `/api/nf/cancelar` | POST | `cancelarNota` | `cancelado` \| `erro` |

**Duas saem do padrão, e é de propósito:**

- `conectar` (GET) e `callback` respondem **redirect, nunca JSON** — o usuário chegou
  navegando, e despejar um JSON na cara dele seria um beco sem saída. Também são as
  únicas que tocam protocolo OAuth diretamente (PKCE, cookie, `state` assinado).
- `status` responde **200 mesmo sem sessão**. Ela existe para relatar se há sessão e se
  há configuração; um 401 esconderia justamente a resposta que a pergunta pede.

## Landing pages

`(marketing)/` — grupo de rotas com as LPs dos dois ICPs. Vive à parte do painel:
importa só `@/ui/primitivos` e os componentes de `_lib/`, nada do núcleo.

Ver a tabela "Onde está cada LP no código" no `CLAUDE.md` do projeto (uma pasta acima
do repo) e o script `scripts/espelha-lp.mjs` para a LP estática de terapeutas.

## Regra

Rota é **tradutora**, não decisora:

```ts
const porteiro = await exigirSessaoComGoogle();   // quem é
if (barrou(porteiro)) return porteiro.barrado;
try {
  const r = await app.oQueFor(porteiro.tenant, { …corpo });   // o que fazer
  return NextResponse.json({ ok: true, …r });                 // como responder
} catch (e) {
  return falha("escopo", e);                                  // erro → status
}
```
