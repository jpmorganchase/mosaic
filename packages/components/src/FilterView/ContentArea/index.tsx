import React from 'react';
import classnames from 'classnames';

import { Grid, GridItemSize } from '../../Grid';
import styles from './styles.css';

export interface FilterViewContentAreaProps {
  /** Additional class name for root class override */
  className?: string;
  /** Tile size */
  size?: GridItemSize;
}

export const FilterViewContentArea: React.FC<FilterViewContentAreaProps> = ({
  children,
  className,
  size = 'small',
  ...rest
}) => (
  <Grid
    className={classnames(className, styles.root, { [styles.gutter]: size !== 'fullWidth' })}
    size={size}
    {...rest}
  >
    {children}
  </Grid>
);
