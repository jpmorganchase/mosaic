import React, { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { Button, type ButtonProps } from '@jpmorganchase/mosaic-components';

import styles from './ToolbarButton.css';

interface ToolbarButtonProps extends ButtonProps {
  active?: boolean;
  label?: string;
}

export const ToolbarButton = forwardRef(
  (
    { active, className, onClick, children, label, ...rest }: ToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => (
    <Button
      ref={ref}
      onClick={onClick}
      className={classnames(className, styles.root, {
        [styles.active]: active
      })}
      aria-label={label}
      variant={active ? 'regular' : 'secondary'}
      {...rest}
    >
      {children}
    </Button>
  )
);
