import React from 'react';
import classnames from 'classnames';
import hoistNonReactStatics from 'hoist-non-react-statics';

import styles from './styles.css';

export interface MarkdownComponentProps {
  /** Additional class name for root class override */
  className?: string;
  /** Spacing */
  spacing?: 'none' | 'regular';
  /** Whether element is inline */
  inline?: boolean;
}

export function withMarkdownSpacing<TProps extends MarkdownComponentProps>(
  Component: React.ComponentType<TProps>,
  spacing = 'regular',
  inline = false
): React.FC<TProps> {
  const MarkdownComponent: React.FC<TProps> = ({
    className = '',
    spacing: spacingProp,
    ...rest
  }) => (
    <Component
      className={classnames(styles[spacingProp || spacing], className, { [styles.inline]: inline })}
      {...(rest as TProps)}
    />
  );
  hoistNonReactStatics(MarkdownComponent, Component);
  return MarkdownComponent;
}
