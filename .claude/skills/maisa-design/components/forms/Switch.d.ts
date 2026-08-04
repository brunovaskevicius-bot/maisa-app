import * as React from 'react';

/** Liga/desliga com efeito imediato — sem botão de salvar. Para escolhas de formulário use Checkbox. */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  checked?: boolean;
}
export declare function Switch(props: SwitchProps): JSX.Element;
