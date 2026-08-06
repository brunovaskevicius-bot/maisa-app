# MAISA — Assistente por WhatsApp (protótipo)

Front-end da **MAISA**: um assistente de IA que atende, agenda e confirma pelo WhatsApp — modular, com reskin por profissão. Protótipo visual (Next.js 14), **sem backend**: todos os dados são mockados.

> Feito por Poli Júnior.

## Rodando localmente

```bash
npm install
npm run dev
# abre http://localhost:3100
```

Build de produção:

```bash
npm run build && npm start
```

## O que tem

- **App único e modular**: na tela **Super Adm** você escolhe a **profissão** (Barbearia · Psicologia · Odontologia · Clínica Médica · Genérico) e liga/desliga as **features** — isso muda a sidebar e o dashboard na hora.
- **Reskin por profissão**: termos (cliente/paciente, barbeiro/dentista…), nome do negócio, saudação, catálogo e **ícones** se adaptam à profissão escolhida.
- **Telas**: Dashboard (bento vivo), Atendimentos (inbox estilo WhatsApp), Agenda (calendário), Dados (gráficos), Configurações do Assistente (preview do WhatsApp ao vivo), Minha Equipe, Meus Serviços, FAQ, Marketing, Meus Pagamentos.
- Design system próprio (tokens OKLCH, sem Tailwind), animações sutis em CSS puro.

As escolhas do Super Adm ficam salvas no navegador (`localStorage`).

## Stack

Next.js 14 (App Router) · TypeScript · React. Sem dependências de UI externas (estilos inline via tokens + CSS).

## Módulo Clínico (Psico Manager)

A aba **Psico Manager** é um app clínico separado, embutido via `iframe`. Vem **desligada por padrão** (habilite em Super Adm). A URL é configurável:

```bash
# .env.local  (opcional)
NEXT_PUBLIC_PSICO_URL=https://sua-url-do-psico
```

Sem essa variável, o módulo aponta para `localhost:3000` (dev) e, em produção, mostra um aviso no lugar do iframe.

## Google Calendar + Meet

Cada profissional conecta a **própria** conta Google. A partir daí, um atendimento vira evento na agenda dele com **link do Google Meet**, e o link pode ser mandado ao cliente pelo WhatsApp.

Onde fica: **Minha Equipe → o profissional → Conectar agenda do Google**. Depois, em qualquer atendimento daquele profissional, aparece **Criar evento com Meet**.

### 1. Google Cloud Console

1. Crie (ou escolha) um projeto em [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs e serviços → Biblioteca** → procure **Google Calendar API** → **Ativar**.
3. **APIs e serviços → Tela de permissão OAuth**:
   - Tipo **Externo** (a menos que todos usem contas do mesmo Workspace — aí **Interno**, e você pula a parte de usuários de teste).
   - Preencha nome do app, e-mail de suporte e e-mail do desenvolvedor.
   - Em **Escopos**, adicione `.../auth/calendar.events`, `openid` e `.../auth/userinfo.email`.
   - Em **Usuários de teste**, adicione o e-mail de cada profissional que vai conectar. Enquanto o app estiver "Em teste", **só esses e-mails conseguem autorizar** — e o limite é 100.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, coloque uma linha por ambiente (precisa bater caractere a caractere):
   - `http://localhost:3100/api/google/callback`
   - `https://SEU-DOMINIO/api/google/callback`
5. Copie o **Client ID** e o **Client secret**.

### 2. Banco

No Supabase: **SQL Editor** → cole [`supabase/001_google_integracoes.sql`](supabase/001_google_integracoes.sql) → **Run**. Cria a tabela dos tokens com RLS (cada usuário só enxerga as próprias linhas).

### 3. Variáveis

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_TOKEN_KEY=$(openssl rand -base64 32)   # cifra os tokens no banco
```

Sem as três, o botão de conectar não aparece (e nada quebra) — mesma lógica da Focus NFe. `GOOGLE_TOKEN_KEY` é obrigatória de propósito: não existe modo "conectado mas sem criptografia".

### Detalhes que valem saber

- **As datas são deslocadas.** A Agenda é um julho/2026 fixo, que já passou. O evento real é criado deslocando o mês por **semanas inteiras** até cair no futuro — assim "sexta 17" continua caindo numa sexta, e a folga de cada profissional continua fazendo sentido. A gaveta sempre mostra a data real antes de criar. Lógica em [`src/lib/google/datas.ts`](src/lib/google/datas.ts).
- **Ninguém é convidado por e-mail.** O evento é criado só na agenda do profissional. Os clientes do protótipo são fictícios, mas os e-mails deles usam domínios **reais** (`@email.com`) — convidar dispararia e-mail de verdade para caixa de estranho. Para ligar, mande `convidarCliente: true` no POST de `/api/google/evento`, ciente disso.
- **O WhatsApp abre com a mensagem pronta** (link `wa.me`), faltando apertar enviar. Envio automático depende da API oficial do WhatsApp, que este protótipo ainda não tem.
- **Desconectar revoga de verdade** no Google, não só apaga a linha local.

## Deploy (Vercel)

Zero configuração — a Vercel detecta o Next.js automaticamente. Importe o repositório em [vercel.com/new](https://vercel.com/new). Variáveis opcionais: `NEXT_PUBLIC_PSICO_URL` e o bloco do Google acima (lembre de adicionar a URL de produção nos URIs de redirecionamento).
