import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Enterprise Workbench — generic types.
 * A workbench is described by an Adapter that provides:
 *   - data fetching (rows + loading/error)
 *   - queue and card predicates (assignment + SLA driven, NOT status-driven)
 *   - filter chips (e.g. source department)
 *   - row actions (assign, reassign, escalate, …)
 *   - a grid renderer
 *   - a row link builder
 *
 * The same shell powers Legal Referrals, Legal Matters, Contract Reviews,
 * Employer Recovery, Appeals, and Payment Arrangements.
 */

export type WorkbenchTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface WorkbenchScope {
  userCode: string | null;
  userId: string | null;
  teamCodes: string[];
  workbasketCodes: string[];
}

export interface WorkbenchQueueDef<T> {
  id: string;
  label: string;
  predicate: (row: T, scope: WorkbenchScope) => boolean;
  tone?: WorkbenchTone;
  /** Default queue selected on first load */
  isDefault?: boolean;
}

export interface WorkbenchCardDef<T> {
  id: string;
  label: string;
  icon?: LucideIcon;
  tone?: WorkbenchTone;
  predicate: (row: T, scope: WorkbenchScope) => boolean;
  /** When clicked, switch to this queue id. If absent, the card only filters. */
  switchToQueue?: string;
}

export interface WorkbenchFilterChip<T> {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  /** Predicate is applied when value !== "ALL" */
  predicate: (row: T, value: string) => boolean;
  defaultValue?: string;
}

export interface WorkbenchRowAction<T> {
  id: string;
  label: string;
  onSelect: (row: T) => void;
  hidden?: (row: T) => boolean;
  destructive?: boolean;
}

export interface WorkbenchAdapter<T> {
  title: string;
  subtitle?: string;
  useRows: () => {
    rows: T[];
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
    refetch: () => void;
  };
  useScope: () => WorkbenchScope;
  getRowId: (row: T) => string;
  queues: WorkbenchQueueDef<T>[];
  cards: WorkbenchCardDef<T>[];
  filterChips?: WorkbenchFilterChip<T>[];
  actions: (row: T) => WorkbenchRowAction<T>[];
  renderGrid: (args: {
    rows: T[];
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
    onRefresh: () => void;
    onRowAction: (row: T) => WorkbenchRowAction<T>[];
  }) => ReactNode;
}
