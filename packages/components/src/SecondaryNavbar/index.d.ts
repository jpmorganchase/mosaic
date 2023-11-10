import React from 'react';
import { TabsMenu } from '../TabsBase';
export interface SecondaryNavbarProps {
  /** Additional class name for root class override */
  className?: string;
  /** Secondary Navbar Items */
  items: TabsMenu;
  /** Url to support resources */
  supportLink: string;
}
export declare const SecondaryNavbar: React.FC<React.PropsWithChildren<SecondaryNavbarProps>>;
