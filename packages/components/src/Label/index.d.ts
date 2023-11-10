import React from 'react';
import { TooltipProps as SaltTooltipProps } from '@salt-ds/core';
export interface LabelProps {
  /** The children components of the Tile component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  tooltip?: React.ReactNode;
  tooltipClass?: string;
  TooltipProps?:
    | SaltTooltipProps
    | {
        title?: string;
      };
}
export declare const Label: React.FC<LabelProps>;
