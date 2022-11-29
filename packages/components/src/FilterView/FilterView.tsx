import React, { cloneElement, useMemo, useState } from 'react';

import { FilterResultCount } from './ResultCount';
import { FilterNoResults, DefaultNoResults } from './NoResults';
import {
  FilterToolbar,
  FilterToolbarContentArea,
  OnStateChangeCallback,
  State
} from '../FilterToolbar';
import { FilterViewProvider } from './FilterViewProvider';
import { FilterViewContentArea } from './ContentArea';
import { Pagination } from './Pagination';
import { usePagination } from './Pagination/usePagination';
import { GridItemSize } from '../Grid';

export type FilterFn<T> = (filterable: T[], filters: string[]) => T[] | [];
export type SortFn<T> = (sortable: T[], sort: string) => T[] | [];

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

export function createDefaultSort<T>(sortKey: string): SortFn<T> {
  function defaultSort(view: T[], sort: string): T[] {
    if (sort === 'A-Z') {
      return view.sort((sortableA, sortableB) => {
        const hasSortableA = Object.prototype.hasOwnProperty.call(sortableA, sortKey);
        const hasSortableB = Object.prototype.hasOwnProperty.call(sortableB, sortKey);
        if (hasSortableA && hasSortableB) {
          return sortableA[sortKey].localeCompare(sortableB[sortKey]);
        }
        console.warn(`sort key "${sortKey}" not found in FilterView data view`);
        if (hasSortableA) {
          return -1;
        }
        if (hasSortableB) {
          return 1;
        }
        return 0;
      });
    }
    return view.sort((sortableA, sortableB) =>
      sortableB[sortKey].localeCompare(sortableA[sortKey])
    );
  }
  return defaultSort;
}

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

const defaultNoResultsElement = (
  <FilterNoResults>
    <DefaultNoResults />
  </FilterNoResults>
);

export function FilterView<T>({
  children,
  className,
  enablePagination = false,
  filter: filterProp,
  initialState = {
    sort: 'A-Z'
  },
  itemRenderer,
  itemsPerPage = 20,
  onStateChange,
  size = 'small',
  sort: sortProp = createDefaultSort('title'),
  view
}: FilterViewProps<T> & FilterViewComposition): React.ReactElement {
  const [viewState, setViewState] = useState({ ...initialState });
  const { filters, sort } = viewState;

  const handleStateChange = state => {
    setViewState(state);
    if (onStateChange) {
      onStateChange(state);
    }
  };

  let filteredView = view;
  filteredView = useMemo(() => {
    if (!filterProp || !filters || filters.length === 0) {
      return filteredView;
    }
    return filterProp(filteredView, filters);
  }, [filterProp, filters, filteredView]);

  filteredView = useMemo(() => {
    if (!sortProp || !sort) {
      return filteredView;
    }
    return sortProp([...filteredView], sort);
  }, [filteredView, sortProp, sort]);

  const counts = {
    displayedCount: filteredView.length,
    totalItemCount: view.length
  };

  const toolbarChildren: NonNullable<React.ReactElement>[] = [];
  let noResultsElement = defaultNoResultsElement;
  let contentAreaElement;
  const childElements = React.Children.toArray(children);
  childElements.forEach((item, index) => {
    const child = item as React.ReactElement;
    if (child.type === FilterViewContentArea) {
      contentAreaElement = child;
    } else if (child.type === FilterNoResults) {
      noResultsElement = React.cloneElement(child, { key: `noresult-${index}` });
    } else {
      toolbarChildren.push(React.cloneElement(child, { key: `toolbar-control-${index}` }));
    }
  });

  // pagination
  const { startIndex, endIndex, onPageChange, page, pageCount } = usePagination({
    itemsPerPage,
    ...counts
  });
  const items = enablePagination ? filteredView.slice(startIndex, endIndex) : filteredView;

  let contentAreaChildren: React.ReactElement[] = [];
  if (items.length > 0) {
    contentAreaChildren = items.map((item, itemIndex) => {
      const renderer = itemRenderer(item, itemIndex);
      return cloneElement(renderer, { size });
    });
  }

  if (contentAreaChildren.length) {
    const contentAreaProps = {
      children: contentAreaChildren,
      key: 'contentArea',
      size
    };

    if (contentAreaElement && contentAreaElement.props.children) {
      contentAreaProps.children = [contentAreaElement.props.children, ...contentAreaProps.children];
    }

    if (contentAreaElement) {
      contentAreaElement = React.cloneElement(contentAreaElement, contentAreaProps);
    } else {
      contentAreaElement = <FilterViewContentArea {...contentAreaProps} />;
    }
  } else {
    contentAreaElement = noResultsElement;
  }

  return (
    <FilterViewProvider state={counts}>
      <div className={className}>
        <FilterToolbar initialState={viewState} onStateChange={handleStateChange}>
          {toolbarChildren}
        </FilterToolbar>
        {contentAreaElement}
        {enablePagination && items.length > 0 ? (
          <Pagination onPageChange={onPageChange} page={page} pageCount={pageCount} />
        ) : null}
      </div>
    </FilterViewProvider>
  );
}

FilterView.ResultCount = FilterResultCount;
FilterView.ToolbarContentArea = FilterToolbar.ContentArea;
FilterView.PillGroup = FilterToolbar.PillGroup;
FilterView.Search = FilterToolbar.Search;
FilterView.SortDropdown = FilterToolbar.SortDropdown;
FilterView.FilterDropdown = FilterToolbar.FilterDropdown;
FilterView.NoResults = FilterNoResults;
FilterView.ContentArea = FilterViewContentArea;
