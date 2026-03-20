import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Loader2, Inbox } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
  rowClassName?: (row: T) => string;
  keyField?: string;
  pageSize?: number;
  showPagination?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  emptyIcon,
  onView,
  onEdit,
  renderActions,
  rowClassName,
  keyField = 'id',
  pageSize: defaultPageSize = 10,
  showPagination = true,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 when data changes
  const dataLength = data.length;
  const prevDataLengthRef = React.useRef(dataLength);
  React.useEffect(() => {
    if (dataLength !== prevDataLengthRef.current) {
      setPage(1);
      prevDataLengthRef.current = dataLength;
    }
  }, [dataLength]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginatedData = useMemo(() => {
    if (!showPagination) return data;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize, showPagination]);

  const safeSetPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasActions = onView || onEdit || renderActions;
  const showPaginationBar = showPagination && data.length > 0;

  return (
    <div className="space-y-0">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
              {hasActions && <TableHead className="w-[120px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {emptyIcon || <Inbox className="h-10 w-10" />}
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={row[keyField] || idx}
                  className={`${rowClassName?.(row) || ''} ${onView ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => onView?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(row) : row[col.key] ?? '-'}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {renderActions ? renderActions(row) : (
                          <>
                            {onView && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPaginationBar && (
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, data.length)}–{Math.min(page * pageSize, data.length)} of {data.length}
            </span>
            <span className="mx-1">|</span>
            <span className="flex items-center gap-1">
              Rows per page
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => safeSetPage(1)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => safeSetPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => safeSetPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => safeSetPage(totalPages)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
