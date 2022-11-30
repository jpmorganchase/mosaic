import { useState, useCallback } from 'react';

interface UsePaginationProps {
  itemsPerPage: number;
  displayedCount: number;
}

export function usePagination({ itemsPerPage, displayedCount }: UsePaginationProps) {
  const [page, setPage] = useState(1);

  const multiplePages = displayedCount >= itemsPerPage;

  const startIndex = page > 1 && multiplePages ? (page - 1) * itemsPerPage : 0;
  const endIndex = multiplePages ? startIndex + itemsPerPage : displayedCount;
  const pageCount = Math.ceil(displayedCount / itemsPerPage);

  const onPageChange = useCallback(
    newPage => {
      setPage(newPage);
    },
    [setPage]
  );

  return {
    page,
    pageCount,
    startIndex,
    endIndex,
    onPageChange
  };
}
