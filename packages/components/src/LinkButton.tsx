import React, { FC } from 'react';
import classnames from 'clsx';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

import styles from './LinkButton.css';

export interface LinkButtonProps {
  href?: string /** href when component is a link */;
  className?: string;
  variant?: 'regular' | 'cta';
}

export const LinkButton: FC<React.PropsWithChildren<LinkButtonProps>> = ({
  className,
  children,
  variant = 'regular',
  ...rest
}) => (
  <a className={classnames(buttonStyles({ variant }), styles.root, className)} {...rest}>
    {children}
  </a>
);
