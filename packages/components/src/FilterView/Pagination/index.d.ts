import React from 'react';
import { PaginationProps as SaltPaginationProps } from '@salt-ds/lab';
export * from './usePagination';
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
export declare const Pagination: React.FC<React.PropsWithChildren<PaginationProps>>;
