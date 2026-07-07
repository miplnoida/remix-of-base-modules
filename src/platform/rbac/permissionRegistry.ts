import { CORE_PERMISSIONS, CORE_PERMISSION_DEFINITIONS } from './core.permissions';
import type { PermissionSourceDefinition } from './permissionTypes';

/**
 * Central permission registry. Business modules extend this by adding their
 * own permission-definition arrays here (bn.permissions.ts, er.permissions.ts…).
 */
export const PERMISSION_REGISTRY = {
  core: CORE_PERMISSIONS,
} as const;

export const ALL_PERMISSION_DEFINITIONS: PermissionSourceDefinition[] = [
  ...CORE_PERMISSION_DEFINITIONS,
];

export function flattenPermissionRegistry(): PermissionSourceDefinition[] {
  return ALL_PERMISSION_DEFINITIONS;
}

export function findSourceDefinition(key: string): PermissionSourceDefinition | undefined {
  return ALL_PERMISSION_DEFINITIONS.find((d) => d.permission_key === key);
}
