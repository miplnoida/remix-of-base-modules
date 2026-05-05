/**
 * Standard label format for Internal-Audit Department display.
 * Always renders "Department Name (OFFICE_CODE)" so users can distinguish
 * duplicate department names that exist under different office locations.
 *
 * The underlying ia_departments.id is preserved as the stored relational key;
 * only the display label is enriched.
 */
export interface DepartmentLike {
  name?: string | null;
  office_code?: string | null;
  display_label?: string | null;
}

export function formatDepartmentLabel(d?: DepartmentLike | null): string {
  if (!d) return '—';
  if (d.display_label) return d.display_label;
  const name = (d.name || '').trim();
  if (!name) return '—';
  const code = (d.office_code || '').trim();
  return code ? `${name} (${code})` : name;
}
