import React from 'react';

import {
  FilterDropdown,
  FilterSortDropdown,
  FilterResultCount,
  FilterView,
  TileLink
} from './index';

const createCustomFilter = (view, filters) => view.filter(({ group }) => filters.includes(group));

const createFiltersList = items =>
  items.reduce((allGroups, { group }) => {
    if (group && allGroups.indexOf(group) === -1) {
      return [...allGroups, group];
    }
    return allGroups;
  }, []);

function alphaSort(view: IndexItem[], sort = 'A-Z'): IndexItem[] {
  return view.sort(({ title: sortableA = '' }, { title: sortableB = '' }) => {
    if (sortableA < sortableB) {
      return sort === 'A-Z' ? -1 : 1;
    }
    if (sortableA > sortableB) {
      return sort === 'A-Z' ? 1 : -1;
    }
    return 0;
  });
}

const itemToString = item => item;
const labelButton = item => item;

export type IndexItem = {
  action?: string;
  description?: string;
  eyebrow?: string;
  image?: string;
  group?: string;
  link: string;
  publicationDate: string;
  formattedDescription?: string;
  title?: string;
};

export type DefaultFilterViewRenderer = (
  /** Tile item */
  item: IndexItem,
  /** Tile item index in view */
  itemIndex: number
) => JSX.Element;

export type CommunityIndexProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Data view */
  view: IndexItem[];
  /** Item Renderer */
  ItemRenderer: DefaultFilterViewRenderer;
};

export const ComunityIndexRenderer: DefaultFilterViewRenderer = ({
  action,
  description,
  eyebrow,
  image,
  link,
  title
}) => (
  <TileLink
    action={action}
    description={description}
    eyebrow={eyebrow}
    image={image}
    key={`tileLink-${title}`}
    link={link}
    title={title}
  />
);

export const CommunityIndex: React.FC<React.PropsWithChildren<CommunityIndexProps>> = ({
  ItemRenderer = ComunityIndexRenderer,
  view,
  ...rest
}) => {
  const filtersList = createFiltersList(view);
  return (
    <FilterView<IndexItem>
      filter={createCustomFilter}
      itemRenderer={ItemRenderer}
      size="medium"
      sort={alphaSort}
      initialState={{ sort: 'A-Z' }}
      view={view}
      enablePagination
      itemsPerPage={12}
      {...rest}
    >
      {filtersList.length > 1 ? (
        <>
          <FilterResultCount />
          <FilterDropdown source={filtersList} />
        </>
      ) : null}
      <FilterSortDropdown
        source={['A-Z', 'Z-A']}
        itemToString={itemToString}
        labelButton={labelButton}
      />
    </FilterView>
  );
};
