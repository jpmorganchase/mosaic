'use client';
import React from 'react';
import { Tooltip, TooltipProps as SaltTooltipProps } from '@salt-ds/core';

import styles from './styles.css';

export interface LabelProps {
  /** The children components of the Tile component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /* Tooltip */
  tooltip?: React.ReactNode;
  /* Tooltip ClassName */
  tooltipClass?: string;
  /* Additional Tooltip Props */
  TooltipProps?: SaltTooltipProps | { title?: string };
}

export const Label: React.FC<LabelProps> = ({
  children,
  className,
  tooltip,
  tooltipClass,
  TooltipProps = {},
  ...rest
}) => {
  return (
    <Tooltip
      disabled={!tooltip}
      {...TooltipProps}
      content={
        <div className={styles.tooltip}>
          {TooltipProps.title && <span className={styles.tooltipTitle}>{TooltipProps.title}</span>}
          <span className={styles.tooltipContent}>{tooltip}</span>
        </div>
      }
      status="info"
    >
      <span {...rest}>{children}</span>
    </Tooltip>
  );
};
