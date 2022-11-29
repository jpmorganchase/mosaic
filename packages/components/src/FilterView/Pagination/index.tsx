import React from 'react';
import classnames from 'classnames';
import {
  Paginator,
  Pagination as UITKPagination,
  PaginationProps as UITKPaginationProps
} from '@jpmorganchase/uitk-lab';

import styles from './styles.css';

export interface PaginationProps {
  /** Additional class name for root class override */
  className?: string;
  /**
   * Callback fired when the page is changed.
   *
   * @param {object} event The event source of the callback.
   * @param {number} page The page selected.
   */
  onPageChange?: UITKPaginationProps['onPageChange'];
  /** The current page */
  page?: UITKPaginationProps['page'];
  /** Number of pages  */
  pageCount: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  className,
  pageCount,
  page,
  onPageChange
}) => (
  <div className={classnames(styles.root, className)}>
    <UITKPagination count={pageCount} onPageChange={onPageChange} page={page}>
      <Paginator />
    </UITKPagination>
  </div>
);
