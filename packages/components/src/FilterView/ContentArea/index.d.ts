import React from 'react';
import { GridItemSize } from '../../Grid';
export interface FilterViewContentAreaProps {
  /** Additional class name for root class override */
  className?: string;
  /** Tile size */
  size?: GridItemSize;
}
export declare const FilterViewContentArea: React.FC<
  React.PropsWithChildren<FilterViewContentAreaProps>
>;
