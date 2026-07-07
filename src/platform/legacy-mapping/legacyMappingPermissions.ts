/**
 * Epic 3 — Legacy Mapping Framework permission keys.
 * Full RBAC seeding is out of scope; these keys are the canonical strings the
 * Legacy Mapping pages and mutations check against.
 *
 * TODO: When global RBAC enforcement is added, gate the "Approve" action in
 * LegacyMappingAdmin behind `core.admin.legacy_mapping.approve`.
 */
export const LEGACY_MAPPING_PERMISSIONS = {
  view: 'core.admin.legacy_mapping.view',
  manage: 'core.admin.legacy_mapping.manage',
  approve: 'core.admin.legacy_mapping.approve',
} as const;

export type LegacyMappingPermission =
  (typeof LEGACY_MAPPING_PERMISSIONS)[keyof typeof LEGACY_MAPPING_PERMISSIONS];
