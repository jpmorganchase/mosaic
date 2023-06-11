'use client';
import React from 'react';
import classnames from 'clsx';
import { Icon } from '../Icon';

import styles from './styles.css';

type Variant = 'caution' | 'important' | 'note' | 'tip' | 'warning';
/**
 * The props type for [[`Callout`]].
 */
export interface CalloutProps {
  /** The content of the callout. */
  children?: React.ReactNode;
  /** Additional class name for root class override. */
  className?: string;
  /** Title override. */
  title?: string;
  /**
   * The variant of the alert.
   *
   * @defaultValue `note`
   */
  variant?: Variant;
}

const iconByVariant = {
  caution: { title: 'Caution', name: 'warningSolid' },
  important: { title: 'Important', name: 'infoSolid' },
  note: { title: 'Note', name: 'infoSolid' },
  tip: { title: 'Tip', name: 'helpSolid' },
  warning: { title: 'Warning', name: 'errorSolid' }
};

/**
 * Renders a callout. Callouts sit within bodies of text and use visual cues to draw user attention to an important piece of information.
 *
 * @example
 * ```tsx
 * <Callout variant="tip">
 * Multiline Message text lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
 * amet. Multiline Message text lorem ipsum dolor sit amet
 * </Callout>
 * ```
 *
 */
export const Callout: React.FC<CalloutProps> = ({
  children,
  className,
  variant = 'note',
  title: titleProp,
  ...rest
}: CalloutProps) => {
  const { name: iconName, title } = iconByVariant[variant];
  const titleText = titleProp !== undefined ? titleProp : title;
  return (
    <div className={classnames(styles.root, styles[`${variant}Border`], className)} {...rest}>
      <Icon className={classnames(styles.icon, styles[variant])} size="medium" name={iconName} />
      <span className={styles.title}>{titleText}</span>
      <div className={styles.content}>{children}</div>
    </div>
  );
};
