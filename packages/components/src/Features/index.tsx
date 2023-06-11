'use client';
import React, { Children, cloneElement, ReactElement } from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { FeatureProps } from '../Feature';

/**
 * The props type for [[`Features`]].
 */
export interface FeaturesProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the Features. This should be multiple [[`Feature`]] components. */
  children: ReactElement<FeatureProps>[];
}

function layoutChildren(children) {
  return Children.map(children, (child, index) =>
    cloneElement(child, {
      imagePlacement: index % 2 === 0 ? 'right' : 'left',
      key: `feature-${index}`
    })
  );
}

/**
Renders Features, a group for Feature components. Image placement starts on the right and is alternated for each subsequent Feature.
*/
export const Features: React.FC<FeaturesProps> = ({ children, className, ...rest }) => (
  <div className={classnames(styles.root, className)} {...rest}>
    {layoutChildren(children)}
  </div>
);
