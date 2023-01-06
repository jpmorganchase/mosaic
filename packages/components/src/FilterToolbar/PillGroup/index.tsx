import React from 'react';
import { Pill } from '@salt-ds/lab';
import classnames from 'classnames';

import { useToolbarDispatch, useToolbarState } from '../ToolbarProvider';
import styles from './styles.css';

export interface FilterPillGroupProps {
  /** Additional class name for root class override */
  className?: string;
}

export const FilterPillGroup: React.FC<FilterPillGroupProps> = ({ className }) => {
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
          label={item}
          onDelete={() => handleDeletePill(itemIndex)}
          variant="closable"
        />
      ))}
    </div>
  );
};
