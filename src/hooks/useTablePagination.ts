import { useState, useMemo } from 'react';

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function useTablePagination<T>(data: T[], defaultPageSize: number = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, page, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const goToPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  // Reset to first page when data changes significantly
  const resetPagination = () => {
    setPage(1);
  };

  return {
    paginatedData,
    pagination: {
      page,
      pageSize,
      totalItems: data.length,
      totalPages,
    },
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    resetPagination,
  };
}
