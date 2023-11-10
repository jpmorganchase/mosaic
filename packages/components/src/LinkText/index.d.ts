import React from 'react';
import { IconProps } from '../Icon';
declare type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export declare type LinkIconProps = PartialBy<IconProps, 'name'>;
export interface LinkTextProps {
  /** Children */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Disabled */
  disabled?: boolean;
  endIcon?: string;
  EndIconProps?: IconProps;
  /** hovered, used when the link's UI is controlled by another component's state */
  hovered?: boolean;
  link?: string;
  startIcon?: string;
  StartIconProps?: IconProps;
  variant?: 'document' | 'regular';
}
export declare const LinkText: React.ForwardRefExoticComponent<
  LinkTextProps & React.RefAttributes<HTMLSpanElement>
>;
export {};
