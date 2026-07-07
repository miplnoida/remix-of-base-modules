/**
 * Epic 4 — Reference Governance permission keys.
 * Full RBAC enforcement is out of scope; these are the canonical strings
 * that the Reference Framework tabs and mutations check against.
 */
export const REFERENCE_GOVERNANCE_PERMISSIONS = {
  view: 'core.admin.reference_governance.view',
  manage: 'core.admin.reference_governance.manage',
  approve: 'core.admin.reference_governance.approve',
} as const;

export type ReferenceGovernancePermission =
  (typeof REFERENCE_GOVERNANCE_PERMISSIONS)[keyof typeof REFERENCE_GOVERNANCE_PERMISSIONS];
