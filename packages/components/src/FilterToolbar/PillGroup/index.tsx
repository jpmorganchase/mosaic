import React from 'react';
import { Pill } from '@salt-ds/core';
import classnames from 'clsx';

import { useToolbarDispatch, useToolbarState } from '../ToolbarProvider';
import styles from './styles.css';
import { Icon } from '../../Icon';

export interface FilterPillGroupProps {
  /** Additional class name for root class override */
  className?: string;
}

export const FilterPillGroup: React.FC<React.PropsWithChildren<FilterPillGroupProps>> = ({
  className
}) => {
  const { filters = [] } = useToolbarState();
  const dispatch = useToolbarDispatch();
  const handleDeletePill = (itemIndex: number) => {
    dispatch({ type: 'removeFilter', value: filters[itemIndex] });
  };

  return (
    <div className={classnames(styles.root, className)}>
      {filters.map((item: string, itemIndex: number) => (
        <Pill
          data-mosaic-testid="pill"
          key={`pill-${item}`}
          onClick={() => handleDeletePill(itemIndex)}
        >
          {item} <Icon name="close" />
        </Pill>
      ))}
    </div>
  );
};
