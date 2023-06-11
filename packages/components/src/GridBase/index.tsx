'use client';
import React, { forwardRef, ReactElement, Ref } from 'react';
import classnames from 'clsx';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';
import type { SpaceVars } from '@jpmorganchase/mosaic-theme';

import styles from './styles.css';

export interface GridBaseProps {
  /* Child components */
  children: ReactElement | ReactElement[];
  /** Additional class name for root class override */
  className?: string;
  /** When true and direction is row, will justify content with space-inbetween * */
  spaceBetween?: boolean;
  /** Horizontal space between columns */
  columnGap?: keyof SpaceVars['horizontal'];
  /** Direction of layout */
  direction?: 'column' | 'row';
  /** Vertical space between rows */
  rowGap?: keyof SpaceVars['vertical'];
}

export const GridBase = forwardRef(
  (
    {
      children,
      columnGap = 'none',
      className,
      direction = 'row',
      spaceBetween = false,
      rowGap = 'none',
      ...rest
    }: GridBaseProps,
    ref: Ref<HTMLDivElement>
  ) => {
    const columnGapClassName = responsiveSprinkles({
      columnGap: [columnGap, columnGap, columnGap, columnGap]
    });
    const rowGapClassName = responsiveSprinkles({ rowGap });
    return (
      <div
        className={classnames(
          styles.root,
          columnGapClassName,
          rowGapClassName,
          {
            [styles.rowDirection]: direction === 'row',
            [styles.spaceBetween]: spaceBetween,
            [styles.columnDirection]: direction === 'column'
          },
          className
        )}
        ref={ref}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
