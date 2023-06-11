'use client';
import React from 'react';

import { TileContentLabel } from '../TileContentLabel';
import { TileLink } from '../TileLink';
import type { GridItemSize } from '../Grid';
import type { SortFn } from '../FilterView';
import { createDefaultSort, FilterResultCount, FilterView } from '../FilterView';
import { FilterDropdown, FilterSortDropdown } from '../FilterToolbar';
import styles from './styles.css';

const createItemRenderer = (filterKey, filterLabel) => (item, itemIndex) => {
  const { description, name } = item;
  let captionElement;
  if (filterKey) {
    const relatedFilters = Array.isArray(item[filterKey]) ? item[filterKey] : [item[filterKey]];
    captionElement = <TileContentLabel labelItems={relatedFilters} labelName={filterLabel} />;
  }
  return (
    <TileLink
      action={item.action}
      caption={captionElement || null}
      description={description}
      image={item.image}
      key={`${name}-${itemIndex}`}
      link={item.link}
      title={item.name}
      variant="grid"
    />
  );
};

export type PageFilterViewProps<T> = {
  sortKey?: SortFn<T>;
  view?: T[];
  filterKey?: string;
  filterLabel?: string;
  filterSource?: string[];
  size: GridItemSize;
};

export function PageFilterView<T>({
  sortKey = createDefaultSort('name'),
  view = [],
  filterKey,
  filterLabel,
  filterSource,
  size = 'small'
}: PageFilterViewProps<T>) {
  const itemRenderer = createItemRenderer(filterKey, filterLabel);
  let filter;
  if (filterKey) {
    filter = (filterView, filters) =>
      filterView.filter(viewItem => {
        if (filterKey in viewItem === false) {
          console.warn(
            `Trying to filter view with key "${filterKey}" which does not exist on view item`,
            viewItem
          );
          return true;
        }
        if (Array.isArray(viewItem[filterKey])) {
          return viewItem[filterKey].some(targetValue => filters.includes(targetValue));
        }
        return filters.includes(viewItem[filterKey]);
      });
  }

  return (
    <FilterView
      className={styles.root}
      filter={filter}
      itemRenderer={itemRenderer}
      size={size}
      sort={sortKey}
      view={view}
    >
      {filter ? (
        <>
          <FilterResultCount />
          <FilterDropdown source={filterSource} />
        </>
      ) : null}
      <FilterSortDropdown />
    </FilterView>
  );
}
