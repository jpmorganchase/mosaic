import React from 'react';
import { ToolbarProviderProps } from './ToolbarProvider';
import { FilterToolbarContentArea } from './ContentArea';
import { FilterDropdown } from './FilterDropdown';
import { FilterPillGroup } from './PillGroup';
import { FilterSearch } from './Search';
import { FilterSortDropdown } from './SortDropdown';
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
export declare const FilterToolbar: React.FC<React.PropsWithChildren<FilterToolbarProps>> &
  ToolbarComposition;
export {};
