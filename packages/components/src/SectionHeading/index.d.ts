import React from 'react';
export interface SectionHeadingProps {
  /** The children components of the SectionHeading component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Heading level */
  level?: number;
}
export declare const SectionHeading: React.FC<SectionHeadingProps>;
