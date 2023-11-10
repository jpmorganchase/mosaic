import React from 'react';
import { IconNames } from '@jpmorganchase/mosaic-theme';
export interface IconProps {
  /** Additional class name for root class override. */
  className?: string;
  /** Name of the icon */
  name: IconNames;
  /** Size of Icon */
  size?: number | 'small' | 'medium' | 'large';
}
export declare const Icon: React.FC<React.PropsWithChildren<IconProps>>;
