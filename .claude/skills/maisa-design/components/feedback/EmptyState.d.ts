import * as React from 'react';

/** Estado vazio. Sempre otimista e com uma saída — nunca só "Nenhum resultado". */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
