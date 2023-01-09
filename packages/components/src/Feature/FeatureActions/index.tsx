import React, { cloneElement, Children, ReactNode } from 'react';
import classNames from 'classnames';

import styles from './styles.css';

/**
 * The props type for [[`FeatureActions`]].
 */
export interface FeatureActionsProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the FeatureActions. */
  children: ReactNode;
}

function layoutChildren(children) {
  return Children.map(children, (child, index) =>
    cloneElement(child, {
      key: `featureAction-${index}`,
      // disable any default spacing added by withMarkdownSpacing
      spacing: 'none'
    })
  );
}

export const FeatureActions: React.FC<React.PropsWithChildren<FeatureActionsProps>> = ({
  children,
  className,
  ...rest
}) => (
  <div className={classNames(className, styles.root)} {...rest}>
    {layoutChildren(children)}
  </div>
);
