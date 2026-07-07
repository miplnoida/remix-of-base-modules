/**
 * Epic 6 — Identity framework permission constants.
 * Mirrors seeds in core_permission_registry (see migration).
 */

export const IDENTITY_PERMISSIONS = {
  users: {
    view: 'core.admin.users.view',
    create: 'core.admin.users.create',
    update: 'core.admin.users.update',
    disable: 'core.admin.users.disable',
    manageRoles: 'core.admin.users.manage_roles',
    manageAssignments: 'core.admin.users.manage_assignments',
    manageSecurity: 'core.admin.users.manage_security',
    manageDelegations: 'core.admin.users.manage_delegations',
  },
  staffProfiles: {
    view: 'core.admin.staff_profiles.view',
    manage: 'core.admin.staff_profiles.manage',
  },
  identity: {
    view: 'core.admin.identity.view',
    manage: 'core.admin.identity.manage',
  },
} as const;
