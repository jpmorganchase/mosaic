import React, { type ReactNode } from 'react';
import classnames from 'clsx';

import styles from './BaseTooltray.css';

type Alignment = 'left' | 'right';

interface BaseTooltrayProps {
  className?: string;
  children?: ReactNode;
  align?: Alignment;
}

export const BaseTooltray = ({ className, align, ...rest }: BaseTooltrayProps) => (
  <div
    className={classnames(className, styles.root, {
      [styles.alignLeft]: align === 'left',
      [styles.alignRight]: align === 'right'
    })}
    {...rest}
  />
);
