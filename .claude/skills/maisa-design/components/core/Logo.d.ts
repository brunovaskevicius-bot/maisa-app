import * as React from 'react';

/**
 * Wordmark da maisa — tipografia pura, não é um símbolo desenhado.
 * Sempre minúscula, Bricolage Grotesque 700, tracking -0.045em, ponto âmbar opcional.
 * A marca ainda não tem um símbolo gráfico definido; ver readme.md.
 */
export interface LogoProps extends React.HTMLAttributes<HTMLElement> {
  /** tamanho da fonte em px */
  size?: number;
  tone?: 'default' | 'inverse' | 'brand';
  /** ponto âmbar depois do nome */
  dot?: boolean;
  as?: keyof JSX.IntrinsicElements;
}
export declare function Logo(props: LogoProps): JSX.Element;
