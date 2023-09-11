import React from 'react';
import classnames from 'clsx';
import {
  Paginator,
  Pagination as SaltPagination,
  PaginationProps as SaltPaginationProps
} from '@salt-ds/lab';

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
  onPageChange?: SaltPaginationProps['onPageChange'];
  /** The current page */
  page?: SaltPaginationProps['page'];
  /** Number of pages  */
  pageCount: number;
}

export const Pagination: React.FC<React.PropsWithChildren<PaginationProps>> = ({
  className,
  pageCount,
  page,
  onPageChange
}) => (
  <div className={classnames(styles.root, className)}>
    <SaltPagination count={pageCount} onPageChange={onPageChange} page={page}>
      <Paginator className={styles.paginator} />
    </SaltPagination>
  </div>
);
