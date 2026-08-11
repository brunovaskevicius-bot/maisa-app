# Arquitetura da MAISA — o mapa geral

> **Comece por aqui.** Este é o roteador do repositório: o que existe, onde está e por
> quê. Cada pasta tem o seu próprio `LEIA-ME.md` com a tabela arquivo a arquivo.
> Última reorganização: **11/08/2026** (adoção da arquitetura hexagonal).

---

## 1. A ideia em um parágrafo

O app é um **hexágono**. No meio fica o que a MAISA É — atendimento, agenda,
expediente, cliente, nota fiscal — sem saber que existe Next.js, React, Google ou
Supabase. Em volta ficam os **adaptadores**: pedaços de código que traduzem o mundo
externo para a língua do meio, e vice‑versa. Entre os dois há **portas**: interfaces
que o meio declara e os adaptadores cumprem.qs

A regra que sustenta tudo:

> **As setas apontam para dentro.** Adaptador importa núcleo. Núcleo nunca importa
> adaptador. Se você precisou escrever `import … from "@/adaptadores/…"` dentro de
> `src/nucleo/`, parou: o que falta é uma porta.

O único lugar que conhece os dois lados é `src/composicao.ts`.

---

## 2. Por que isto agora

Duas razões concretas, nenhuma delas estética:

**O agente de WhatsApp.** A MAISA vai marcar horário conversando com o cliente. Um
agente de IA não tem navegador, não tem React e não faz `fetch` no próprio app. Antes,
"marcar um atendimento" só existia como um `POST /api/google/evento` com validação
escrita dentro do handler — ou seja, a regra de negócio só existia para quem falasse
HTTP. Agora ela é `app.agendarAtendimento(tenant, pedido)`, e o agente vai chamar a
**mesma função**, com a mesma proteção contra marcar duas vezes.

**Multi‑inquilino.** O mesmo app atende terapeutas e barbeiros, e cada assinante é um
negócio isolado. Toda porta de saída já recebe `ContextoTenant`, mesmo que hoje só
exista um negócio. Quando o banco entrar, é um adaptador novo — não é caçar `where`
faltando em vinte arquivos.

---

## 3. O mapa

```
code/
├── ARQUITETURA.md              ← você está aqui
├── README.md                   ← como rodar, env vars, deploy
├── supabase/                   ← DDL versionada (o schema é o arquivo, não a prosa)
├── lp/  → public/lp/           ← LP estática de terapeutas (espelhada no predev)
├── scripts/                    ← espelha-lp, vendor-ds, captura de telas
└── src/
    ├── composicao.ts           ★ RAIZ DE COMPOSIÇÃO — portas encontram adaptadores
    │
    ├── nucleo/                 ● O HEXÁGONO — zero import de framework
    │   ├── dominio/            ..... tipos e regras puras (o que a MAISA é)
    │   ├── portas/
    │   │   ├── entrada/        ..... o que se pode PEDIR ao app (casos de uso)
    │   │   └── saida/          ..... o que o app PRECISA do mundo (interfaces)
    │   └── aplicacao/          ..... implementação dos casos de uso
    │
    ├── adaptadores/
    │   ├── entrada/            ◀ quem CHAMA o app
    │   │   ├── http/           ..... sessão → tenant, erro de domínio → status HTTP
    │   │   └── whatsapp/       ..... o agente de IA (ferramentas + memória + bolhas)
    │   └── saida/              ▶ quem o app CHAMA
    │       ├── google/         ..... Google Calendar + OAuth + tokens cifrados
    │       ├── focus/          ..... Focus NFe (NFS-e municipal)
    │       ├── evolution/      ..... WhatsApp: por onde a MAISA FALA
    │       ├── gemini/         ..... o modelo que responde HOJE (chave de teste)
    │       ├── anthropic/      ..... o outro modelo — troca em 1 linha
    │       ├── supabase/       ..... auth, sessão, cliente do banco
    │       └── demo/           ..... fixtures em memória (cadastro, agenda, memória)
    │
    ├── app/                    ← Next.js: páginas e route handlers (finos)
    ├── ui/                     ◀ adaptador de entrada humano (React)
    └── ds/                     ← design system vendorado (ver src/ds/VENDORED.md)
```

Legenda: ● núcleo · ◀ entrada · ▶ saída · ★ composição

---

## 4. Um pedido inteiro, de ponta a ponta

Marcar um atendimento pelo painel:

```
 clique na grade
   └─ ui/telas/Agenda.tsx ......... cria o rascunho (uuid de idempotência nasce aqui)
      └─ ui/estado/store.tsx ...... POST /api/google/evento
         └─ app/api/google/evento/route.ts        ← rota FINA: só traduz HTTP
            ├─ adaptadores/entrada/http/contexto.ts ...... cookie → ContextoTenant
            └─ composicao.ts → app.agendarAtendimento
               └─ nucleo/aplicacao/agendar-atendimento.ts  ← TODA a regra
                  ├─ nucleo/dominio/* .............. validação, instantes, invariantes
                  ├─ porta RepositorioNegocio ...... → adaptadores/saida/demo
                  └─ porta AgendaExterna ........... → adaptadores/saida/google
                     └─ conexoes.ts (token) → calendario.ts (HTTP v3) → Google
```

Pelo WhatsApp, os quatro primeiros passos somem e entra um só —
`adaptadores/entrada/whatsapp` chamando `app.agendarAtendimento`. **Nada abaixo disso
mudou.** Era o teste de que a arquitetura estava fazendo o trabalho dela, e ele passou:

```
 mensagem do cliente (Evolution API)
   └─ app/api/whatsapp/route.ts ............ rota FINA: segredo + normaliza envelope
      ├─ whatsapp/contexto.ts .............. instância que recebeu → ContextoTenant (ator = agente)
      └─ whatsapp/agente.ts ................ loop: histórico → Claude → ferramenta → bolhas
         ├─ whatsapp/persona.ts ............ prompt montado do cadastro (estável + volátil)
         ├─ whatsapp/ferramentas.ts ........ recusa o ALUCINADO (horário não ofertado, id inventado)
         ├─ composicao.ts → app.agendarAtendimento   ← MESMA função, MESMA proteção
         └─ porta CanalDeMensagens .......... → saida/evolution (a resposta volta por aqui)
```

O agente ganhou de graça a idempotência, a allowlist de agenda e a validação de data —
porque elas moram no caso de uso, não na rota. O que ele precisou acrescentar foi um caso
de uso novo (`oferecerHorarios`: a tela calculava o vago desenhando a grade, o que não
serve para quem não tem tela) e uma camada de desconfiança própria, para o que o núcleo
não tem como distinguir: "14h que o cliente escolheu de uma lista" e "14h que o modelo
achou razoável" são, para ele, o mesmo pedido válido.

---

## 5. Onde eu mexo quando quero…

| Quero… | Mexo em |
|---|---|
| mudar uma REGRA (o que é válido, o que o app faz) | `src/nucleo/aplicacao/` |
| mudar um TIPO do negócio | `src/nucleo/dominio/` |
| criar uma ação nova do produto | porta em `portas/entrada/` + caso de uso em `aplicacao/` |
| trocar Google por outro calendário | novo adaptador em `saida/` + 1 linha em `composicao.ts` |
| sair dos fixtures e ir pro banco | `saida/demo/repositorio.ts` → `saida/supabase/…` + 1 linha em `composicao.ts` |
| mudar o formato JSON de uma resposta | `app/api/**/route.ts` e `adaptadores/entrada/http/` |
| mexer em tela | `src/ui/` |
| mexer em landing page | `src/app/(marketing)/` e `lp/` (ver o CLAUDE.md do projeto) |

---

## 6. Regras que valem sempre

1. **Núcleo não importa adaptador.** Nem para um tipo. Nem "só desta vez".
2. **`tenantId` nasce da sessão**, nunca da query string nem do corpo do request. O
   único lugar que o cria é `adaptadores/entrada/http/contexto.ts`.
3. **Rota é tradutora, não decisora.** Se um `if` de regra apareceu num `route.ts`,
   ele está no lugar errado.
4. **Erro de domínio não é status HTTP.** O núcleo lança `DadoInvalido`; quem vira 400
   é `entrada/http/respostas.ts`. O agente de WhatsApp vai virar uma frase.
5. **Os nomes de `status` nas respostas são contrato** com o store. Mudar um deles é
   mudar o comportamento da tela — procure o nome no `store.tsx` antes.
6. **Segredo não cruza a fronteira.** Nada em `saida/google`, `saida/focus` ou
   `composicao.ts` pode ser importado de um componente `"use client"`.
7. **Nunca `npm run build` com o `next dev` no ar** — o build clobbera o `.next` do
   dev e a tela perde todo o CSS. Parece bug do código, e não é.

---

## 7. O que ficou faltando (dívida declarada)

Honestidade sobre o estado real, para ninguém achar que está mais pronto do que está:

- **A UI ainda lê fixture direto.** As telas fazem `import * as D from
  "@/adaptadores/saida/demo"` em vez de passar por um caso de uso. O caminho longo é
  proposital: ele denuncia a dívida em toda tela que a tem. Consertar isso é reescrever
  o `store.tsx` para conversar com o núcleo — trabalho de outra sessão.
- **`repositorioDemo` ignora o inquilino que recebe.** Existe um negócio só. A
  assinatura já pede o contexto; falta a implementação Supabase.
- **Não há teste automatizado.** Agora dá para ter: os casos de uso recebem as portas
  por parâmetro, então um teste monta dublês e roda o núcleo sem rede. Era impossível
  quando a regra morava dentro do `route.ts`. 69 asserções cobrindo vagas, inferência de
  memória, bolhas, normalização de webhook e a allowlist de horários do agente já foram
  escritas e passaram — **fora do repositório**, porque não há runner escolhido. Falta
  trazê-las para dentro.
- **A memória do agente é um `Map` de processo.** Morre no redeploy e não é compartilhada
  entre instâncias: na Vercel, duas mensagens seguidas podem cair em lambdas diferentes e
  a segunda não lembra da primeira. A DDL está em `supabase/007_memoria_agente.sql`;
  faltam `saida/supabase/memoria.ts` e duas linhas em `composicao.ts`.
- **O agente não responde a áudio.** Cliente que manda áudio recebe silêncio: a mensagem
  é reconhecida, aparece no log com o tipo, e é descartada. No Brasil áudio é como muita
  gente manda mensagem — é decisão de produto pendente (pedir texto, escalar, ou
  transcrever), não caso de borda. A plumbing está pronta em `Envelope.midia`.
- **A conversa não é deduplicada.** O webhook reentrega quando não recebe 200 a tempo, e
  hoje uma reentrega gera resposta duplicada. O índice único em `provedor_id` já está na
  DDL; o adaptador de demonstração não o usa.
- **O schema multi‑inquilino existe; nenhum código o usa ainda.** `supabase/002`–`099`
  trazem `negocios`, `membros`, `tenant_id` em tudo, RLS por membro e o
  `criar_negocio()` que provisiona um inquilino inteiro numa transação. O que falta é do
  lado do TypeScript: `entrada/http/contexto.ts` ainda devolve `tenantId = usuarioId`,
  não existe `saida/supabase/repositorio.ts`, e `saida/google/conexoes.ts` continua na
  tabela antiga. A lista completa está em [supabase/LEIA-ME.md](supabase/LEIA-ME.md), §5.
- **A DDL nunca rodou contra um Postgres.** Não há banco local nesta máquina; o primeiro
  `Run` no Supabase é também o primeiro teste. Rode em ordem e leia os `notice`.

---

## 8. Índice dos LEIA‑ME

| Pasta | Documento |
|---|---|
| `supabase/` | [supabase/LEIA-ME.md](supabase/LEIA-ME.md) |
| `src/` | [src/LEIA-ME.md](src/LEIA-ME.md) |
| `src/nucleo/` | [src/nucleo/LEIA-ME.md](src/nucleo/LEIA-ME.md) |
| `src/nucleo/dominio/` | [src/nucleo/dominio/LEIA-ME.md](src/nucleo/dominio/LEIA-ME.md) |
| `src/nucleo/portas/` | [src/nucleo/portas/LEIA-ME.md](src/nucleo/portas/LEIA-ME.md) |
| `src/nucleo/aplicacao/` | [src/nucleo/aplicacao/LEIA-ME.md](src/nucleo/aplicacao/LEIA-ME.md) |
| `src/adaptadores/` | [src/adaptadores/LEIA-ME.md](src/adaptadores/LEIA-ME.md) |
| `src/adaptadores/entrada/http/` | [.../entrada/http/LEIA-ME.md](src/adaptadores/entrada/http/LEIA-ME.md) |
| `src/adaptadores/entrada/whatsapp/` | [.../entrada/whatsapp/LEIA-ME.md](src/adaptadores/entrada/whatsapp/LEIA-ME.md) |
| `src/adaptadores/saida/google/` | [.../saida/google/LEIA-ME.md](src/adaptadores/saida/google/LEIA-ME.md) |
| `src/adaptadores/saida/focus/` | [.../saida/focus/LEIA-ME.md](src/adaptadores/saida/focus/LEIA-ME.md) |
| `src/adaptadores/saida/evolution/` | [.../saida/evolution/LEIA-ME.md](src/adaptadores/saida/evolution/LEIA-ME.md) |
| `src/adaptadores/saida/supabase/` | [.../saida/supabase/LEIA-ME.md](src/adaptadores/saida/supabase/LEIA-ME.md) |
| `src/adaptadores/saida/demo/` | [.../saida/demo/LEIA-ME.md](src/adaptadores/saida/demo/LEIA-ME.md) |
| `src/app/` | [src/app/LEIA-ME.md](src/app/LEIA-ME.md) |
| `src/ui/` | [src/ui/LEIA-ME.md](src/ui/LEIA-ME.md) |
