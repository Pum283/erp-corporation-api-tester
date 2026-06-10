import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../api/pagination';
import type { PaginatedResult, PaginationParams } from '../types/entities';

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

  const load = useCallback(
    async (nextPage: number, nextPageSize: number) => {
      setLoading(true);
      try {
        const result = await fetchPage({ page: nextPage, pageSize: nextPageSize });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
  );

  const goToPage = useCallback(
    (p: number) => {
      void load(p, data.pageSize);
    },
    [load, data.pageSize],
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
