import * as React from 'react';

/**
 * Botão de ação da maisa. Primário = verde sólido, um por tela.
 * @startingPoint section="Core" subtitle="Botões, ícones, badges, tags, cards e avatares" viewport="700x300"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: ação principal (1 por tela) · secondary: ação alternativa · soft: dentro de superfícies verdes · ghost: barras de ferramenta · accent: CTA de marketing · danger: destrutiva */
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** ocupa 100% da largura — usado em mobile e formulários */
  block?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** renderiza como outra tag, ex.: 'a' para links */
  as?: 'button' | 'a';
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
