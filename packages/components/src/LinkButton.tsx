import React, { FC } from 'react';
import classnames from 'classnames';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

export interface LinkButtonProps {
  href?: string /** href when component is a link */;
  className?: string;
  variant?: 'regular' | 'cta';
}

export const LinkButton: FC<LinkButtonProps> = ({
  className,
  children,
  variant = 'regular',
  ...rest
}) => (
  <a className={classnames(buttonStyles({ variant }), className)} {...rest}>
    {children}
  </a>
);
