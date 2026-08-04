import * as React from 'react';

/** Superfície branca com borda fina e sombra baixa. Base de quase tudo no painel. */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** default: branco + borda · flat: sem sombra · raised: sombra média · sunken: creme · accent: âmbar claro · inverse: verde escuro */
  variant?: 'default' | 'flat' | 'raised' | 'sunken' | 'accent' | 'inverse';
  pad?: 'none' | 'sm' | 'md' | 'lg';
  /** ganha hover de elevação (-2px) e cursor de clique */
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
