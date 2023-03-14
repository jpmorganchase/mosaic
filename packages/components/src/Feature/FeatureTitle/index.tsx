import React, { ReactNode } from 'react';
import classNames from 'clsx';

import styles from './styles.css';

/**
 * The props type for [[`FeatureTitle`]].
 */
export interface FeatureTitleProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureTitle. */
  children: ReactNode;
}

export const FeatureTitle: React.FC<FeatureTitleProps> = ({ children, className }) => (
  <div className={classNames(className, styles.root)}>{children}</div>
);
