import type { PaginatedResult, PaginationParams } from '../types/entities';

export function paginationQuery(params?: PaginationParams): string {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  return `?page=${page}&pageSize=${pageSize}`;
}

export async function fetchAllPages<T>(
  fetchPage: (params: PaginationParams) => Promise<PaginatedResult<T>>,
  pageSize = 100,
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
