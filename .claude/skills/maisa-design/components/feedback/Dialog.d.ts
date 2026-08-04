import * as React from 'react';

/** Modal centralizado sobre overlay verde translúcido com blur. Confirmações e formulários curtos. */
export interface DialogProps {
  open?: boolean;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  onClose?: () => void;
  /** normalmente dois Buttons: secondary "Cancelar" + primary/danger da ação */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
