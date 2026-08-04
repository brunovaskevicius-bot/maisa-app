import * as React from 'react';

/** Campo de texto com label, dica e erro embutidos. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  label?: string;
  /** texto de apoio abaixo do campo */
  hint?: string;
  /** mensagem de erro — substitui a dica e pinta a borda de vermelho */
  error?: string;
  /** marca o campo como opcional em vez de marcar os obrigatórios com asterisco */
  optional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}
export declare function Input(props: InputProps): JSX.Element;
