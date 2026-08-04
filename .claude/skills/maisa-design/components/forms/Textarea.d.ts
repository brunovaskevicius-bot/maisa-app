import * as React from 'react';

/** Campo de texto longo — instruções para a maisa, observações do agendamento. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}
export declare function Textarea(props: TextareaProps): JSX.Element;
