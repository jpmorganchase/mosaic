import React from 'react';
export interface ImpactProps {
  /** Additional class name for root class override */
  className?: string;
  image: string;
  label: string;
  title: React.ReactNode;
}
export declare const Impact: React.FC<React.PropsWithChildren<ImpactProps>>;
