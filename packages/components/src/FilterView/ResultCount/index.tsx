import React from 'react';
import classnames from 'classnames';

import { useFilterViewState } from '../useResultCount';
import styles from './styles.css';

export interface FilterResultCountProps {
  /** Additional class name for root class override */
  className?: string;
}

export const FilterResultCount: React.FC<React.PropsWithChildren<FilterResultCountProps>> = ({
  className
}) => {
  const { displayedCount, totalItemCount } = useFilterViewState();
  return (
    <div aria-label="result count" className={classnames(className, styles.root)}>
      {displayedCount === totalItemCount ? 'All' : displayedCount}
      {' Result'}
      {displayedCount === 1 ? '' : 's'} Displayed
    </div>
  );
};
