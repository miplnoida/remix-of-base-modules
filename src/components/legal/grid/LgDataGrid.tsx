/**
 * LgDataGrid — thin alias over the Benefits BNDataGrid so every Legal
 * listing shares the exact same toolbar, paging, sort, filter, column
 * picker, export, bulk-action and row-action behaviour.
 *
 * Use this everywhere in the Legal module — never hand-roll a <table>.
 */
import React from "react";
import { BNDataGrid } from "@/components/bn/grid";
import type { BNGridProps } from "@/components/bn/grid/types";

export type LgDataGridProps<T> = BNGridProps<T>;

// Wrapper intentionally accepts BNGridProps<any> so callers can pass strongly
// typed `columns`/`data` for one type while using helper-built `rowActions`
// (whose T may infer as unknown when handlers ignore the row arg) without
// forcing TS to widen the whole grid's T to unknown.
type AnyLgGridProps = BNGridProps<any>;

export function LgDataGrid(props: AnyLgGridProps) {
  // Force the persistence id to a "lg." prefix so legal grids don't collide
  // with benefits grid column-preference storage.
  const id = props.id.startsWith("lg.") ? props.id : `lg.${props.id}`;
  const exportFilename = props.exportFilename ?? `legal-${id.replace(/^lg\./, "")}`;
  const Grid = BNDataGrid as unknown as (p: AnyLgGridProps) => JSX.Element;
  return <Grid {...props} id={id} exportFilename={exportFilename} />;
}

export { LgStatusBadge } from "./LgStatusBadge";
export type {
  BNColumnDef as LgColumnDef,
  BNRowAction as LgRowAction,
  BNBulkAction as LgBulkAction,
  BNToolbarFilter as LgToolbarFilter,
  BNSummaryChip as LgSummaryChip,
} from "@/components/bn/grid/types";
