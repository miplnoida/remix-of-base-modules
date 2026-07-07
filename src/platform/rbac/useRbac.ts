import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  compareRegistryWithDatabase,
  createPermissionRegistryEntry,
  deactivatePermissionRegistryEntry,
  getAppModules,
  getModuleActions,
  getPermissionRegistryEntries,
  getPermissionRegistryEntryById,
  getRolePermissions,
  getRoles,
  reactivatePermissionRegistryEntry,
  syncPermissionsFromRegistry,
  updatePermissionRegistryEntry,
} from './rbacService';
import type {
  PermissionRegistryFilters,
  PermissionRegistryFormValues,
} from './permissionTypes';

const K = ['core-permission-registry'];

export function usePermissionRegistryEntries(filters: PermissionRegistryFilters = {}) {
  return useQuery({
    queryKey: [...K, filters],
    queryFn: () => getPermissionRegistryEntries(filters),
  });
}

export function usePermissionRegistryEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...K, 'byId', id],
    queryFn: () => (id ? getPermissionRegistryEntryById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreatePermissionRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PermissionRegistryFormValues) => createPermissionRegistryEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useUpdatePermissionRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PermissionRegistryFormValues> }) =>
      updatePermissionRegistryEntry(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useDeactivatePermissionRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivatePermissionRegistryEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useReactivatePermissionRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivatePermissionRegistryEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function usePermissionRegistryComparison() {
  return useQuery({
    queryKey: [...K, 'comparison'],
    queryFn: compareRegistryWithDatabase,
  });
}

export function useSyncPermissionsFromRegistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncPermissionsFromRegistry,
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useAppModules() {
  return useQuery({ queryKey: ['core-app-modules-v'], queryFn: getAppModules });
}
export function useModuleActions() {
  return useQuery({ queryKey: ['core-module-actions-v'], queryFn: getModuleActions });
}
export function useRoles() {
  return useQuery({ queryKey: ['core-roles'], queryFn: getRoles });
}
export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ['core-role-permissions-v', roleId ?? '_all'],
    queryFn: () => getRolePermissions(roleId),
  });
}
