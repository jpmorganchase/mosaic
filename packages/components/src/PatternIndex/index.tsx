import React, { useState, memo } from 'react';
import classnames from 'clsx';
import {
  FlexItem,
  FlowLayout,
  FormField,
  FormFieldLabel,
  GridLayout,
  GridItem,
  Input
} from '@salt-ds/core';
import { Pagination, usePagination } from '../FilterView/Pagination';
import { P2, P6, Caption3, useBreakpoint } from '../index';
import { Dropdown, SelectionChangeHandler } from '@salt-ds/lab';
import styles from './styles.css';

export type PatternItem = {
  a11yLevel: string;
  description: string;
  owner: string;
  title: string;
  link: string;
  source: 'FIGMA' | 'STORYBOOK';
};

export type PatternIndexProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Number of items per page */
  itemsPerPage?: number;
  /** Data view */
  view: PatternItem[];
};

export type PatternRendererProps = {
  /** Tile item */
  item: PatternItem;
};

const sourceOptions = ['All', 'Figma', 'Storybook', 'UNKNOWN'];
const a11yOptions = ['All', '2.2/AAA', '2.2/AA', '2.2/A', '2.1/AAA', '2.1/AA', '2.1/A', 'UNKNOWN'];
const sortOrderOptions = ['A-Z', 'Z-A'];

const PureIframe: React.FC<{ src: string; title: string }> = memo(({ src, title }) => (
  <iframe src={src} title={title} width="450" height="253" />
));

function sortPatterns(view: PatternItem[], sort: string): PatternItem[] {
  const sortKey = 'title';
  if (sort === 'A-Z') {
    return view.sort((sortableA, sortableB) =>
      sortableA[sortKey].localeCompare(sortableB[sortKey])
    );
  }
  return view.sort((sortableA, sortableB) => sortableB[sortKey].localeCompare(sortableA[sortKey]));
}

export const FigmaRenderer = ({ item }) => (
  <>
    <div>
      <Caption3>
        {item.owner} / {item.source}
      </Caption3>
    </div>
    <FlowLayout>
      <FlexItem grow={1}>
        <P2>{item.title}</P2>
      </FlexItem>
      <FlexItem>
        <P6>{item.a11yLevel}</P6>
      </FlexItem>
    </FlowLayout>
    <PureIframe src={item.link} title={item.title} />
  </>
);
export const StorybookRenderer = ({ item }) => (
  <>
    <div>
      <Caption3>
        {item.owner} / {item.source}
      </Caption3>
    </div>
    <div>
      <P2>{item.title}</P2>
    </div>
    <PureIframe src={item.link} title={item.title} />
  </>
);

const filter = (view: PatternItem[], a11yFilter, sourceFilter, ownerFilter, textFilter) => {
  if (!sourceFilter && !a11yFilter && !ownerFilter) {
    return view;
  }
  return view.filter(item => {
    const isSourceFiltered =
      !item.source ||
      !sourceFilter ||
      sourceFilter === 'All' ||
      (item.source && item.source.toLowerCase() === sourceFilter.toLowerCase());
    const isA11yFiltered =
      !item.a11yLevel ||
      !a11yFilter ||
      a11yFilter === 'All' ||
      item.a11yLevel.toLowerCase() === a11yFilter.toLowerCase();
    const isOwnerFiltered =
      !item.owner ||
      !ownerFilter ||
      ownerFilter === 'All' ||
      (item.owner && item.owner.toLowerCase() === ownerFilter.toLowerCase());
    const isTextFiltered =
      !item.title ||
      !textFilter?.length ||
      (textFilter?.length && item.title.indexOf(textFilter.toLowerCase()) >= 0);
    return isSourceFiltered && isA11yFiltered && isOwnerFiltered && isTextFiltered;
  });
};

export const PatternIndex: React.FC<React.PropsWithChildren<PatternIndexProps>> = ({
  className,
  itemsPerPage = 4,
  view
}) => {
  const [sourceFilter, setSourceFilter] = useState<string | null>('All');
  const [a11yFilter, setA11yFilter] = useState<string | null>('All');
  const [ownerFilter, setOwnerFilter] = useState<string | null>('All');
  const [textFilter, setTextFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string | null>(sortOrderOptions[0]);

  const breakpoint = useBreakpoint();

  const handleTextFilterChange = event => {
    const { value } = event.target;
    setTextFilter(value);
  };

  const handleA11yFilterSelect: SelectionChangeHandler<string, 'default'> = (_e, selectedItem) => {
    setA11yFilter(selectedItem);
  };

  const handleSourceFilterSelect: SelectionChangeHandler<string, 'default'> = (
    _e,
    selectedItem
  ) => {
    setSourceFilter(selectedItem);
  };

  const handleOwnerFilterSelect: SelectionChangeHandler<string, 'default'> = (_e, selectedItem) => {
    setOwnerFilter(selectedItem);
  };

  const handleSortOrderSelect: SelectionChangeHandler<string, 'default'> = (_e, selectedItem) => {
    setSortOrder(selectedItem);
  };

  const ownerOptions = view.reduce<string[]>(
    (result, viewItem) => {
      if (viewItem.owner && result.indexOf(viewItem.owner) === -1) {
        result.splice(result.length - 1, 0, viewItem.owner);
        return result;
      }
      return result;
    },
    ['All', 'UNKNOWN']
  );

  const filteredView = filter(view, a11yFilter, sourceFilter, ownerFilter, textFilter);
  const { startIndex, endIndex, onPageChange, page, pageCount } = usePagination({
    itemsPerPage,
    displayedCount: filteredView.length
  });
  let items = filteredView.slice(startIndex, endIndex);
  items = sortOrder ? sortPatterns(items, sortOrder) : items;
  return (
    <>
      <div className={classnames(styles.root, className)}>
        <FormField className={styles.filterFormField}>
          <FormFieldLabel>Filter</FormFieldLabel>
          <Input
            value={textFilter}
            inputProps={{ name: 'filter on text' }}
            onChange={handleTextFilterChange}
          />
        </FormField>
        <FlowLayout>
          <FlexItem>
            <FormField>
              <FormFieldLabel>Source</FormFieldLabel>
              <Dropdown
                defaultSelected={sourceFilter}
                selected={sourceFilter}
                source={sourceOptions}
                onSelect={handleSourceFilterSelect}
              />
            </FormField>
          </FlexItem>
          <FlexItem>
            <FormField>
              <FormFieldLabel>A11y Rating</FormFieldLabel>
              <Dropdown
                defaultSelected={a11yFilter}
                selected={a11yFilter}
                source={a11yOptions}
                onSelect={handleA11yFilterSelect}
              />
            </FormField>
          </FlexItem>
          <FlexItem>
            <FormField>
              <FormFieldLabel>Owner</FormFieldLabel>
              <Dropdown
                defaultSelected={ownerFilter}
                selected={ownerFilter}
                source={ownerOptions}
                onSelect={handleOwnerFilterSelect}
              />
            </FormField>
          </FlexItem>
          <FlexItem grow={1}>
            <FormField className={styles.sortFormField}>
              <FormFieldLabel>Sort</FormFieldLabel>
              <Dropdown
                defaultSelected={sortOrder}
                selected={sortOrder}
                source={sortOrderOptions}
                onSelect={handleSortOrderSelect}
              />
            </FormField>
          </FlexItem>
        </FlowLayout>
      </div>
      {items.length ? (
        <>
          <div className={styles.content}>
            <P6 className={styles.count}>
              {startIndex + 1} to {Math.min(endIndex, filteredView.length)} Of {filteredView.length}{' '}
              Items
            </P6>
            <GridLayout className={className} columns={breakpoint !== 'mobile' ? 2 : 1}>
              {items.map(item => (
                <GridItem key={`pattern-${item.source}-${item.title}`}>
                  {item.source === 'FIGMA' ? (
                    <FigmaRenderer item={item} />
                  ) : (
                    <StorybookRenderer item={item} />
                  )}
                </GridItem>
              ))}
            </GridLayout>
          </div>
          {items.length ? (
            <Pagination onPageChange={onPageChange} page={page} pageCount={pageCount} />
          ) : null}
        </>
      ) : (
        <div className={styles.content}>No Results Found</div>
      )}
    </>
  );
};
