/**
 * EPIC 3D-UX — Reusable Communication Hub table.
 *
 * Presentation-only. Callers own data fetching. Supports:
 *  - client-side or server-side pagination (page/pageSize/total)
 *  - controlled sort (single column, asc/desc)
 *  - sticky first column (left) and sticky action column (right)
 *  - density: compact (default) / comfortable
 *  - loading / empty / error states
 *
 * Columns are declared once and referenced by key. `sortable` columns get a
 * click handler on the header. Server-side pagination is enabled by passing
 * `mode="server"` — otherwise the component paginates + sorts the given rows
 * in-memory.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface HubTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  /** value used for client-side sorting when sortable */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  sticky?: "left" | "right";
  className?: string;
  headerClassName?: string;
  minWidth?: string | number;
}

export interface HubTablePagination {
  page: number; // 1-based
  pageSize: number;
  total?: number; // if known
}

export interface CommunicationHubDataTableProps<T> {
  /** Stable id for persisting density/pageSize prefs in localStorage. */
  screenKey: string;
  columns: HubTableColumn<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T, index: number) => string;
  mode?: "client" | "server";
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  /** initial default sort. */
  defaultSort?: SortState;
  /** controlled sort state (server mode). */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** pagination (server mode). */
  pagination?: HubTablePagination;
  onPaginationChange?: (p: HubTablePagination) => void;
  /** page-size options. */
  pageSizeOptions?: number[];
  /** header slot rendered above the table (filters etc). */
  toolbar?: ReactNode;
  /** actions rendered on the right of the toolbar (refresh, export). */
  toolbarActions?: ReactNode;
  className?: string;
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

function readPref<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writePref<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function stickyClasses(sticky: HubTableColumn<unknown>["sticky"], isHeader: boolean) {
  if (!sticky) return "";
  const base =
    "sticky bg-background z-10 " +
    (isHeader ? "bg-muted/50 " : "");
  if (sticky === "left") {
    return (
      base +
      "left-0 shadow-[inset_-8px_0_8px_-8px_hsl(var(--border))]"
    );
  }
  return base + "right-0 shadow-[inset_8px_0_8px_-8px_hsl(var(--border))]";
}

export function CommunicationHubDataTable<T>({
  screenKey,
  columns,
  rows,
  getRowKey,
  mode = "client",
  loading,
  error,
  onRetry,
  emptyMessage = "No records match the current filters.",
  defaultSort,
  sort: sortProp,
  onSortChange,
  pagination: paginationProp,
  onPaginationChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  toolbar,
  toolbarActions,
  className,
}: CommunicationHubDataTableProps<T>) {
  const densityKey = `comm-hub:table:${screenKey}:density`;
  const pageSizeKey = `comm-hub:table:${screenKey}:pageSize`;

  const [density, setDensity] = useState<"compact" | "comfortable">(() =>
    readPref<"compact" | "comfortable">(densityKey, "compact"),
  );
  const [internalSort, setInternalSort] = useState<SortState | undefined>(defaultSort);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(() => readPref<number>(pageSizeKey, 25));

  const isServer = mode === "server";
  const sort = isServer ? sortProp : internalSort;
  const pageSize = isServer ? paginationProp?.pageSize ?? 25 : internalPageSize;
  const page = isServer ? paginationProp?.page ?? 1 : internalPage;

  // Client-side sort + page
  const displayRows = useMemo(() => {
    if (!rows) return [];
    if (isServer) return rows;
    let out = rows.slice();
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.direction === "asc" ? 1 : -1;
        out.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }
    const start = (page - 1) * pageSize;
    return out.slice(start, start + pageSize);
  }, [rows, isServer, sort, columns, page, pageSize]);

  const total = isServer ? paginationProp?.total ?? 0 : rows?.length ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (isServer && onPaginationChange && paginationProp) {
      onPaginationChange({ ...paginationProp, page: clamped });
    } else {
      setInternalPage(clamped);
    }
  };
  const setPageSize = (next: number) => {
    writePref(pageSizeKey, next);
    if (isServer && onPaginationChange && paginationProp) {
      onPaginationChange({ ...paginationProp, page: 1, pageSize: next });
    } else {
      setInternalPageSize(next);
      setInternalPage(1);
    }
  };
  const setDensityPref = (next: "compact" | "comfortable") => {
    writePref(densityKey, next);
    setDensity(next);
  };

  const clickHeader = (col: HubTableColumn<T>) => {
    if (!col.sortable) return;
    const nextDir: SortDirection = sort?.key === col.key && sort.direction === "asc" ? "desc" : "asc";
    const next: SortState = { key: col.key, direction: nextDir };
    if (isServer && onSortChange) onSortChange(next);
    else setInternalSort(next);
  };

  const rowPadding = density === "compact" ? "py-1.5" : "py-3";
  const cellPadding = density === "compact" ? "px-2" : "px-3";

  return (
    <div className={cn("space-y-3", className)}>
      {(toolbar || toolbarActions) && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-0">{toolbar}</div>
          {toolbarActions && <div className="flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      <div className="rounded-md border bg-background">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                {columns.map((col) => {
                  const isSorted = sort?.key === col.key;
                  const Icon = !col.sortable ? null : !isSorted ? ArrowUpDown : sort!.direction === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={col.key}
                      style={col.minWidth ? { minWidth: typeof col.minWidth === "number" ? `${col.minWidth}px` : col.minWidth } : undefined}
                      className={cn(
                        "text-left font-medium text-xs text-muted-foreground border-b whitespace-nowrap",
                        cellPadding,
                        "py-2",
                        col.sortable && "cursor-pointer select-none hover:text-foreground",
                        stickyClasses(col.sticky, true),
                        col.headerClassName,
                      )}
                      onClick={() => clickHeader(col)}
                      aria-sort={isSorted ? (sort!.direction === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {Icon && <Icon className="h-3 w-3 opacity-70" aria-hidden />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {columns.map((c) => (
                      <td key={c.key} className={cn("border-b", cellPadding, rowPadding, stickyClasses(c.sticky, false))}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center">
                    <div className="text-sm text-destructive mb-2">
                      {typeof error === "string" ? error : error.message ?? "Failed to load data"}
                    </div>
                    {onRetry && (
                      <Button size="sm" variant="outline" onClick={onRetry}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                displayRows.map((row, i) => (
                  <tr key={getRowKey(row, i)} className="hover:bg-muted/40">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "border-b align-top",
                          cellPadding,
                          rowPadding,
                          stickyClasses(col.sticky, false),
                          col.className,
                        )}
                      >
                        {col.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination bar */}
        <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2 text-xs">
          <div className="text-muted-foreground">
            {total === 0 ? "0 rows" : <>Showing <span className="font-medium text-foreground">{from}–{to}</span> of <span className="font-medium text-foreground">{total}</span></>}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2 text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Last page">
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-l pl-2 ml-1">
              <span className="text-muted-foreground">Density</span>
              <Button
                variant={density === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setDensityPref("compact")}
              >
                Compact
              </Button>
              <Button
                variant={density === "comfortable" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setDensityPref("comfortable")}
              >
                Comfortable
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunicationHubDataTable;
