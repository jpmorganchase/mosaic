'use client';
import React from 'react';
import classnames from 'clsx';

import { H1, H2, H3, H4, H5, H6 } from '../Typography';
import styles from './styles.css';

const levelToHeading = [H1, H2, H3, H4, H5, H6];

export interface SectionHeadingProps {
  /** The children components of the SectionHeading component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** Heading level */
  level?: number;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  className,
  level = 1,
  ...rest
}) => {
  const LevelComponent = levelToHeading[level - 1];
  if (!LevelComponent) {
    throw new Error(`Level ${level} not supported, valid levels are 0-${levelToHeading.length}`);
  }
  return (
    <LevelComponent className={classnames(styles.root, className)} {...rest}>
      {children}
    </LevelComponent>
  );
};
