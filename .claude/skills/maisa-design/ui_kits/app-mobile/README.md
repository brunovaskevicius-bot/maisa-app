# UI kit — app mobile da maisa

iOS 390×844. O painel no bolso: consultar entre um atendimento e outro, não trabalhar o dia inteiro.

**Arquivos**
- `index.html` — telefone interativo com as 4 abas + a conversa aberta.
- `Moldura.jsx` — moldura do aparelho, barra de status e tab bar (`Icon` solid quando ativa, outline quando não) e `TopoApp`, o cabeçalho de tela.
- `Telas.jsx` — `Hoje` (resumo da maisa em card verde-900 + dois `StatCard` + agenda), `ListaConversas`, `Conversa` (thread + faixa âmbar com o switch de quem responde), `AgendaMob` (tira de dias + timeline), `NotasMob` (alerta âmbar + lista).

Usa `../painel/data.js` — os mesmos dados do painel.

**Regras do mobile**
Alvo de toque mínimo 44px. Um passo abaixo na escala de tipo em relação ao painel (título de tela em 28px, corpo em 14-15px). Ação primária de tela vira `IconButton` `solid round` no cabeçalho. Nada de gesto escondido: tudo tem um botão visível.
