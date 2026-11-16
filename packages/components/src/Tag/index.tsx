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
  /** Tag label. When omitted, children provide the label. */
  label?: string;
  children?: React.ReactNode;
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
  children,
  size = 'small',
  ...rest
}: TagProps) => (
  <span
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
      {label ?? children}
    </span>
  </span>
);
