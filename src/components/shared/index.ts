/**
 * Foundation Components - Reusable UI utilities
 * 
 * These components provide standardized functionality across all modules:
 * - StatusBadge: Consistent status display with auto-detection
 * - PageHeader: Breadcrumbs, title, subtitle, and action buttons
 * - MetricCard: Dashboard metric cards with icons and trends
 * - QueryByFilter: Collapsible multi-criteria filter system
 * - ColumnSelector: Dynamic table column visibility control
 * - ExportButton: CSV/Excel/JSON export with one click
 */

export { StatusBadge } from "./StatusBadge";
export type { StatusVariant } from "./StatusBadge";

export { PageHeader } from "./PageHeader";
export type { BreadcrumbItem } from "./PageHeader";

export { MetricCard } from "./MetricCard";

export { QueryByFilter } from "./QueryByFilter";
export type { FilterField } from "./QueryByFilter";

export { ColumnSelector } from "./ColumnSelector";
export type { Column } from "./ColumnSelector";

export { ExportButton } from "./ExportButton";
