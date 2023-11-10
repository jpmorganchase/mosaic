import React from 'react';
export interface MarkdownComponentProps {
  /** Additional class name for root class override */
  className?: string;
  /** Spacing */
  spacing?: 'none' | 'regular';
  /** Whether element is inline */
  inline?: boolean;
}
export declare function withMarkdownSpacing<TProps extends MarkdownComponentProps>(
  Component: React.ComponentType<React.PropsWithChildren<TProps>>,
  spacing?: string,
  inline?: boolean
): React.FC<React.PropsWithChildren<TProps>>;
