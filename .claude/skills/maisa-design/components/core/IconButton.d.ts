import * as React from 'react';

/** Botão só com ícone. `label` é obrigatório — vira aria-label e title. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** texto acessível, sempre em pt-BR */
  label: string;
  variant?: 'ghost' | 'outline' | 'solid' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  round?: boolean;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
