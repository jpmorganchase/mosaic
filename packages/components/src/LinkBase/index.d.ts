import React from 'react';
export interface LinkBaseProps extends Omit<React.HTMLProps<HTMLLinkElement>, 'ref'> {
  /** Children */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
}
export declare const LinkBase: React.ForwardRefExoticComponent<
  LinkBaseProps & React.RefAttributes<HTMLLinkElement>
>;
