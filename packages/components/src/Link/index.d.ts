import React from 'react';
import { LinkBaseProps } from '../LinkBase';
import { LinkTextProps } from '../LinkText';
export interface LinkProps extends LinkBaseProps, Omit<LinkTextProps, 'variant'> {
  LinkBaseProps?: LinkBaseProps;
  LinkTextProps?: LinkTextProps;
  variant?: 'component' | 'document' | 'heading' | 'regular' | 'selectable';
}
export declare const Link: React.ForwardRefExoticComponent<
  LinkProps & React.RefAttributes<HTMLLinkElement>
>;
