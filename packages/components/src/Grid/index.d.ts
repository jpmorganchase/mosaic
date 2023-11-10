import React, { ReactNode } from 'react';
import { Size } from '../common/types';
export declare type GridItemSize = Size | 'fullWidth' | 'fitContent';
export interface GridProps {
  children?: ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Grid item size */
  size?: GridItemSize;
}
export declare const Grid: React.ForwardRefExoticComponent<
  GridProps & React.RefAttributes<HTMLDivElement>
>;
