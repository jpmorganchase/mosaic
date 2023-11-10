import React from 'react';
export { View as Tab } from '../ViewStack';
export interface TabsProps {
  /** Additional class name for root class override */
  className?: string;
  /** Tab elements defined by each child */
  children: React.ReactElement;
}
export declare const Tabs: React.FC<TabsProps>;
