import * as React from 'react';

/** Chip de filtro ou categoria. Clicável quando recebe onClick, removível quando recebe onRemove. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  selected?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}
export declare function Tag(props: TagProps): JSX.Element;
