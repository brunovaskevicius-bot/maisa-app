# Fluxo — oferecer horário e marcar

Os dois casos de uso mais chamados do produto. Valem igual para o painel e para o WhatsApp:
**é a mesma função**, com um `Ator` diferente dentro do contexto.

## Parte 1 — "que horas você tem?"

`nucleo/aplicacao/oferecer-horarios.ts`. É a ferramenta **mais chamada** pelo agente e a única
que fala com o Google em caminho quente.

```
oferecerHorarios(tenant, {servicoId, de, dias, porDia})
 ├─ 1. o serviço existe e está ativo?          oferecer-horarios.ts:46
 │     é ele que define a DURAÇÃO — sem duração não há o que calcular
 ├─ 2. quais agendas posso consultar?          oferecer-horarios.ts:64
 │     interseção de DUAS listas (ver abaixo)
 ├─ 3. uma leitura por agenda, janela inteira  oferecer-horarios.ts:88
 │     agenda.listar() → adaptadores/saida/google
 └─ 4. calcular o vago, dia a dia              dominio/vagas.ts:58 (função pura)
       para quando já tem resposta suficiente  oferecer-horarios.ts:110
```

**A interseção de duas listas** (`:64`) não é redundância — as duas existem por motivos
diferentes. `agendasPermitidas` é **segurança**: o inquilino não lê agenda de outro.
`servico.profissionalIds` é **verdade de negócio**: nem todo mundo faz tudo. Sem a segunda, a
MAISA ofereceria com quem não sabe fazer o serviço, e o cliente descobriria isso na cadeira.

**Uma leitura por agenda, cobrindo a janela inteira** (`:88`), nunca uma por dia. Sete dias ×
três profissionais seriam 21 chamadas para responder "tem vaga essa semana?", e o cliente
desistiria antes.

**Todo evento conta como ocupado** (`:95-100`), inclusive o compromisso pessoal que não nasceu
na MAISA. É o ponto: a agenda do dono é a fonte da verdade, então "almoço" bloqueia horário
igual a um atendimento. Filtrar por marca da MAISA faria ela oferecer exatamente os horários
que o dono reservou para não ser incomodado.

**Serviço inexistente vira erro, não lista vazia** (`:47`). O agente preenche o id com o que
entendeu de uma frase; um id inventado tem que morrer ali, com um erro que ele possa
transformar em pergunta. Lista vazia ele traduziria para "não tenho vaga" — que é mentira.

Constantes que valem saber, em `dominio/vagas.ts`: passo de 30 min (`:33`), antecedência
mínima de 30 min (`:40`), teto de 21 dias varridos (`:44`). E `espalhar` (`:99`) escolhe
horários distribuídos em vez dos três primeiros seguidos — oferecer 9h, 9h30 e 10h é oferecer
uma coisa só.

## Parte 2 — "marca para mim"

`nucleo/aplicacao/agendar-atendimento.ts`.

```
agendarAtendimento(tenant, {maisaAg, agendaId, data, inicio, servicoId, clienteId, ...})
 ├─ 1. o pedido faz sentido?                   :40   uuid, data civil, hora válida
 ├─ 2. de quem é essa agenda?                  :58   allowlist do inquilino
 ├─ 3. o que vai ser feito, e para quem        :67   serviço, duração, cliente
 ├─ 3b. quem marcou entra no cadastro          :85
 ├─ 4. IDEMPOTÊNCIA: pergunta antes de criar   :115  buscarPorAtendimento()
 │      achou? devolve o existente, não cria um segundo
 ├─    registra no histórico                   :142
 └─ 5. criar no provedor                       :175  agenda.criar()
```

### A idempotência, que é a parte que sempre quebra

`maisaAg` é a chave. Ela nasce na **origem do pedido**, não na hora de enviar — no painel, do
clique; no WhatsApp, derivada de (inquilino, telefone, serviço, dia, hora) por hash.

O passo 4 (`:115`) cobre o caso ruim: o POST **chegou** ao Google, criou o evento, e perdeu a
resposta na volta. "Tentar de novo" com a mesma chave **encontra** o evento em vez de criar um
segundo. A busca varre alguns dias em torno do instante, não a agenda inteira.

O outro lado dessa costura está no adaptador do Google: a chave é gravada em
`extendedProperties.private` do evento. É o que faz o evento voltar da leitura reconhecido como
atendimento da MAISA, e não como compromisso pessoal.

⚠️ **`private`, nunca `shared`.** `shared` é copiado para a agenda de todo convidado — o id
interno do cliente iria parar no calendário de terceiros.

### Marcar no passado é permitido

De propósito (`dominio/agenda.ts:126-134`). Registrar às 15h o encaixe que entrou às 14h é uso
normal de agenda. O que **não** é permitido é data a mais de um ano daqui (`:110`): isso não é
regra de negócio, é sanidade — uma data corrompida não deve plantar evento em 2200, onde
ninguém olha e o dono levaria meses para descobrir.

## Trocar o Google por outro calendário

É o teste que a arquitetura tem que passar. Escreva um adaptador cumprindo `AgendaExterna`
(`nucleo/portas/saida/agenda-externa.ts`), troque **uma linha** em `src/composicao.ts:82`, e
nenhum caso de uso muda.

⚠️ **Isso vale para provedor que é um calendário** — Google, Outlook, CalDAV: ele guarda o que
você mandar e não opina. Não vale para plataforma de agendamento (Booksy, Trinks, Fresha), que
tem modelo próprio de serviço e profissional e é **dona das regras de disponibilidade**. Nesse
caso, calcular a vaga por fora oferece horário que o próprio provedor recusa na hora de marcar.
A análise está em
[Product-House › docs/integracoes/booksy.md](https://github.com/contasinovacao-dev/Product-House/blob/main/docs/integracoes/booksy.md).

## Onde mexer

| Quero mudar | Mexo em |
|---|---|
| passo, antecedência, teto de dias | `nucleo/dominio/vagas.ts` |
| quantos horários a MAISA oferece | `oferecer-horarios.ts` (`MAX_DIAS_COM_VAGA`, `porDia`) |
| horário de funcionamento | `nucleo/dominio/expediente.ts` + `RepositorioHorarios` |
| o que vai no evento criado | `NovoEventoExterno` na porta, e o adaptador que grava |
| calendário novo | adaptador em `saida/` + 1 linha em `composicao.ts` |
