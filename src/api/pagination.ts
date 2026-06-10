import type { PaginatedResult, PaginationParams } from '../types/entities';

export const DEFAULT_PAGE_SIZE = 10;

/** Kích thước chunk khi gom toàn bộ trang (dropdown / cache) — tránh gọi N lần pageSize=10. */
export const FETCH_ALL_PAGE_SIZE = 100;

export function paginationQuery(params?: PaginationParams): string {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  return `?page=${page}&pageSize=${pageSize}`;
}

export async function fetchAllPages<T>(
  fetchPage: (params: PaginationParams) => Promise<PaginatedResult<T>>,
  pageSize = FETCH_ALL_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  for (;;) {
    const result = await fetchPage({ page, pageSize });
    all.push(...result.items);
    if (!result.hasNextPage) break;
    page += 1;
  }

  return all;
}
