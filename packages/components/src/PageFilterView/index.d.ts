/// <reference types="react" />
import type { GridItemSize } from '../Grid';
import type { SortFn } from '../FilterView';
export declare type PageFilterViewProps<T> = {
  sortKey?: SortFn<T>;
  view?: T[];
  filterKey?: string;
  filterLabel?: string;
  filterSource?: string[];
  size: GridItemSize;
};
export declare function PageFilterView<T>({
  sortKey,
  view,
  filterKey,
  filterLabel,
  filterSource,
  size
}: PageFilterViewProps<T>): JSX.Element;
