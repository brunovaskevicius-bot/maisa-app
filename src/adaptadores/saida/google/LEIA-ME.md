# `saida/google/` — Google Calendar

Cumpre as portas `AgendaExterna` e `ConexoesDeAgenda`. **⚠️ Só servidor.**

É a fatia mais densa do repositório porque carrega três assuntos que costumam ser
confundidos: OAuth (quem autorizou), armazenamento de token (onde ele mora, cifrado) e
a API do calendário (o que se faz com ele).

## Arquivos

| Arquivo | Assunto | Detalhe que não é óbvio |
|---|---|---|
| `agenda-google.ts` | **A fachada.** Implementa as portas amarrando os vizinhos. | É o único que o resto do app importa. É aqui que `AtendimentoMarcado` (domínio) vira `extendedProperties.private` (Google). |
| `config.ts` | Env vars, escopos, `redirectUri`, `caminhoDeVolta` | Sem `GOOGLE_TOKEN_KEY` válida (32 bytes em base64) a integração fica **desligada**, não "degradada": ou os tokens são cifrados, ou o botão de conectar nem aparece. |
| `oauth.ts` | Consent, troca de código, refresh, revogação, e‑mail da conta | Sem SDK — a API de token é um POST form‑urlencoded. `prompt=consent` é o que garante o refresh token de quem já autorizou antes. |
| `cripto.ts` | AES‑256‑GCM dos tokens, assinatura do `state`, PKCE | O `state` é assinado; o verifier do PKCE fica em cookie httpOnly, nunca na URL. |
| `conexoes.ts` | Onde os tokens moram (tabela `google_integracoes`) e como se renovam | `acessoValido()` é o único caminho para um token — ele já renova e regrava. Nenhuma rota precisa lembrar de nada. |
| `calendario.ts` | HTTP da API v3: listar, criar, remarcar, cancelar | Traduz evento → `EventoDeAgenda` (data civil + hora decimal). `PROPS` são as marcas privadas que identificam um atendimento da MAISA. |

## Fluxo de conexão (OAuth)

```
GET /api/google/conectar?pid=pr1
  └─ cripto.pkce() + cripto.assinarEstado()  → cookie httpOnly + state assinado
     └─ oauth.urlDeConsentimento()           → redirect para o Google
        └─ GET /api/google/callback
           ├─ cripto.lerEstado()             → confere que quem voltou é quem saiu
           ├─ oauth.trocarCodigo(PKCE)
           ├─ oauth.emailDaConta()
           └─ conexoes.salvar()              → tokens CIFRADOS no Supabase
```

## Fluxo de operação

```
caso de uso → agenda-google.ts → conexoes.acessoValido()  (token válido, renovando se preciso)
                               → calendario.*             (HTTP v3)
```

## Decisões que já custaram caro

- **`extendedProperties.private`, nunca `shared`.** `shared` é copiado para a agenda de
  todo convidado — o id interno do cliente iria parar no calendário de terceiros.
- **`requestId` estável no Meet.** Derivado do uuid do atendimento, não sorteado a cada
  tentativa: um retry devolve a MESMA conferência em vez de criar outra.
- **Revogar antes de apagar.** Só apagar a linha deixaria o refresh token vivo no Google
  até alguém tirar na mão em `myaccount.google.com`.
- **Escopo mínimo (`calendar.events`).** Não lê a lista de calendários, não mexe em
  configuração. Menos escopo = tela de consentimento menos assustadora e menos estrago
  se um token vazar.
- **Cota (429/403 `rateLimitExceeded`) vira `LimiteDoProvedor`, não erro.** É
  transitório: a tela espera e tenta de novo em vez de mostrar falha vermelha.

## Schema

`supabase/001_google_integracoes.sql`, na raiz do repo. A DDL é versionada de
propósito — o arquivo é a verdade, não a prosa.
