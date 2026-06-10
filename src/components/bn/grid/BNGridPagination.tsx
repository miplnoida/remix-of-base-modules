import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface Props<T> {
  table: Table<T>;
  totalRows: number;
}

const PAGE_SIZES = [10, 25, 50, 100, 250];

export function BNGridPagination<T>({ table, totalRows }: Props<T>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount() || 1;
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(totalRows, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t bg-muted/30 text-xs">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground tabular-nums">{start.toLocaleString()}-{end.toLocaleString()}</span> of{' '}
          <span className="font-medium text-foreground tabular-nums">{totalRows.toLocaleString()}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger className="h-7 w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground mr-2">
          Page <span className="font-medium text-foreground tabular-nums">{pageIndex + 1}</span> of{' '}
          <span className="font-medium text-foreground tabular-nums">{pageCount}</span>
        </span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page"><ChevronFirst className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} aria-label="Last page"><ChevronLast className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
