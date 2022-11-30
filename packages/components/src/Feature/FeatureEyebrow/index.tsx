import React, { ReactNode } from 'react';
import classNames from 'classnames';

import { Eyebrow } from '../../Typography';
import styles from './styles.css';

/**
 * The props type for [[`FeatureEyebrow`]].
 */
export interface FeatureEyebrowProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureEyebrow. */
  children: ReactNode;
}

export const FeatureEyebrow: React.FC<FeatureEyebrowProps> = ({ children, className }) => (
  <Eyebrow className={classNames(className, styles.root)}>{children}</Eyebrow>
);
