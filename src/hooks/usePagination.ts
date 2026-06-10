import { useCallback, useState } from 'react';
import type { PaginatedResult, PaginationParams } from '../types/entities';

const DEFAULT_PAGE_SIZE = 20;

export function usePagination<T>(
  fetchPage: (params: PaginationParams) => Promise<PaginatedResult<T>>,
  initialPageSize = DEFAULT_PAGE_SIZE,
) {
  const [data, setData] = useState<PaginatedResult<T>>({
    items: [],
    page: 1,
    pageSize: initialPageSize,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const load = useCallback(
    async (nextPage = page, nextPageSize = pageSize) => {
      setLoading(true);
      try {
        const result = await fetchPage({ page: nextPage, pageSize: nextPageSize });
        setData(result);
        setPage(result.page);
        setPageSize(result.pageSize);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, page, pageSize],
  );

  const goToPage = useCallback(
    (p: number) => {
      void load(p, pageSize);
    },
    [load, pageSize],
  );

  const changePageSize = useCallback(
    (size: number) => {
      void load(1, size);
    },
    [load],
  );

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    totalPages: data.totalPages,
    hasPreviousPage: data.hasPreviousPage,
    hasNextPage: data.hasNextPage,
    loading,
    load,
    goToPage,
    changePageSize,
  };
}
