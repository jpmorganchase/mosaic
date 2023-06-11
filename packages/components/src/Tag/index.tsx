'use client';
import React from 'react';
import classnames from 'clsx';
import { Icon } from '../Icon';

import styles from './styles.css';
import { Size } from '../common/types';

export interface TagProps {
  /** Additional class name for overrides */
  className?: string;
  /** Tag category */
  category?: string;
  /** Icon name */
  icon?: string;
  /** Tag label */
  label: string;
  /** Tag size */
  size?: Size;
}

/**
 * Renders a Tag.
 * @example
 * ```tsx
 * <Tag
 *  category="4"
 *  icon="successTick"
 *  label="Label"
 *  size="medium"
 * />
 * ```
 */
export const Tag: React.FC<React.PropsWithChildren<TagProps>> = ({
  className,
  category = '0',
  icon: iconName = 'none',
  label,
  size = 'small',
  ...rest
}: TagProps) => (
  <div
    className={classnames(
      styles.root,
      styles[`category${category}`],
      styles[`border${category}`],
      className
    )}
    {...rest}
  >
    <span
      className={classnames(styles.label, styles[size], styles[`category${category}`])}
      aria-label="tag"
    >
      {iconName && (
        <span className={styles.icon}>
          <Icon name={iconName} size={size} />
        </span>
      )}
      {label}
    </span>
  </div>
);
