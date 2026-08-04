/* Dados fictícios do painel maisa — nomes e valores de exemplo em pt-BR. */
window.MS_DATA = {
  conta: { negocio: 'Studio Lasca', dono: 'Renata Lasca', plano: 'Pro' },
  stats: [
    { label: 'Atendimentos na semana', value: '38', icon: 'chat-bubble-left-right', delta: '12% vs. semana passada', dir: 'up', foot: 'sem ninguém digitar' },
    { label: 'Faturamento', value: 'R$ 12.480', icon: 'banknotes', delta: '8% vs. semana passada', dir: 'up' },
    { label: 'Notas emitidas', value: '26', icon: 'document-text', foot: 'nenhuma pendente' },
    { label: 'Horários vagos hoje', value: '3', icon: 'clock', foot: '14h, 16h30 e 18h' },
  ],
  agenda: [
    { hora: '09:00', dur: '45 min', cliente: 'Juliana Prado', servico: 'Corte + escova', status: 'confirmado', valor: 'R$ 180' },
    { hora: '10:00', dur: '30 min', cliente: 'Marcos Aurélio', servico: 'Barba', status: 'confirmado', valor: 'R$ 70' },
    { hora: '11:30', dur: '1h30', cliente: 'Beatriz Nunes', servico: 'Coloração', status: 'aguardando', valor: 'R$ 420' },
    { hora: '13:00', dur: '45 min', cliente: 'Caio Ferraz', servico: 'Corte masculino', status: 'confirmado', valor: 'R$ 90' },
    { hora: '15:00', dur: '1h', cliente: 'Sandra Vitório', servico: 'Hidratação', status: 'cancelado', valor: 'R$ 150' },
    { hora: '17:00', dur: '45 min', cliente: 'Pedro Lemos', servico: 'Corte + barba', status: 'confirmado', valor: 'R$ 140' },
  ],
  conversas: [
    { id: 1, nome: 'Juliana Prado', tel: '11 91234-5678', ultima: '9h fica ótimo', hora: '14:33', naoLidas: 0, porMaisa: true, tags: ['Cliente VIP'] },
    { id: 2, nome: 'Marcos Aurélio', tel: '11 98877-1200', ultima: 'Consigo chegar 10 minutos atrasado?', hora: '14:12', naoLidas: 2, porMaisa: false, tags: [] },
    { id: 3, nome: 'Beatriz Nunes', tel: '11 99610-4477', ultima: 'A maisa mandou o orçamento da coloração', hora: '13:40', naoLidas: 0, porMaisa: true, tags: ['Orçamento'] },
    { id: 4, nome: 'Caio Ferraz', tel: '11 94422-8899', ultima: 'Obrigado! Até amanhã', hora: '11:02', naoLidas: 0, porMaisa: true, tags: [] },
    { id: 5, nome: 'Sandra Vitório', tel: '11 97010-3355', ultima: 'Preciso cancelar, surgiu um imprevisto', hora: 'Ontem', naoLidas: 0, porMaisa: true, tags: [] },
  ],
  thread: {
    1: [
      { from: 'in', t: '14:31', txt: 'Oi! Tem horário amanhã de manhã?' },
      { from: 'out', a: 'maisa', t: '14:31', s: 'read', txt: 'Oi, Juliana! Tenho sim. 9h ou 10h30, qual fica melhor?' },
      { from: 'in', t: '14:33', txt: '9h fica ótimo' },
      { from: 'out', a: 'maisa', t: '14:33', s: 'read', txt: 'Fechado. Corte + escova, quinta às 9h, com a Renata. Te lembro na véspera.' },
      { from: 'note', txt: 'Agendamento criado · quinta, 9h · Corte + escova · R$ 180' },
      { from: 'in', t: '14:35', txt: 'Perfeito, obrigada!' },
    ],
    2: [
      { from: 'in', t: '14:10', txt: 'Bom dia' },
      { from: 'in', t: '14:12', txt: 'Consigo chegar 10 minutos atrasado?' },
      { from: 'note', txt: 'A maisa passou pra você — pedido de mudança em cima da hora' },
    ],
  },
  notas: [
    { num: '1.284', cliente: 'Juliana Prado', doc: '312.887.440-11', servico: 'Corte + escova', valor: 'R$ 180,00', data: '27/07/2026', status: 'emitida' },
    { num: '1.283', cliente: 'Marcos Aurélio', doc: '109.552.887-03', servico: 'Barba', valor: 'R$ 70,00', data: '27/07/2026', status: 'emitida' },
    { num: '1.282', cliente: 'Studio Bela Ltda', doc: '18.774.220/0001-45', servico: 'Coloração', valor: 'R$ 420,00', data: '26/07/2026', status: 'processando' },
    { num: '—', cliente: 'Caio Ferraz', doc: '448.120.775-90', servico: 'Corte masculino', valor: 'R$ 90,00', data: '26/07/2026', status: 'erro' },
    { num: '1.281', cliente: 'Pedro Lemos', doc: '221.640.339-71', servico: 'Corte + barba', valor: 'R$ 140,00', data: '25/07/2026', status: 'emitida' },
    { num: '1.280', cliente: 'Sandra Vitório', doc: '905.331.208-64', servico: 'Hidratação', valor: 'R$ 150,00', data: '24/07/2026', status: 'cancelada' },
  ],
};
