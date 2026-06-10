/**
 * BNDataGrid — shared types for the unified Benefits Module grid standard.
 */
import type { ColumnDef, Row, RowData, SortingState, ColumnFiltersState, VisibilityState, PaginationState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type BNColumnAlign = 'left' | 'right' | 'center';

export interface BNColumnMeta {
  /** Human-readable label used in column picker + exports. */
  label?: string;
  align?: BNColumnAlign;
  /** Hide from export. */
  noExport?: boolean;
  /** Render a formatted cell value for export (string/number). */
  exportValue?: (row: unknown) => string | number | null | undefined;
  /** Default width in px. */
  width?: number;
  /** Min width in px. */
  minWidth?: number;
  /** Sticky to left edge (only honored for first column). */
  pinLeft?: boolean;
  /** Sticky to right edge (only honored for actions column). */
  pinRight?: boolean;
  /** Used as the column header tooltip. */
  description?: string;
  /** Hide column by default (user can re-enable from picker). */
  defaultHidden?: boolean;
}

// Augment TanStack column meta so consumers get typed access.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> extends BNColumnMeta {}
}

export type BNColumnDef<T> = ColumnDef<T, unknown>;

export interface BNRowAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
  /** Hide based on row state. */
  hidden?: (row: T) => boolean;
  /** Disable based on row state. */
  disabled?: (row: T) => boolean;
  variant?: 'default' | 'destructive';
}

export interface BNBulkAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (rows: T[]) => void | Promise<void>;
  variant?: 'default' | 'destructive';
  /** Disable bulk action based on selection. */
  disabled?: (rows: T[]) => boolean;
}

export interface BNToolbarFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

export interface BNSummaryChip {
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
}

export interface BNGridServerState {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
}

export interface BNGridProps<T> {
  /** Stable id used for localStorage persistence (e.g. "bn.rule-catalogue"). */
  id: string;
  columns: BNColumnDef<T>[];
  data: T[];
  /** Row id resolver (defaults to row.id). */
  getRowId?: (row: T, index: number) => string;
  isLoading?: boolean;

  /** Mode = client (default): grid handles paging/sort/filter locally. */
  /** Mode = server: parent owns state via onServerStateChange + totalCount. */
  mode?: 'client' | 'server';
  totalCount?: number;
  onServerStateChange?: (state: BNGridServerState) => void;

  // Toolbar
  searchPlaceholder?: string;
  toolbarFilters?: BNToolbarFilter[];
  toolbarExtras?: ReactNode;

  // Summary chips above grid.
  summary?: BNSummaryChip[];

  // Row & bulk actions
  rowActions?: BNRowAction<T>[];
  bulkActions?: BNBulkAction<T>[];

  // Empty state
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onCreate?: () => void;
  onImport?: () => void;
  onRefresh?: () => void;

  // Row click → typically opens side panel.
  onRowClick?: (row: T) => void;

  // Default sort, applied if no persisted state exists.
  defaultSort?: SortingState;
  defaultPageSize?: 10 | 25 | 50 | 100 | 250;

  // Export config
  exportFilename?: string;
  /** Override "current user" shown in export header. */
  exportUserLabel?: string;
}

export type BNTableRow<T> = Row<T>;
