/**
 * lgRowActions — standard {View, Edit, History, Documents} row-action factory
 * so every Legal grid offers the same action set with consistent icons.
 */
import React from "react";
import { Eye, Pencil, History, Paperclip, Trash2 } from "lucide-react";
import type { BNRowAction } from "@/components/bn/grid/types";

export interface StandardRowActions<T> {
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onHistory?: (row: T) => void;
  onDocuments?: (row: T) => void;
  onDelete?: (row: T) => void;
  canEdit?: (row: T) => boolean;
  canDelete?: (row: T) => boolean;
}

export function buildLgRowActions<T>(opts: StandardRowActions<T>): BNRowAction<T>[] {
  const out: BNRowAction<T>[] = [];
  if (opts.onView) out.push({ key: "view", label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: opts.onView });
  if (opts.onEdit) out.push({
    key: "edit", label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onClick: opts.onEdit,
    disabled: opts.canEdit ? (r) => !opts.canEdit!(r) : undefined,
  });
  if (opts.onHistory) out.push({ key: "history", label: "History", icon: <History className="h-3.5 w-3.5" />, onClick: opts.onHistory });
  if (opts.onDocuments) out.push({ key: "documents", label: "Documents", icon: <Paperclip className="h-3.5 w-3.5" />, onClick: opts.onDocuments });
  if (opts.onDelete) out.push({
    key: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive", onClick: opts.onDelete,
    disabled: opts.canDelete ? (r) => !opts.canDelete!(r) : undefined,
  });
  return out;
}

/** Days remaining helper used by Hearings/Deadlines grids for green/amber/red chips. */
export function daysRemainingTone(dateIso?: string | null): "ok" | "warn" | "danger" | "muted" {
  if (!dateIso) return "muted";
  const target = new Date(dateIso).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today.getTime()) / 86400000);
  if (diff < 0) return "danger";
  if (diff <= 3) return "warn";
  return "ok";
}

export function daysRemainingLabel(dateIso?: string | null): string {
  if (!dateIso) return "—";
  const target = new Date(dateIso).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  return `${diff}d`;
}
