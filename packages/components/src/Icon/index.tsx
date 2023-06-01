'use client';

import React from 'react';
import { icons, IconNames } from '@jpmorganchase/mosaic-theme';

import styles from './styles.css';

export interface IconProps {
  /** Additional class name for root class override. */
  className?: string;
  /** Name of the icon */
  name: IconNames;
  /** Size of Icon */
  size?: 'small' | 'medium' | 'large';
}

const deprecatedIcons = {
  tick: 'successTick'
};

export const Icon: React.FC<React.PropsWithChildren<IconProps>> = ({
  className,
  name,
  size = 'small',
  ...rest
}) => {
  if (name === 'none') {
    return null;
  }
  let currentIconName = name;
  if (deprecatedIcons[name]) {
    console.warn(
      `icon ${name} has been deprecated and should be replaced by ${deprecatedIcons[name]}`
    );
    console.warn(`icon ${name} will be removed after March 2023`);
    currentIconName = deprecatedIcons[name];
  }
  if (!icons || !icons[currentIconName]) {
    throw new Error(`icon ${currentIconName} is not supported`);
  }
  const IconComponent = icons[currentIconName];
  return (
    <span className={className} {...rest}>
      <IconComponent className={styles[size]} />
    </span>
  );
};
