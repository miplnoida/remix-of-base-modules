/**
 * BN-AWARD360-B1 — Award 360 typed data table.
 * Not a generic table framework. Scoped to Award 360 tabs.
 */
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TabEmptyState, TabErrorState, TabLoading } from './index';

export interface Award360Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  width?: string;
}

export interface Award360DataTableProps<T> {
  rows: T[];
  columns: Award360Column<T>[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
}

export function Award360DataTable<T>({
  rows,
  columns,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'No rows',
  emptyHint,
  getRowKey,
  onRowClick,
  sortBy,
  sortDirection,
  onSortChange,
}: Award360DataTableProps<T>) {
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={onRetry} />;
  if (!rows.length) return <TabEmptyState title={emptyTitle} hint={emptyHint} />;

  const handleSort = (col: Award360Column<T>) => {
    if (!col.sortAccessor || !onSortChange) return;
    if (sortBy === col.key) onSortChange(col.key, sortDirection === 'asc' ? 'desc' : 'asc');
    else onSortChange(col.key, 'asc');
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => {
              const sortable = !!c.sortAccessor && !!onSortChange;
              const active = sortBy === c.key;
              const Icon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <TableHead
                  key={c.key}
                  className={c.align === 'right' ? 'text-right' : ''}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-7 gap-1 px-2 text-xs"
                      onClick={() => handleSort(c)}
                      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {c.label}
                      <Icon className="h-3 w-3 opacity-60" />
                    </Button>
                  ) : (
                    <span className="text-xs">{c.label}</span>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={getRowKey(r)}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} className={c.align === 'right' ? 'text-right tabular-nums' : ''}>
                  {c.render ? c.render(r) : ((r as any)[c.key] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
