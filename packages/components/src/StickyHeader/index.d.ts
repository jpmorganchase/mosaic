import React, { FC } from 'react';
export interface StickyHeaderProps {
  /** Additional class name for root class override */
  className?: string;
  /** Vertical offset in pixels, defaults to 0 */
  offset?: number;
}
export declare const StickyHeader: FC<React.PropsWithChildren<StickyHeaderProps>>;
