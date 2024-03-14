import { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { TooltipProps as SaltTooltipProps } from '@salt-ds/core';

import { Button, type ButtonProps } from '../Button';
import { Label } from '../Label';
import styles from './ToolbarButton.css';

export interface ToolbarButtonProps extends ButtonProps {
  active?: boolean;
  label?: string;
  disableTooltip?: boolean;
  tooltipPlacement?: SaltTooltipProps['placement'];
}

export const ToolbarButton = forwardRef(
  (
    {
      active,
      className,
      onClick,
      children,
      label,
      disabled,
      disableTooltip = disabled,
      tooltipPlacement = 'bottom',
      ...rest
    }: ToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => (
    <Label tooltip={!disableTooltip} TooltipProps={{ title: label, placement: tooltipPlacement }}>
      <Button
        aria-label={label}
        ref={ref}
        onClick={onClick}
        className={classnames(className, styles.root)}
        variant={active ? 'regular' : 'secondary'}
        disabled={disabled}
        {...rest}
      >
        {children}
      </Button>
    </Label>
  )
);
