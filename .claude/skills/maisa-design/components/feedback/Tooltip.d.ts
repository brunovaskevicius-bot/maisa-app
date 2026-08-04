import * as React from 'react';

/** Rótulo curto no hover/foco. Bolha verde-900 sobre texto creme. Nunca guarde informação essencial aqui. */
export interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
