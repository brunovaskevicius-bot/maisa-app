import * as React from 'react';

/** Select nativo com chevron Heroicons por cima. Até ~8 opções; acima disso, use busca. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  size?: 'sm' | 'md';
  options?: Array<string | { value: string; label: string }>;
  placeholder?: string;
}
export declare function Select(props: SelectProps): JSX.Element;
