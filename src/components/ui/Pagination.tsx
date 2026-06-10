import type { PaginatedResult } from '../../types/entities';

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
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
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
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}
