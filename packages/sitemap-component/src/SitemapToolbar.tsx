import React, { useState } from 'react';
import { Dropdown, DropdownButton, SelectionChangeHandler } from '@salt-ds/lab';
import {
  useToolbarDispatch,
  useToolbarState,
  Caption2,
  Icon
} from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export interface SitemapToolbarProps {
  /** Additional class name for overrides */
  className?: string;
  /** The url of the file system */
  loading: boolean;
  pageCount: number;
  namespaces: string[];
  /** Initial namespace filters */
  initialNamespaceFilters?: string[];
}

const defaultButtonLabel = (selectedItems: string[] | undefined) => {
  if (!selectedItems || selectedItems.length === 0) {
    return 'All';
  }
  if (selectedItems.length === 1) {
    return `${selectedItems[0]}`;
  }
  return `${selectedItems.length} Items Selected`;
};

export const SitemapToolbar: React.FC<SitemapToolbarProps> = ({
  initialNamespaceFilters = [],
  loading,
  namespaces,
  pageCount,
  ...rest
}: SitemapToolbarProps) => {
  const dispatch = useToolbarDispatch();
  const { filters = [] } = useToolbarState();
  const [isOpen, setIsOpen] = useState(false);
  const handleSelect: SelectionChangeHandler<string, 'multiple'> = (_e, selectedItems) =>
    dispatch({ type: 'setFilters', value: selectedItems });

  return (
    <div className={styles.toolbar}>
      {!loading ? (
        <>
          <Caption2 className={styles.pageCount}>Number of pages: {pageCount}</Caption2>
          {namespaces?.length >= 1 ? (
            <Dropdown<string, 'multiple'>
              aria-label={isOpen ? 'close filters menu' : 'open filters menu'}
              className={styles.filterDropdown}
              onOpenChange={setIsOpen}
              onSelectionChange={handleSelect}
              selected={filters}
              selectionStrategy="multiple"
              source={namespaces}
              triggerComponent={
                <span className={styles.filterDropdownTriggerRoot}>
                  <Icon name="filter" />
                  <DropdownButton label={defaultButtonLabel(filters)} />
                </span>
              }
              width={200}
              {...rest}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
};
