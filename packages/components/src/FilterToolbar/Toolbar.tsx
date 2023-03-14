import React from 'react';
import classnames from 'clsx';

import { ToolbarProvider, ToolbarProviderProps } from './ToolbarProvider';
import { FilterToolbarContentArea } from './ContentArea';
import { FilterDropdown } from './FilterDropdown';
import { FilterPillGroup } from './PillGroup';
import { FilterSearch } from './Search';
import { FilterSortDropdown } from './SortDropdown';
import styles from './styles.css';

interface ToolbarComposition {
  ContentArea: typeof FilterToolbarContentArea;
  FilterDropdown: typeof FilterDropdown;
  PillGroup: typeof FilterPillGroup;
  Search: typeof FilterSearch;
  SortDropdown: typeof FilterSortDropdown;
}

export interface FilterToolbarProps extends ToolbarProviderProps {
  /** Additional class name for root class override */
  className?: string;
}

export const FilterToolbar: React.FC<React.PropsWithChildren<FilterToolbarProps>> &
  ToolbarComposition = function Toolbar({ children, className, ...rest }) {
  return (
    <ToolbarProvider {...rest}>
      <div className={classnames(styles.root, className)}>{children}</div>
    </ToolbarProvider>
  );
};

FilterToolbar.ContentArea = FilterToolbarContentArea;
FilterToolbar.FilterDropdown = FilterDropdown;
FilterToolbar.PillGroup = FilterPillGroup;
FilterToolbar.SortDropdown = FilterSortDropdown;
FilterToolbar.Search = FilterSearch;
