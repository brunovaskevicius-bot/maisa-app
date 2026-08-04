import * as React from 'react';

/** Escolha única dentro de um grupo (mesmo `name`). */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  checked?: boolean;
}
export declare function Radio(props: RadioProps): JSX.Element;
