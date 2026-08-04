import * as React from 'react';

/**
 * Mensagem de WhatsApp dentro do painel maisa.
 * `in` = cliente (branco, à esquerda) · `out` = maisa ou o dono do negócio (verde claro, à direita) · `note` = evento do sistema, centralizado em âmbar.
 */
export interface ChatBubbleProps {
  from?: 'in' | 'out' | 'note';
  /** aparece só quando quem respondeu não é óbvio, ex.: "maisa" vs. o atendente humano */
  author?: string;
  /** hora curta, ex.: "14:32" */
  time?: string;
  status?: 'sent' | 'read';
  children?: React.ReactNode;
}
export declare function ChatBubble(props: ChatBubbleProps): JSX.Element;
