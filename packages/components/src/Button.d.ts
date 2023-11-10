import React, { type ReactNode } from 'react';
import { ButtonProps as SaltButtonProps } from '@salt-ds/core';
export interface ButtonProps extends Omit<SaltButtonProps, 'variant'> {
  variant?: 'regular' | 'secondary' | 'cta';
  children?: ReactNode;
}
export declare const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
