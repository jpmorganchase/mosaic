import { type ReactNode } from 'react';
import classnames from 'clsx';

import styles from './ToolbarSeparator.css';

interface ToolbarSeparatorProps {
  className?: string;
  children?: ReactNode;
}

export const ToolbarSeparator = ({ className, ...rest }: ToolbarSeparatorProps) => (
  <div className={classnames(className, styles.root)} {...rest} />
);
