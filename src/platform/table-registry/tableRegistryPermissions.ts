/**
 * Epic 2 — Table Naming Governance permission keys.
 * Full RBAC seeding is out of scope; these keys are the canonical strings the
 * Table Registry page and its mutations check against.
 */
export const TABLE_REGISTRY_PERMISSIONS = {
  view: 'core.admin.table_registry.view',
  manage: 'core.admin.table_registry.manage',
} as const;

export type TableRegistryPermission =
  (typeof TABLE_REGISTRY_PERMISSIONS)[keyof typeof TABLE_REGISTRY_PERMISSIONS];
