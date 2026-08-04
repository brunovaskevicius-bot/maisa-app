import * as React from 'react';

/** Aviso temporário, canto inferior direito no desktop e topo no mobile. Nunca para erro que exige decisão — aí é Dialog. */
export interface ToastProps {
  tone?: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onClose?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;
