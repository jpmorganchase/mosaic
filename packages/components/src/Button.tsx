import React, { FC } from 'react';
import classnames from 'classnames';
import { Button as UITKButton, ButtonProps as UITKButtonProps } from '@jpmorganchase/uitk-core';
import { button as buttonStyles } from '@jpmorganchase/mosaic-theme';

export interface ButtonProps extends Omit<UITKButtonProps, 'variant'> {
  variant?: 'regular' | 'secondary' | 'cta';
}

export const Button: FC<ButtonProps> = ({ children, className, variant = 'regular', ...rest }) => (
  <UITKButton
    className={classnames(buttonStyles({ variant }), className)}
    variant={variant == 'regular' ? 'primary' : variant}
    {...rest}
  >
    {children}
  </UITKButton>
);
