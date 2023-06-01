'use client';

import React from 'react';
import classnames from 'clsx';

import { FilterResultCount, FilterView } from '../FilterView';
import { FilterDropdown, FilterSortDropdown } from '../FilterToolbar';
import { EditionTileLink } from '../EditionTileLink';
import { useBreakpoint } from '../useBreakpoint';
import { FormattedContent } from '../FormattedContent';
import styles from './styles.css';

export const createCustomFilter = (view, filters) =>
  view.filter(({ group }) => filters.includes(group));

export const createFiltersList = items =>
  items.reduce((allGroups, { group }) => {
    if (group && allGroups.indexOf(group) === -1) {
      return [...allGroups, group];
    }
    return allGroups;
  }, []);

function editionSort(view: Edition[], sort = 'DESC'): Edition[] {
  return view.sort((sortableA, sortableB) => {
    const publicationDateA = new Date(sortableA.publicationDate);
    const publicationDateB = new Date(sortableB.publicationDate);
    if (sort === 'Newest') {
      return publicationDateB.valueOf() - publicationDateA.valueOf();
    }
    return publicationDateA.valueOf() - publicationDateB.valueOf();
  });
}

const itemToString = item => item;
const labelButton = item => item;

export type Edition = {
  eyebrow?: string;
  image?: string;
  group?: string;
  link: string;
  publicationDate: string;
  formattedDescription?: string;
  title?: string;
};

export type EditionFilterViewRenderer = (
  /** Edition data item */
  item: Edition,
  /** Edition item index in view */
  itemIndex: number
) => JSX.Element;

export type EditionFilterViewProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Data view of editions */
  view: Edition[];
  /** Item Renderer */
  ItemRenderer: EditionFilterViewRenderer;
};

export const DefaultEditionFilterViewRenderer: EditionFilterViewRenderer = (item, itemIndex) => {
  const breakpoint = useBreakpoint();
  return (
    <EditionTileLink
      description={
        item.formattedDescription ? (
          <FormattedContent>{item.formattedDescription}</FormattedContent>
        ) : null
      }
      eyebrow={item.eyebrow}
      image={item.image}
      imagePlacement={breakpoint === 'mobile' ? 'fullWidth' : 'left'}
      key={`editionTile-${itemIndex}`}
      link={item.link}
      title={item.title}
    />
  );
};
export const EditionFilterView: React.FC<React.PropsWithChildren<EditionFilterViewProps>> = ({
  className,
  ItemRenderer = DefaultEditionFilterViewRenderer,
  view,
  ...rest
}) => {
  const filtersList = createFiltersList(view);
  return (
    <FilterView<Edition>
      className={classnames(styles.root, className)}
      filter={createCustomFilter}
      itemRenderer={ItemRenderer}
      size="fullWidth"
      sort={editionSort}
      initialState={{ sort: 'Newest' }}
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
        source={['Oldest', 'Newest']}
        itemToString={itemToString}
        labelButton={labelButton}
      />
    </FilterView>
  );
};
