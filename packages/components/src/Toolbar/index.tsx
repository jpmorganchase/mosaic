import { type ReactNode } from 'react';
import classnames from 'clsx';

import styles from './Toolbar.css';

interface ToolbarProps {
  className?: string;
  children?: ReactNode;
}

export const Toolbar = ({ className, ...rest }: ToolbarProps) => (
  <div className={classnames(className, styles.root)} {...rest} />
);
