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

export function LgDataGrid<T>(props: LgDataGridProps<T>) {
  // Force the persistence id to a "lg." prefix so legal grids don't collide
  // with benefits grid column-preference storage.
  const id = props.id.startsWith("lg.") ? props.id : `lg.${props.id}`;
  const exportFilename = props.exportFilename ?? `legal-${id.replace(/^lg\./, "")}`;
  return <BNDataGrid {...props} id={id} exportFilename={exportFilename} />;
}

export { LgStatusBadge } from "./LgStatusBadge";
export type {
  BNColumnDef as LgColumnDef,
  BNRowAction as LgRowAction,
  BNBulkAction as LgBulkAction,
  BNToolbarFilter as LgToolbarFilter,
  BNSummaryChip as LgSummaryChip,
} from "@/components/bn/grid/types";
