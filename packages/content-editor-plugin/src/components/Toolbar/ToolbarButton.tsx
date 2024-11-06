import { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { Button, type ButtonProps, Label } from '@jpmorganchase/mosaic-components';

import styles from './ToolbarButton.css';

export interface ToolbarButtonProps extends ButtonProps {
  active?: boolean;
  label?: string;
  disableTooltip?: boolean;
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
      ...rest
    }: ToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => (
    <Label tooltip={!disableTooltip} TooltipProps={{ title: label, placement: 'bottom' }}>
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
