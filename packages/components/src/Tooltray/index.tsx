import { type ReactNode } from 'react';
import classnames from 'clsx';

import styles from './Tooltray.css';

type Alignment = 'left' | 'right';

interface TooltrayProps {
  className?: string;
  children?: ReactNode;
  align?: Alignment;
}

export const Tooltray = ({ className, align, ...rest }: TooltrayProps) => (
  <div
    className={classnames(className, styles.root, {
      [styles.alignLeft]: align === 'left',
      [styles.alignRight]: align === 'right'
    })}
    {...rest}
  />
);
