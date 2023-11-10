import React, { ReactNode } from 'react';
/**
 * The props type for [[`FeatureTitle`]].
 */
export interface FeatureTitleProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureTitle. */
  children: ReactNode;
}
export declare const FeatureTitle: React.FC<FeatureTitleProps>;
