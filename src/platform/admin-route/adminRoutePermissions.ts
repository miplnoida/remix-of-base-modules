/**
 * Epic 1 — Administration Route Governance permission keys.
 * Full RBAC seeding is out of scope for this epic; these are the canonical
 * keys the Route Registry page and its mutations check against.
 */
export const ADMIN_ROUTE_REGISTRY_PERMISSIONS = {
  view: 'core.admin.route_registry.view',
  manage: 'core.admin.route_registry.manage',
} as const;

export type AdminRouteRegistryPermission =
  (typeof ADMIN_ROUTE_REGISTRY_PERMISSIONS)[keyof typeof ADMIN_ROUTE_REGISTRY_PERMISSIONS];
