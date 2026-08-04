import * as React from 'react';

/** Avatar circular com iniciais como fallback. Sem foto, usa verde claro + iniciais. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'away' | 'offline';
}
export declare function Avatar(props: AvatarProps): JSX.Element;
