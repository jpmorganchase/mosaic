import { type ReactNode } from 'react';
import classnames from 'clsx';

import styles from './BaseToolbar.css';

interface BaseToolbarProps {
  className?: string;
  children?: ReactNode;
}

export const BaseToolbar = ({ className, ...rest }: BaseToolbarProps) => (
  <div className={classnames(className, styles.root)} {...rest} />
);
