import * as React from 'react';

/** Etiqueta de status, não clicável. Para filtros clicáveis use Tag. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'subtle' | 'solid';
  size?: 'sm' | 'md';
  /** ponto colorido antes do texto — bom para status ao vivo */
  dot?: boolean;
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
