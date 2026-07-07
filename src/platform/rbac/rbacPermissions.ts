/**
 * Permission keys used by the Permission Registry admin surface.
 * Kept as a small module so pages/components can import without pulling
 * the full core.permissions catalogue.
 */
export const RBAC_ADMIN_PERMISSIONS = {
  permissionRegistry: {
    view: 'core.admin.permission_registry.view',
    manage: 'core.admin.permission_registry.manage',
    sync: 'core.admin.permission_registry.sync',
  },
} as const;
