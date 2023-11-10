import React, { ReactNode } from 'react';
/**
 * The props type for [[`FeatureContent`]].
 */
export interface FeatureContentProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureContent. */
  children: ReactNode;
}
export declare const FeatureContent: React.FC<FeatureContentProps>;
