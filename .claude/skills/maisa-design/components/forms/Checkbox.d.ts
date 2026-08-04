import * as React from 'react';

/** Caixa de seleção controlada. Aceita descrição secundária embaixo do label. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  checked?: boolean;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
