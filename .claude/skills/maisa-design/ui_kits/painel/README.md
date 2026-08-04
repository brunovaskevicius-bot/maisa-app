# UI kit — painel web da maisa

O app do dono do negócio, 1440×880. Sidebar fixa de 248px + topbar de 68px + conteúdo com 24px de padding.

**Arquivos**
- `index.html` — app navegável: troca de tela pela sidebar, modal de emissão de NF e toast de confirmação.
- `data.js` — dados fictícios em pt-BR (`window.MS_DATA`), compartilhados com o app mobile.
- `Shell.jsx` — `Sidebar` (nav + card "maisa está no ar" + conta) e `Topbar` (título, busca, sino, ação).
- `Inicio.jsx` — 4 `StatCard`, agenda do dia, "O que a maisa fez hoje" e o card verde-900 com a única pendência.
- `Conversas.jsx` — três colunas: lista filtrável, thread com `ChatBubble` sobre fundo `sunken`, ficha do cliente com ações. O switch "maisa responde" é o controle mais importante da tela.
- `Agenda.jsx` — semana com grade de 11 linhas de 52px e blocos posicionados por hora.
- `Clientes.jsx` — lista densa com métricas por linha.
- `Notas.jsx` — três indicadores + tabela com status, filtro por aba e ação de conserto na linha com erro.
- `Ajustes.jsx` — comportamento da maisa, regras em texto livre, NF-e, WhatsApp conectado e serviços.

**Regras do painel**
Densidade média: 40px de altura em item de nav, 13-14px de padding vertical em linha de lista. Números sempre em mono com `tabular-nums`. Toda tela tem no máximo um botão primário. O que precisa do dono aparece em âmbar ou no card verde-900 — nunca em vermelho, a menos que algo tenha realmente falhado.
