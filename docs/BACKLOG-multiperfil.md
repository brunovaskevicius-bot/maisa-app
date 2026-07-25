# Backlog — Multiperfil por profissão + módulos ligáveis

> **Status:** removido do app em 25/07/2026, durante a repaginada de UI/UX (design
> "MAISA — App completo"). O app hoje roda como **um negócio genérico só**.
> Este doc guarda exatamente o que existia, para reativar quando fizermos a
> versão nova dessa lógica.
>
> **Para acionar:** peça "vamos retomar o `BACKLOG-multiperfil.md`".

---

## 1. O que era

Duas mecânicas independentes que se cruzavam na sidebar:

### 1.1 `FEATURE_REGISTRY` — telas ligáveis por toggle

Arquivo: `src/lib/profiles.ts` (removido). Cada tela do app era uma *feature* com
`id`, `label`, `grupo`, `icon`, `modulo` e `defaultOn`. A sidebar renderizava só
as features ligadas, agrupadas, e escondia grupo que ficasse vazio.

16 features em 4 grupos:

| Grupo | Features |
| --- | --- |
| `GESTÃO` | `config`, `equipe`, `servicos`, `faq`, `marketing`, `pagamentos` |
| `OPERACIONAL` | `dashboard`, `atendimentos`, `agenda`, `dados` |
| `CLÍNICO` | `clin-dashboard`, `pacientes`, `clin-servicos`, `calendario`, `faturamento` |
| `ADMIN` | `superadm` (`fixo: true` — sempre visível, não desligável) |

Dois **módulos**: `maisa` (o assistente de WhatsApp, base do produto) e
`clinico` (o consultório — pacientes, calendário, faturamento com NFS-e). A ideia
era vender o módulo clínico como add-on.

Regras que valiam:

- `fixo: true` ⇒ `isOn()` retorna sempre `true` e `toggle()` é no-op.
- Se a tela ativa fosse desligada, o app caía na primeira feature ligada da ordem
  do registry (nunca ficava numa tela morta).
- Persistência: `localStorage["maisa.features"]` (objeto `{[featureId]: boolean}`),
  lido **depois** do mount para não quebrar hidratação SSR.

### 1.2 Cinco perfis de profissão

Também em `src/lib/profiles.ts`. Um `ProfissaoSpec` por vertical, todos
index-alinhados aos mocks base (`servicos[i]` ↔ `s1..s7`, `equipeEspecialidades[i]`
↔ `b1..b4`, `campanhas[i]` ↔ `m1..m4`):

| id | Negócio | Emoji | Profissional | Cliente | Catálogo | Ícone |
| --- | --- | --- | --- | --- | --- | --- |
| `barbearia` | Barbearia Navalha de Ouro | 💈 | barbeiro | cliente | Meus Serviços | `scissors` |
| `psicologia` | Espaço Bem-Estar | 🌱 | psicólogo(a) | paciente | Minhas Sessões | `heart` |
| `odontologia` | Clínica Sorriso | 🦷 | dentista | paciente | Meus Procedimentos | `tooth` |
| `medica` | Clínica Vida | 🩺 | médico(a) | paciente | Meus Procedimentos | `stethoscope` |
| `generico` | Seu Negócio | — | profissional | cliente | Meus Serviços | `tag` |

Cada spec carregava:

- **`terms`** — o vocabulário inteiro da vertical: `negocioTipo`, `negocioNome`,
  `emoji`, `profissionalSing/Plur`, `clienteSing/Plur`, `localAtendimento`
  ("cadeira" vs "consultório"), `saudacao`, e os subtítulos de tela
  (`agendaSub`, `equipeSub`, `dadosSub`, `atendimentosSub`), `catalogoLabel`,
  `servicoIcon`.
- **`servicos`** — 7 serviços com nome/categoria/preço/duração próprios.
- **`equipeEspecialidades`** — 4 especialidades.
- **`campanhas`** — 4 campanhas de marketing temáticas.
- **`configSecoes`** — as 4 seções de ajuste da MAISA (`personalidade`,
  `horarios`, `agendamentos`, `comportamento`), cada uma com uma *thread* de
  preview de WhatsApp escrita na voz da vertical.
- **`faqs`** — 5 perguntas frequentes com resposta, categoria e nº de usos.
- **`faqsSugeridos`** — 4 sugestões de pergunta nova.
- **`mensagensExemplo`** — a conversa de exemplo da tela de Atendimentos.

### 1.3 O resolver

`src/lib/adminConfig.tsx` (removido) tinha um `resolve(profissao)` que devolvia
um `ResolvedData` **espelhando os exports de `mock.ts` com os mesmos nomes**, já
trocados pela vertical ativa. Detalhes que importam:

- Catálogo trocado **por índice**, preservando `id`/`ativo`/`barbeiroIds` da base.
- Campo `servico` (string livre) de agendamentos e pagamentos remapeado por
  índice estável do catálogo base — com fallback pro nome original.
- Equipe: só a `especialidade` mudava; **nomes de pessoas ficavam** (Rafael,
  Diego, Léo, Caio) em todas as verticais.
- Conversas, KPIs e horários eram pass-through (agnósticos).
- Helpers renomeados pra sair do vocabulário de barbearia:
  `nomeDoProfissional`, `servicosDoProfissional`, `profissionaisDoServico`
  (eram `barbeiroNome`, `servicosDoBarbeiro`, `barbeirosDoServico`).
- Persistência: `localStorage["maisa.profissao"]`, também lido pós-mount.
- Contexto exposto: `{ features, isOn, toggle, profissao, setProfissao, t, data }`
  via `useAdmin()`.

### 1.4 A tela Super Adm

`src/components/screens/SuperAdm.tsx` (removida): seletor de profissão + lista de
toggles por grupo, para demonstrar o app em qualquer vertical na frente do
cliente sem recompilar. Era a tela de demo comercial.

---

## 2. Por que saiu

A repaginada trocou a arquitetura de informação: 16 telas viraram **9**
(Fluxo de hoje, Conversas, Agenda, Clientes, Faturamento, Equipe, Serviços,
A MAISA, Mais). O registry mapeava 1:1 nas telas antigas e não sobrevive à
consolidação — `dashboard` + `dados` + `clin-dashboard` colapsaram em "Números do
mês" dentro de "Mais"; `atendimentos` virou "Conversas"; `agenda` + `calendario`
viraram uma "Agenda" só; `servicos` + `clin-servicos` viraram "Serviços".

Manter os dois sistemas durante a repaginada significaria remapear toggles e
verticais para uma IA que ainda estava mudando de forma. Decisão: **congelar
num negócio genérico**, entregar a UX nova inteira, e refazer o multiperfil
depois — em cima da IA nova, que é mais estável e tem menos superfície.

---

## 3. Como refazer (proposta)

O vocabulário agora está concentrado, não espalhado por 16 telas. Isso deixa o
retorno bem mais barato do que era:

1. **`src/lib/vertical.ts`** — só o `terms` (vocabulário) + o dataset de exemplo
   por vertical. Sem `FeatureId`, sem grupos: a IA nova tem 9 itens fixos.
2. **Pontos de injeção** (onde o vocabulário aparece hoje, tudo em um lugar cada):
   - `data.ts` → `NEGOCIO`, `PRESTADOR`, `EQUIPE`, `SERVICOS`, `CLIENTES`,
     `CONVERSAS`/`THREADS`, `FAQS`, `PREVIEWS`.
   - `store.tsx` → `assistente.saudacao`.
   - `AppShell.tsx` → `TELAS` (título/subtítulo/ação primária de cada tela) e o
     label do item de nav `clientes` ("Clientes" vs "Pacientes").
   - `ui.tsx` → o ícone da nav de `servicos`.
3. **Módulos ligáveis**, se ainda fizerem sentido: como a IA nova tem 9 itens,
   um `Record<TelaId, boolean>` simples resolve — sem grupos, sem registry, sem
   fallback complexo. O único caso real hoje seria esconder **Faturamento**
   (NFS-e) de quem não emite nota, e **Equipe** de quem trabalha sozinho.
4. **Onde entra na UI:** um card "Perfil do negócio" dentro de "Mais", abrindo na
   Gaveta com um bloco de chips (verticais) + um bloco de toggles (telas). A
   Gaveta já suporta os dois tipos de bloco — não precisa de tela nova.

### Decisões a tomar quando retomar

- As 5 verticais continuam? (barbearia foi o piloto; o cliente atual é
  consultório de psicologia)
- Vocabulário vira dado de conta no Supabase — ou continua hard-coded pra demo?
- "Esconder tela" é feature de plano/billing ou preferência do usuário? Muda onde
  o estado mora.

---

## 4. Onde achar o código original

Está no histórico git do `maisa-app`. Os arquivos removidos nesta repaginada:

```
src/lib/profiles.ts               # FEATURE_REGISTRY + 5 ProfissaoSpec
src/lib/adminConfig.tsx           # provider + resolve(profissao) + useAdmin()
src/lib/mock.ts                   # dataset base (barbearia)
src/lib/clinicoMock.ts            # dataset do módulo clínico
src/components/screens/SuperAdm.tsx
src/components/screens/*.tsx      # as 16 telas antigas
src/components/charts.tsx
```
