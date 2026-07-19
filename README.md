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

## Deploy (Vercel)

Zero configuração — a Vercel detecta o Next.js automaticamente. Importe o repositório em [vercel.com/new](https://vercel.com/new). Variável opcional: `NEXT_PUBLIC_PSICO_URL`.
