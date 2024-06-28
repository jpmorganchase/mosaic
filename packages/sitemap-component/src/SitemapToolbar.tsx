import React, { SyntheticEvent } from 'react';
import { Dropdown, Option } from '@salt-ds/core';
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
  const handleSelect = (_e: SyntheticEvent, selectedItems: string[]) =>
    dispatch({ type: 'setFilters', value: selectedItems });

  return (
    <div className={styles.toolbar}>
      {!loading ? (
        <>
          <Caption2 className={styles.pageCount}>Number of pages: {pageCount}</Caption2>
          {namespaces?.length >= 1 ? (
            <Dropdown
              startAdornment={<Icon name="filter" />}
              value={defaultButtonLabel(filters)}
              aria-label="Filters"
              className={styles.filterDropdown}
              onSelectionChange={handleSelect}
              selected={filters}
              multiselect
              style={{ width: 200 }}
              {...rest}
            >
              {namespaces.map(namespace => (
                <Option key={namespace} value={namespace}>
                  {namespace}
                </Option>
              ))}
            </Dropdown>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
