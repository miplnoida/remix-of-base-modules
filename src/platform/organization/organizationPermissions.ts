/**
 * Epic 7 – Organization Foundation permission constants.
 * Mirror of source registry keys in src/platform/rbac/core.permissions.ts.
 */
export const ORGANIZATION_PERMISSIONS = {
  organization: {
    view: 'core.admin.organization.view',
    manage: 'core.admin.organization.manage',
  },
  organizationProfile: {
    view: 'core.admin.organization_profile.view',
    manage: 'core.admin.organization_profile.manage',
  },
  offices: {
    view: 'core.admin.offices.view',
    manage: 'core.admin.offices.manage',
  },
  departments: {
    view: 'core.admin.departments.view',
    manage: 'core.admin.departments.manage',
  },
  designations: {
    view: 'core.admin.designations.view',
    manage: 'core.admin.designations.manage',
  },
  locations: {
    view: 'core.admin.locations.view',
    manage: 'core.admin.locations.manage',
  },
  calendar: {
    view: 'core.admin.calendar.view',
    manage: 'core.admin.calendar.manage',
  },
} as const;

export type OrganizationPermissionKey =
  | typeof ORGANIZATION_PERMISSIONS.organization.view
  | typeof ORGANIZATION_PERMISSIONS.organization.manage
  | typeof ORGANIZATION_PERMISSIONS.organizationProfile.view
  | typeof ORGANIZATION_PERMISSIONS.organizationProfile.manage
  | typeof ORGANIZATION_PERMISSIONS.offices.view
  | typeof ORGANIZATION_PERMISSIONS.offices.manage
  | typeof ORGANIZATION_PERMISSIONS.departments.view
  | typeof ORGANIZATION_PERMISSIONS.departments.manage
  | typeof ORGANIZATION_PERMISSIONS.designations.view
  | typeof ORGANIZATION_PERMISSIONS.designations.manage
  | typeof ORGANIZATION_PERMISSIONS.locations.view
  | typeof ORGANIZATION_PERMISSIONS.locations.manage
  | typeof ORGANIZATION_PERMISSIONS.calendar.view
  | typeof ORGANIZATION_PERMISSIONS.calendar.manage;
