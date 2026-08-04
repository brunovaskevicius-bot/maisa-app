import * as React from 'react';

/**
 * Número grande do painel: atendimentos, NFs emitidas, faturamento.
 * @startingPoint section="Painel" subtitle="Cartões de número, conversa e status do painel" viewport="700x260"
 */
export interface StatCardProps {
  label: string;
  /** já formatado em pt-BR: "R$ 12.480", "38", "92%" */
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** variação, ex.: "12% vs. semana passada" */
  delta?: string;
  deltaDirection?: 'up' | 'down';
  footnote?: string;
}
export declare function StatCard(props: StatCardProps): JSX.Element;
