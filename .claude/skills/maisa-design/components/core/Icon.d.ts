import * as React from 'react';

/** Ícone Heroicons v2 (MIT). Os SVGs originais estão em assets/icons/. */
export interface IconProps extends React.SVGAttributes<SVGElement> {
  /** nome do arquivo Heroicons, ex.: 'calendar-days', 'chat-bubble-left-right' */
  name: string;
  /** outline = 24px traço (padrão da UI) · solid = 24px preenchido · solid20 = 20px preenchido, para affixes */
  variant?: 'outline' | 'solid' | 'solid20';
  size?: number;
  /** 1.6 é o padrão maisa — um pouco mais leve que o padrão Heroicons */
  strokeWidth?: number;
  color?: string;
  /** quando presente vira <title> e o ícone deixa de ser decorativo */
  title?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
export declare const iconNames: { outline: string[]; solid: string[]; solid20: string[] };
