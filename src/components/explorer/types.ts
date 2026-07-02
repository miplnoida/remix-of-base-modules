/**
 * Enterprise Data Explorer Framework — core types.
 *
 * A "dataset" is a descriptor that tells the ExplorerShell how to
 * fetch, filter, group, aggregate, chart, and export a live analytical
 * workspace. Every module in the platform contributes datasets; the
 * shell is 100% reusable.
 */
import type { ReactNode } from "react";
import type { LgColumnDef } from "@/components/legal/grid";

export type ExplorerViewType =
  | "grid"
  | "kanban"
  | "timeline"
  | "calendar"
  | "map"
  | "pivot"
  | "chart";

export type ExplorerFilterOp =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "in" | "nin"
  | "contains" | "startsWith" | "endsWith"
  | "between" | "isNull" | "isNotNull";

export interface ExplorerFilter {
  field: string;
  op: ExplorerFilterOp;
  value?: any;
  value2?: any; // for between
}

export interface ExplorerSort { field: string; dir: "asc" | "desc" }

export interface ExplorerGrouping { field: string; label?: string }

export interface ExplorerKpiDef<T = any> {
  id: string;
  label: string;
  hint?: string;
  /** Aggregation over the CURRENT filtered rows. */
  compute: (rows: T[]) => { value: number | string; delta?: number; trend?: "up" | "down" | "flat" };
  format?: "number" | "currency" | "percent" | "duration" | "text";
  currency?: string;
  /** Optional drilldown: adds these filters when the KPI is clicked. */
  drilldown?: (rows: T[]) => ExplorerFilter[] | undefined;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export type ExplorerChartType = "bar" | "line" | "pie" | "area" | "stacked-bar" | "donut";

export interface ExplorerChartDef<T = any> {
  id: string;
  title: string;
  type: ExplorerChartType;
  /** Field to group on for X axis / slices. */
  dimension: keyof T | string;
  /** Numeric aggregation: sum | count | avg. */
  measure?: { field?: keyof T | string; agg: "sum" | "count" | "avg" | "min" | "max" };
  /** Extra series field for stacked charts. */
  stack?: keyof T | string;
  /** If set, clicking a slice emits a cross-filter on this field with the slice key. */
  crossFilterField?: keyof T | string;
  height?: number;
  limit?: number;
}

export interface ExplorerViewConfig {
  type: ExplorerViewType;
  label: string;
  icon?: ReactNode;
  /** Configuration passed to the view renderer. */
  config?: Record<string, any>;
}

export interface ExplorerDatasetDescriptor<T = any> {
  /** Stable machine key — used for saved views, schedules, cache. */
  key: string;
  /** Human title shown in the shell. */
  title: string;
  subtitle?: string;
  module: string; // 'legal' | 'benefits' | 'compliance' | ...
  breadcrumbs?: Array<{ label: string; href?: string }>;

  /** React-Query key. */
  queryKey: readonly unknown[];
  /** Fetch function — receives the current advanced filters. */
  fetcher: (state: ExplorerServerFilters) => Promise<T[]>;
  /** Field name that uniquely identifies a row. */
  rowKey: keyof T | string;

  columns: LgColumnDef<T>[];
  /** Filter descriptors for the advanced filter UI. */
  filterFields?: ExplorerFilterField[];
  /** Default sort. */
  defaultSort?: ExplorerSort[];
  /** Default view. */
  defaultView?: ExplorerViewType;
  /** Enabled views (default: ['grid','chart']). */
  views?: ExplorerViewConfig[];

  kpis?: ExplorerKpiDef<T>[];
  charts?: ExplorerChartDef<T>[];

  /** For Kanban view. */
  kanban?: { groupBy: string; wipField?: string; titleField?: string; subtitleField?: string };
  /** For Timeline / Calendar. */
  timeline?: { dateField: string; endDateField?: string; titleField: string; colorField?: string };
  /** For Map. */
  map?: { latField: string; lngField: string; titleField?: string };
  /** Fields the drilldown handler can navigate to for a row detail. */
  rowNavigate?: (row: T) => string | undefined;

  /** Extra chip filters shown in the filter bar (server-driven quick filters). */
  serverFilterFields?: Array<"dateRange" | "territory" | "officer" | "status" | "stage">;

  /** Enable AI insights panel. */
  aiInsights?: boolean;
  /** Enable schedule delivery. */
  scheduling?: boolean;
  /** Enable saved views. */
  savedViews?: boolean;
  /** Permission gate. */
  requiredCapability?: string;
}

export interface ExplorerFilterField {
  field: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "boolean";
  options?: Array<{ value: string; label: string }>;
}

export interface ExplorerServerFilters {
  dateFrom?: string;
  dateTo?: string;
  territory?: string;
  officerId?: string;
  status?: string;
  stage?: string;
}

export interface ExplorerViewState {
  view: ExplorerViewType;
  serverFilters: ExplorerServerFilters;
  filters: ExplorerFilter[];
  sort: ExplorerSort[];
  grouping: ExplorerGrouping[];
  search: string;
  visibleColumns?: string[];
  crossFilter?: { field: string; value: any } | null;
}

export const DEFAULT_VIEW_STATE: ExplorerViewState = {
  view: "grid",
  serverFilters: {},
  filters: [],
  sort: [],
  grouping: [],
  search: "",
  crossFilter: null,
};
