import React from 'react';
import { FilterResultCount } from './ResultCount';
import { FilterNoResults } from './NoResults';
import {
  FilterToolbar,
  FilterToolbarContentArea,
  OnStateChangeCallback,
  State
} from '../FilterToolbar';
import { FilterViewContentArea } from './ContentArea';
import { GridItemSize } from '../Grid';
export declare type FilterFn<T> = (filterable: T[], filters: string[]) => T[] | [];
export declare type SortFn<T> = (sortable: T[], sort: string) => T[] | [];
export interface FilterViewProps<T> {
  /** Children of the FilterToolbar */
  children: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
  /** View uses pagination when true */
  enablePagination?: boolean;
  /** Number of items to display per page */
  itemsPerPage?: number;
  /** Filter function, called when the view has a filter applied */
  filter?: FilterFn<T>;
  /** Initial state of filter/sort */
  initialState?: State;
  /** Item renderer for view */
  itemRenderer: (item: T, itemIndex: number) => JSX.Element;
  /** Callback called when the filter/sort state changes */
  onStateChange?: OnStateChangeCallback;
  /** Tile size */
  size?: GridItemSize;
  /** Sort function, creates a sort callback, which is called when a view is sorted */
  sort?: SortFn<T>;
  /** Date view to sort and filter */
  view: T[];
}
export declare function createDefaultSort<T>(sortKey: string): SortFn<T>;
export interface FilterViewComposition {
  ContentArea?: typeof FilterViewContentArea;
  FilterDropdown?: typeof FilterToolbar.FilterDropdown;
  NoResults?: typeof FilterNoResults;
  PillGroup?: typeof FilterToolbar.PillGroup;
  ResultCount?: typeof FilterResultCount;
  Search?: typeof FilterToolbar.Search;
  SortDropdown?: typeof FilterToolbar.SortDropdown;
  ToolbarContentArea?: typeof FilterToolbarContentArea;
}
export declare function FilterView<T>({
  children,
  className,
  enablePagination,
  filter: filterProp,
  initialState,
  itemRenderer,
  itemsPerPage,
  onStateChange,
  size,
  sort: sortProp,
  view
}: FilterViewProps<T> & FilterViewComposition): React.ReactElement;
export declare namespace FilterView {
  var ResultCount: React.FC<
    React.PropsWithChildren<import('./ResultCount').FilterResultCountProps>
  >;
  var ToolbarContentArea: React.FC<React.PropsWithChildren<React.HTMLProps<HTMLDivElement>>>;
  var PillGroup: React.FC<React.PropsWithChildren<import('../FilterToolbar').FilterPillGroupProps>>;
  var Search: typeof import('../FilterToolbar').FilterSearch;
  var SortDropdown: typeof import('../FilterToolbar').FilterSortDropdown;
  var FilterDropdown: typeof import('../FilterToolbar').FilterDropdown;
  var NoResults: React.FC<React.PropsWithChildren<import('./NoResults').FilterNoResultsProps>>;
  var ContentArea: React.FC<
    React.PropsWithChildren<import('./ContentArea').FilterViewContentAreaProps>
  >;
}
