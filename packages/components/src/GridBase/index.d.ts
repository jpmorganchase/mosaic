import React, { ReactElement } from 'react';
import type { SpaceVars } from '@jpmorganchase/mosaic-theme';
export interface GridBaseProps {
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
export declare const GridBase: React.ForwardRefExoticComponent<
  GridBaseProps & React.RefAttributes<HTMLDivElement>
>;
