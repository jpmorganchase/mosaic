import React, { ReactNode } from 'react';
/**
 * The props type for [[`FeatureActions`]].
 */
export interface FeatureActionsProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureActions. */
  children: ReactNode;
}
export declare const FeatureActions: React.FC<React.PropsWithChildren<FeatureActionsProps>>;
