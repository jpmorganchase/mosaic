'use client';
import React, { FC } from 'react';
import classnames from 'clsx';
import { Button as SaltButton, ButtonProps as SaltButtonProps } from '@salt-ds/core';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

export interface ButtonProps extends Omit<SaltButtonProps, 'variant'> {
  variant?: 'regular' | 'secondary' | 'cta';
}

export const Button: FC<React.PropsWithChildren<ButtonProps>> = ({
  children,
  className,
  variant = 'regular',
  ...rest
}) => (
  <SaltButton
    className={classnames(buttonStyles({ variant }), className)}
    variant={variant == 'regular' ? 'primary' : variant}
    {...rest}
  >
    {children}
  </SaltButton>
);
