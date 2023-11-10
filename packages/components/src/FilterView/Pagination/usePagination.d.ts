interface UsePaginationProps {
  itemsPerPage: number;
  displayedCount: number;
}
export declare function usePagination({ itemsPerPage, displayedCount }: UsePaginationProps): {
  page: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (newPage: number) => void;
};
export {};
