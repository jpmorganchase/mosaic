import React, { cloneElement, Children, ReactNode } from 'react';
import classNames from 'classnames';

import styles from './styles.css';

/**
 * The props type for [[`FeatureContent`]].
 */
export interface FeatureContentProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureContent. */
  children: ReactNode;
}

function layoutChildren(children) {
  return Children.map(children, (child, index) =>
    child.type != null
      ? cloneElement(child, {
          key: `featureContent-${index}`,
          // disable any default spacing added by withMarkdownSpacing
          spacing: 'none'
        })
      : child
  );
}

export const FeatureContent: React.FC<FeatureContentProps> = ({ children, className }) => (
  <div className={classNames(className, styles.root)}>{layoutChildren(children)}</div>
);
