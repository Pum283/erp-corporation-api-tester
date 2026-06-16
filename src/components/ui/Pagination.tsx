import type { PaginatedResult } from '../../types/entities';
import { DEFAULT_PAGE_SIZE } from '../../api/pagination';
import { Select } from './Select';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {from}–{to} / {totalCount} bản ghi
      </span>
      <div className="pagination-controls">
        {onPageSizeChange && (
          <label className="pagination-size">
            Hiển thị
            <Select
              size="compact"
              value={pageSize}
              onChange={(v) => onPageSizeChange(Number(v))}
              options={PAGE_SIZE_OPTIONS.map((n) => ({
                value: n,
                label: String(n),
              }))}
            />
          </label>
        )}
        <button
          type="button"
          className="btn btn-sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          ← Trước
        </button>
        <span className="pagination-page">
          Trang {page} / {totalPages || 1}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Sau →
        </button>
      </div>
    </div>
  );
}

export function emptyPaginated<T>(): PaginatedResult<T> {
  return {
    items: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}
