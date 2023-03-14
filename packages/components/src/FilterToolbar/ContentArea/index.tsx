import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export const FilterToolbarContentArea: React.FC<
  React.PropsWithChildren<React.HTMLProps<HTMLDivElement>>
> = ({ children, className, ...rest }) => (
  <div className={classnames(styles.root, className)} {...rest}>
    {children}
  </div>
);
