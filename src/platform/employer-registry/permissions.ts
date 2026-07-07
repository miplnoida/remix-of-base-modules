/**
 * Employer Registry (pilot) permissions.
 * Mirror of the entries seeded in core_permission_registry and
 * `src/platform/rbac/core.permissions.ts`.
 */
export const EMPLOYER_REGISTRY_PERMISSIONS = {
  view: 'er.admin.employer_registry.view',
  create: 'er.admin.employer_registry.create',
  update: 'er.admin.employer_registry.update',
  deactivate: 'er.admin.employer_registry.deactivate',
  manageStatus: 'er.admin.employer_registry.manage_status',
  viewSensitive: 'er.admin.employer_registry.view_sensitive',
  pilotAccess: 'er.admin.employer_registry.pilot_access',
} as const;
