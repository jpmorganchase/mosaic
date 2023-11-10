import React, { FC } from 'react';
export interface LinkButtonProps {
  href?: string /** href when component is a link */;
  className?: string;
  variant?: 'regular' | 'cta';
}
export declare const LinkButton: FC<React.PropsWithChildren<LinkButtonProps>>;
