/**
 * BNDataGrid — unified enterprise grid for all Benefits Module listings.
 *
 * Features (see .lovable/plan.md "Build BNDataGrid"):
 *  - paging (10/25/50/100/250) with First/Prev/Next/Last, total count
 *  - sorting with ▲/▼ indicators, default sort prop
 *  - quick search + toolbar filters + filter count + clear-all
 *  - column visibility (persisted)
 *  - column resizing (persisted) with reset
 *  - sticky first column + sticky actions column with horizontal scroll
 *  - row click, row actions, multi-select + bulk actions
 *  - summary chips strip
 *  - CSV / Excel / PDF export with filter+sort+timestamp header
 *  - skeleton loading + empty state (Create / Import / Refresh)
 *  - client mode (default) or server mode (parent owns paging/sort/filter)
 *  - a11y: aria-sort headers, focus rings, ESC handled by side panel
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowDown, ArrowUp, ChevronsUpDown, FileSearch, MoreHorizontal, Plus, RefreshCw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BNGridProps, BNGridServerState } from './types';
import { useBnGridState, clearGridState } from '@/hooks/bn/useBnGridState';
import { BNGridToolbar } from './BNGridToolbar';
import { BNGridPagination } from './BNGridPagination';
import { BNGridSummary } from './BNGridSummary';

export function BNDataGrid<T>(props: BNGridProps<T>) {
  const {
    id, columns, data, getRowId, isLoading,
    mode = 'client', totalCount, onServerStateChange,
    searchPlaceholder, toolbarFilters, toolbarExtras,
    summary,
    rowActions, bulkActions,
    emptyMessage = 'No records found.', emptyAction,
    onCreate, onImport, onRefresh,
    onRowClick,
    defaultSort = [], defaultPageSize = 25,
    exportFilename, exportUserLabel,
  } = props;

  const [persisted, setPersisted] = useBnGridState(id, { pageSize: defaultPageSize });

  const [sorting, setSorting] = useState<SortingState>(persisted.sorting.length ? persisted.sorting : defaultSort);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const base: VisibilityState = {};
    columns.forEach((c) => {
      const colId = (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey;
      if (colId && c.meta?.defaultHidden) base[colId] = false;
    });
    return { ...base, ...persisted.columnVisibility };
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(persisted.columnSizing ?? {});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: persisted.pageSize ?? defaultPageSize });

  // Persist
  useEffect(() => {
    setPersisted({ sorting, columnVisibility, columnSizing, pageSize: pagination.pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting, columnVisibility, columnSizing, pagination.pageSize]);

  // Build enhanced columns: selection + provided + actions
  const enhancedColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    const cols: ColumnDef<T, unknown>[] = [];
    if (bulkActions?.length) {
      cols.push({
        id: '__select__',
        size: 36,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        meta: { pinLeft: true, noExport: true },
      });
    }
    cols.push(...columns);
    if (rowActions?.length) {
      // Inline icon buttons for first N, overflow the rest into a dropdown.
      const INLINE_LIMIT = 3;
      const iconBtnWidth = 30;
      const inlineCount = Math.min(rowActions.length, INLINE_LIMIT);
      const hasOverflow = rowActions.length > INLINE_LIMIT;
      const actionsWidth = (inlineCount + (hasOverflow ? 1 : 0)) * iconBtnWidth + 16;
      cols.push({
        id: '__actions__',
        size: actionsWidth,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const visible = rowActions.filter((a) => !a.hidden?.(row.original));
          if (!visible.length) return null;
          const inline = visible.slice(0, INLINE_LIMIT);
          const overflow = visible.slice(INLINE_LIMIT);
          return (
            <TooltipProvider delayDuration={150}>
              <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                {inline.map((a) => (
                  <Tooltip key={a.key}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7',
                          a.variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10',
                        )}
                        disabled={a.disabled?.(row.original)}
                        onClick={() => a.onClick(row.original)}
                        aria-label={a.label}
                      >
                        {a.icon ?? <MoreHorizontal className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{a.label}</TooltipContent>
                  </Tooltip>
                ))}
                {overflow.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {overflow.map((a, i) => (
                        <React.Fragment key={a.key}>
                          {i > 0 && a.variant === 'destructive' && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            disabled={a.disabled?.(row.original)}
                            onClick={() => a.onClick(row.original)}
                            className={a.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                          >
                            {a.icon}
                            <span className={a.icon ? 'ml-2' : ''}>{a.label}</span>
                          </DropdownMenuItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </TooltipProvider>
          );
        },
        meta: { pinRight: true, noExport: true, align: 'right' },
      });
    }

    return cols;
  }, [columns, bulkActions, rowActions]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      sorting,
      columnVisibility,
      columnSizing,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination,
    },
    getRowId,
    enableRowSelection: !!bulkActions?.length,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    manualPagination: mode === 'server',
    manualSorting: mode === 'server',
    manualFiltering: mode === 'server',
    pageCount: mode === 'server' ? Math.max(1, Math.ceil((totalCount ?? 0) / pagination.pageSize)) : undefined,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: mode === 'client' ? getSortedRowModel() : undefined,
    getFilteredRowModel: mode === 'client' ? getFilteredRowModel() : undefined,
    getPaginationRowModel: mode === 'client' ? getPaginationRowModel() : undefined,
  });

  // Emit server-state changes
  const lastEmitted = useRef<string>('');
  useEffect(() => {
    if (mode !== 'server' || !onServerStateChange) return;
    const state: BNGridServerState = { pagination, sorting, columnFilters, globalFilter };
    const sig = JSON.stringify(state);
    if (sig !== lastEmitted.current) {
      lastEmitted.current = sig;
      onServerStateChange(state);
    }
  }, [mode, onServerStateChange, pagination, sorting, columnFilters, globalFilter]);

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.original),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection, data],
  );

  const total = mode === 'server' ? (totalCount ?? 0) : table.getFilteredRowModel().rows.length;

  const handleClearAll = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    toolbarFilters?.forEach((f) => f.onChange(''));
  };

  const handleResetColumns = () => {
    setColumnVisibility({});
    setColumnSizing({});
    clearGridState(id);
  };

  const filterSummary = useMemo(() => {
    const out: string[] = [];
    if (globalFilter) out.push(`search="${globalFilter}"`);
    toolbarFilters?.forEach((f) => { if (f.value) out.push(`${f.label}=${f.value}`); });
    return out;
  }, [globalFilter, toolbarFilters]);

  const sortSummary = sorting.map((s) => `${s.id} ${s.desc ? '▼' : '▲'}`);

  const exportContext = {
    filename: exportFilename || id.replace(/[^a-z0-9_-]+/gi, '_'),
    userLabel: exportUserLabel,
    filterSummary,
    sortSummary,
  };

  return (
    <div className="space-y-3">
      {summary && <BNGridSummary chips={summary} />}

      <div className="border rounded-md bg-card overflow-hidden flex flex-col">
        <BNGridToolbar
          table={table}
          search={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder={searchPlaceholder}
          filters={toolbarFilters}
          onClearAll={handleClearAll}
          onRefresh={onRefresh}
          onCreate={onCreate}
          onImport={onImport}
          onResetColumns={handleResetColumns}
          exportContext={exportContext}
          extras={toolbarExtras}
        />

        {bulkActions?.length && selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-primary/5">
            <span className="text-xs font-medium">{selectedRows.length} selected</span>
            <div className="flex flex-wrap items-center gap-1.5 ml-2">
              {bulkActions.map((a) => (
                <Button
                  key={a.key}
                  size="sm"
                  variant={a.variant === 'destructive' ? 'destructive' : 'outline'}
                  className="h-7 gap-1.5"
                  disabled={a.disabled?.(selectedRows)}
                  onClick={() => a.onClick(selectedRows)}
                >
                  {a.icon}{a.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setRowSelection({})}>Clear</Button>
            </div>
          </div>
        )}

        <div className="overflow-auto max-h-[calc(100vh-22rem)]" role="region" aria-label="Data grid">
          <table className="w-full text-sm border-collapse" style={{ minWidth: table.getCenterTotalSize() }} role="grid">
            <thead className="sticky top-0 z-20 bg-muted">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const meta = h.column.columnDef.meta;
                    const canSort = h.column.getCanSort();
                    const sort = h.column.getIsSorted();
                    const ariaSort = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none';
                    return (
                      <th
                        key={h.id}
                        aria-sort={ariaSort as React.AriaAttributes['aria-sort']}
                        className={cn(
                          'h-9 px-3 text-left align-middle font-medium text-foreground/80 text-xs whitespace-nowrap border-b select-none',
                          meta?.align === 'right' && 'text-right',
                          meta?.align === 'center' && 'text-center',
                          meta?.pinLeft && 'sticky left-0 z-30 bg-muted',
                          meta?.pinRight && 'sticky right-0 z-30 bg-muted shadow-[-4px_0_6px_-4px_hsl(var(--border))]',

                        )}
                        style={{ width: h.getSize() }}
                      >
                        <div className={cn('flex items-center gap-1', meta?.align === 'right' && 'justify-end', meta?.align === 'center' && 'justify-center')}>
                          {h.isPlaceholder ? null : (
                            <button
                              type="button"
                              className={cn('inline-flex items-center gap-1 hover:text-foreground', canSort && 'cursor-pointer')}
                              onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                              title={(meta?.description as string) || ''}
                            >
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {canSort && (
                                sort === 'asc' ? <ArrowUp className="h-3 w-3" /> :
                                sort === 'desc' ? <ArrowDown className="h-3 w-3" /> :
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          )}
                        </div>
                        {h.column.getCanResize() && (
                          <div
                            onMouseDown={h.getResizeHandler()}
                            onTouchStart={h.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent hover:bg-primary/40',
                              h.column.getIsResizing() && 'bg-primary',
                            )}
                            style={{ position: 'absolute' }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skl-${i}`} className="border-b">
                    {table.getVisibleLeafColumns().map((c) => (
                      <td key={c.id} className="px-3 py-2"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <FileSearch className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                      <div className="flex items-center gap-2">
                        {onCreate && <Button size="sm" onClick={onCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />Create New</Button>}
                        {onImport && <Button size="sm" variant="outline" onClick={onImport}><Upload className="h-3.5 w-3.5 mr-1.5" />Import</Button>}
                        {onRefresh && <Button size="sm" variant="outline" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>}
                        {emptyAction}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                      row.getIsSelected() && 'bg-primary/5',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-3 py-2 align-middle text-xs',
                            meta?.align === 'right' && 'text-right',
                            meta?.align === 'center' && 'text-center',
                            meta?.pinLeft && 'sticky left-0 z-10 bg-card',
                            meta?.pinRight && 'sticky right-0 z-10 bg-card shadow-[-4px_0_6px_-4px_hsl(var(--border))]',

                          )}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <BNGridPagination table={table} totalRows={total} />
      </div>
    </div>
  );
}
