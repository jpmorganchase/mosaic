'use client';
import React, { forwardRef, ReactNode, Ref } from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { Size } from '../common/types';

export type GridItemSize = Size | 'fullWidth' | 'fitContent';

export interface GridProps {
  /* Child components */
  children?: ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Grid item size */
  size?: GridItemSize;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, className, size = 'small', ...rest }, ref: Ref<HTMLDivElement>) => (
    <div
      className={classnames(className, styles.root, styles[size])}
      role="region"
      ref={ref}
      {...rest}
    >
      {children}
    </div>
  )
);
