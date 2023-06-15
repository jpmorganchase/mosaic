import React, { type Ref, type ReactNode, forwardRef } from 'react';
import classnames from 'clsx';
import { Button as SaltButton, ButtonProps as SaltButtonProps } from '@salt-ds/core';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

export interface ButtonProps extends Omit<SaltButtonProps, 'variant'> {
  variant?: 'regular' | 'secondary' | 'cta';
  children?: ReactNode;
}

export const Button = forwardRef(
  (
    { children, className, variant = 'regular', ...rest }: ButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => (
    <SaltButton
      ref={ref}
      className={classnames(buttonStyles({ variant }), className)}
      variant={variant === 'regular' ? 'primary' : variant}
      {...rest}
    >
      {children}
    </SaltButton>
  )
);
