'use client';

import React from 'react';
import { useTooltip, Tooltip, TooltipProps as SaltTooltipProps } from '@salt-ds/lab';

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
  TooltipProps?: SaltTooltipProps;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className,
  tooltip,
  tooltipClass,
  TooltipProps = { children: <>null</>, classes: {}, title: undefined },
  ...rest
}) => {
  const { getTriggerProps, getTooltipProps } = useTooltip();
  const labelProps = tooltip ? getTriggerProps<'span'>(rest) : undefined;
  const tooltipProps = getTooltipProps({
    ...TooltipProps,
    status: 'info'
  });

  return (
    <>
      <span {...labelProps}>{children}</span>
      {tooltip ? (
        <Tooltip
          {...tooltipProps}
          render={() => (
            <div className={styles.tooltip}>
              {TooltipProps.title && (
                <span className={styles.tooltipTitle}>{TooltipProps.title}</span>
              )}
              <span className={styles.tooltipContent}>{tooltip}</span>
            </div>
          )}
        />
      ) : null}
    </>
  );
};
