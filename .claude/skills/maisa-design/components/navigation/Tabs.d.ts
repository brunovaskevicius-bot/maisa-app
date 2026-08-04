import * as React from 'react';

export interface TabItem { value: string; label: string; icon?: React.ReactNode; count?: number }

/** Alterna visões da mesma tela. `underline` para navegação de página, `pill` para filtros dentro de um card. */
export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  variant?: 'underline' | 'pill';
}
export declare function Tabs(props: TabsProps): JSX.Element;
